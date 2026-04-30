import { useEffect, useRef } from 'react';

/**
 * Calls the latest `callback` every `delay` milliseconds. Pass `null` to
 * pause the interval without unmounting. Based on Dan Abramov's reference
 * implementation.
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return undefined;
    const id = setInterval(() => {
      savedCallback.current?.();
    }, delay);
    return () => clearInterval(id);
  }, [delay]);
}
