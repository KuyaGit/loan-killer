import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Type } from '@/constants/theme';
import { formatDate, formatPeso } from '@/constants/format';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { LoanMonth } from '@/types/loan';

interface MonthlyItemCheckboxProps {
  month: LoanMonth;
  disabled?: boolean;
  onToggle: (monthId: string, paid: boolean) => void;
  /** Called when the user taps the edit-amount pencil button. Omit to hide the button. */
  onEditAmount?: () => void;
}

export function MonthlyItemCheckbox({
  month,
  disabled = false,
  onToggle,
  onEditAmount,
}: MonthlyItemCheckboxProps) {
  const success = useThemeColor({}, 'success');
  const pending = useThemeColor({}, 'pending');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');

  const checkColor = month.isPaid ? success : pending;

  return (
    <View style={[styles.container, { borderBottomColor: border }]}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <ThemedText style={styles.monthLabel}>Month {month.monthNumber}</ThemedText>
          <ThemedText style={[styles.amount, { color: month.isPaid ? success : undefined }]}>
            {formatPeso(month.amount)}
          </ThemedText>
        </View>
        <ThemedText style={[styles.statusText, { color: month.isPaid ? success : muted }]}>
          {month.isPaid ? `Paid · ${formatDate(month.paidDate)}` : 'Pending'}
        </ThemedText>
      </View>

      {/* Edit-amount button (active loans only) */}
      {!disabled && onEditAmount && (
        <Pressable
          onPress={onEditAmount}
          style={({ pressed }) => [styles.editButton, pressed && styles.checkPressed]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Edit amount for Month ${month.monthNumber}`}>
          <IconSymbol name="pencil" size={16} color={muted} />
        </Pressable>
      )}

      {/* Paid-check button — always visible; disabled on completed loans */}
      <Pressable
        style={({ pressed }) => [styles.checkButton, pressed && !disabled && styles.checkPressed]}
        onPress={() => !disabled && onToggle(month.id, !month.isPaid)}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: month.isPaid, disabled }}
        accessibilityLabel={`Month ${month.monthNumber} payment of ${formatPeso(month.amount)}, ${month.isPaid ? 'paid' : 'pending'}`}>
        <IconSymbol
          name={month.isPaid ? 'checkmark.circle.fill' : 'circle'}
          size={26}
          color={checkColor}
        />
      </Pressable>

      {/* Lock icon for completed-loan unpaid rows */}
      {disabled && !month.isPaid && (
        <IconSymbol name="lock.fill" size={14} color={muted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkButton: {
    padding: 2,
  },
  checkPressed: {
    opacity: 0.7,
  },
  editButton: {
    padding: 2,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthLabel: {
    ...Type.bodyStrong,
    fontSize: 15,
  },
  amount: {
    ...Type.bodyStrong,
    fontSize: 15,
  },
  statusText: {
    ...Type.caption,
  },
});
