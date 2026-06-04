import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_TERM_MONTHS } from '@/constants/database';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

const DEFAULT_PRESETS = [6, 12, 24, 36, 48, 60];

interface TermChipsProps {
  /** Currently selected term in months, or null when unset */
  value: number | null;
  onChange: (months: number) => void;
  max?: number;
  presets?: number[];
  /** When true, the custom text input renders with a danger border */
  error?: boolean;
}

type Mode = 'preset' | 'custom';

function seedMode(value: number | null, presets: number[]): Mode {
  if (value !== null && !presets.includes(value)) return 'custom';
  return 'preset';
}

export function TermChips({
  value,
  onChange,
  max = MAX_TERM_MONTHS,
  presets = DEFAULT_PRESETS,
  error = false,
}: TermChipsProps) {
  const [mode, setMode] = useState<Mode>(() => seedMode(value, presets));
  const [customText, setCustomText] = useState(
    value !== null && !presets.includes(value) ? String(value) : ''
  );
  const customInputRef = useRef<TextInput>(null);

  // When external value changes to a preset, switch mode back to preset
  useEffect(() => {
    if (value !== null && presets.includes(value)) {
      setMode('preset');
    }
  }, [value, presets]);

  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const danger = useThemeColor({}, 'danger');

  function handlePresetPress(months: number) {
    setMode('preset');
    setCustomText('');
    onChange(months);
  }

  function handleCustomPress() {
    setMode('custom');
    // Seed custom text from current value if it's not a preset
    if (value !== null && !presets.includes(value)) {
      setCustomText(String(value));
    }
    // Focus after state update
    setTimeout(() => customInputRef.current?.focus(), 50);
  }

  function handleCustomChange(raw: string) {
    // Strip non-digits
    const digits = raw.replace(/[^0-9]/g, '');
    setCustomText(digits);
    const parsed = parseInt(digits, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= max) {
      onChange(parsed);
    }
  }

  const allChips = [...presets, 'custom' as const];

  return (
    <View style={styles.container}>
      {/* Chip row */}
      <View style={styles.chipRow}>
        {allChips.map((item) => {
          const isCustomChip = item === 'custom';
          const isSelected = isCustomChip
            ? mode === 'custom'
            : mode === 'preset' && value === item;

          return (
            <Pressable
              key={String(item)}
              onPress={() => (isCustomChip ? handleCustomPress() : handlePresetPress(item as number))}
              style={({ pressed }) => [
                styles.chip,
                isSelected
                  ? { backgroundColor: primaryMuted, borderWidth: 1.5, borderColor: primary }
                  : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: border },
                pressed && styles.chipPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={isCustomChip ? 'Custom terms' : `${item} months`}>
              {isSelected && (
                <IconSymbol name="checkmark.circle.fill" size={15} color={primary} />
              )}
              <Text
                style={[
                  styles.chipLabel,
                  { color: isSelected ? primary : text },
                  isSelected && styles.chipLabelSelected,
                ]}>
                {isCustomChip ? 'Custom' : `${item}m`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Custom text input — shown only in custom mode */}
      {mode === 'custom' && (
        <View style={styles.customContainer}>
          <TextInput
            ref={customInputRef}
            value={customText}
            onChangeText={handleCustomChange}
            placeholder={`1 – ${max}`}
            placeholderTextColor={muted}
            keyboardType="number-pad"
            maxLength={2}
            style={[
              styles.customInput,
              {
                backgroundColor: card,
                borderColor: error ? danger : border,
                color: text,
              },
            ]}
            accessibilityLabel={`Custom terms, enter 1 to ${max}`}
          />
          <Text style={[styles.helperText, { color: muted }]}>
            Max {max} months (5 years). Monthly payment is auto-computed.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 2,   // 10
    paddingHorizontal: Spacing.lg,      // 16
    borderRadius: Radius.pill,
    minHeight: 40,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipLabel: {
    ...Type.bodyStrong,
  },
  chipLabelSelected: {
    fontWeight: '700',
  },
  customContainer: {
    gap: Spacing.xs,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md - 1,   // 11
    fontSize: 15,
    alignSelf: 'stretch',
  },
  helperText: {
    ...Type.caption,
  },
});
