// Opens/upgrades the on-device SQLite database.
// The schema version is stored in SQLite's built-in `user_version` number, so each
// future schema change can be applied once, in order, on users' existing databases.

import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'before-bill.db';
const DATABASE_VERSION = 1;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    // CHECK constraints stop bad values getting in even if app code has a bug.
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        renewal_date TEXT NOT NULL,
        cycle_unit TEXT NOT NULL CHECK (cycle_unit IN ('day', 'week', 'month', 'year')),
        cycle_count INTEGER NOT NULL CHECK (cycle_count >= 1),
        is_trial INTEGER NOT NULL DEFAULT 0 CHECK (is_trial IN (0, 1)),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled'))
      );
    `);
    currentVersion = 1;
  }

  // Future changes go here: if (currentVersion === 1) { ...; currentVersion = 2; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
