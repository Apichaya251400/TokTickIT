import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("Issue #23: Requester Context Middleware & Ticket Creation API", () => {
  const validRequesterHeader = { "X-Requester-Id": "1" }; // Alice Smith

  const validPayload = {
    categoryId: 1,
    relatedSystemId: 1,
    requestedPriority: "HIGH",
    summary: "Cannot access email account",
    description: "I have been unable to log into my corporate email account since morning.",
  };

  describe("Requester Context Header Middleware", () => {
    it("API-01: Returns HTTP 400 Bad Request when X-Requester-Id header is missing", async () => {
      const res = await request(app).post("/api/tickets").send(validPayload);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: "INVALID_REQUESTER_HEADER",
          message: "Header X-Requester-Id must be a positive integer.",
        },
      });
    });

    it("API-02: Returns HTTP 400 Bad Request when X-Requester-Id header is invalid, non-numeric, or <= 0", async () => {
      const resInvalid = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", "abc")
        .send(validPayload);
      expect(resInvalid.status).toBe(400);
      expect(resInvalid.body.error.code).toBe("INVALID_REQUESTER_HEADER");

      const resZero = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", "0")
        .send(validPayload);
      expect(resZero.status).toBe(400);
      expect(resZero.body.error.code).toBe("INVALID_REQUESTER_HEADER");

      const resNegative = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", "-5")
        .send(validPayload);
      expect(resNegative.status).toBe(400);
      expect(resNegative.body.error.code).toBe("INVALID_REQUESTER_HEADER");
    });

    it("Returns HTTP 403 Forbidden when X-Requester-Id specifies unknown or inactive requester", async () => {
      // Inactive Requester: Eve Adams (id=5)
      const resInactive = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", "5")
        .send(validPayload);
      expect(resInactive.status).toBe(403);
      expect(resInactive.body).toEqual({
        error: {
          code: "FORBIDDEN_REQUESTER",
          message: "Specified requester is unknown or inactive.",
        },
      });

      // Unknown Requester ID
      const resUnknown = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", "9999")
        .send(validPayload);
      expect(resUnknown.status).toBe(403);
      expect(resUnknown.body).toEqual({
        error: {
          code: "FORBIDDEN_REQUESTER",
          message: "Specified requester is unknown or inactive.",
        },
      });
    });
  });

  describe("POST /api/tickets Field Validations & Creation", () => {
    it("API-04: Returns HTTP 400 Bad Request for summary < 10 characters or whitespace-only", async () => {
      const res9 = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, summary: "123456789" });
      expect(res9.status).toBe(400);
      expect(res9.body.error.code).toBe("VALIDATION_ERROR");

      const resSpace = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, summary: "          " });
      expect(resSpace.status).toBe(400);
      expect(resSpace.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("API-05: Returns HTTP 201 Created for summary exactly 10 characters", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, summary: "1234567890" });
      expect(res.status).toBe(201);
      expect(res.body.summary).toBe("1234567890");
      expect(res.body.currentStatus).toBe("NEW");
      expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    });

    it("API-06: Returns HTTP 201 Created for summary exactly 120 characters", async () => {
      const summary120 = "a".repeat(120);
      const res = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, summary: summary120 });
      expect(res.status).toBe(201);
      expect(res.body.summary).toBe(summary120);
    });

    it("API-07: Returns HTTP 400 Bad Request for summary > 120 characters", async () => {
      const summary121 = "a".repeat(121);
      const res = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, summary: summary121 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("API-08: Returns HTTP 400 Bad Request for description < 20 characters", async () => {
      const res19 = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, description: "Short description!!" });
      expect(res19.status).toBe(400);
      expect(res19.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("API-09: Returns HTTP 201 Created for description exactly 20 characters", async () => {
      const desc20 = "a".repeat(20);
      const res = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, description: desc20 });
      expect(res.status).toBe(201);
      expect(res.body.description).toBe(desc20);
    });

    it("API-10: Returns HTTP 201 Created for description exactly 2,000 characters", async () => {
      const desc2000 = "a".repeat(2000);
      const res = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, description: desc2000 });
      expect(res.status).toBe(201);
      expect(res.body.description).toBe(desc2000);
    });

    it("API-11: Returns HTTP 400 Bad Request for description > 2,000 characters", async () => {
      const desc2001 = "a".repeat(2001);
      const res = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, description: desc2001 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("API-12: Returns HTTP 201 Created when requestedPriority is URGENT", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, requestedPriority: "URGENT" });
      expect(res.status).toBe(201);
      expect(res.body.requestedPriority).toBe("URGENT");
    });

    it("Returns HTTP 400 Bad Request when categoryId or relatedSystemId is invalid or inactive", async () => {
      const resCat = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, categoryId: 999 });
      expect(resCat.status).toBe(400);

      const resSys = await request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, relatedSystemId: 999 });
      expect(resSys.status).toBe(400);
    });

    it("API-13: Returns HTTP 409 Conflict when duplicate submission occurs during active processing", async () => {
      // Simulates repeated in-flight requests during active processing with identical payload
      const req1 = request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send(validPayload);
      const req2 = request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send(validPayload);

      const [res1, res2] = await Promise.all([req1, req2]);
      const statuses = [res1.status, res2.status];

      expect(statuses).toContain(201);
      expect(statuses).toContain(409);

      // Verifies concurrent requests with identical summary but DIFFERENT descriptions do NOT falsely trigger 409
      const reqDiffDescA = request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, description: "Room A cannot connect to Wi-Fi network." });
      const reqDiffDescB = request(app)
        .post("/api/tickets")
        .set(validRequesterHeader)
        .send({ ...validPayload, description: "Room B cannot connect to Wi-Fi network." });

      const [resDiffA, resDiffB] = await Promise.all([reqDiffDescA, reqDiffDescB]);
      expect(resDiffA.status).toBe(201);
      expect(resDiffB.status).toBe(201);
    });
  });
});
