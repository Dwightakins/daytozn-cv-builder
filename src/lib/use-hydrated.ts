import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during server rendering and the first (hydration) render, true afterwards.
 * Lets components ship fully visible HTML and only switch on animations once JS is running.
 */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
