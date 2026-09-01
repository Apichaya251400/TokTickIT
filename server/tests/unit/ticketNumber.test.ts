import { describe, it, expect } from "vitest";
import { generateTicketNumber } from "../../src/utils/ticketNumber.js";

describe("UNIT-01: Ticket Number Generator Helper", () => {
  it("generates a ticket number matching TKT-YYYY-XXXXXX format", () => {
    const currentYear = new Date().getFullYear();
    const ticketNumber = generateTicketNumber(1);
    expect(ticketNumber).toMatch(new RegExp(`^TKT-${currentYear}-\\d{6}$`));
    expect(ticketNumber).toBe(`TKT-${currentYear}-000001`);
  });

  it("pads sequential counter correctly to 6 digits", () => {
    const currentYear = new Date().getFullYear();
    const ticketNumber = generateTicketNumber(42);
    expect(ticketNumber).toBe(`TKT-${currentYear}-000042`);
  });
});
