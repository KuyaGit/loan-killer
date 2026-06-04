/**
 * useUpdateCheck — React wrapper around checkForUpdate.
 *
 * Fires on mount (cold boot) AND every time the app returns to the foreground
 * (AppState transitions from background/inactive → active).  Returns null
 * until a check resolves, then either null (up-to-date / offline / error) or
 * an UpdateInfo object.  Each completed check produces a fresh object so
 * callers can react with a dependency on the returned value.
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

import { checkForUpdate, UpdateInfo } from '@/services/update';

export function useUpdateCheck(): UpdateInfo | null {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const inFlight = useRef(false);
  const prevAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const installedVersion = Constants.expoConfig?.version;
    // If we can't determine the installed version, skip all checks silently.
    if (!installedVersion) return;

    async function runCheck() {
      if (inFlight.current) return; // skip if a request is already in progress
      inFlight.current = true;
      try {
        const result = await checkForUpdate(installedVersion!);
        setInfo(result);
      } finally {
        inFlight.current = false;
      }
    }

    // Cold-boot check.
    runCheck();

    // Foreground check — re-run whenever the app returns to the foreground.
    function handleAppStateChange(nextState: AppStateStatus) {
      const prev = prevAppState.current;
      prevAppState.current = nextState;
      if (
        nextState === 'active' &&
        (prev === 'background' || prev === 'inactive')
      ) {
        runCheck();
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return info;
}
