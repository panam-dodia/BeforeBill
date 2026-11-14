// Save/load subscriptions. All user values go in as `?` parameters (never pasted into
// the SQL text), which prevents SQL injection.

import type { SQLiteDatabase } from 'expo-sqlite';

import type { CycleUnit, Subscription, SubscriptionStatus } from '../types/subscription';
import type { ValidSubscriptionInput } from '../logic/subscriptionList';

interface SubscriptionRow {
  id: number;
  name: string;
  renewal_date: string;
  cycle_unit: string;
  cycle_count: number;
  is_trial: number;
  status: string;
}

const CYCLE_UNITS: readonly string[] = ['day', 'week', 'month', 'year'];
const STATUSES: readonly string[] = ['active', 'cancelled'];

function rowToSubscription(row: SubscriptionRow): Subscription {
  // The table's CHECK constraints should make these impossible; failing loudly beats
  // silently showing wrong data.
  if (!CYCLE_UNITS.includes(row.cycle_unit) || !STATUSES.includes(row.status)) {
    throw new Error(`Subscription ${row.id} has invalid stored data`);
  }
  return {
    id: row.id,
    name: row.name,
    renewalDate: row.renewal_date,
    cycle: { unit: row.cycle_unit as CycleUnit, count: row.cycle_count },
    isTrial: row.is_trial === 1,
    status: row.status as SubscriptionStatus,
  };
}

export async function listSubscriptions(db: SQLiteDatabase): Promise<Subscription[]> {
  const rows = await db.getAllAsync<SubscriptionRow>('SELECT * FROM subscriptions');
  return rows.map(rowToSubscription);
}

export async function getSubscription(db: SQLiteDatabase, id: number): Promise<Subscription | null> {
  const row = await db.getFirstAsync<SubscriptionRow>('SELECT * FROM subscriptions WHERE id = ?', id);
  return row ? rowToSubscription(row) : null;
}

/** Returns the new subscription's id. */
export async function insertSubscription(db: SQLiteDatabase, input: ValidSubscriptionInput): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO subscriptions (name, renewal_date, cycle_unit, cycle_count, is_trial) VALUES (?, ?, ?, ?, ?)',
    input.name,
    input.renewalDate,
    input.cycle.unit,
    input.cycle.count,
    input.isTrial ? 1 : 0,
  );
  return result.lastInsertRowId;
}

export async function updateSubscription(
  db: SQLiteDatabase,
  id: number,
  input: ValidSubscriptionInput,
): Promise<void> {
  await db.runAsync(
    'UPDATE subscriptions SET name = ?, renewal_date = ?, cycle_unit = ?, cycle_count = ?, is_trial = ? WHERE id = ?',
    input.name,
    input.renewalDate,
    input.cycle.unit,
    input.cycle.count,
    input.isTrial ? 1 : 0,
    id,
  );
}

export async function setSubscriptionStatus(
  db: SQLiteDatabase,
  id: number,
  status: SubscriptionStatus,
): Promise<void> {
  await db.runAsync('UPDATE subscriptions SET status = ? WHERE id = ?', status, id);
}

export async function deleteSubscription(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM subscriptions WHERE id = ?', id);
}
