import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { parseCalendarDate, toCalendarDate } from '../logic/dates';
import {
  CYCLE_UNITS,
  MAX_NAME_LENGTH,
  type SubscriptionFormErrors,
  validateSubscriptionInput,
} from '../logic/subscriptionList';
import {
  deleteSubscription,
  getSubscription,
  insertSubscription,
  setSubscriptionStatus,
  updateSubscription,
} from '../storage/subscriptions';
import type { CalendarDate, CycleUnit, SubscriptionStatus } from '../types/subscription';

const UNIT_LABELS: Record<CycleUnit, string> = { day: 'Day', week: 'Week', month: 'Month', year: 'Year' };

/** Date object for the picker: noon local time, so no time-zone edge can move it to another day. */
function calendarDateToPickerValue(date: CalendarDate): Date {
  const { year, month, day } = parseCalendarDate(date);
  return new Date(year, month - 1, day, 12);
}

function formatLongDate(date: CalendarDate): string {
  return calendarDateToPickerValue(date).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function EditSubscriptionScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;

  const [isLoading, setIsLoading] = useState(editingId !== null);
  const [name, setName] = useState('');
  const [renewalDate, setRenewalDate] = useState<CalendarDate>(() => toCalendarDate(new Date()));
  const [cycleUnit, setCycleUnit] = useState<CycleUnit>('month');
  const [cycleCountText, setCycleCountText] = useState('1');
  const [isTrial, setIsTrial] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [errors, setErrors] = useState<SubscriptionFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // When editing, fill the form with the saved values.
  useEffect(() => {
    if (editingId === null) return;
    let isCurrent = true;
    getSubscription(db, editingId)
      .then((subscription) => {
        if (!isCurrent) return;
        if (!subscription) {
          Alert.alert('Not found', 'This subscription no longer exists.');
          router.back();
          return;
        }
        setName(subscription.name);
        setRenewalDate(subscription.renewalDate);
        setCycleUnit(subscription.cycle.unit);
        setCycleCountText(String(subscription.cycle.count));
        setIsTrial(subscription.isTrial);
        setStatus(subscription.status);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (isCurrent) showError(error);
      });
    return () => {
      isCurrent = false;
    };
  }, [db, editingId, router]);

  function showError(error: unknown) {
    Alert.alert('Something went wrong', error instanceof Error ? error.message : String(error));
  }

  function openAndroidDatePicker() {
    // Android shows the picker as a dialog; the library recommends this imperative API for it.
    DateTimePickerAndroid.open({
      value: calendarDateToPickerValue(renewalDate),
      mode: 'date',
      onValueChange: (_event, date) => setRenewalDate(toCalendarDate(date)),
    });
  }

  async function handleSave() {
    const result = validateSubscriptionInput({ name, renewalDate, cycleUnit, cycleCountText, isTrial });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setIsSaving(true);
    try {
      if (editingId === null) {
        await insertSubscription(db, result.value);
      } else {
        await updateSubscription(db, editingId, result.value);
      }
      router.back();
    } catch (error) {
      showError(error);
      setIsSaving(false);
    }
  }

  async function handleToggleCancelled() {
    if (editingId === null) return;
    const newStatus: SubscriptionStatus = status === 'active' ? 'cancelled' : 'active';
    try {
      await setSubscriptionStatus(db, editingId, newStatus);
      router.back();
    } catch (error) {
      showError(error);
    }
  }

  function handleDelete() {
    if (editingId === null) return;
    Alert.alert('Delete subscription?', `"${name}" will be removed. This can't be undone.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubscription(db, editingId);
            router.back();
          } catch (error) {
            showError(error);
          }
        },
      },
    ]);
  }

  const title = editingId === null ? 'Add subscription' : 'Edit subscription';

  if (isLoading) {
    return <Stack.Screen options={{ title }} />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title }} />

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Adobe"
        maxLength={MAX_NAME_LENGTH}
        autoFocus={editingId === null}
        returnKeyType="done"
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

      <Text style={styles.label}>{isTrial ? 'Trial ends on' : 'Next renewal date'}</Text>
      {Platform.OS === 'android' ? (
        <Pressable style={styles.input} onPress={openAndroidDatePicker} accessibilityRole="button">
          <Text style={styles.inputText}>{formatLongDate(renewalDate)}</Text>
        </Pressable>
      ) : (
        <View style={styles.iosPickerRow}>
          <DateTimePicker
            value={calendarDateToPickerValue(renewalDate)}
            mode="date"
            display="compact"
            onValueChange={(_event, date) => setRenewalDate(toCalendarDate(date))}
          />
        </View>
      )}
      {errors.renewalDate && <Text style={styles.errorText}>{errors.renewalDate}</Text>}

      <Text style={styles.label}>Repeats every</Text>
      <View style={styles.cycleRow}>
        <TextInput
          style={[styles.input, styles.countInput, errors.cycleCount && styles.inputError]}
          value={cycleCountText}
          onChangeText={setCycleCountText}
          keyboardType="number-pad"
          maxLength={3}
          accessibilityLabel="Repeat count"
        />
        <View style={styles.segmented}>
          {CYCLE_UNITS.map((unit) => (
            <Pressable
              key={unit}
              style={[styles.segment, cycleUnit === unit && styles.segmentSelected]}
              onPress={() => setCycleUnit(unit)}
              accessibilityRole="button"
              accessibilityState={{ selected: cycleUnit === unit }}
            >
              <Text style={[styles.segmentText, cycleUnit === unit && styles.segmentTextSelected]}>
                {UNIT_LABELS[unit]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {errors.cycleCount && <Text style={styles.errorText}>{errors.cycleCount}</Text>}

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Free trial</Text>
        <Switch value={isTrial} onValueChange={setIsTrial} />
      </View>

      <Pressable
        style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Save</Text>
      </Pressable>

      {editingId !== null && (
        <>
          <Pressable style={styles.secondaryButton} onPress={handleToggleCancelled} accessibilityRole="button">
            <Text style={styles.secondaryButtonText}>
              {status === 'active' ? 'Mark as cancelled' : 'Reactivate'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleDelete} accessibilityRole="button">
            <Text style={[styles.secondaryButtonText, styles.deleteText]}>Delete</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 48 },
  label: { marginTop: 16, marginBottom: 6, fontSize: 14, fontWeight: '600', color: '#444' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111',
    justifyContent: 'center',
  },
  inputText: { fontSize: 16, color: '#111' },
  inputError: { borderColor: '#b00020' },
  errorText: { marginTop: 4, fontSize: 13, color: '#b00020' },
  iosPickerRow: { alignItems: 'flex-start' },
  cycleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countInput: { width: 60, textAlign: 'center' },
  segmented: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: '#0a66c2', borderRadius: 8, overflow: 'hidden' },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentSelected: { backgroundColor: '#0a66c2' },
  segmentText: { fontSize: 14, color: '#0a66c2' },
  segmentTextSelected: { color: '#fff', fontWeight: '600' },
  switchRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 16, color: '#111' },
  primaryButton: { marginTop: 28, backgroundColor: '#0a66c2', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  secondaryButton: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  secondaryButtonText: { fontSize: 16, color: '#0a66c2' },
  deleteText: { color: '#b00020' },
});
