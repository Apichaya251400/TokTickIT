import { Router, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getPrisma } from "../prisma.js";
import { requesterContextMiddleware, AuthenticatedRequesterRequest } from "../middleware/requesterContext.js";
import { validateSummary, validateDescription, validateFileSize, sanitizeFileName } from "../utils/validation.js";
import { generateTicketNumber, getNextTicketSequence } from "../utils/ticketNumber.js";
import { RequestedPriority } from "@prisma/client";

export const ticketRouter = Router();

// Storage directory for uploaded attachments
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "attachments");

function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".pdf",
]);

function isAllowedFileType(fileName: string, mimeType: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  return ALLOWED_MIME_TYPES.has(mime) && ALLOWED_EXTENSIONS.has(ext);
}

interface ParsedMultipartFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function parseMultipartForm(req: AuthenticatedRequesterRequest): Promise<ParsedMultipartFile | null> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) {
      return resolve(null);
    }
    const boundary = match[1] || match[2];

    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const boundaryBuffer = Buffer.from(`--${boundary}`);

      let start = body.indexOf(boundaryBuffer);
      if (start === -1) return resolve(null);

      while (start !== -1) {
        const nextStart = body.indexOf(boundaryBuffer, start + boundaryBuffer.length);
        if (nextStart === -1) break;

        const part = body.subarray(start + boundaryBuffer.length, nextStart);
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd !== -1) {
          const headerStr = part.subarray(0, headerEnd).toString("utf8");
          let bodyBuffer = part.subarray(headerEnd + 4);
          if (
            bodyBuffer.length >= 2 &&
            bodyBuffer[bodyBuffer.length - 2] === 13 &&
            bodyBuffer[bodyBuffer.length - 1] === 10
          ) {
            bodyBuffer = bodyBuffer.subarray(0, bodyBuffer.length - 2);
          }

          const filenameMatch = headerStr.match(/filename="([^"]+)"/i);
          const nameMatch = headerStr.match(/name="([^"]+)"/i);
          const typeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

          if (filenameMatch && nameMatch) {
            return resolve({
              fieldname: nameMatch[1],
              originalname: filenameMatch[1],
              mimetype: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
              buffer: bodyBuffer,
              size: bodyBuffer.length,
            });
          }
        }
        start = nextStart;
      }
      resolve(null);
    });
    req.on("error", (err) => reject(err));
  });
}

// In-memory set tracking currently processing ticket requests to detect repeated submissions during processing (BR-14 / AC-20 / API-13)
const inFlightSubmissions = new Set<string>();

