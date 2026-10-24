import { useEffect, useState } from 'react';

export function useDelayedUnmount(open: boolean, delay = 200) {
  const [shouldRender, setShouldRender] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsClosing(false);
      return;
    }

    if (!shouldRender) return;

    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [open, delay, shouldRender]);

  return { shouldRender, isClosing };
}
