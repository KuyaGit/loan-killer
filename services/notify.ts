/**
 * Tiny event emitter for database change notifications.
 *
 * Every mutating service function calls notifyDbChange() after its transaction
 * commits. Screens and hooks subscribe via subscribeDbChange() to refetch live data.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to database change events. Returns an unsubscribe function. */
export function subscribeDbChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notify all subscribers that the database has changed. */
export function notifyDbChange(): void {
  listeners.forEach((l) => l());
}
