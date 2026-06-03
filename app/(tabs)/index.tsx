import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ProgressBar } from '@/components/progress-bar';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Type } from '@/constants/theme';
import { formatPercent, formatPeso } from '@/constants/format';
import { getDashboardStats } from '@/services/database';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useThemeColor } from '@/hooks/use-theme-color';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  iconName?: React.ComponentProps<typeof IconSymbol>['name'];
}

function StatCard({ label, value, sub, accent, iconName }: StatCardProps) {
  const primary = useThemeColor({}, 'primary');
  const muted = useThemeColor({}, 'muted');
  const primaryMuted = useThemeColor({}, 'primaryMuted');

  return (
    <Card style={styles.statCard}>
      <View style={styles.statHeader}>
        {iconName && (
          <View style={[styles.statIconBg, { backgroundColor: primaryMuted }]}>
            <IconSymbol name={iconName} size={16} color={primary} />
          </View>
        )}
        <ThemedText style={[styles.statLabel, { color: muted }]}>{label}</ThemedText>
      </View>
      <ThemedText style={[styles.statValue, accent ? { color: accent } : undefined]}>
        {value}
      </ThemedText>
      {sub && <ThemedText style={[styles.statSub, { color: muted }]}>{sub}</ThemedText>}
    </Card>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const background = useThemeColor({}, 'background');
  const success = useThemeColor({}, 'success');
  const muted = useThemeColor({}, 'muted');
  const onPrimary = useThemeColor({}, 'onPrimary');

  const { data: stats, loading } = useLiveQuery(getDashboardStats);

  if (loading && !stats) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: muted }}>Loading…</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || stats.totalLoans === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: background }]}>
        <ScreenHeader title="Dashboard" />
        <EmptyState
          title="No Loans Yet"
          message="Add your first loan to start tracking your payments and balances."
          actionLabel="Add Loan"
          onAction={() => router.push('/(tabs)/add')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Dashboard"
          subtitle={`${stats.activeLoans} active · ${stats.completedLoans} completed`}
        />

        {/* Hero card — solid emerald surface */}
        <Card variant="accent" style={styles.heroCard}>
          <ThemedText style={[styles.heroLabel, { color: onPrimary, opacity: 0.75 }]}>
            Overall Debt Progress
          </ThemedText>
          <ThemedText style={[styles.heroPct, { color: onPrimary }]}>
            {formatPercent(stats.avgProgress)}
          </ThemedText>
          <ProgressBar
            value={stats.avgProgress}
            height={8}
            color={onPrimary}
            trackColor={onPrimary + '33'}
          />
          <View style={styles.heroFooter}>
            <ThemedText style={[styles.heroFooterText, { color: onPrimary, opacity: 0.75 }]}>
              {formatPeso(stats.totalPaid)} paid
            </ThemedText>
            <ThemedText style={[styles.heroFooterText, { color: onPrimary, opacity: 0.75 }]}>
              {formatPeso(stats.totalRemaining)} remaining
            </ThemedText>
          </View>
        </Card>

        {/* Stat grid */}
        <View style={styles.grid}>
          <StatCard
            label="Total Borrowed"
            value={formatPeso(stats.totalBorrowed)}
            iconName="creditcard.fill"
          />
          <StatCard
            label="Remaining Balance"
            value={formatPeso(stats.totalRemaining)}
            accent={stats.totalRemaining === 0 ? success : undefined}
            iconName="chart.pie.fill"
          />
          <StatCard
            label="Monthly Due"
            value={formatPeso(stats.totalMonthlyPayments)}
            sub="active loans"
            iconName="calendar.badge.clock"
          />
          <StatCard
            label="Total Paid"
            value={formatPeso(stats.totalPaid)}
            accent={success}
            iconName="checkmark.seal.fill"
          />
          <StatCard
            label="Active Loans"
            value={String(stats.activeLoans)}
            iconName="list.bullet"
          />
          <StatCard
            label="Completed"
            value={String(stats.completedLoans)}
            accent={stats.completedLoans > 0 ? success : undefined}
            iconName="checkmark.circle.fill"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: Spacing.xxxl },
  heroCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    gap: Spacing.md,
  },
  heroLabel: {
    ...Type.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroPct: {
    ...Type.heroNumber,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  heroFooterText: {
    ...Type.caption,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.sm + 4,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    gap: Spacing.xs,
    padding: Spacing.md + 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    ...Type.sectionLabel,
    flex: 1,
  },
  statValue: {
    ...Type.bodyStrong,
    fontSize: 17,
  },
  statSub: {
    ...Type.caption,
  },
});
