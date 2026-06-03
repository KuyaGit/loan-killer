/**
 * EditAmountModal — lets the user type a new amount for a single schedule month.
 *
 * Uses RN Modal (cross-platform) because Alert.prompt is iOS-only.
 * On Save, validates the amount is a positive number and calls onSave.
 */

import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { formatPeso } from '@/constants/format';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

interface EditAmountModalProps {
  visible: boolean;
  monthNumber: number;
  initialAmount: number;
  onSave: (amount: number) => Promise<void> | void;
  onCancel: () => void;
}

export function EditAmountModal({
  visible,
  monthNumber,
  initialAmount,
  onSave,
  onCancel,
}: EditAmountModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const danger = useThemeColor({}, 'danger');
  const primary = useThemeColor({}, 'primary');

  // Seed the input each time the modal opens with a fresh month
  useEffect(() => {
    if (visible) {
      setValue(String(initialAmount));
      setError('');
      setSaving(false);
    }
  }, [visible, initialAmount]);

  function validate(): number | null {
    const parsed = parseFloat(value.replace(/,/g, ''));
    if (!isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount greater than 0.');
      return null;
    }
    setError('');
    return parsed;
  }

  async function handleSave() {
    const amount = validate();
    if (amount === null) return;
    setSaving(true);
    try {
      await onSave(amount);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent>
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={onCancel} />

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
        pointerEvents="box-none">
        <Card style={styles.sheet}>
          {/* Title */}
          <ThemedText style={styles.title}>
            Edit Month {monthNumber} Amount
          </ThemedText>
          <ThemedText style={[styles.currentAmount, { color: muted }]}>
            Current: {formatPeso(initialAmount)}
          </ThemedText>

          {/* Amount input */}
          <View style={styles.inputWrap}>
            <ThemedText style={[styles.currencySymbol, { color: primary }]}>₱</ThemedText>
            <TextInput
              value={value}
              onChangeText={(t) => { setValue(t); setError(''); }}
              keyboardType="decimal-pad"
              selectTextOnFocus
              style={[
                styles.input,
                {
                  backgroundColor: card,
                  borderColor: error ? danger : border,
                  color: text,
                },
              ]}
              accessibilityLabel={`New amount for Month ${monthNumber}`}
            />
          </View>
          {error ? (
            <ThemedText style={[styles.errorText, { color: danger }]}>{error}</ThemedText>
          ) : null}

          {/* Buttons */}
          <View style={styles.buttons}>
            <View style={styles.buttonItem}>
              <PrimaryButton label="Cancel" onPress={onCancel} variant="outline" disabled={saving} />
            </View>
            <View style={styles.buttonItem}>
              <PrimaryButton label={saving ? 'Saving…' : 'Save'} onPress={handleSave} loading={saving} />
            </View>
          </View>
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  keyboardAvoid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  title: {
    ...Type.cardTitle,
  },
  currentAmount: {
    ...Type.caption,
    marginTop: -Spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  currencySymbol: {
    ...Type.bodyStrong,
    fontSize: 18,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 11,
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    ...Type.caption,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  buttonItem: {
    flex: 1,
  },
});
