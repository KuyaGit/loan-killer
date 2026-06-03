/**
 * LockGate — wraps the entire app and shows a lock screen when App Lock is enabled.
 *
 * Lock behaviour:
 *  - On mount (launch): if enabled, immediately trigger the auth prompt.
 *  - AppState 'background' → set locked = true.
 *  - AppState 'active' while locked + enabled → trigger auth prompt.
 *  - Re-lock is skipped on 'inactive' to avoid a loop when the OS itself
 *    briefly suspends the app to show the biometric UI.
 *
 * Must be rendered INSIDE SQLiteProvider (uses useSQLiteContext via useLiveQuery).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Type } from '@/constants/theme';
import { getAppLockEnabled } from '@/services/database';
import { authenticate } from '@/services/app-lock';
import { useLiveQuery } from '@/hooks/use-live-query';
import { useThemeColor } from '@/hooks/use-theme-color';

interface LockGateProps {
  children: React.ReactNode;
}

export function LockGate({ children }: LockGateProps) {
  const { data: enabled, loading } = useLiveQuery(getAppLockEnabled);

  // Start locked so the content is never briefly visible before the auth check
  const [locked, setLocked] = useState(true);
  // Guard against stacking multiple simultaneous auth prompts
  const authInProgress = useRef(false);

  const tryAuthenticate = useCallback(async () => {
    if (authInProgress.current) return;
    authInProgress.current = true;
    const success = await authenticate('Unlock Loan Logs');
    authInProgress.current = false;
    if (success) {
      setLocked(false);
    }
    // On failure / cancel: stay locked; user can tap the Unlock button to retry
  }, []);

  // On mount, auto-trigger auth if enabled (and still locked)
  useEffect(() => {
    if (loading) return;          // wait until we know whether lock is enabled
    if (!enabled) {
      setLocked(false);           // lock disabled — reveal immediately
      return;
    }
    // Lock is enabled — authenticate on launch
    tryAuthenticate();
  }, [loading, enabled, tryAuthenticate]);

  // Re-lock when the app goes to background; re-trigger auth on foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        if (enabled) {
          setLocked(true);
        }
        return;
      }
      if (nextState === 'active' && enabled && locked) {
        tryAuthenticate();
      }
      // Ignore 'inactive' — the OS fires it when the biometric prompt itself appears
    });
    return () => subscription.remove();
  }, [enabled, locked, tryAuthenticate]);

  // While we're loading the preference, show nothing (SQLiteProvider Suspense covers the gap)
  if (loading) return null;

  // Lock is disabled — transparent passthrough
  if (!enabled) return <>{children}</>;

  // Lock is enabled + unlocked — show the app
  if (!locked) return <>{children}</>;

  // Lock screen
  return <LockScreen onUnlock={tryAuthenticate} />;
}

// ---------------------------------------------------------------------------
// Lock screen UI
// ---------------------------------------------------------------------------

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const background = useThemeColor({}, 'background');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const primary = useThemeColor({}, 'primary');
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* Icon in a tinted circle — mirrors EmptyState style */}
      <View style={[styles.iconCircle, { backgroundColor: primaryMuted }]}>
        <IconSymbol name="lock.fill" size={36} color={primary} />
      </View>

      <ThemedText style={styles.title}>Loan Logs is locked</ThemedText>
      <ThemedText style={[styles.caption, { color: muted }]}>
        Authenticate to access your loans
      </ThemedText>

      <View style={styles.buttonWrap}>
        <PrimaryButton label="Unlock" onPress={onUnlock} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xxxl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Type.cardTitle,
    textAlign: 'center',
  },
  caption: {
    ...Type.body,
    textAlign: 'center',
  },
  buttonWrap: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.xl,
  },
});
