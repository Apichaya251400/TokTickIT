import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Issue #27: My Tickets List API (GET /api/tickets)", () => {
  const charlieHeader = { "X-Requester-Id": "3" }; // Charlie Brown (Requester 3)
  const bobHeader = { "X-Requester-Id": "2" };     // Bob Jones (Requester 2)

  let charlieTicket1Id: string;
  let charlieTicket2Id: string;
  let charlieTicket3Id: string;
  let bobTicketId: string;

  const createdTicketIds: string[] = [];

  describe("Requester Context Header Validation", () => {
    it("API-01 / BR-09: Returns HTTP 400 Bad Request when X-Requester-Id header is missing", async () => {
      const res = await request(app).get("/api/tickets");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_REQUESTER_HEADER",
          message: "Header X-Requester-Id must be a positive integer.",
        },
      });
    });

    it("API-02 / BR-09: Returns HTTP 400 Bad Request when X-Requester-Id header is malformed, non-numeric, or <= 0", async () => {
      const resInvalid = await request(app).get("/api/tickets").set("X-Requester-Id", "abc");
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.error.code).toBe("INVALID_REQUESTER_HEADER");

      const resZero = await request(app).get("/api/tickets").set("X-Requester-Id", "0");
      expect(resZero.status).toBe(400);
      expect(resZero.body.error.code).toBe("INVALID_REQUESTER_HEADER");

      const resNeg = await request(app).get("/api/tickets").set("X-Requester-Id", "-10");
      expect(resNeg.status).toBe(400);
      expect(resNeg.body.error.code).toBe("INVALID_REQUESTER_HEADER");
    });

    it("BR-09: Returns HTTP 403 Forbidden when X-Requester-Id specifies unknown or inactive requester", async () => {
      // Inactive requester ID 5 (Eve Adams)
      const resInactive = await request(app).get("/api/tickets").set("X-Requester-Id", "5");
      expect(resInactive.status).toBe(403);
      expect(resInactive.body).toEqual({
        error: {
          code: "FORBIDDEN_REQUESTER",
          message: "Specified requester is unknown or inactive.",
        },
      });

      // Unknown requester ID 9999
      const resUnknown = await request(app).get("/api/tickets").set("X-Requester-Id", "9999");
      expect(resUnknown.status).toBe(403);
      expect(resUnknown.body).toEqual({
        error: {
          code: "FORBIDDEN_REQUESTER",
          message: "Specified requester is unknown or inactive.",
        },
      });
    });
  });

  describe("Query Parameter Validation (HTTP 400 INVALID_QUERY_PARAMETER)", () => {
    it("Rejects invalid supported query parameter values with HTTP 400 Bad Request", async () => {
      const testCases = [
        { query: "page=abc", label: "non-numeric page" },
        { query: "page=0", label: "zero page" },
        { query: "page=-1", label: "negative page" },
        { query: "pageSize=999", label: "unsupported pageSize 999" },
        { query: "pageSize=abc", label: "non-numeric pageSize" },
        { query: "sortBy=invalidField", label: "unsupported sortBy" },
        { query: "sortOrder=sideways", label: "unsupported sortOrder" },
        { query: "requestedPriority=CRITICAL", label: "unsupported priority" },
        { query: "currentStatus=INVALID_STATUS", label: "unsupported status" },
        { query: "categoryId=abc", label: "non-numeric categoryId" },
        { query: "categoryId=0", label: "zero categoryId" },
        { query: "relatedSystemId=abc", label: "non-numeric relatedSystemId" },
      ];

      for (const tc of testCases) {
        const res = await request(app)
          .get(`/api/tickets?${tc.query}`)
          .set(charlieHeader);

        expect(res.status, `Failed for ${tc.label}`).toBe(400);
        expect(res.body.error.code, `Failed for ${tc.label}`).toBe("INVALID_QUERY_PARAMETER");
      }
    });

    it("Safely ignores unknown query parameter names and processes request normally", async () => {
      const res = await request(app)
        .get("/api/tickets?unknownParam=xyz&foo=bar")
        .set(charlieHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty("pagination");
    });
  });

  describe("Ticket Filtering, Searching, Sorting, and Pagination Suite", () => {
    // Unique search token generated per test execution to isolate test data from pre-existing DB records
    const searchToken = `Token_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    beforeAll(async () => {
      // 1. Create tickets for Charlie Brown (Requester 3) with unique search token
      const res1 = await request(app)
        .post("/api/tickets")
        .set(charlieHeader)
        .send({
          categoryId: 1, // Account and Access
          relatedSystemId: 1, // Email
          requestedPriority: "LOW",
          summary: `${searchToken} Alpha Account Reset`,
          description: "User needs account password reset for campus portal login.",
        });
      expect(res1.status).toBe(201);
      charlieTicket1Id = res1.body.id;
      createdTicketIds.push(charlieTicket1Id);

      const res2 = await request(app)
        .post("/api/tickets")
        .set(charlieHeader)
        .send({
          categoryId: 2, // Hardware
          relatedSystemId: 6, // Printer
          requestedPriority: "HIGH",
          summary: "Hardware Printer Offline Error",
          description: `Paper jam issue on ${searchToken} Beta printer device.`,
        });
      expect(res2.status).toBe(201);
      charlieTicket2Id = res2.body.id;
      createdTicketIds.push(charlieTicket2Id);

      const res3 = await request(app)
        .post("/api/tickets")
        .set(charlieHeader)
        .send({
          categoryId: 1, // Account and Access
          relatedSystemId: 1, // Email
          requestedPriority: "URGENT",
          summary: "Network VPN Access Failure",
          description: `${searchToken} Gamma VPN connection drops repeatedly during operation.`,
        });
      expect(res3.status).toBe(201);
      charlieTicket3Id = res3.body.id;
      createdTicketIds.push(charlieTicket3Id);

      // 2. Create ticket for Bob Jones (Requester 2) to test requester ownership isolation
      const bobRes = await request(app)
        .post("/api/tickets")
        .set(bobHeader)
        .send({
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          summary: "Bob Private Ticket Summary",
          description: `${searchToken} Alpha private description belonging strictly to Bob.`,
        });
      expect(bobRes.status).toBe(201);
      bobTicketId = bobRes.body.id;
      createdTicketIds.push(bobTicketId);
    });

    afterAll(async () => {
      // Clean up test tickets created by this test suite
      if (createdTicketIds.length > 0) {
        const prisma = getPrisma();
        await prisma.attachment.deleteMany({
          where: { ticketId: { in: createdTicketIds } },
        });
        await prisma.ticket.deleteMany({
          where: { id: { in: createdTicketIds } },
        });
      }
    });

    describe("API-26 — Keyword Search (BR-19, AC-06)", () => {
      it("Searches tickets by case-insensitive substring across ticketNumber, summary, and description", async () => {
        // 1. Search matching summary in Alpha
        const resSummary = await request(app)
          .get(`/api/tickets?search=${searchToken}%20alpha`)
          .set(charlieHeader);
        expect(resSummary.status).toBe(200);
        expect(resSummary.body.data.length).toBe(1);
        expect(resSummary.body.data[0].id).toBe(charlieTicket1Id);

        // 2. Search matching description in Beta
        const resDesc = await request(app)
          .get(`/api/tickets?search=${searchToken}%20beta`)
          .set(charlieHeader);
        expect(resDesc.status).toBe(200);
        expect(resDesc.body.data.length).toBe(1);
        expect(resDesc.body.data[0].id).toBe(charlieTicket2Id);

        // 3. Search matching ticketNumber
        const detailRes = await request(app)
          .get(`/api/tickets/${charlieTicket3Id}`)
          .set(charlieHeader);
        const targetTicketNumber = detailRes.body.ticketNumber;

        const resNumber = await request(app)
          .get(`/api/tickets?search=${targetTicketNumber}`)
          .set(charlieHeader);
        expect(resNumber.status).toBe(200);
        expect(resNumber.body.data.length).toBe(1);
        expect(resNumber.body.data[0].id).toBe(charlieTicket3Id);
      });

      it("Enforces ownership scope during search and never discloses other requesters' tickets", async () => {
        // Search matching Bob's ticket summary/description using Charlie's header
        const res = await request(app)
          .get("/api/tickets?search=Bob%20Private")
          .set(charlieHeader);

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(0);
        expect(res.body.pagination.totalItems).toBe(0);
      });
    });

    describe("API-27 — Combined Filters (BR-20, AC-06)", () => {
      it("Combines categoryId, relatedSystemId, requestedPriority, and currentStatus using AND logic", async () => {
        // Query with categoryId=1, relatedSystemId=1, requestedPriority=URGENT, currentStatus=NEW
        const resMatch = await request(app)
          .get(`/api/tickets?search=${searchToken}&categoryId=1&relatedSystemId=1&requestedPriority=URGENT&currentStatus=NEW`)
          .set(charlieHeader);

        expect(resMatch.status).toBe(200);
        expect(resMatch.body.data.length).toBe(1);
        expect(resMatch.body.data[0].id).toBe(charlieTicket3Id);

        // Query with non-matching priority filter combination
        const resNoMatch = await request(app)
          .get(`/api/tickets?search=${searchToken}&categoryId=1&relatedSystemId=1&requestedPriority=HIGH&currentStatus=NEW`)
          .set(charlieHeader);

        expect(resNoMatch.status).toBe(200);
        expect(resNoMatch.body.data.length).toBe(0);
      });
    });

    describe("API-28 — Priority Severity Sorting & Secondary Sort (BR-21, AC-11)", () => {
      it("Sorts requestedPriority by severity order (URGENT > HIGH > MEDIUM > LOW) when sortOrder=desc", async () => {
        const res = await request(app)
          .get(`/api/tickets?search=${searchToken}&sortBy=requestedPriority&sortOrder=desc`)
          .set(charlieHeader);

        expect(res.status).toBe(200);
        const priorities = res.body.data.map((t: any) => t.requestedPriority);
        
        // Verify severity order for Charlie's searchToken tickets: URGENT before HIGH before LOW
        expect(priorities).toEqual(["URGENT", "HIGH", "LOW"]);
      });

      it("Sorts requestedPriority by severity order (LOW < MEDIUM < HIGH < URGENT) when sortOrder=asc", async () => {
        const res = await request(app)
          .get(`/api/tickets?search=${searchToken}&sortBy=requestedPriority&sortOrder=asc`)
          .set(charlieHeader);

        expect(res.status).toBe(200);
        const priorities = res.body.data.map((t: any) => t.requestedPriority);

        expect(priorities).toEqual(["LOW", "HIGH", "URGENT"]);
      });

      it("Applies secondary ordering strictly by id DESC for tickets with identical primary sort values", async () => {
        const secondaryToken = `SecToken_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Create two tickets with identical priority for secondary sort test
        const resA = await request(app)
          .post("/api/tickets")
          .set(charlieHeader)
          .send({
            categoryId: 1,
            relatedSystemId: 1,
            requestedPriority: "MEDIUM",
            summary: `${secondaryToken} Ticket A`,
            description: "Testing secondary sort ordering id DESC for duplicate priorities.",
          });
        const resB = await request(app)
          .post("/api/tickets")
          .set(charlieHeader)
          .send({
            categoryId: 1,
            relatedSystemId: 1,
            requestedPriority: "MEDIUM",
            summary: `${secondaryToken} Ticket B`,
            description: "Testing secondary sort ordering id DESC for duplicate priorities.",
          });

        createdTicketIds.push(resA.body.id, resB.body.id);

        const resList = await request(app)
          .get(`/api/tickets?search=${secondaryToken}&requestedPriority=MEDIUM&sortBy=requestedPriority&sortOrder=desc`)
          .set(charlieHeader);

        expect(resList.status).toBe(200);
        expect(resList.body.data.length).toBe(2);

        const ids = resList.body.data.map((t: any) => t.id);
        // Secondary sort id DESC requires higher UUID string to appear first
        if (resA.body.id > resB.body.id) {
          expect(ids).toEqual([resA.body.id, resB.body.id]);
        } else {
          expect(ids).toEqual([resB.body.id, resA.body.id]);
        }
      });
    });

    describe("API-29 — Pagination & Page Beyond Last Page (BR-22, AC-10)", () => {
      it("Returns paginated results with default page=1, pageSize=10, and accurate metadata", async () => {
        const res = await request(app)
          .get(`/api/tickets?search=${searchToken}`)
          .set(charlieHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("data");
        expect(res.body).toHaveProperty("pagination");
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.pageSize).toBe(10);
        expect(res.body.pagination.totalItems).toBe(3);
        expect(res.body.pagination.totalPages).toBe(1);
      });

      it("Returns HTTP 200 OK with data=[] and accurate pagination metadata when requesting a page beyond totalPages", async () => {
        const res = await request(app)
          .get(`/api/tickets?search=${searchToken}&page=999&pageSize=10`)
          .set(charlieHeader);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination.page).toBe(999);
        expect(res.body.pagination.pageSize).toBe(10);
        expect(res.body.pagination.totalItems).toBe(3);
        expect(res.body.pagination.totalPages).toBe(1);
      });
    });

    describe("Empty / No-Results State", () => {
      it("Returns HTTP 200 OK with data=[] and totalItems=0 for a search/filter matching zero tickets", async () => {
        const res = await request(app)
          .get("/api/tickets?search=NonExistentQuery_XYZ999")
          .set(charlieHeader);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination).toEqual({
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        });
      });
    });
  });
});
