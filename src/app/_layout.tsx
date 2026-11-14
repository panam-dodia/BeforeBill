import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DATABASE_NAME, migrateDatabase } from '../storage/db';

// Root of the app: opens the database (running any schema upgrades first),
// then shows the screens. Every file in src/app/ is a screen.
export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Before Bill' }} />
        <Stack.Screen name="edit" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </SQLiteProvider>
  );
}