const ALLOWED_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// POST /api/tickets - Create a new IT support ticket
ticketRouter.post(
  "/tickets",
  requesterContextMiddleware,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    const { categoryId, relatedSystemId, requestedPriority, summary, description } = req.body || {};

    const validationDetails: Array<{ field: string; message: string }> = [];

    // Validate categoryId
    const parsedCatId = Number(categoryId);
    if (!categoryId || !Number.isInteger(parsedCatId) || parsedCatId <= 0) {
      validationDetails.push({
        field: "categoryId",
        message: "Category ID must be a positive integer.",
      });
    }

    // Validate relatedSystemId
    const parsedSysId = Number(relatedSystemId);
    if (!relatedSystemId || !Number.isInteger(parsedSysId) || parsedSysId <= 0) {
      validationDetails.push({
        field: "relatedSystemId",
        message: "Related System ID must be a positive integer.",
      });
    }

    // Validate requestedPriority
    if (!requestedPriority || !ALLOWED_PRIORITIES.has(requestedPriority)) {
      validationDetails.push({
        field: "requestedPriority",
        message: "Requested Priority must be one of: LOW, MEDIUM, HIGH, URGENT.",
      });
    }

    // Validate summary (10-120 chars, non-whitespace)
    const cleanSummary = validateSummary(summary);
    if (!cleanSummary) {
      validationDetails.push({
        field: "summary",
        message: "Summary must be between 10 and 120 characters.",
      });
    }

    // Validate description (20-2,000 chars, non-whitespace)
    const cleanDescription = validateDescription(description);
    if (!cleanDescription) {
      validationDetails.push({
        field: "description",
        message: "Description must be between 20 and 2,000 characters.",
      });
    }

    if (validationDetails.length > 0) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "One or more validation constraints failed.",
          details: validationDetails,
        },
      });
      return;
    }

    const requesterId = req.requesterId!;

    // Duplicate submission check for in-flight requests during active processing (BR-14 / AC-20 / API-13)
    const duplicateKey = `${requesterId}:${parsedCatId}:${parsedSysId}:${requestedPriority}:${cleanSummary}:${cleanDescription}`;
    if (inFlightSubmissions.has(duplicateKey)) {
      res.status(409).json({
        error: {
          code: "DUPLICATE_SUBMISSION",
          message: "A duplicate ticket creation request is currently being processed.",
        },
      });
      return;
    }

    inFlightSubmissions.add(duplicateKey);

    try {
      const prisma = getPrisma();

      // Check active Category and RelatedSystem references
      const [category, relatedSystem] = await Promise.all([
        prisma.category.findFirst({
          where: { id: parsedCatId, isActive: true },
        }),
        prisma.relatedSystem.findFirst({
          where: { id: parsedSysId, isActive: true },
        }),
      ]);

      if (!category || !relatedSystem) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Specified Category or Related System is invalid or inactive.",
          },
        });
        return;
      }

      // Generate ticket number TKT-YYYY-XXXXXX using database-safe sequence (BR-01)
      const ticketSeq = await getNextTicketSequence(prisma);
      const ticketNumber = generateTicketNumber(ticketSeq);

      // Create ticket in database
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId: parsedCatId,
          relatedSystemId: parsedSysId,
          requestedPriority: requestedPriority as RequestedPriority,
          summary: cleanSummary!,
          description: cleanDescription!,
          currentStatus: "NEW",
        },
      });

      res.status(201).json({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        requesterId: ticket.requesterId,
        categoryId: ticket.categoryId,
        relatedSystemId: ticket.relatedSystemId,
        requestedPriority: ticket.requestedPriority,
        currentStatus: ticket.currentStatus,
        summary: ticket.summary,
        description: ticket.description,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create ticket.",
        },
      });
    } finally {
      inFlightSubmissions.delete(duplicateKey);
    }
  }
);

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const ALLOWED_SORT_BY = new Set(["createdAt", "updatedAt", "ticketNumber", "requestedPriority"]);
const ALLOWED_SORT_ORDER = new Set(["asc", "desc"]);
const ALLOWED_PAGE_SIZES = new Set([10, 20, 50]);
const ALLOWED_STATUSES = new Set(["NEW"]);

