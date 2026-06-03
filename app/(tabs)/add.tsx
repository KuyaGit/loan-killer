import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { TermChips } from '@/components/term-chips';
import { ThemedText } from '@/components/themed-text';
import { MAX_TERM_MONTHS } from '@/constants/database';
import { formatPeso } from '@/constants/format';
import { Radius, Spacing, Type } from '@/constants/theme';
import { createLoan } from '@/services/database';
import { useThemeColor } from '@/hooks/use-theme-color';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function computePreview(
  originalAmount: number,
  termMonths: number
): { monthlyPayment: number; lastPayment: number; termMonths: number } | null {
  if (
    !isFinite(originalAmount) ||
    originalAmount <= 0 ||
    !Number.isInteger(termMonths) ||
    termMonths < 1 ||
    termMonths > MAX_TERM_MONTHS
  )
    return null;
  const amountCents = Math.round(originalAmount * 100);
  if (amountCents < termMonths) return null;
  const monthlyCents = Math.floor(amountCents / termMonths);
  const lastCents = amountCents - monthlyCents * (termMonths - 1);
  return {
    monthlyPayment: Math.round(monthlyCents) / 100,
    lastPayment: Math.round(lastCents) / 100,
    termMonths,
  };
}

interface FieldError {
  name?: string;
  originalAmount?: string;
  termMonths?: string;
  startDate?: string;
}

export default function AddLoanScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [name, setName] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});

  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');

  const parsedAmount = parseFloat(originalAmount.replace(/,/g, ''));
  const parsedTerms = parseInt(termMonths, 10);
  const preview = computePreview(parsedAmount, parsedTerms);

  function validate(): boolean {
    const newErrors: FieldError = {};
    if (!name.trim()) newErrors.name = 'Loan name is required.';
    if (!originalAmount || !isFinite(parsedAmount) || parsedAmount <= 0)
      newErrors.originalAmount = 'Enter a valid loan amount greater than 0.';
    if (!termMonths || !Number.isInteger(parsedTerms) || parsedTerms < 1 || parsedTerms > MAX_TERM_MONTHS)
      newErrors.termMonths = `Enter terms between 1 and ${MAX_TERM_MONTHS} months (max 5 years).`;
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate))
      newErrors.startDate = 'Use YYYY-MM-DD format (e.g. 2026-01-01).';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      await createLoan(db, {
        name: name.trim(),
        originalAmount: parsedAmount,
        termMonths: parsedTerms,
        startDate: startDate || null,
        notes: notes.trim() || null,
      });
      setName(''); setOriginalAmount(''); setTermMonths('');
      setStartDate(today()); setNotes(''); setErrors({});
      router.push('/(tabs)/loans');
    } catch {
      Alert.alert('Error', 'Could not save the loan. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ScreenHeader title="Add Loan" />

          <View style={styles.form}>
            {/* Loan Name */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Loan Name *</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Car Loan, Home Renovation…"
                placeholderTextColor={muted}
                style={[styles.input, { backgroundColor: card, borderColor: errors.name ? danger : border, color: text }]}
              />
              {errors.name && <ThemedText style={[styles.errorText, { color: danger }]}>{errors.name}</ThemedText>}
            </View>

            {/* Total Amount */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Total Loan Amount *</ThemedText>
              <TextInput
                value={originalAmount}
                onChangeText={setOriginalAmount}
                placeholder="e.g. 120000"
                placeholderTextColor={muted}
                keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: card, borderColor: errors.originalAmount ? danger : border, color: text }]}
              />
              {errors.originalAmount && <ThemedText style={[styles.errorText, { color: danger }]}>{errors.originalAmount}</ThemedText>}
            </View>

            {/* Terms — Chip selector */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Terms (months) *</ThemedText>
              <TermChips
                value={Number.isInteger(parsedTerms) ? parsedTerms : null}
                onChange={(m) => setTermMonths(String(m))}
                error={!!errors.termMonths}
              />
              {errors.termMonths && <ThemedText style={[styles.errorText, { color: danger }]}>{errors.termMonths}</ThemedText>}
            </View>

            {/* Start Date */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Start Date</ThemedText>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={muted}
                style={[styles.input, { backgroundColor: card, borderColor: errors.startDate ? danger : border, color: text }]}
              />
              {errors.startDate && <ThemedText style={[styles.errorText, { color: danger }]}>{errors.startDate}</ThemedText>}
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Notes (optional)</ThemedText>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional details…"
                placeholderTextColor={muted}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea, { backgroundColor: card, borderColor: border, color: text }]}
              />
            </View>

            {/* Schedule preview */}
            {preview && (
              <Card style={[styles.preview, { backgroundColor: primaryMuted }]}>
                <ThemedText style={[styles.previewTitle, { color: primary }]}>
                  Schedule Preview
                </ThemedText>

                {/* Monthly headline */}
                <View style={styles.previewHighlight}>
                  <ThemedText style={[styles.previewHL, { color: muted }]}>Monthly Payment</ThemedText>
                  <ThemedText style={[styles.previewHLValue, { color: primary }]}>
                    {formatPeso(preview.monthlyPayment)}
                  </ThemedText>
                </View>

                <View style={[styles.divider, { backgroundColor: primary + '20' }]} />

                <View style={styles.previewRow}>
                  <ThemedText style={[styles.previewLabel, { color: muted }]}>Total months:</ThemedText>
                  <ThemedText style={styles.previewValue}>{preview.termMonths} months</ThemedText>
                </View>
                {preview.termMonths > 1 && (
                  <View style={styles.previewRow}>
                    <ThemedText style={[styles.previewLabel, { color: muted }]}>Months 1–{preview.termMonths - 1}:</ThemedText>
                    <ThemedText style={styles.previewValue}>{formatPeso(preview.monthlyPayment)}/mo</ThemedText>
                  </View>
                )}
                <View style={styles.previewRow}>
                  <ThemedText style={[styles.previewLabel, { color: muted }]}>
                    {preview.termMonths === 1 ? 'Month 1' : `Month ${preview.termMonths} (last)`}:
                  </ThemedText>
                  <ThemedText style={[styles.previewValue, preview.lastPayment !== preview.monthlyPayment ? { color: success } : undefined]}>
                    {formatPeso(preview.lastPayment)}
                  </ThemedText>
                </View>
              </Card>
            )}

            <PrimaryButton label={saving ? 'Saving…' : 'Add Loan'} onPress={handleSave} loading={saving} disabled={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 48 },
  form: { paddingHorizontal: Spacing.lg, gap: Spacing.lg, marginTop: Spacing.xs },
  field: { gap: Spacing.sm },
  label: { ...Type.bodyStrong, fontSize: 14 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 11, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 11 },
  errorText: { ...Type.caption },
  preview: {
    gap: Spacing.sm,
    borderWidth: 0,  // Card handles border; override padding for tighter look
    padding: Spacing.lg,
  },
  previewTitle: { ...Type.bodyStrong, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 },
  previewHighlight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewHL: { ...Type.caption },
  previewHLValue: { ...Type.heroNumber },
  divider: { height: 1, marginVertical: Spacing.xs },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLabel: { ...Type.body },
  previewValue: { ...Type.bodyStrong },
});
