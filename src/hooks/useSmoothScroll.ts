import { useState, useCallback, useEffect, useRef } from 'react';
import Lenis from 'lenis';

export interface UseSmoothScrollProps {
  enabled?: boolean;
}

export function useSmoothScroll(enabled: boolean = true) {
  const [wrapper, setWrapper] = useState<HTMLElement | null>(null);
  const [content, setContent] = useState<HTMLElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const wrapperRef = useCallback((node: HTMLElement | null) => {
    if (node !== null) setWrapper(node);
  }, []);

  const contentRef = useCallback((node: HTMLElement | null) => {
    if (node !== null) setContent(node);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Initialize Lenis.
    // If wrapper is null, it defaults to window scroll.
    const lenis = new Lenis({
      wrapper: wrapper || undefined,
      content: content || undefined,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo for elastic, premium deceleration
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
    });

    lenisRef.current = lenis;

    const scrollTarget = document.documentElement;

    const handleScroll = (e: any) => {
      const scrollY = e.scroll ?? 0;
      const progress = e.progress ?? 0;
      const velocity = e.velocity ?? 0;

      // Update custom properties on the root element
      scrollTarget.style.setProperty('--scroll-y', `${scrollY}`);
      scrollTarget.style.setProperty('--scroll-progress', `${progress}`);
      scrollTarget.style.setProperty('--scroll-velocity', `${velocity}`);
    };

    lenis.on('scroll', handleScroll);

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Set initial custom property values
    scrollTarget.style.setProperty('--scroll-y', '0');
    scrollTarget.style.setProperty('--scroll-progress', '0');
    scrollTarget.style.setProperty('--scroll-velocity', '0');

    return () => {
      cancelAnimationFrame(rafId);
      lenis.off('scroll', handleScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled, wrapper, content]);

  return { wrapperRef, contentRef, lenisRef };
}