// GET /api/tickets - Retrieve paginated list of owned tickets (Issue #27)
ticketRouter.get(
  "/tickets",
  requesterContextMiddleware,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    const {
      search,
      categoryId,
      relatedSystemId,
      requestedPriority,
      currentStatus,
      sortBy: sortByRaw,
      sortOrder: sortOrderRaw,
      page: pageRaw,
      pageSize: pageSizeRaw,
    } = req.query;

    // 1. Validate page (default 1, must be integer >= 1)
    let page = 1;
    if (pageRaw !== undefined) {
      const parsedPage = Number(pageRaw);
      if (!Number.isInteger(parsedPage) || parsedPage < 1 || String(pageRaw).trim() === "") {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY_PARAMETER",
            message: "Invalid query parameter value.",
          },
        });
        return;
      }
      page = parsedPage;
    }

    // 2. Validate pageSize (default 10, must be 10, 20, 50)
    let pageSize = 10;
    if (pageSizeRaw !== undefined) {
      const parsedPageSize = Number(pageSizeRaw);
      if (!Number.isInteger(parsedPageSize) || !ALLOWED_PAGE_SIZES.has(parsedPageSize) || String(pageSizeRaw).trim() === "") {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY_PARAMETER",
            message: "Invalid query parameter value.",
          },
        });
        return;
      }
      pageSize = parsedPageSize;
    }

    // 3. Validate sortBy (default createdAt)
    let sortBy = "createdAt";
    if (sortByRaw !== undefined) {
      const strSortBy = String(sortByRaw);
      if (!ALLOWED_SORT_BY.has(strSortBy)) {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY_PARAMETER",
            message: "Invalid query parameter value.",
          },
        });
        return;
      }
      sortBy = strSortBy;
    }

    // 4. Validate sortOrder (default desc)
    let sortOrder: "asc" | "desc" = "desc";
    if (sortOrderRaw !== undefined) {
      const strSortOrder = String(sortOrderRaw);
      if (!ALLOWED_SORT_ORDER.has(strSortOrder)) {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY_PARAMETER",
            message: "Invalid query parameter value.",
          },
        });
        return;
      }
      sortOrder = strSortOrder as "asc" | "desc";
    }

    // 5. Validate categoryId (optional int > 0)
    let parsedCatId: number | undefined;
    if (categoryId !== undefined) {
      const numCatId = Number(categoryId);
      if (!Number.isInteger(numCatId) || numCatId <= 0 || String(categoryId).trim() === "") {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY_PARAMETER",
            message: "Invalid query parameter value.",
          },
        });
        return;
      }
      parsedCatId = numCatId;
    }

    // 6. Validate relatedSystemId (optional int > 0)
    let parsedSysId: number | undefined;
    if (relatedSystemId !== undefined) {
      const numSysId = Number(relatedSystemId);
      if (!Number.isInteger(numSysId) || numSysId <= 0 || String(relatedSystemId).trim() === "") {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY_PARAMETER",
            message: "Invalid query parameter value.",
          },
        });
        return;
      }
      parsedSysId = numSysId;
    }

    // 7. Validate requestedPriority (optional enum)
    let strPriority: string | undefined;
    if (requestedPriority !== undefined) {
      const p = String(requestedPriority);
      if (!ALLOWED_PRIORITIES.has(p)) {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY_PARAMETER",
            message: "Invalid query parameter value.",
          },
        });
        return;
      }
      strPriority = p;
    }

    // 8. Validate currentStatus (optional enum)
    let strStatus: string | undefined;
    if (currentStatus !== undefined) {
      const s = String(currentStatus);
      if (!ALLOWED_STATUSES.has(s)) {
        res.status(400).json({
          error: {
            code: "INVALID_QUERY_PARAMETER",
            message: "Invalid query parameter value.",
          },
        });
        return;
      }
      strStatus = s;
    }

    const requesterId = req.requesterId!;
    const prisma = getPrisma();

    // Construct Prisma query where clause
    const where: any = {
      requesterId, // Scope strictly to requester context in DB query
    };

    if (search !== undefined && typeof search === "string") {
      const cleanSearch = search.trim();
      if (cleanSearch.length > 0) {
        where.OR = [
          { ticketNumber: { contains: cleanSearch, mode: "insensitive" } },
          { summary: { contains: cleanSearch, mode: "insensitive" } },
          { description: { contains: cleanSearch, mode: "insensitive" } },
        ];
      }
    }

    if (parsedCatId !== undefined) where.categoryId = parsedCatId;
    if (parsedSysId !== undefined) where.relatedSystemId = parsedSysId;
    if (strPriority !== undefined) where.requestedPriority = strPriority;
    if (strStatus !== undefined) where.currentStatus = strStatus;

    // Construct Prisma orderBy array
    const orderBy: any[] = [];
    if (sortBy === "requestedPriority") {
      orderBy.push({ requestedPriority: sortOrder });
    } else if (sortBy === "ticketNumber") {
      orderBy.push({ ticketNumber: sortOrder });
    } else if (sortBy === "updatedAt") {
      orderBy.push({ updatedAt: sortOrder });
    } else {
      orderBy.push({ createdAt: sortOrder });
    }

    // Secondary sort strictly id DESC for deterministic pagination
    orderBy.push({ id: "desc" });

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    try {
      const [tickets, totalItems] = await Promise.all([
        prisma.ticket.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            category: { select: { name: true } },
            relatedSystem: { select: { name: true } },
          },
        }),
        prisma.ticket.count({ where }),
      ]);

      const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

      res.status(200).json({
        data: tickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          summary: t.summary,
          categoryName: t.category.name,
          relatedSystemName: t.relatedSystem.name,
          requestedPriority: t.requestedPriority,
          currentStatus: t.currentStatus,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve tickets.",
        },
      });
    }
  }
);

