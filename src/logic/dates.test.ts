import {
  addDays,
  addMonthsClamped,
  daysBetween,
  nthRenewal,
  parseCalendarDate,
  toCalendarDate,
  upcomingRenewals,
} from './dates';

const monthly = { unit: 'month', count: 1 } as const;

describe('parseCalendarDate', () => {
  it('parses a valid date', () => {
    expect(parseCalendarDate('2026-11-22')).toEqual({ year: 2026, month: 11, day: 22 });
  });

  it.each(['2026-02-30', '2026-13-01', '2026-1-5', '22/11/2026', ''])('rejects "%s"', (value) => {
    expect(() => parseCalendarDate(value)).toThrow();
  });

  it('accepts Feb 29 only in leap years', () => {
    expect(() => parseCalendarDate('2028-02-29')).not.toThrow();
    expect(() => parseCalendarDate('2027-02-29')).toThrow();
  });
});

describe('toCalendarDate', () => {
  it("uses the phone's local date, even late at night", () => {
    expect(toCalendarDate(new Date(2026, 10, 22, 23, 59))).toBe('2026-11-22');
    expect(toCalendarDate(new Date(2026, 10, 22, 0, 0))).toBe('2026-11-22');
  });
});

describe('daysBetween / addDays', () => {
  it('counts days across months and years', () => {
    expect(daysBetween('2026-11-13', '2026-11-22')).toBe(9);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2026-11-22', '2026-11-13')).toBe(-9);
  });

  it('is not affected by daylight-saving changes', () => {
    // US clocks change on 2026-03-08 and 2026-11-01; EU on 2026-03-29 and 2026-10-25.
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('2026-10-20', '2026-11-05')).toBe(16);
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('addMonthsClamped', () => {
  it('clamps to the last day of shorter months', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30');
  });

  it('rolls over into the next year', () => {
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsClamped('2026-01-15', -1)).toBe('2025-12-15');
  });
});

describe('nthRenewal', () => {
  it('does not drift after a short month (always counts from the anchor)', () => {
    expect(nthRenewal('2026-01-31', monthly, 1)).toBe('2026-02-28');
    expect(nthRenewal('2026-01-31', monthly, 2)).toBe('2026-03-31');
  });

  it('handles a Feb 29 yearly renewal', () => {
    const yearly = { unit: 'year', count: 1 } as const;
    expect(nthRenewal('2028-02-29', yearly, 1)).toBe('2029-02-28');
    expect(nthRenewal('2028-02-29', yearly, 4)).toBe('2032-02-29');
  });

  it('handles every-N-weeks and every-N-days cycles', () => {
    expect(nthRenewal('2026-11-01', { unit: 'week', count: 2 }, 1)).toBe('2026-11-15');
    expect(nthRenewal('2026-11-01', { unit: 'day', count: 30 }, 1)).toBe('2026-12-01');
  });

  it.each([0, -1, 1.5])('rejects a cycle count of %s', (count) => {
    expect(() => nthRenewal('2026-11-01', { unit: 'month', count }, 1)).toThrow();
  });
});

describe('upcomingRenewals', () => {
  it('starts at the anchor when it is in the future', () => {
    expect(upcomingRenewals('2026-11-22', monthly, '2026-11-13', 3)).toEqual([
      '2026-11-22',
      '2026-12-22',
      '2027-01-22',
    ]);
  });

  it('includes a renewal happening today', () => {
    expect(upcomingRenewals('2026-11-13', monthly, '2026-11-13', 1)).toEqual(['2026-11-13']);
  });

  it('rolls a past anchor forward to the next renewal', () => {
    expect(upcomingRenewals('2025-01-31', monthly, '2026-11-13', 2)).toEqual([
      '2026-11-30',
      '2026-12-31',
    ]);
  });

  it('rolls a daily cycle forward over several years', () => {
    expect(upcomingRenewals('2020-01-01', { unit: 'day', count: 1 }, '2026-11-13', 1)).toEqual([
      '2026-11-13',
    ]);
  });

  it('returns nothing when asked for zero renewals', () => {
    expect(upcomingRenewals('2026-11-22', monthly, '2026-11-13', 0)).toEqual([]);
  });
});
