// What the home list shows and how the add/edit form is checked.
// Plain TypeScript (no React/Expo) so it can be unit tested.

import type { CalendarDate, CycleUnit, RenewalCycle, Subscription } from '../types/subscription';
import { daysBetween, parseCalendarDate, upcomingRenewals } from './dates';

export interface ActiveListItem {
  subscription: Subscription;
  nextRenewal: CalendarDate;
  daysUntil: number;
  /** True while a free trial hasn't reached its end date yet (the first renewal). */
  isTrialEnding: boolean;
}

export interface SubscriptionList {
  active: ActiveListItem[];
  cancelled: Subscription[];
}

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/** Active subscriptions sorted by soonest renewal; cancelled ones listed separately by name. */
export function buildSubscriptionList(subscriptions: Subscription[], today: CalendarDate): SubscriptionList {
  const active = subscriptions
    .filter((s) => s.status === 'active')
    .map((subscription): ActiveListItem => {
      const [nextRenewal] = upcomingRenewals(subscription.renewalDate, subscription.cycle, today, 1);
      return {
        subscription,
        nextRenewal,
        daysUntil: daysBetween(today, nextRenewal),
        // After the trial end date passes, the subscription is a normal paid one.
        isTrialEnding: subscription.isTrial && nextRenewal === subscription.renewalDate,
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil || byName(a.subscription.name, b.subscription.name));

  const cancelled = subscriptions
    .filter((s) => s.status === 'cancelled')
    .sort((a, b) => byName(a.name, b.name));

  return { active, cancelled };
}

export function describeDaysUntil(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

// ---- Form checking ----

export const CYCLE_UNITS: readonly CycleUnit[] = ['day', 'week', 'month', 'year'];
export const MAX_NAME_LENGTH = 100;
export const MAX_CYCLE_COUNT = 999;

/** Raw values from the form (the "every N" box is text because it's typed in). */
export interface SubscriptionFormInput {
  name: string;
  renewalDate: CalendarDate;
  cycleUnit: CycleUnit;
  cycleCountText: string;
  isTrial: boolean;
}

export interface ValidSubscriptionInput {
  name: string;
  renewalDate: CalendarDate;
  cycle: RenewalCycle;
  isTrial: boolean;
}

export interface SubscriptionFormErrors {
  name?: string;
  cycleCount?: string;
  renewalDate?: string;
}

export type ValidationResult =
  | { ok: true; value: ValidSubscriptionInput }
  | { ok: false; errors: SubscriptionFormErrors };

export function validateSubscriptionInput(input: SubscriptionFormInput): ValidationResult {
  const errors: SubscriptionFormErrors = {};

  const name = input.name.trim();
  if (name.length === 0) {
    errors.name = 'Enter a name';
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer`;
  }

  const countText = input.cycleCountText.trim();
  const count = Number(countText);
  if (!/^\d+$/.test(countText) || count < 1 || count > MAX_CYCLE_COUNT) {
    errors.cycleCount = `Enter a whole number from 1 to ${MAX_CYCLE_COUNT}`;
  }

  try {
    parseCalendarDate(input.renewalDate);
  } catch {
    errors.renewalDate = 'Pick a valid date';
  }

  if (errors.name || errors.cycleCount || errors.renewalDate) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      name,
      renewalDate: input.renewalDate,
      cycle: { unit: input.cycleUnit, count },
      isTrial: input.isTrial,
    },
  };
}
