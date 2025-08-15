// Simple event hub for auth session changes

const listeners = new Set();

/**
 * Subscribe to logout events.
 * Returns an unsubscribe function.
 */
export const onLogout = (handler) => {
  listeners.add(handler);
  return () => listeners.delete(handler);
};

/**
 * Emit a logout event to all subscribers.
 */
export const emitLogout = (reason) => {
  for (const fn of listeners) {
    try {
      fn(reason);
    } catch {}
  }
};
