import { Link, Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { parseCalendarDate, toCalendarDate } from '../logic/dates';
import { buildSubscriptionList, describeDaysUntil } from '../logic/subscriptionList';
import { listSubscriptions } from '../storage/subscriptions';
import type { CalendarDate, Subscription } from '../types/subscription';

/** "Sun, 22 Nov" in the phone's language. Built from local parts so it can't shift a day. */
function formatRenewalDate(date: CalendarDate): string {
  const { year, month, day } = parseCalendarDate(date);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

type Row =
  | { kind: 'active'; subscription: Subscription; nextRenewal: CalendarDate; daysUntil: number; isTrialEnding: boolean }
  | { kind: 'cancelled'; subscription: Subscription };

export default function HomeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reload every time this screen comes back into view (e.g. after saving in the form).
  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      listSubscriptions(db)
        .then((rows) => {
          if (isCurrent) {
            setSubscriptions(rows);
            setLoadError(null);
          }
        })
        .catch((error: unknown) => {
          if (isCurrent) setLoadError(error instanceof Error ? error.message : String(error));
        });
      return () => {
        isCurrent = false;
      };
    }, [db]),
  );

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Link href="/edit" asChild>
            <Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel="Add subscription">
              <Text style={styles.addButton}>+ Add</Text>
            </Pressable>
          </Link>
        ),
      }}
    />
  );

  if (loadError) {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={styles.errorText}>Couldn't load subscriptions: {loadError}</Text>
      </View>
    );
  }

  if (subscriptions === null) {
    return <View style={styles.centered}>{header}</View>;
  }

  if (subscriptions.length === 0) {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={styles.emptyText}>No subscriptions yet.{'\n'}Tap + Add to add one.</Text>
      </View>
    );
  }

  const { active, cancelled } = buildSubscriptionList(subscriptions, toCalendarDate(new Date()));
  const sections: { title: string | null; data: Row[] }[] = [
    { title: null, data: active.map((item) => ({ kind: 'active' as const, ...item })) },
  ];
  if (cancelled.length > 0) {
    sections.push({
      title: 'Cancelled',
      data: cancelled.map((subscription) => ({ kind: 'cancelled' as const, subscription })),
    });
  }

  return (
    <>
      {header}
      <SectionList
        sections={sections}
        keyExtractor={(row) => String(row.subscription.id)}
        renderSectionHeader={({ section }) =>
          section.title ? <Text style={styles.sectionHeader}>{section.title}</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: '/edit', params: { id: String(item.subscription.id) } })}
          >
            {item.kind === 'active' ? (
              <>
                <View style={styles.rowLeft}>
                  <Text style={styles.name}>{item.subscription.name}</Text>
                  {item.isTrialEnding && <Text style={styles.trialBadge}>Free trial</Text>}
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.renewalText}>
                    {item.isTrialEnding ? 'Trial ends' : 'Renews'} {formatRenewalDate(item.nextRenewal)}
                  </Text>
                  <Text style={[styles.daysText, item.daysUntil <= 7 && styles.daysTextSoon]}>
                    {describeDaysUntil(item.daysUntil)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[styles.name, styles.cancelledName]}>{item.subscription.name}</Text>
            )}
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  errorText: { fontSize: 16, color: '#b00020', textAlign: 'center' },
  addButton: { fontSize: 17, color: '#0a66c2', fontWeight: '600' },
  listContent: { paddingBottom: 32, backgroundColor: '#fff', flexGrow: 1 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff' },
  rowLeft: { flex: 1, marginRight: 12 },
  rowRight: { alignItems: 'flex-end' },
  name: { fontSize: 17, fontWeight: '600', color: '#111' },
  cancelledName: { color: '#999', fontWeight: '400' },
  trialBadge: { marginTop: 2, fontSize: 13, color: '#8a5a00' },
  renewalText: { fontSize: 15, color: '#333' },
  daysText: { marginTop: 2, fontSize: 13, color: '#666' },
  daysTextSoon: { color: '#b00020', fontWeight: '600' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#ddd', marginLeft: 16 },
});