// GET /api/tickets/:id - Retrieve owned ticket details with attachments (Issue #25)
ticketRouter.get(
  "/tickets/:id",
  requesterContextMiddleware,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    const ticketId = req.params.id;

    if (!UUID_REGEX.test(ticketId)) {
      res.status(400).json({
        error: {
          code: "INVALID_TICKET_ID",
          message: "Ticket ID must be a valid UUID.",
        },
      });
      return;
    }

    const requesterId = req.requesterId!;

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          requesterId, // Enforces ownership strictly at the database query level
        },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          relatedSystem: {
            select: {
              id: true,
              name: true,
            },
          },
          attachments: {
            orderBy: {
              uploadedAt: "asc",
            },
            select: {
              id: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              uploadedAt: true,
              removedAt: true,
              removalReason: true,
            },
          },
        },
      });

      if (!ticket) {
        res.status(404).json({
          error: {
            code: "TICKET_NOT_FOUND",
            message: "Ticket not found.",
          },
        });
        return;
      }

      res.status(200).json({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        requester: {
          id: ticket.requester.id,
          name: ticket.requester.name,
          email: ticket.requester.email,
        },
        category: {
          id: ticket.category.id,
          name: ticket.category.name,
        },
        relatedSystem: {
          id: ticket.relatedSystem.id,
          name: ticket.relatedSystem.name,
        },
        requestedPriority: ticket.requestedPriority,
        currentStatus: ticket.currentStatus,
        summary: ticket.summary,
        description: ticket.description,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        attachments: ticket.attachments.map((att) => ({
          id: att.id,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          uploadedAt: att.uploadedAt,
          removedAt: att.removedAt,
          removalReason: att.removalReason,
          isRemoved: att.removedAt !== null,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve ticket details.",
        },
      });
    }
  }
);

// POST /api/tickets/:id/attachments - Upload attachment to ticket (Issue #26)
ticketRouter.post(
  "/tickets/:id/attachments",
  requesterContextMiddleware,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    const ticketId = req.params.id;

    if (!UUID_REGEX.test(ticketId)) {
      res.status(400).json({
        error: {
          code: "INVALID_TICKET_ID",
          message: "Ticket ID must be a valid UUID.",
        },
      });
      return;
    }

    const requesterId = req.requesterId!;
    const prisma = getPrisma();

    // Verify ticket existence AND requester ownership directly in DB query
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        requesterId,
      },
    });

    if (!ticket) {
      res.status(404).json({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
        },
      });
      return;
    }

    // Parse file payload
    const file = await parseMultipartForm(req);
    if (!file) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "No attachment file provided in request.",
        },
      });
      return;
    }

    if (file.fieldname !== "file") {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Form field name must be 'file'.",
        },
      });
      return;
    }

    // File size validation (max 5,000,000 bytes inclusive)
    if (!validateFileSize(file.size)) {
      res.status(413).json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "File size exceeds maximum allowed limit of 5,000,000 bytes.",
        },
      });
      return;
    }

    // File type validation (allowed extensions and MIME types)
    if (!isAllowedFileType(file.originalname, file.mimetype)) {
      res.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "File type not supported. Allowed types: JPG, JPEG, PNG, WEBP, PDF.",
        },
      });
      return;
    }

    // Filename path traversal sanitization
    const sanitizedName = sanitizeFileName(file.originalname);

    ensureUploadsDir();

    let diskPath: string | null = null;

    try {
      // Concurrency-safe Active Limit Check & Insertion inside Prisma transaction
      const attachment = await prisma.$transaction(async (tx) => {
        // Lock the ticket row to serialize concurrent attachment uploads for this ticket
        await tx.$executeRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

        const activeCount = await tx.attachment.count({
          where: {
            ticketId,
            removedAt: null,
          },
        });

        if (activeCount >= 5) {
          const limitError = new Error("ATTACHMENT_LIMIT_EXCEEDED");
          (limitError as any).code = "ATTACHMENT_LIMIT_EXCEEDED";
          throw limitError;
        }

        const tempId = crypto.randomUUID();
        const diskFileName = `${tempId}_${sanitizedName}`;
        diskPath = path.join(UPLOADS_DIR, diskFileName);

        await fs.promises.writeFile(diskPath, file.buffer);

        return await tx.attachment.create({
          data: {
            id: tempId,
            ticketId,
            fileName: sanitizedName,
            fileSize: file.size,
            mimeType: file.mimetype,
            filePath: diskPath,
          },
        });
      });

      res.status(201).json({
        id: attachment.id,
        ticketId: attachment.ticketId,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        uploadedAt: attachment.uploadedAt,
        isRemoved: false,
      });
    } catch (err: any) {
      if (diskPath && fs.existsSync(diskPath)) {
        await fs.promises.unlink(diskPath).catch(() => {});
      }

      if (err?.code === "ATTACHMENT_LIMIT_EXCEEDED" || err?.message === "ATTACHMENT_LIMIT_EXCEEDED") {
        res.status(409).json({
          error: {
            code: "ATTACHMENT_LIMIT_EXCEEDED",
            message: "Maximum limit of 5 active attachments reached for this ticket.",
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload attachment.",
        },
      });
    }
  }
);

