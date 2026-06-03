/**
 * useLiveQuery — reactive SQLite query hook.
 *
 * Runs queryFn whenever:
 *  1. The component mounts
 *  2. A database change is signalled via notifyDbChange()
 *  3. The dependency array changes
 *  4. The screen is focused (useFocusEffect backstop for stale state)
 */

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import { subscribeDbChange } from '@/services/notify';

export interface LiveQueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Execute a SQLite query function reactively.
 *
 * @param queryFn - Async function that receives the db and returns data.
 * @param deps - Re-run the query when these values change (like useEffect deps).
 */
export function useLiveQuery<T>(
  queryFn: (db: SQLiteDatabase) => Promise<T>,
  deps: unknown[] = []
): LiveQueryResult<T> {
  const db = useSQLiteContext();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  // Keep a stable ref to queryFn to avoid infinite loops when callers
  // define the function inline without useCallback
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const run = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const result = await queryFnRef.current(db);
      if (mountedRef.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ...deps]);

  // Initial load + react to dep changes
  useEffect(() => {
    mountedRef.current = true;
    run();
    // Subscribe to global db-change notifications
    const unsub = subscribeDbChange(run);
    return () => {
      unsub();
    };
  }, [run]);

  // Backstop: refetch when the screen is focused (catches stale data from background mutations)
  useFocusEffect(
    useCallback(() => {
      run();
    }, [run])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, loading, error, refetch: run };
}
