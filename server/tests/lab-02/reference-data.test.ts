import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";

describe("Issue #1 Reference Data APIs", () => {
  it("GET /api/requesters/active returns active requesters and excludes inactive Eve Adams", async () => {
    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const names = res.body.map((r: { name: string }) => r.name);

    // Verifies active requesters are present
    expect(names).toContain("Alice Smith");
    expect(names).toContain("Bob Jones");
    expect(names).toContain("Charlie Brown");
    expect(names).toContain("Diana Prince");

    // Verifies inactive requester Eve Adams is excluded
    expect(names).not.toContain("Eve Adams");
  });

  it("GET /api/related-systems returns the 7 seeded related systems", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);

    const names = res.body.map((s: { name: string }) => s.name);
    expect(names).toEqual([
      "Email",
      "Campus Wi-Fi",
      "VPN",
      "LEB2 App",
      "Grade Submission App",
      "Printer",
      "Corporate Laptop",
    ]);
  });

  it("GET /api/categories preserves existing Lab 1 endpoint behavior", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);

    const names = res.body.map((c: { name: string }) => c.name);
    expect(names).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
  });
});
