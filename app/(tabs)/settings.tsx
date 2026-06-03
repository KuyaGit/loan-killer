import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Type } from '@/constants/theme';
import {
  exportToJSON,
  getAppLockEnabled,
  getDashboardStats,
  importFromJSON,
  setAppLockEnabled,
} from '@/services/database';
import { authenticate, isAuthAvailable } from '@/services/app-lock';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { ExportBundle } from '@/types/loan';

interface SettingsRowProps {
  iconName: React.ComponentProps<typeof IconSymbol>['name'];
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'default' | 'danger';
}

function SettingsRow({ iconName, title, description, actionLabel, onPress, loading, variant = 'default' }: SettingsRowProps) {
  const muted = useThemeColor({}, 'muted');
  const primary = useThemeColor({}, 'primary');

  return (
    <Card style={styles.row}>
      <View style={styles.rowIcon}>
        <IconSymbol name={iconName} size={20} color={primary} />
      </View>
      <View style={styles.rowContent}>
        <ThemedText style={styles.rowTitle}>{title}</ThemedText>
        <ThemedText style={[styles.rowDesc, { color: muted }]}>{description}</ThemedText>
        <View style={styles.rowButton}>
          <PrimaryButton
            label={loading ? '…' : actionLabel}
            onPress={onPress}
            loading={loading}
            variant={variant === 'danger' ? 'danger-outline' : 'outline'}
          />
        </View>
      </View>
    </Card>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lockToggling, setLockToggling] = useState(false);

  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const success = useThemeColor({}, 'success');
  const primary = useThemeColor({}, 'primary');

  const { data: stats } = useLiveQuery(getDashboardStats);
  const { data: appLockEnabled = false } = useLiveQuery(getAppLockEnabled);

  async function handleAppLockToggle(nextValue: boolean) {
    if (lockToggling) return;

    // Check device has authentication set up before enabling
    if (nextValue) {
      const available = await isAuthAvailable();
      if (!available) {
        Alert.alert(
          'Device Security Required',
          'To enable App Lock, please set up Face ID, fingerprint, or a passcode in your device settings first.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setLockToggling(true);
    const prompt = nextValue ? 'Confirm to enable App Lock' : 'Confirm to disable App Lock';
    const success = await authenticate(prompt);
    if (success) {
      await setAppLockEnabled(db, nextValue);
    }
    setLockToggling(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const bundle = await exportToJSON(db);
      const filename = `loan-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const file = new File(Paths.cache, filename);
      file.create();
      file.write(JSON.stringify(bundle, null, 2));
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Sharing not available', 'This device does not support file sharing.'); return; }
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export Loan Logs Backup' });
    } catch (e) {
      Alert.alert('Export Failed', String(e instanceof Error ? e.message : e));
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      let json: string;
      try { json = await new File(asset.uri).text(); } catch { Alert.alert('Import Failed', 'Could not read the selected file.'); return; }
      let bundle: ExportBundle;
      try { bundle = JSON.parse(json) as ExportBundle; } catch { Alert.alert('Import Failed', 'The selected file is not valid JSON.'); return; }

      Alert.alert('Import Backup', 'How would you like to import this backup?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge (keep existing)',
          onPress: async () => {
            setImporting(true);
            try { await importFromJSON(db, bundle, 'merge'); Alert.alert('Import Successful', 'Loans have been merged.'); }
            catch (e) { Alert.alert('Import Failed', String(e instanceof Error ? e.message : e)); }
            finally { setImporting(false); }
          },
        },
        {
          text: 'Replace All', style: 'destructive',
          onPress: () => Alert.alert('Replace All Data?', 'This will delete ALL your current loans and replace them with the backup. This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace', style: 'destructive',
              onPress: async () => {
                setImporting(true);
                try { await importFromJSON(db, bundle, 'replace'); Alert.alert('Import Successful', 'All data replaced with backup.'); }
                catch (e) { Alert.alert('Import Failed', String(e instanceof Error ? e.message : e)); }
                finally { setImporting(false); }
              },
            },
          ]),
        },
      ]);
    } catch (e) {
      Alert.alert('Import Failed', String(e instanceof Error ? e.message : e));
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Settings" />

        {/* Data Summary */}
        {stats && (
          <Card style={styles.summaryCard}>
            <ThemedText style={styles.sectionTitle}>Data Summary</ThemedText>
            <View style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: muted }]}>Total Loans</ThemedText>
              <ThemedText style={styles.summaryValue}>{stats.totalLoans}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: muted }]}>Active</ThemedText>
              <ThemedText style={styles.summaryValue}>{stats.activeLoans}</ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: muted }]}>Completed</ThemedText>
              <ThemedText style={[styles.summaryValue, stats.completedLoans > 0 ? { color: success } : undefined]}>
                {stats.completedLoans}
              </ThemedText>
            </View>
            <ThemedText style={[styles.dbNote, { color: muted }]}>
              Database: loanlogs.db · Offline only · All data stored locally
            </ThemedText>
          </Card>
        )}

        {/* Backup & Restore */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: muted }]}>Backup &amp; Restore</ThemedText>
          <SettingsRow
            iconName="square.and.arrow.up"
            title="Export Backup"
            description="Save all your loans and payment history as a JSON file."
            actionLabel="Export"
            onPress={handleExport}
            loading={exporting}
          />
          <SettingsRow
            iconName="square.and.arrow.down"
            title="Import Backup"
            description="Restore loans from a previously exported JSON file. You can merge or replace existing data."
            actionLabel="Import"
            onPress={handleImport}
            loading={importing}
          />
        </View>

        {/* Security */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: muted }]}>Security</ThemedText>
          <Card style={styles.row}>
            <View style={styles.rowIcon}>
              <IconSymbol name="faceid" size={20} color={primary} />
            </View>
            <View style={[styles.rowContent, styles.rowContentRow]}>
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>App Lock</ThemedText>
                <ThemedText style={[styles.rowDesc, { color: muted }]}>
                  Require Face ID, fingerprint, or device PIN to open the app.
                </ThemedText>
              </View>
              <Switch
                value={appLockEnabled}
                onValueChange={handleAppLockToggle}
                disabled={lockToggling}
                trackColor={{ false: muted + '44', true: primary }}
                thumbColor="#ffffff"
              />
            </View>
          </Card>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: muted }]}>Appearance</ThemedText>
          <Card>
            <View style={styles.infoRow}>
              <IconSymbol name="gearshape.fill" size={18} color={muted} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <ThemedText style={styles.rowTitle}>Dark Mode</ThemedText>
                <ThemedText style={[styles.rowDesc, { color: muted }]}>
                  Loan Logs follows your device&apos;s system appearance. Change it in Settings → Display &amp; Brightness.
                </ThemedText>
              </View>
            </View>
          </Card>
        </View>

        {/* About */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: muted }]}>About</ThemedText>
          <Card>
            <View style={styles.infoRow}>
              <IconSymbol name="info.circle.fill" size={18} color={muted} style={styles.infoIcon} />
              <View style={styles.infoContent}>
                <ThemedText style={styles.rowTitle}>Loan Logs</ThemedText>
                <ThemedText style={[styles.rowDesc, { color: muted }]}>
                  An offline-first personal loan tracker. All data is stored locally on your device using SQLite — no accounts, no servers, no internet required.
                </ThemedText>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 48 },
  summaryCard: { marginHorizontal: Spacing.lg, marginTop: Spacing.xs, gap: Spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...Type.body },
  summaryValue: { ...Type.bodyStrong },
  dbNote: { ...Type.caption, marginTop: Spacing.xs },
  section: { marginTop: Spacing.xxl, gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  sectionTitle: { ...Type.sectionLabel, marginBottom: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  rowIcon: { paddingTop: 2 },
  rowContent: { flex: 1, gap: Spacing.sm },
  rowContentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowText: { flex: 1, gap: Spacing.xs },
  rowTitle: { ...Type.bodyStrong },
  rowDesc: { ...Type.caption, lineHeight: 18 },
  rowButton: { alignSelf: 'flex-start' },
  infoRow: { flexDirection: 'row', gap: Spacing.md },
  infoIcon: { marginTop: 2 },
  infoContent: { flex: 1, gap: Spacing.xs },
});
