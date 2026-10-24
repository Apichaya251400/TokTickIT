/**
 * Timezone utilities for TokTickIT.
 * Bangkok (Asia/Bangkok) operates at UTC+7 with no daylight saving time (DST).
 */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface DayBoundaries {
  startOfDay: Date;
  startOfNextDay: Date;
}

/**
 * Returns the exact UTC start and end boundaries for today in Asia/Bangkok (UTC+7).
 * startOfDay: local 00:00:00.000 in Bangkok as a UTC Date
 * startOfNextDay: local 00:00:00.000 of next day in Bangkok as a UTC Date
 */
export function getBangkokDayBoundaries(refDate: Date = new Date()): DayBoundaries {
  const localTime = new Date(refDate.getTime() + BANGKOK_OFFSET_MS);
  const year = localTime.getUTCFullYear();
  const month = localTime.getUTCMonth();
  const day = localTime.getUTCDate();

  const startOfDayMs = Date.UTC(year, month, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
  const startOfNextDayMs = Date.UTC(year, month, day + 1, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;

  return {
    startOfDay: new Date(startOfDayMs),
    startOfNextDay: new Date(startOfNextDayMs),
  };
}

/**
 * Returns boundaries covering a window of past calendar days up to startOfNextDay in Asia/Bangkok.
 * E.g., for daysAgo = 29, it covers today and the previous 29 calendar days (30 days total).
 */
export function getBangkokDaysAgoBoundaries(daysAgo: number, refDate: Date = new Date()): DayBoundaries {
  const localTime = new Date(refDate.getTime() + BANGKOK_OFFSET_MS);
  const year = localTime.getUTCFullYear();
  const month = localTime.getUTCMonth();
  const day = localTime.getUTCDate();

  const startOfDayMs = Date.UTC(year, month, day - daysAgo, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
  const startOfNextDayMs = Date.UTC(year, month, day + 1, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;

  return {
    startOfDay: new Date(startOfDayMs),
    startOfNextDay: new Date(startOfNextDayMs),
  };
}
