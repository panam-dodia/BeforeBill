import { planReminders, remindersForRenewal } from './reminders';

// Dates below are built with the local-time Date constructor (month is 0-based),
// so the tests pass in any time zone the machine is set to.

function describeFireAt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

describe('remindersForRenewal', () => {
  it('reminds 7 days and 1 day before, at 9:00 AM local time (Adobe example)', () => {
    const now = new Date(2026, 10, 13, 10, 0); // 13 Nov 2026, 10:00
    const reminders = remindersForRenewal('2026-11-22', now);
    expect(reminders.map((r) => [r.daysBefore, describeFireAt(r.fireAt)])).toEqual([
      [7, '2026-11-15 09:00'],
      [1, '2026-11-21 09:00'],
    ]);
  });

  it('skips the 7-day reminder when it is already in the past', () => {
    const now = new Date(2026, 10, 13, 10, 0);
    const reminders = remindersForRenewal('2026-11-16', now);
    expect(reminders.map((r) => [r.daysBefore, describeFireAt(r.fireAt)])).toEqual([
      [1, '2026-11-15 09:00'],
    ]);
  });

  it('skips a reminder whose time is exactly now, keeps one a minute later', () => {
    expect(remindersForRenewal('2026-11-22', new Date(2026, 10, 21, 9, 0))).toEqual([]);
    expect(remindersForRenewal('2026-11-22', new Date(2026, 10, 21, 8, 59))).toHaveLength(1);
  });

  it('crosses month and year boundaries', () => {
    const now = new Date(2026, 10, 1, 9, 0);
    expect(remindersForRenewal('2026-12-03', now).map((r) => describeFireAt(r.fireAt))).toEqual([
      '2026-11-26 09:00',
      '2026-12-02 09:00',
    ]);
    expect(remindersForRenewal('2027-01-01', now).map((r) => describeFireAt(r.fireAt))).toEqual([
      '2026-12-25 09:00',
      '2026-12-31 09:00',
    ]);
  });
});

describe('planReminders', () => {
  const now = new Date(2026, 10, 13, 10, 0);

  it('plans reminders for several renewals ahead', () => {
    const reminders = planReminders(
      { renewalDate: '2026-11-22', cycle: { unit: 'month', count: 1 }, status: 'active' },
      now,
      3,
    );
    expect(reminders.map((r) => `${r.renewalDate} -${r.daysBefore}d @ ${describeFireAt(r.fireAt)}`)).toEqual([
      '2026-11-22 -7d @ 2026-11-15 09:00',
      '2026-11-22 -1d @ 2026-11-21 09:00',
      '2026-12-22 -7d @ 2026-12-15 09:00',
      '2026-12-22 -1d @ 2026-12-21 09:00',
      '2027-01-22 -7d @ 2027-01-15 09:00',
      '2027-01-22 -1d @ 2027-01-21 09:00',
    ]);
  });

  it('rolls forward from a renewal date in the past', () => {
    const reminders = planReminders(
      { renewalDate: '2026-10-22', cycle: { unit: 'month', count: 1 }, status: 'active' },
      now,
      1,
    );
    expect(reminders.map((r) => r.renewalDate)).toEqual(['2026-11-22', '2026-11-22']);
  });

  it('plans nothing for a cancelled subscription', () => {
    expect(
      planReminders(
        { renewalDate: '2026-11-22', cycle: { unit: 'month', count: 1 }, status: 'cancelled' },
        now,
        3,
      ),
    ).toEqual([]);
  });
});
