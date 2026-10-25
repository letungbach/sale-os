import { useEffect, useRef } from 'react';

interface Options {
  open: boolean;
  onClose: () => void;
  panelRef: React.RefObject<HTMLElement>;
}

export function useDialog({ open, onClose, panelRef }: Options) {
  const onCloseRef = useRef(onClose);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = () => panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [];
    const items = focusables();
    if (items.length > 0) items[0].focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const currentItems = focusables();
      if (currentItems.length === 0) return;

      const first = currentItems[0];
      const last = currentItems[currentItems.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const scrollY = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      Object.assign(document.body.style, previous);
      window.scrollTo(0, scrollY);
      previouslyFocused.current?.focus();
    };
  }, [open, panelRef]);
}
