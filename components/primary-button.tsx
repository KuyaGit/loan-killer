import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ButtonVariant = 'primary' | 'outline' | 'danger-outline';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const primary = useThemeColor({}, 'primary');
  const onPrimary = useThemeColor({}, 'onPrimary');
  const danger = useThemeColor({}, 'danger');
  const muted = useThemeColor({}, 'muted');

  const isDisabled = disabled || loading;

  const bgColor =
    variant === 'primary' ? primary : 'transparent';

  const textColor =
    variant === 'primary'
      ? onPrimary
      : variant === 'danger-outline'
      ? danger
      : primary;

  const borderColor =
    variant === 'outline'
      ? primary
      : variant === 'danger-outline'
      ? danger
      : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bgColor },
        borderColor ? { borderWidth: 1.5, borderColor } : undefined,
        (pressed || isDisabled) && styles.dimmed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.label, { color: isDisabled && variant === 'primary' ? muted : textColor }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,  // 14
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    ...Type.button,
  },
  dimmed: {
    opacity: 0.6,
  },
});
