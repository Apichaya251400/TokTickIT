import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("Issue #25: Ticket Detail API & Ownership Protection (GET /api/tickets/:id)", () => {
  const aliceHeader = { "X-Requester-Id": "1" }; // Alice Smith (Owner)
  const bobHeader = { "X-Requester-Id": "2" };   // Bob Jones (Non-Owner)

  let aliceTicketId: string;

  beforeAll(async () => {
    // Create a ticket owned by Alice Smith (Requester 1) to test ownership and detail retrieval
    const res = await request(app)
      .post("/api/tickets")
      .set(aliceHeader)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "HIGH",
        summary: "Detail Test Ticket Summary",
        description: "Detailed description for testing Ticket Detail API endpoint.",
      });

    expect(res.status).toBe(201);
    aliceTicketId = res.body.id;
  });

  describe("Requester Context Header Validation", () => {
    it("API-01 / BR-09: Returns HTTP 400 Bad Request when X-Requester-Id header is missing", async () => {
      const res = await request(app).get(`/api/tickets/${aliceTicketId}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_REQUESTER_HEADER",
          message: "Header X-Requester-Id must be a positive integer.",
        },
      });
    });

    it("API-02 / BR-09: Returns HTTP 400 Bad Request when X-Requester-Id header is malformed, non-numeric, or <= 0", async () => {
      const resInvalid = await request(app)
        .get(`/api/tickets/${aliceTicketId}`)
        .set("X-Requester-Id", "abc");
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.error.code).toBe("INVALID_REQUESTER_HEADER");

      const resZero = await request(app)
        .get(`/api/tickets/${aliceTicketId}`)
        .set("X-Requester-Id", "0");
      expect(resZero.status).toBe(400);
      expect(resZero.body.error.code).toBe("INVALID_REQUESTER_HEADER");

      const resNeg = await request(app)
        .get(`/api/tickets/${aliceTicketId}`)
        .set("X-Requester-Id", "-5");
      expect(resNeg.status).toBe(400);
      expect(resNeg.body.error.code).toBe("INVALID_REQUESTER_HEADER");
    });

    it("BR-09: Returns HTTP 403 Forbidden when X-Requester-Id specifies unknown or inactive requester", async () => {
      // Inactive Requester: Eve Adams (id=5)
      const resInactive = await request(app)
        .get(`/api/tickets/${aliceTicketId}`)
        .set("X-Requester-Id", "5");
      expect(resInactive.status).toBe(403);
      expect(resInactive.body).toEqual({
        error: {
          code: "FORBIDDEN_REQUESTER",
          message: "Specified requester is unknown or inactive.",
        },
      });

      // Unknown Requester ID
      const resUnknown = await request(app)
        .get(`/api/tickets/${aliceTicketId}`)
        .set("X-Requester-Id", "9999");
      expect(resUnknown.status).toBe(403);
      expect(resUnknown.body).toEqual({
        error: {
          code: "FORBIDDEN_REQUESTER",
          message: "Specified requester is unknown or inactive.",
        },
      });
    });
  });

  describe("Path Parameter Validation", () => {
    it("Returns HTTP 400 Bad Request when ticket :id path parameter is not a valid UUID", async () => {
      const res = await request(app)
        .get("/api/tickets/not-a-valid-uuid")
        .set(aliceHeader);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_TICKET_ID",
          message: "Ticket ID must be a valid UUID.",
        },
      });
    });
  });

  describe("Ownership Protection & Resource Existence (BR-04, BR-05, AC-03, API-14)", () => {
    it("API-14 / BR-04 / BR-05 / AC-03: Returns HTTP 404 Not Found when non-owner requests another requester's ticket", async () => {
      // Bob Jones (Requester 2) attempts to access Alice Smith's (Requester 1) ticket
      const res = await request(app)
        .get(`/api/tickets/${aliceTicketId}`)
        .set(bobHeader);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
        },
      });
    });

    it("Returns HTTP 404 Not Found when ticket UUID does not exist", async () => {
      const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .get(`/api/tickets/${nonExistentUuid}`)
        .set(aliceHeader);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: {
          code: "TICKET_NOT_FOUND",
          message: "Ticket not found.",
        },
      });
    });

    it("Verifies non-owner 404 response is identical to non-existent ticket 404 response (zero IDOR disclosure)", async () => {
      const nonOwnerRes = await request(app)
        .get(`/api/tickets/${aliceTicketId}`)
        .set(bobHeader);

      const nonExistentRes = await request(app)
        .get("/api/tickets/00000000-0000-0000-0000-000000000000")
        .set(aliceHeader);

      expect(nonOwnerRes.status).toBe(404);
      expect(nonExistentRes.status).toBe(404);
      expect(nonOwnerRes.body).toEqual(nonExistentRes.body);
    });
  });

  describe("Ticket Detail Retrieval Success (FR-06)", () => {
    it("Returns HTTP 200 OK with complete ticket detail and nested relations for owning requester", async () => {
      const res = await request(app)
        .get(`/api/tickets/${aliceTicketId}`)
        .set(aliceHeader);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(aliceTicketId);
      expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(res.body.summary).toBe("Detail Test Ticket Summary");
      expect(res.body.description).toBe("Detailed description for testing Ticket Detail API endpoint.");
      expect(res.body.requestedPriority).toBe("HIGH");
      expect(res.body.currentStatus).toBe("NEW");

      // Verify nested relations
      expect(res.body.requester).toEqual({
        id: 1,
        name: "Alice Smith",
        email: "alice@example.com",
      });
      expect(res.body.category).toEqual({
        id: 1,
        name: "Account and Access",
      });
      expect(res.body.relatedSystem).toEqual({
        id: 1,
        name: "Email",
      });

      // Verify attachments array metadata
      expect(Array.isArray(res.body.attachments)).toBe(true);
      expect(res.body.attachments).toEqual([]);
      expect(res.body).toHaveProperty("createdAt");
      expect(res.body).toHaveProperty("updatedAt");
    });
  });
});
