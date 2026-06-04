/**
 * UpdateGate — orchestrates the version-check and displays UpdateModal.
 *
 * Timing logic:
 *   The AnimatedSplash overlay dissolves at ~3 000 ms after mount.  There is
 *   no onFinish callback on that component, so we use a timer that fires just
 *   after the known animation ends (SPLASH_GATE_MS = 3 200 ms).  This ensures
 *   the modal never flashes under the opaque splash overlay.
 *
 * The network fetch starts immediately on mount (during the splash) so the
 * result is usually ready before the timer fires — no visible extra delay.
 */

import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { UpdateModal } from '@/components/update-modal';
import { useUpdateCheck } from '@/hooks/use-update-check';

// AnimatedSplash total animation is ~3 000 ms; give it a 200 ms buffer.
const SPLASH_GATE_MS = 3200;

interface UpdateGateProps {
  children: React.ReactNode;
}

export function UpdateGate({ children }: UpdateGateProps) {
  const info = useUpdateCheck();
  const [dismissed, setDismissed] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  // Unblock the modal after the splash overlay has dissolved.
  useEffect(() => {
    const t = setTimeout(() => setSplashGone(true), SPLASH_GATE_MS);
    return () => clearTimeout(t);
  }, []);

  const showModal = !!info && !dismissed && splashGone;

  function handleUpdate() {
    if (info) {
      Linking.openURL(info.downloadUrl).catch(() => {
        // Silently swallow — openURL failure should not break anything.
      });
    }
    setDismissed(true);
  }

  return (
    <>
      {children}
      <UpdateModal
        visible={showModal}
        version={info?.version ?? ''}
        onUpdate={handleUpdate}
        onLater={() => setDismissed(true)}
      />
    </>
  );
}
