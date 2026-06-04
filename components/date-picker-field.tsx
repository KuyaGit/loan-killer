/**
 * DatePickerField — a themed calendar picker for selecting a date (no external library).
 *
 * Renders a pressable trigger that looks identical to the other form inputs, and opens
 * a modal calendar grid styled with the app's emerald design tokens.
 */

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { formatDate } from '@/constants/format';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

// ---------------------------------------------------------------------------
// Types / helpers
// ---------------------------------------------------------------------------

interface DatePickerFieldProps {
  /** ISO date string 'YYYY-MM-DD', or null/empty when no date is selected. */
  value: string | null;
  onChange: (iso: string) => void;
  /** When true the trigger renders with a danger border (matches TermChips convention). */
  error?: boolean;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Return today as a 'YYYY-MM-DD' string in local time. */
function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a 'YYYY-MM-DD' string into { year, month (0-based), day }. Falls back to today. */
function parseIso(iso: string | null): { year: number; month: number; day: number } {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
}

/** Build a 'YYYY-MM-DD' string from { year, month (0-based), day }. */
function buildIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DatePickerField({ value, onChange, error = false }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  // Pending selection inside the modal — committed only on "Done"
  const [pendingIso, setPendingIso] = useState<string>(value || todayIso());

  // Calendar view state (which month is visible)
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // Colors
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');
  const primary = useThemeColor({}, 'primary');
  const onPrimary = useThemeColor({}, 'onPrimary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');

  // Seed pending + view state each time the modal opens
  useEffect(() => {
    if (open) {
      const seed = value || todayIso();
      setPendingIso(seed);
      const { year, month } = parseIso(seed);
      setViewYear(year);
      setViewMonth(month);
    }
  }, [open, value]);

  // ---------------------------------------------------------------------------
  // Month navigation
  // ---------------------------------------------------------------------------

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Day selection
  // ---------------------------------------------------------------------------

  function selectDay(day: number) {
    const iso = buildIso(viewYear, viewMonth, day);
    setPendingIso(iso);
    void Haptics.selectionAsync();
  }

  function handleToday() {
    const iso = todayIso();
    setPendingIso(iso);
    const { year, month } = parseIso(iso);
    setViewYear(year);
    setViewMonth(month);
    void Haptics.selectionAsync();
  }

  function handleDone() {
    onChange(pendingIso);
    setOpen(false);
  }

  function handleCancel() {
    setOpen(false);
  }

  // ---------------------------------------------------------------------------
  // Calendar grid computation
  // ---------------------------------------------------------------------------

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = todayIso();
  const { year: selYear, month: selMonth, day: selDay } = parseIso(pendingIso);

  // Build grid cells: nulls for leading blanks + 1-based day numbers
  const gridCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows of 7
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const displayLabel = value ? formatDate(value) : 'Select a date';

  return (
    <>
      {/* Trigger */}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Start date, ${displayLabel}. Tap to open calendar.`}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: card,
            borderColor: error ? danger : border,
          },
          pressed && styles.triggerPressed,
        ]}>
        <Ionicons name="calendar-outline" size={18} color={value ? primary : muted} />
        <Text
          style={[
            styles.triggerLabel,
            { color: value ? text : muted },
          ]}>
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color={muted} />
      </Pressable>

      {/* Calendar modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
        statusBarTranslucent>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleCancel} />

        {/* Sheet */}
        <View style={styles.sheetWrapper} pointerEvents="box-none">
          <Card style={[styles.sheet, { backgroundColor: card }]}>

            {/* Month navigation header */}
            <View style={styles.calHeader}>
              <Pressable
                onPress={prevMonth}
                hitSlop={8}
                accessibilityLabel="Previous month"
                style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}>
                <Ionicons name="chevron-back" size={20} color={text} />
              </Pressable>

              <Text style={[styles.monthTitle, { color: text }]}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>

              <Pressable
                onPress={nextMonth}
                hitSlop={8}
                accessibilityLabel="Next month"
                style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}>
                <Ionicons name="chevron-forward" size={20} color={text} />
              </Pressable>
            </View>

            {/* Weekday labels */}
            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={[styles.weekdayLabel, { color: muted }]}>
                  {label}
                </Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {gridCells.map((day, idx) => {
                if (day === null) {
                  return <View key={`blank-${idx}`} style={styles.dayCell} />;
                }

                const iso = buildIso(viewYear, viewMonth, day);
                const isSelected =
                  selYear === viewYear && selMonth === viewMonth && selDay === day;
                const isToday = iso === today;

                return (
                  <Pressable
                    key={iso}
                    onPress={() => selectDay(day)}
                    accessibilityLabel={`${day} ${MONTH_NAMES[viewMonth]} ${viewYear}${isToday ? ', today' : ''}`}
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.dayCell,
                      styles.dayPressable,
                      isSelected && { backgroundColor: primary },
                      !isSelected && isToday && {
                        borderWidth: 1.5,
                        borderColor: primary,
                      },
                      pressed && !isSelected && { backgroundColor: primaryMuted },
                    ]}>
                    <Text
                      style={[
                        styles.dayLabel,
                        { color: isSelected ? onPrimary : isToday ? primary : text },
                        isSelected && { fontWeight: '700' },
                      ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Footer */}
            <View style={[styles.footerDivider, { backgroundColor: border }]} />
            <View style={styles.footer}>
              {/* Today shortcut */}
              <Pressable
                onPress={handleToday}
                hitSlop={8}
                accessibilityLabel="Jump to today"
                style={({ pressed }) => [styles.todayBtn, pressed && { opacity: 0.6 }]}>
                <Text style={[styles.todayBtnLabel, { color: primary }]}>Today</Text>
              </Pressable>

              {/* Cancel + Done */}
              <View style={styles.footerButtons}>
                <View style={styles.footerBtn}>
                  <PrimaryButton label="Cancel" onPress={handleCancel} variant="outline" />
                </View>
                <View style={styles.footerBtn}>
                  <PrimaryButton label="Done" onPress={handleDone} />
                </View>
              </View>
            </View>

          </Card>
        </View>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  // Trigger
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 11,
  },
  triggerPressed: { opacity: 0.7 },
  triggerLabel: {
    flex: 1,
    ...Type.body,
  },

  // Modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    alignSelf: 'stretch',
    gap: 0,
    padding: Spacing.lg,
  },

  // Calendar header
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navBtn: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  navBtnPressed: { opacity: 0.5 },
  monthTitle: {
    ...Type.cardTitle,
  },

  // Weekday row
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.xs,
  },
  weekdayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    ...Type.caption,
    fontWeight: '600',
  },

  // Day grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 2,
    marginBottom: Spacing.md,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },
  dayPressable: {},
  dayLabel: {
    ...Type.body,
    textAlign: 'center',
  },

  // Footer
  footerDivider: {
    height: 1,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  todayBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  todayBtnLabel: {
    ...Type.bodyStrong,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  footerBtn: {
    minWidth: 80,
  },
});
