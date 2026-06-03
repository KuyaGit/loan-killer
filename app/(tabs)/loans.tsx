import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { EmptyState } from '@/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LoanCard } from '@/components/loan-card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { deleteLoan, getLoans } from '@/services/database';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { LoanStatus } from '@/types/loan';

type FilterStatus = LoanStatus | 'all';

const FILTER_OPTIONS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

export default function LoansScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const primary = useThemeColor({}, 'primary');
  const onPrimary = useThemeColor({}, 'onPrimary');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');
  const track = useThemeColor({}, 'track');

  const { data: loans, loading } = useLiveQuery(
    (db) => getLoans(db, { search, status: filterStatus }),
    [search, filterStatus]
  );

  const hasLoans = (loans?.length ?? 0) > 0;
  // 'active' is the default view — treat it the same as 'all' for empty-state messaging
  // so a fresh install still shows "No Loans Yet" + Add Loan CTA
  const isFiltered = search.length > 0 || filterStatus === 'completed';

  const handleDelete = useCallback(
    (loanId: string, loanName: string) => {
      Alert.alert(
        'Delete Loan',
        `Are you sure you want to delete "${loanName}"? All payment history will be lost.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteLoan(db, loanId) },
        ]
      );
    },
    [db]
  );

  const renderItem = useCallback(
    ({ item }: { item: NonNullable<typeof loans>[number] }) => (
      <LoanCard
        loan={item}
        onPress={() => router.push(`/loan/${item.id}`)}
        onLongPress={() => handleDelete(item.id, item.name)}
      />
    ),
    [router, handleDelete]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]}>
      <ScreenHeader title="Loans" />

      {/* Search pill */}
      <View style={[styles.searchRow, { backgroundColor: card, borderColor: border }]}>
        <IconSymbol name="magnifyingglass" size={18} color={muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search loans…"
          placeholderTextColor={muted}
          style={[styles.searchInput, { color: text }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Segmented filter pills */}
      <View style={[styles.segmentContainer, { backgroundColor: track }]}>
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filterStatus === opt.key;
          return (
            <Pressable
              key={opt.key}
              style={[
                styles.segmentPill,
                isActive ? { backgroundColor: primary } : undefined,
              ]}
              onPress={() => setFilterStatus(opt.key)}>
              <ThemedText
                style={[
                  styles.segmentLabel,
                  { color: isActive ? onPrimary : muted },
                  isActive && styles.segmentLabelActive,
                ]}>
                {opt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {loading && !loans ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: muted }}>Loading…</ThemedText>
        </View>
      ) : !hasLoans ? (
        <EmptyState
          title={isFiltered ? 'No Results' : 'No Loans Yet'}
          message={
            isFiltered
              ? 'No loans match your search or filter. Try adjusting your criteria.'
              : 'Start tracking your loans by tapping "Add Loan" below.'
          }
          actionLabel={isFiltered ? undefined : 'Add Loan'}
          onAction={isFiltered ? undefined : () => router.push('/(tabs)/add')}
        />
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Type.body,
    paddingVertical: 0,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.pill,
    padding: 4,
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  segmentLabel: {
    ...Type.caption,
    fontWeight: '500',
  },
  segmentLabelActive: {
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
});
