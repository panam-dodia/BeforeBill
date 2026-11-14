/**
 * A calendar date with no time and no time zone, written as "YYYY-MM-DD".
 * Renewals happen on a day, not at an instant, so storing a plain date keeps
 * "renews 22 Nov" meaning 22 Nov in every time zone.
 */
export type CalendarDate = string;

export type CycleUnit = 'day' | 'week' | 'month' | 'year';

/** How often a subscription renews, e.g. { unit: 'month', count: 1 } = monthly. */
export interface RenewalCycle {
  unit: CycleUnit;
  count: number;
}

export type SubscriptionStatus = 'active' | 'cancelled';

export interface Subscription {
  id: number;
  name: string;
  /**
   * The renewal date the user entered. Later renewals are always computed from
   * this date (not from the previous renewal) so month-end dates don't drift.
   */
  renewalDate: CalendarDate;
  cycle: RenewalCycle;
  isTrial: boolean;
  status: SubscriptionStatus;
}
