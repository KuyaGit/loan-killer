import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { Card } from '@/components/card';
import { EditAmountModal } from '@/components/edit-amount-modal';
import { MonthlyItemCheckbox } from '@/components/monthly-item-checkbox';
import { PrimaryButton } from '@/components/primary-button';
import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { formatDate, formatPercent, formatPeso } from '@/constants/format';
import { deleteLoan, getLoanById, getLoanMonths, markMonthAsPaid, updateMonthAmount } from '@/services/database';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { LoanMonth } from '@/types/loan';

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();

  const [editingMonth, setEditingMonth] = useState<LoanMonth | null>(null);

  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const success = useThemeColor({}, 'success');
  const border = useThemeColor({}, 'border');

  const { data: loan, loading: loanLoading } = useLiveQuery(
    (db) => getLoanById(db, id),
    [id]
  );
  const { data: months, loading: monthsLoading } = useLiveQuery(
    (db) => getLoanMonths(db, id),
    [id]
  );

  const handleTogglePaid = useCallback(
    async (monthId: string, paid: boolean) => {
      await markMonthAsPaid(db, monthId, paid);
    },
    [db]
  );

  const handleDelete = useCallback(() => {
    if (!loan) return;
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete "${loan.name}"? All payment history will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => { await deleteLoan(db, loan.id); router.back(); },
        },
      ]
    );
  }, [db, loan, router]);

  const handleSaveAmount = useCallback(
    async (amount: number) => {
      if (!editingMonth) return;
      await updateMonthAmount(db, editingMonth.id, amount);
      setEditingMonth(null);
    },
    [db, editingMonth]
  );

  const isCompleted = loan?.status === 'completed';

  const renderItem = useCallback(
    ({ item }: { item: NonNullable<typeof months>[number] }) => (
      <MonthlyItemCheckbox
        month={item}
        disabled={isCompleted}
        onToggle={handleTogglePaid}
        onEditAmount={isCompleted ? undefined : () => setEditingMonth(item)}
      />
    ),
    [isCompleted, handleTogglePaid]
  );

  if (loanLoading && !loan) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: background }]}>
        <View style={styles.center}><ThemedText style={{ color: muted }}>Loading…</ThemedText></View>
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: background }]}>
        <View style={styles.center}>
          <ThemedText style={styles.notFoundTitle}>Loan not found</ThemedText>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={{ color: primary }}>← Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const progressColor = isCompleted ? success : primary;
  const badgeBg = isCompleted ? success + '22' : primaryMuted;
  const badgeTextColor = isCompleted ? success : primary;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['bottom']}>
      <FlatList
        data={months ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews
        ListHeaderComponent={
          <View>
            {/* Summary card */}
            <Card variant="elevated" style={styles.summaryCard}>
              {/* Status badge + completed date */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <ThemedText style={[styles.badgeText, { color: badgeTextColor }]}>
                    {isCompleted ? '✓ Completed' : 'Active'}
                  </ThemedText>
                </View>
                {isCompleted && loan.completedAt && (
                  <ThemedText style={[styles.completedDate, { color: muted }]}>
                    {formatDate(loan.completedAt)}
                  </ThemedText>
                )}
              </View>

              {/* Loan name */}
              <ThemedText style={styles.loanName}>{loan.name}</ThemedText>

              {/* Amounts */}
              <View style={styles.amountsGrid}>
                <View style={styles.amountItem}>
                  <ThemedText style={[styles.amountLabel, { color: muted }]}>Original</ThemedText>
                  <ThemedText style={styles.amountValue}>{formatPeso(loan.originalAmount)}</ThemedText>
                </View>
                <View style={styles.amountItem}>
                  <ThemedText style={[styles.amountLabel, { color: muted }]}>Remaining</ThemedText>
                  <ThemedText style={[styles.amountValue, isCompleted ? { color: success } : undefined]}>
                    {formatPeso(loan.remainingBalance)}
                  </ThemedText>
                </View>
                <View style={styles.amountItem}>
                  <ThemedText style={[styles.amountLabel, { color: muted }]}>Monthly</ThemedText>
                  <ThemedText style={styles.amountValue}>{formatPeso(loan.monthlyPayment)}</ThemedText>
                </View>
                {loan.startDate && (
                  <View style={styles.amountItem}>
                    <ThemedText style={[styles.amountLabel, { color: muted }]}>Start Date</ThemedText>
                    <ThemedText style={styles.amountValue}>{formatDate(loan.startDate)}</ThemedText>
                  </View>
                )}
              </View>

              {/* Progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                  <ThemedText style={[styles.progressMonths, { color: muted }]}>
                    {loan.paidMonths} / {loan.totalMonths} months paid
                  </ThemedText>
                  <ThemedText style={[styles.progressPct, { color: progressColor }]}>
                    {formatPercent(loan.progress)}
                  </ThemedText>
                </View>
                <ProgressBar value={loan.progress} height={10} color={progressColor} />
              </View>

              {/* Notes */}
              {loan.notes ? (
                <View style={[styles.notesContainer, { borderTopColor: border }]}>
                  <ThemedText style={[styles.notesLabel, { color: muted }]}>Notes</ThemedText>
                  <ThemedText style={styles.notesText}>{loan.notes}</ThemedText>
                </View>
              ) : null}
            </Card>

            {/* Completed lock notice */}
            {isCompleted && (
              <View style={[styles.lockNotice, { backgroundColor: success + '15', borderColor: success + '40' }]}>
                <ThemedText style={[styles.lockText, { color: success }]}>
                  🎉 Fully paid! Payment history is locked.
                </ThemedText>
              </View>
            )}

            {/* Schedule header */}
            <View style={styles.scheduleHeader}>
              <ThemedText style={styles.scheduleTitle}>Payment Schedule</ThemedText>
              {monthsLoading && !months && (
                <ThemedText style={[styles.scheduleLoading, { color: muted }]}>Loading…</ThemedText>
              )}
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <PrimaryButton label="Delete Loan" onPress={handleDelete} variant="danger-outline" />
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
      />

      {/* Edit-amount modal — rendered outside FlatList to avoid clipping */}
      {editingMonth && (
        <EditAmountModal
          visible
          monthNumber={editingMonth.monthNumber}
          initialAmount={editingMonth.amount}
          onSave={handleSaveAmount}
          onCancel={() => setEditingMonth(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, padding: Spacing.xxxl },
  notFoundTitle: { ...Type.cardTitle },
  backButton: { marginTop: Spacing.sm },
  summaryCard: { margin: Spacing.lg, gap: Spacing.lg },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.xs, borderRadius: Radius.pill },
  badgeText: { fontSize: 12, fontWeight: '600' },
  completedDate: { ...Type.caption },
  loanName: { ...Type.screenTitle },
  amountsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  amountItem: { minWidth: '45%', gap: 2 },
  amountLabel: { ...Type.sectionLabel },
  amountValue: { ...Type.bodyStrong, fontSize: 16 },
  progressSection: { gap: Spacing.sm },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressMonths: { ...Type.caption },
  progressPct: { fontSize: 20, fontWeight: '700' },
  notesContainer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md, gap: Spacing.xs },
  notesLabel: { ...Type.sectionLabel },
  notesText: { ...Type.body },
  lockNotice: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  lockText: { ...Type.caption, fontWeight: '500' },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, gap: Spacing.sm },
  scheduleTitle: { ...Type.bodyStrong, fontSize: 16 },
  scheduleLoading: { ...Type.caption },
  footer: { padding: Spacing.lg, paddingTop: Spacing.xxl },
});