// GET /api/attachments/:id/download - Download attachment binary stream (Issue #26)
ticketRouter.get(
  "/attachments/:id/download",
  requesterContextMiddleware,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    const attachmentId = req.params.id;

    if (!UUID_REGEX.test(attachmentId)) {
      res.status(400).json({
        error: {
          code: "INVALID_ATTACHMENT_ID",
          message: "Attachment ID must be a valid UUID.",
        },
      });
      return;
    }

    const requesterId = req.requesterId!;
    const prisma = getPrisma();

    // Verify attachment existence AND ticket ownership directly in DB query
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ticket: {
          requesterId, // Ticket ownership filter
        },
      },
    });

    if (!attachment) {
      res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "Attachment not found.",
        },
      });
      return;
    }

    // Soft-removed download prevention
    if (attachment.removedAt !== null) {
      res.status(409).json({
        error: {
          code: "ATTACHMENT_REMOVED",
          message: "This attachment has been removed and is no longer available for download.",
        },
      });
      return;
    }

    // Check if physical file exists on disk
    if (!fs.existsSync(attachment.filePath)) {
      res.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve attachment file.",
        },
      });
      return;
    }

    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${attachment.fileName}"`);
    const stream = fs.createReadStream(attachment.filePath);
    stream.pipe(res);
  }
);

// DELETE /api/attachments/:id - Soft remove attachment with removalReason (Issue #26)
ticketRouter.delete(
  "/attachments/:id",
  requesterContextMiddleware,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    const attachmentId = req.params.id;

    if (!UUID_REGEX.test(attachmentId)) {
      res.status(400).json({
        error: {
          code: "INVALID_ATTACHMENT_ID",
          message: "Attachment ID must be a valid UUID.",
        },
      });
      return;
    }

    const requesterId = req.requesterId!;
    const prisma = getPrisma();

    // Verify attachment existence AND ticket ownership directly in DB query
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ticket: {
          requesterId, // Ticket ownership filter
        },
      },
    });

    if (!attachment) {
      res.status(404).json({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "Attachment not found.",
        },
      });
      return;
    }

    // Check if already soft-removed
    if (attachment.removedAt !== null) {
      res.status(409).json({
        error: {
          code: "ATTACHMENT_ALREADY_REMOVED",
          message: "This attachment has already been removed.",
        },
      });
      return;
    }

    const { removalReason } = req.body || {};
    const cleanReason = typeof removalReason === "string" ? removalReason.trim() : "";

    if (!cleanReason || cleanReason.length < 5 || cleanReason.length > 200) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Removal reason must be between 5 and 200 characters.",
        },
      });
      return;
    }

    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        removedAt: new Date(),
        removalReason: cleanReason,
      },
    });

    res.status(200).json({
      id: updated.id,
      fileName: updated.fileName,
      removedAt: updated.removedAt,
      removalReason: updated.removalReason,
      isRemoved: true,
    });
  }
);
