import type { Subscription } from '../types/subscription';
import { buildSubscriptionList, describeDaysUntil, validateSubscriptionInput } from './subscriptionList';

function sub(overrides: Partial<Subscription> & Pick<Subscription, 'id' | 'name'>): Subscription {
  return {
    renewalDate: '2026-11-22',
    cycle: { unit: 'month', count: 1 },
    isTrial: false,
    status: 'active',
    ...overrides,
  };
}

const today = '2026-11-13';

describe('buildSubscriptionList', () => {
  it('sorts active subscriptions by soonest renewal, then by name', () => {
    const list = buildSubscriptionList(
      [
        sub({ id: 1, name: 'Netflix', renewalDate: '2026-12-01' }),
        sub({ id: 2, name: 'adobe', renewalDate: '2026-11-22' }),
        sub({ id: 3, name: 'Zoom', renewalDate: '2026-11-15' }),
        sub({ id: 4, name: 'Apple', renewalDate: '2026-11-22' }),
      ],
      today,
    );
    expect(list.active.map((i) => [i.subscription.name, i.nextRenewal, i.daysUntil])).toEqual([
      ['Zoom', '2026-11-15', 2],
      ['adobe', '2026-11-22', 9],
      ['Apple', '2026-11-22', 9],
      ['Netflix', '2026-12-01', 18],
    ]);
  });

  it('rolls a past renewal date forward', () => {
    const list = buildSubscriptionList([sub({ id: 1, name: 'Old', renewalDate: '2026-10-05' })], today);
    expect(list.active[0].nextRenewal).toBe('2026-12-05');
  });

  it('marks a trial as ending only until its end date has passed', () => {
    const list = buildSubscriptionList(
      [
        sub({ id: 1, name: 'Adobe', isTrial: true, renewalDate: '2026-11-22' }),
        sub({ id: 2, name: 'Past trial', isTrial: true, renewalDate: '2026-10-22' }),
      ],
      today,
    );
    expect(list.active.map((i) => [i.subscription.name, i.isTrialEnding])).toEqual([
      ['Adobe', true],
      ['Past trial', false],
    ]);
  });

  it('puts cancelled subscriptions in their own list, sorted by name', () => {
    const list = buildSubscriptionList(
      [
        sub({ id: 1, name: 'Spotify', status: 'cancelled' }),
        sub({ id: 2, name: 'Adobe' }),
        sub({ id: 3, name: 'Hulu', status: 'cancelled' }),
      ],
      today,
    );
    expect(list.active.map((i) => i.subscription.name)).toEqual(['Adobe']);
    expect(list.cancelled.map((s) => s.name)).toEqual(['Hulu', 'Spotify']);
  });
});

describe('describeDaysUntil', () => {
  it.each([
    [0, 'today'],
    [1, 'tomorrow'],
    [9, 'in 9 days'],
  ])('%i -> %s', (days, text) => {
    expect(describeDaysUntil(days)).toBe(text);
  });
});

describe('validateSubscriptionInput', () => {
  const good = {
    name: '  Adobe  ',
    renewalDate: '2026-11-22',
    cycleUnit: 'month' as const,
    cycleCountText: '1',
    isTrial: true,
  };

  it('accepts good input and trims the name', () => {
    expect(validateSubscriptionInput(good)).toEqual({
      ok: true,
      value: { name: 'Adobe', renewalDate: '2026-11-22', cycle: { unit: 'month', count: 1 }, isTrial: true },
    });
  });

  it('requires a name', () => {
    const result = validateSubscriptionInput({ ...good, name: '   ' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.name).toBeTruthy();
  });

  it('rejects a name that is too long', () => {
    const result = validateSubscriptionInput({ ...good, name: 'x'.repeat(101) });
    expect(!result.ok && result.errors.name).toBeTruthy();
  });

  it.each(['', '0', '-1', '1.5', 'abc', '1000'])('rejects cycle count "%s"', (cycleCountText) => {
    const result = validateSubscriptionInput({ ...good, cycleCountText });
    expect(!result.ok && result.errors.cycleCount).toBeTruthy();
  });

  it('rejects an invalid date', () => {
    const result = validateSubscriptionInput({ ...good, renewalDate: '2026-02-30' });
    expect(!result.ok && result.errors.renewalDate).toBeTruthy();
  });
});
