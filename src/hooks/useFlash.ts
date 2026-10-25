import { useCallback, useRef, useState } from 'react';

export function useFlash(duration = 3000) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), duration);
  }, [duration]);

  const clear = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  return { toast, flash, clear };
}
