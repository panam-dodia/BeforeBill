// Calendar-date math for renewals. Plain TypeScript (no React/Expo) so it can be unit tested.
//
// Dates are "YYYY-MM-DD" strings. Internally they are converted to whole UTC days,
// which avoids daylight-saving shifts: a UTC day is always exactly 24 hours.

import type { CalendarDate, RenewalCycle } from '../types/subscription';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DateParts {
  year: number;
  /** 1 = January ... 12 = December */
  month: number;
  day: number;
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseCalendarDate(value: CalendarDate): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid calendar date "${value}": expected YYYY-MM-DD`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`Invalid calendar date "${value}": no such day`);
  }
  return { year, month, day };
}

export function formatCalendarDate({ year, month, day }: DateParts): CalendarDate {
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** The calendar date of `moment` in the phone's own time zone. */
export function toCalendarDate(moment: Date): CalendarDate {
  return formatCalendarDate({
    year: moment.getFullYear(),
    month: moment.getMonth() + 1,
    day: moment.getDate(),
  });
}

function toDayNumber(date: CalendarDate): number {
  const { year, month, day } = parseCalendarDate(date);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function fromDayNumber(dayNumber: number): CalendarDate {
  const d = new Date(dayNumber * MS_PER_DAY);
  return formatCalendarDate({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return fromDayNumber(toDayNumber(date) + days);
}

/**
 * Adds months, clamping to the last day of the target month when it is shorter
 * (Jan 31 + 1 month = Feb 28, or Feb 29 in a leap year).
 */
export function addMonthsClamped(date: CalendarDate, months: number): CalendarDate {
  const { year, month, day } = parseCalendarDate(date);
  const monthIndex = year * 12 + (month - 1) + months;
  const newYear = Math.floor(monthIndex / 12);
  const newMonth = monthIndex - newYear * 12 + 1;
  return formatCalendarDate({
    year: newYear,
    month: newMonth,
    day: Math.min(day, daysInMonth(newYear, newMonth)),
  });
}

function assertValidCycle(cycle: RenewalCycle): void {
  if (!Number.isInteger(cycle.count) || cycle.count < 1) {
    throw new Error(`Invalid renewal cycle count ${cycle.count}: must be a whole number of at least 1`);
  }
}

/**
 * The n-th renewal after `anchor` (n = 0 is the anchor itself).
 * Always computed from the anchor so clamped month-end dates don't drift:
 * anchor Jan 31 monthly -> Feb 28 -> Mar 31 (not Mar 28).
 */
export function nthRenewal(anchor: CalendarDate, cycle: RenewalCycle, n: number): CalendarDate {
  assertValidCycle(cycle);
  switch (cycle.unit) {
    case 'day':
      return addDays(anchor, n * cycle.count);
    case 'week':
      return addDays(anchor, n * cycle.count * 7);
    case 'month':
      return addMonthsClamped(anchor, n * cycle.count);
    case 'year':
      return addMonthsClamped(anchor, n * cycle.count * 12);
  }
}

// Longest possible length of one cycle, used to jump close to "today" without
// looping one cycle at a time over many years. Using the longest length means
// the jump never overshoots.
function maxCycleDays(cycle: RenewalCycle): number {
  switch (cycle.unit) {
    case 'day':
      return cycle.count;
    case 'week':
      return cycle.count * 7;
    case 'month':
      return cycle.count * 31;
    case 'year':
      return cycle.count * 366;
  }
}

/**
 * The next `count` renewal dates on or after `today`.
 * A renewal happening today is included (it hasn't been charged yet as far as we know).
 */
export function upcomingRenewals(
  anchor: CalendarDate,
  cycle: RenewalCycle,
  today: CalendarDate,
  count: number,
): CalendarDate[] {
  assertValidCycle(cycle);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid count ${count}: must be a whole number of at least 0`);
  }

  const elapsed = daysBetween(anchor, today);
  let n = elapsed > 0 ? Math.floor(elapsed / maxCycleDays(cycle)) : 0;
  while (daysBetween(today, nthRenewal(anchor, cycle, n)) < 0) {
    n++;
  }

  const result: CalendarDate[] = [];
  for (let i = 0; i < count; i++) {
    result.push(nthRenewal(anchor, cycle, n + i));
  }
  return result;
}
