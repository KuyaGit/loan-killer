import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { formatPercent, formatPeso } from '@/constants/format';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { Loan } from '@/types/loan';

interface LoanCardProps {
  loan: Loan;
  onPress: () => void;
  onLongPress?: () => void;
}

export function LoanCard({ loan, onPress, onLongPress }: LoanCardProps) {
  const success = useThemeColor({}, 'success');
  const muted = useThemeColor({}, 'muted');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');

  const isCompleted = loan.status === 'completed';
  const progressColor = isCompleted ? success : primary;
  const badgeBg = isCompleted ? success + '22' : primaryMuted;
  const badgeText = isCompleted ? success : primary;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Card variant="elevated" style={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {loan.name}
          </ThemedText>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <ThemedText style={[styles.badgeText, { color: badgeText }]}>
              {isCompleted ? 'Completed' : 'Active'}
            </ThemedText>
          </View>
        </View>

        {/* Amounts */}
        <View style={styles.amountsRow}>
          <View style={styles.amountItem}>
            <ThemedText style={[styles.amountLabel, { color: muted }]}>Original</ThemedText>
            <ThemedText style={styles.amountValue}>{formatPeso(loan.originalAmount)}</ThemedText>
          </View>
          <View style={styles.amountItem}>
            <ThemedText style={[styles.amountLabel, { color: muted }]}>Remaining</ThemedText>
            <ThemedText style={[styles.amountValue, { color: isCompleted ? success : undefined }]}>
              {formatPeso(loan.remainingBalance)}
            </ThemedText>
          </View>
          <View style={styles.amountItem}>
            <ThemedText style={[styles.amountLabel, { color: muted }]}>Monthly</ThemedText>
            <ThemedText style={styles.amountValue}>{formatPeso(loan.monthlyPayment)}</ThemedText>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <ThemedText style={[styles.progressLabel, { color: muted }]}>
              {loan.paidMonths} / {loan.totalMonths} months paid
            </ThemedText>
            <ThemedText style={[styles.progressPct, { color: progressColor }]}>
              {formatPercent(loan.progress)}
            </ThemedText>
          </View>
          <ProgressBar value={loan.progress} height={6} color={progressColor} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs + 2,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  card: {
    gap: Spacing.md,
    // Override card padding to tighten slightly
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: {
    ...Type.bodyStrong,
    fontSize: 16,
    flex: 1,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  amountItem: {
    flex: 1,
    gap: 2,
  },
  amountLabel: {
    ...Type.caption,
  },
  amountValue: {
    ...Type.bodyStrong,
    fontSize: 14,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...Type.caption,
  },
  progressPct: {
    ...Type.caption,
    fontWeight: '700',
  },
});
