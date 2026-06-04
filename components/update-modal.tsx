/**
 * UpdateModal — shown when a newer version is available on GitHub Releases.
 *
 * Mirrors the structure of EditAmountModal: transparent RN Modal, dim backdrop,
 * Card sheet, ThemedText titles, two PrimaryButtons (Later / Update).
 */

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Type } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

interface UpdateModalProps {
  visible: boolean;
  /** Normalized remote version string, e.g. "1.2.0" */
  version: string;
  /** Called when the user taps "Update" */
  onUpdate: () => void;
  /** Called when the user taps "Later" or the backdrop / Android back */
  onLater: () => void;
}

export function UpdateModal({ visible, version, onUpdate, onLater }: UpdateModalProps) {
  const muted = useThemeColor({}, 'muted');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onLater}
      statusBarTranslucent>
      {/* Dim backdrop — tapping it dismisses like "Later" */}
      <Pressable style={styles.backdrop} onPress={onLater} />

      {/* Centered sheet */}
      <View style={styles.center} pointerEvents="box-none">
        <Card style={styles.sheet}>
          <ThemedText style={styles.title}>Update available</ThemedText>
          <ThemedText style={[styles.body, { color: muted }]}>
            Version {version} is ready to install.
          </ThemedText>

          <View style={styles.buttons}>
            <View style={styles.buttonItem}>
              <PrimaryButton label="Later" onPress={onLater} variant="outline" />
            </View>
            <View style={styles.buttonItem}>
              <PrimaryButton label="Update" onPress={onUpdate} />
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  center: {
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
  body: {
    ...Type.body,
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
