// Decides WHEN reminders should fire. Plain TypeScript (no React/Expo) so it can be unit tested.
// Actually scheduling the phone notifications happens later in src/notifications/.

import type { CalendarDate, Subscription } from '../types/subscription';
import { parseCalendarDate, toCalendarDate, upcomingRenewals } from './dates';

/** Remind 7 days before and 1 day before each renewal. */
export const REMINDER_DAYS_BEFORE = [7, 1] as const;

/** Reminders fire at 9:00 AM in the phone's own time zone. */
export const REMINDER_HOUR = 9;

export interface PlannedReminder {
  renewalDate: CalendarDate;
  daysBefore: number;
  fireAt: Date;
}

/**
 * Reminders for one renewal date, skipping any whose time has already passed
 * (e.g. adding a subscription 3 days before renewal gives only the 1-day reminder).
 */
export function remindersForRenewal(renewalDate: CalendarDate, now: Date): PlannedReminder[] {
  const { year, month, day } = parseCalendarDate(renewalDate);
  return REMINDER_DAYS_BEFORE.map((daysBefore) => ({
    renewalDate,
    daysBefore,
    // The local-time Date constructor handles month/year rollover (day 0, negative days)
    // and daylight saving, so this is 9:00 AM local on the right day everywhere.
    fireAt: new Date(year, month - 1, day - daysBefore, REMINDER_HOUR, 0, 0, 0),
  })).filter((reminder) => reminder.fireAt.getTime() > now.getTime());
}

/**
 * All reminders for the next `renewalsAhead` renewals of a subscription.
 * Booking several renewals ahead means reminders still arrive if the app isn't opened for a while.
 */
export function planReminders(
  subscription: Pick<Subscription, 'renewalDate' | 'cycle' | 'status'>,
  now: Date,
  renewalsAhead: number,
): PlannedReminder[] {
  if (subscription.status === 'cancelled') {
    return [];
  }
  const renewals = upcomingRenewals(
    subscription.renewalDate,
    subscription.cycle,
    toCalendarDate(now),
    renewalsAhead,
  );
  return renewals.flatMap((renewalDate) => remindersForRenewal(renewalDate, now));
}
