import { useEffect, useRef, useState } from 'react';

export type ScrollDirection = 'up' | 'down' | 'idle';

const THRESHOLD = 10; // px mínimo para detectar mudança de direção

export function useScrollDirection(): { direction: ScrollDirection; scrollY: number } {
  const [direction, setDirection] = useState<ScrollDirection>('idle');
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (rafId.current !== null) return; // debounce via rAF

      rafId.current = requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;

        if (Math.abs(delta) >= THRESHOLD) {
          setDirection(delta > 0 ? 'down' : 'up');
          lastScrollY.current = currentY;
        }

        setScrollY(currentY);
        rafId.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return { direction, scrollY };
}
