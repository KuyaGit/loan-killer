/**
 * useUpdateCheck — React wrapper around checkForUpdate.
 *
 * Fires once on mount (= once per cold boot).  Returns null until the check
 * resolves, then either null (up-to-date / error) or an UpdateInfo object.
 */

import { useEffect, useState } from 'react';
import Constants from 'expo-constants';

import { checkForUpdate, UpdateInfo } from '@/services/update';

export function useUpdateCheck(): UpdateInfo | null {
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const installedVersion = Constants.expoConfig?.version;
    // If we can't determine the installed version, skip the check silently.
    if (!installedVersion) return;

    let cancelled = false;

    checkForUpdate(installedVersion).then((result) => {
      if (!cancelled) setInfo(result);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}
