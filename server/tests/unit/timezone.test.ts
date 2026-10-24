import { describe, it, expect } from "vitest";
import { getBangkokDayBoundaries, getBangkokDaysAgoBoundaries } from "../../src/utils/timezone";

describe("TEST-UNIT-02: Asia/Bangkok Timezone Boundary Calculations", () => {
  it("calculates startOfDay and startOfNextDay for standard mid-day UTC timestamp", () => {
    // 2026-10-05 08:30:00 UTC = 2026-10-05 15:30:00 in Bangkok (UTC+7)
    const ref = new Date("2026-10-05T08:30:00.000Z");
    const { startOfDay, startOfNextDay } = getBangkokDayBoundaries(ref);

    expect(startOfDay.toISOString()).toBe("2026-10-04T17:00:00.000Z");
    expect(startOfNextDay.toISOString()).toBe("2026-10-05T17:00:00.000Z");
    expect(startOfNextDay.getTime() - startOfDay.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("handles UTC evening timestamps that have already rolled over to next day in Bangkok", () => {
    // 2026-10-04 18:00:00 UTC = 2026-10-05 01:00:00 in Bangkok
    const ref = new Date("2026-10-04T18:00:00.000Z");
    const { startOfDay, startOfNextDay } = getBangkokDayBoundaries(ref);

    expect(startOfDay.toISOString()).toBe("2026-10-04T17:00:00.000Z");
    expect(startOfNextDay.toISOString()).toBe("2026-10-05T17:00:00.000Z");
  });

  it("handles exact local midnight boundary (17:00:00.000Z)", () => {
    // 2026-10-04 17:00:00.000Z = 2026-10-05 00:00:00 in Bangkok
    const ref = new Date("2026-10-04T17:00:00.000Z");
    const { startOfDay, startOfNextDay } = getBangkokDayBoundaries(ref);

    expect(startOfDay.toISOString()).toBe("2026-10-04T17:00:00.000Z");
    expect(startOfNextDay.toISOString()).toBe("2026-10-05T17:00:00.000Z");
  });

  it("handles 1ms before local midnight boundary (16:59:59.999Z)", () => {
    // 2026-10-04 16:59:59.999Z = 2026-10-04 23:59:59.999 in Bangkok
    const ref = new Date("2026-10-04T16:59:59.999Z");
    const { startOfDay, startOfNextDay } = getBangkokDayBoundaries(ref);

    expect(startOfDay.toISOString()).toBe("2026-10-03T17:00:00.000Z");
    expect(startOfNextDay.toISOString()).toBe("2026-10-04T17:00:00.000Z");
  });

  it("handles month and year boundaries correctly", () => {
    // 2026-12-31 20:00:00 UTC = 2027-01-01 03:00:00 in Bangkok
    const ref = new Date("2026-12-31T20:00:00.000Z");
    const { startOfDay, startOfNextDay } = getBangkokDayBoundaries(ref);

    expect(startOfDay.toISOString()).toBe("2026-12-31T17:00:00.000Z");
    expect(startOfNextDay.toISOString()).toBe("2027-01-01T17:00:00.000Z");
  });

  it("calculates 30-day window (today - 29 days) for recently resolved metrics", () => {
    // Reference: 2026-10-30 12:00:00 UTC (in Bangkok Oct 30)
    // 29 calendar days before Oct 30 is Oct 1.
    const ref = new Date("2026-10-30T12:00:00.000Z");
    const { startOfDay, startOfNextDay } = getBangkokDaysAgoBoundaries(29, ref);

    expect(startOfDay.toISOString()).toBe("2026-09-30T17:00:00.000Z"); // Oct 1 00:00 Bangkok
    expect(startOfNextDay.toISOString()).toBe("2026-10-30T17:00:00.000Z"); // Oct 31 00:00 Bangkok
  });
});
