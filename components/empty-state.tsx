import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const muted = useThemeColor({}, 'muted');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const primary = useThemeColor({}, 'primary');

  return (
    <View style={styles.container}>
      {/* Icon in a tinted circle */}
      <View style={[styles.iconCircle, { backgroundColor: primaryMuted }]}>
        <IconSymbol name="tray" size={32} color={primary} />
      </View>

      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={[styles.message, { color: muted }]}>{message}</ThemedText>

      {actionLabel && onAction && (
        <View style={styles.buttonContainer}>
          <PrimaryButton label={actionLabel} onPress={onAction} variant="outline" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Type.cardTitle,
    textAlign: 'center',
  },
  message: {
    ...Type.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.xl,
  },
});
