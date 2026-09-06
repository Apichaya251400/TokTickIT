import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import fs from "fs";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue #26: Attachment Upload, Download, Soft Removal & Lifecycle Rules", () => {
  const aliceHeader = { "X-Requester-Id": "1" }; // Alice Smith (Requester 1)
  const bobHeader = { "X-Requester-Id": "2" };   // Bob Jones (Requester 2)

  let aliceTicketId: string;

  beforeAll(async () => {
    // Create a base ticket owned by Alice Smith for attachment testing
    const res = await request(app)
      .post("/api/tickets")
      .set(aliceHeader)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Attachment Test Base Ticket",
        description: "Ticket created specifically for attachment lifecycle integration testing.",
      });

    expect(res.status).toBe(201);
    aliceTicketId = res.body.id;
  });

  describe("File Size & Type Validations (API-15, API-16, API-17, API-18)", () => {
    it("API-15 / BR-06 / AC-04: Accepts attachment upload of 4,999,999 bytes", async () => {
      const buffer = Buffer.alloc(4999999, "a");
      const res = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", buffer, "boundary-test-4999999.png");

      expect(res.status).toBe(201);
      expect(res.body.fileSize).toBe(4999999);
      expect(res.body.isRemoved).toBe(false);
    });

    it("API-16 / BR-06 / AC-04: Accepts attachment upload of 5,000,000 bytes", async () => {
      const buffer = Buffer.alloc(5000000, "b");
      const res = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", buffer, "boundary-test-5000000.pdf");

      expect(res.status).toBe(201);
      expect(res.body.fileSize).toBe(5000000);
      expect(res.body.isRemoved).toBe(false);
    });

    it("API-17 / BR-06 / AC-04: Rejects attachment upload exceeding 5,000,000 bytes with HTTP 413 Payload Too Large", async () => {
      const buffer = Buffer.alloc(5000001, "c");
      const res = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", buffer, "oversized-file.jpg");

      expect(res.status).toBe(413);
      expect(res.body).toEqual({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "File size exceeds maximum allowed limit of 5,000,000 bytes.",
        },
      });
    });

    it("API-18 / BR-06 / AC-04: Rejects unsupported file type (e.g. .exe) with HTTP 415 Unsupported Media Type", async () => {
      const buffer = Buffer.from("executable content");
      const res = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", buffer, "malicious.exe");

      expect(res.status).toBe(415);
      expect(res.body).toEqual({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "File type not supported. Allowed types: JPG, JPEG, PNG, WEBP, PDF.",
        },
      });
    });
  });

  describe("Filename Sanitization & Path Traversal Protection (API-30, BR-16)", () => {
    it("API-30 / BR-16: Sanitizes path traversal sequences (../secret.pdf) to safe basename", async () => {
      const buffer = Buffer.from("sample content");
      const res = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", buffer, "../secret.pdf");

      expect(res.status).toBe(201);
      expect(res.body.fileName).toBe("secret.pdf");
    });
  });

  describe("Active Attachment Limit & Soft-Removed Exemption (API-19, API-32, BR-07)", () => {
    it("API-19 & API-32 / BR-07 / AC-07: Enforces maximum 5 active attachments limit and ignores soft-removed attachments", async () => {
      // Create a fresh dedicated ticket to test the 5-active attachment limit
      const ticketRes = await request(app)
        .post("/api/tickets")
        .set(aliceHeader)
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "LOW",
          summary: "Limit Test Attachment Ticket",
          description: "Testing active attachment limit counting rules and soft-removal exemptions.",
        });
      const limitTicketId = ticketRes.body.id;

      // Upload 5 active attachments
      const uploadedIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const uploadRes = await request(app)
          .post(`/api/tickets/${limitTicketId}/attachments`)
          .set(aliceHeader)
          .attach("file", Buffer.from(`file ${i}`), `active-file-${i}.pdf`);
        expect(uploadRes.status).toBe(201);
        uploadedIds.push(uploadRes.body.id);
      }

      // API-19: Attempting to upload a 6th active attachment must fail with HTTP 409 Conflict
      const res6 = await request(app)
        .post(`/api/tickets/${limitTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.from("file 6"), "active-file-6.pdf");

      expect(res6.status).toBe(409);
      expect(res6.body).toEqual({
        error: {
          code: "ATTACHMENT_LIMIT_EXCEEDED",
          message: "Maximum limit of 5 active attachments reached for this ticket.",
        },
      });

      // Soft remove 1 of the 5 active attachments
      const softRemoveRes = await request(app)
        .delete(`/api/attachments/${uploadedIds[0]}`)
        .set(aliceHeader)
        .send({ removalReason: "Uploaded wrong file version for this ticket" });
      expect(softRemoveRes.status).toBe(200);

      // API-32: Uploading a new attachment now succeeds (5 total active + 1 soft-removed)
      const resAfterRemove = await request(app)
        .post(`/api/tickets/${limitTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.from("file new"), "new-active-file.png");

      expect(resAfterRemove.status).toBe(201);
    });

    it("Concurrency Regression: Prevents concurrent uploads from breaching 5-active limit", async () => {
      // Create ticket and upload 4 active attachments
      const ticketRes = await request(app)
        .post("/api/tickets")
        .set(aliceHeader)
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "LOW",
          summary: "Concurrent Limit Attachment Ticket",
          description: "Testing concurrent upload race conditions against active limit.",
        });
      const concTicketId = ticketRes.body.id;

      for (let i = 1; i <= 4; i++) {
        await request(app)
          .post(`/api/tickets/${concTicketId}/attachments`)
          .set(aliceHeader)
          .attach("file", Buffer.from(`file ${i}`), `conc-file-${i}.png`);
      }

      // Perform 2 concurrent attachment uploads
      const reqA = request(app)
        .post(`/api/tickets/${concTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.from("conc A"), "conc-A.png");
      const reqB = request(app)
        .post(`/api/tickets/${concTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.from("conc B"), "conc-B.png");

      const [resA, resB] = await Promise.all([reqA, reqB]);
      const statuses = [resA.status, resB.status];

      // Exactly one request should succeed (201) and one should fail (409) or both succeed if properly synchronized
      expect(statuses).toContain(201);

      // Verify active count in DB does NOT exceed 5
      const prisma = getPrisma();
      const activeCount = await prisma.attachment.count({
        where: { ticketId: concTicketId, removedAt: null },
      });
      expect(activeCount).toBeLessThanOrEqual(5);
    });
  });

  describe("Soft Removal & Reason Boundaries (API-20, API-21, API-22, API-23, BR-08, AC-17)", () => {
    let attachmentId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.from("soft remove test"), "soft-remove-test.pdf");
      expect(res.status).toBe(201);
      attachmentId = res.body.id;
    });

    it("API-20 / BR-08 / AC-17: Rejects soft removal with 4-character removalReason", async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set(aliceHeader)
        .send({ removalReason: "1234" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("API-23 / BR-08 / AC-17: Rejects soft removal with 201-character removalReason", async () => {
      const longReason = "a".repeat(201);
      const res = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set(aliceHeader)
        .send({ removalReason: longReason });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("API-21 & API-22 / BR-08 / AC-17: Accepts soft removal with valid 5–200 character removalReason", async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set(aliceHeader)
        .send({ removalReason: "  Valid removal reason text at least 5 chars  " });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(attachmentId);
      expect(res.body.removalReason).toBe("Valid removal reason text at least 5 chars");
      expect(res.body.isRemoved).toBe(true);
      expect(res.body).toHaveProperty("removedAt");
    });
  });

  describe("Download & Soft Removal Access Restrictions (API-24, API-25, BR-04, BR-05, AC-05, AC-16)", () => {
    let activeAttachmentId: string;
    let softRemovedAttachmentId: string;

    beforeAll(async () => {
      // Upload 1 active attachment
      const resActive = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.from("active file content"), "active-download.png");
      activeAttachmentId = resActive.body.id;

      // Upload 1 attachment and soft-remove it
      const resRemove = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.from("removed file content"), "removed-download.png");
      softRemovedAttachmentId = resRemove.body.id;

      await request(app)
        .delete(`/api/attachments/${softRemovedAttachmentId}`)
        .set(aliceHeader)
        .send({ removalReason: "Removing for download test" });
    });

    it("Downloads active attachment successfully for owner", async () => {
      const res = await request(app)
        .get(`/api/attachments/${activeAttachmentId}/download`)
        .set(aliceHeader);

      expect(res.status).toBe(200);
      expect(res.header["content-type"]).toContain("image/png");
      expect(res.header["content-disposition"]).toContain('filename="active-download.png"');
    });

    it("API-24 / BR-08 / AC-05: Rejects download of soft-removed attachment with HTTP 409 Conflict", async () => {
      const res = await request(app)
        .get(`/api/attachments/${softRemovedAttachmentId}/download`)
        .set(aliceHeader);

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: {
          code: "ATTACHMENT_REMOVED",
          message: "This attachment has been removed and is no longer available for download.",
        },
      });
    });

    it("API-25 / BR-04 / BR-05 / AC-16: Returns HTTP 404 Not Found when non-owner accesses another requester's attachment", async () => {
      // Bob Jones (Requester 2) attempts to download Alice Smith's (Requester 1) attachment
      const resDownload = await request(app)
        .get(`/api/attachments/${activeAttachmentId}/download`)
        .set(bobHeader);

      expect(resDownload.status).toBe(404);
      expect(resDownload.body).toEqual({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "Attachment not found.",
        },
      });

      // Bob Jones attempts to soft-remove Alice Smith's attachment
      const resDelete = await request(app)
        .delete(`/api/attachments/${activeAttachmentId}`)
        .set(bobHeader)
        .send({ removalReason: "Attempting non-owner removal" });

      expect(resDelete.status).toBe(404);
      expect(resDelete.body).toEqual({
        error: {
          code: "ATTACHMENT_NOT_FOUND",
          message: "Attachment not found.",
        },
      });
    });
  });

  describe("Failure Retention Rule (API-31, BR-18)", () => {
    it("API-31 / BR-18: Ticket remains persisted when attachment upload fails after ticket creation", async () => {
      // 1. Create a valid ticket
      const ticketRes = await request(app)
        .post("/api/tickets")
        .set(aliceHeader)
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "HIGH",
          summary: "Failure Retention Test Ticket",
          description: "Verifying that ticket remains saved even if attachment upload fails.",
        });

      expect(ticketRes.status).toBe(201);
      const createdTicketId = ticketRes.body.id;

      // 2. Attempt invalid attachment upload (oversized file)
      const uploadRes = await request(app)
        .post(`/api/tickets/${createdTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.alloc(5000001), "too-large.pdf");

      expect(uploadRes.status).toBe(413);

      // 3. Verify ticket still exists in DB and is retrievable via GET /api/tickets/:id
      const detailRes = await request(app)
        .get(`/api/tickets/${createdTicketId}`)
        .set(aliceHeader);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.id).toBe(createdTicketId);
      expect(detailRes.body.summary).toBe("Failure Retention Test Ticket");
    });
  });

  describe("Peer Review Regression Tests: Field Name & Storage Edge Cases", () => {
    it("Peer Review 1: Rejects multipart attachment upload using field name other than 'file' with HTTP 400 Bad Request", async () => {
      const buffer = Buffer.from("valid file content");
      const res = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .attach("document", buffer, "valid-file.png"); // Using field name 'document' instead of 'file'

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toBe("Form field name must be 'file'.");
    });

    it("Peer Review 2: Returns HTTP 500 Internal Server Error when attachment DB record exists but physical file is missing from disk", async () => {
      // Create a fresh dedicated ticket to ensure clean active attachment slot
      const ticketRes = await request(app)
        .post("/api/tickets")
        .set(aliceHeader)
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "LOW",
          summary: "Storage Test Dedicated Ticket",
          description: "Dedicated ticket for missing physical file storage test.",
        });
      expect(ticketRes.status).toBe(201);
      const storageTicketId = ticketRes.body.id;

      // 1. Upload a valid attachment
      const uploadRes = await request(app)
        .post(`/api/tickets/${storageTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", Buffer.from("temp physical file content"), "storage-test.pdf");
      expect(uploadRes.status).toBe(201);
      const attachmentId = uploadRes.body.id;

      // 2. Remove the physical file directly from disk while preserving the database Attachment record
      const prisma = getPrisma();
      const dbAttachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
      expect(dbAttachment).not.toBeNull();
      if (dbAttachment && fs.existsSync(dbAttachment.filePath)) {
        await fs.promises.unlink(dbAttachment.filePath);
      }

      // 3. Attempt download - must return 500 Internal Server Error (not 200 or zero-filled Buffer)
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set(aliceHeader);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve attachment file.",
        },
      });
    });

    it("Final Hardening 1: Rejects multipart upload when file field is completely missing with HTTP 400 Bad Request", async () => {
      const res = await request(app)
        .post(`/api/tickets/${aliceTicketId}/attachments`)
        .set(aliceHeader)
        .field("dummyField", "no file part included");

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toBe("No attachment file provided in request.");
    });

    it("Final Hardening 2: Successfully downloads active attachment with exact binary payload and headers", async () => {
      // 1. Create a dedicated ticket to isolate download positive path
      const ticketRes = await request(app)
        .post("/api/tickets")
        .set(aliceHeader)
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "LOW",
          summary: "Positive Download Ticket",
          description: "Dedicated ticket for positive path attachment download test.",
        });
      expect(ticketRes.status).toBe(201);
      const activeTicketId = ticketRes.body.id;

      // 2. Upload small deterministic file payload
      const filePayload = Buffer.from("active attachment download regression");
      const uploadRes = await request(app)
        .post(`/api/tickets/${activeTicketId}/attachments`)
        .set(aliceHeader)
        .attach("file", filePayload, "active-regression.pdf");

      expect(uploadRes.status).toBe(201);
      const attachmentId = uploadRes.body.id;

      // 3. Download active attachment
      const downloadRes = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set(aliceHeader);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.header["content-type"]).toContain("application/pdf");
      expect(downloadRes.header["content-disposition"]).toContain('filename="active-regression.pdf"');
      expect(downloadRes.body.toString("utf8")).toBe("active attachment download regression");
    });
  });
});
