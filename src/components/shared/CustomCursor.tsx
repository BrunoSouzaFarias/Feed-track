import React, { useEffect, useState, useRef, createContext, useContext, useCallback } from 'react';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type CursorType = 'default' | 'hover' | 'magnetic' | 'text' | 'hidden';
type CursorMode = 'default' | 'text' | 'chart' | 'action' | 'drag';

interface CursorContextType {
  setCursorType: (type: CursorType) => void;
  setCursorText: (text: string) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const CursorContext = createContext<CursorContextType>({
  setCursorType: () => {},
  setCursorText: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useCursor = () => useContext(CursorContext);

export function CursorProvider({ children }: { children: React.ReactNode }) {
  const [cursorType, setCursorType] = useState<CursorType>('default');
  const [cursorText, setCursorText] = useState<string>('');

  return (
    <CursorContext.Provider value={{ setCursorType, setCursorText }}>
      {children}
      <CustomCursor type={cursorType} text={cursorText} />
    </CursorContext.Provider>
  );
}

// ─── Helpers de detecção de modo ────────────────────────────────────────────

function detectCursorMode(el: Element | null): { mode: CursorMode; label: string } {
  if (!el) return { mode: 'default', label: '' };

  // Sobe na árvore DOM para detectar o contexto mais próximo
  let node: Element | null = el;
  while (node && node !== document.body) {
    const dataCursor = node.getAttribute('data-cursor');

    if (dataCursor === 'drag' || node.classList.contains('nine-box-cell')) {
      return { mode: 'drag', label: '' };
    }
    if (dataCursor === 'chart' || node.classList.contains('recharts-wrapper')) {
      return { mode: 'chart', label: '' };
    }
    if (dataCursor === 'action') {
      const label = node.getAttribute('data-cursor-label') || 'Ver mais';
      return { mode: 'action', label };
    }
    if (dataCursor === 'text') {
      return { mode: 'text', label: '' };
    }

    const tag = node.tagName.toLowerCase();

    // Elementos de ação nativos
    if (
      tag === 'button' ||
      tag === 'a' ||
      node.getAttribute('role') === 'tab' ||
      node.getAttribute('role') === 'button' ||
      tag === 'select' ||
      (tag === 'input' && ['submit', 'button'].includes(node.getAttribute('type') || ''))
    ) {
      const label = node.getAttribute('data-cursor-label') || '';
      return { mode: 'action', label };
    }

    // Elementos de texto nativos
    if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'li', 'td', 'th'].includes(tag)) {
      return { mode: 'text', label: '' };
    }

    node = node.parentElement;
  }

  return { mode: 'default', label: '' };
}

// ─── Componente Principal ───────────────────────────────────────────────────

interface CustomCursorProps {
  type: CursorType;
  text?: string;
}

export function CustomCursor({ type, text }: CustomCursorProps) {
  const { setCursorType } = useCursor();
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(true);

  // Modo contextual inteligente
  const [cursorMode, setCursorMode] = useState<CursorMode>('default');
  const [cursorLabel, setCursorLabel] = useState('');

  // Target coordinates (actual mouse position)
  const mouseRef = useRef({ x: 0, y: 0 });

  // Current coordinates for the dot (fast lerp)
  const dotRef = useRef({ x: 0, y: 0 });
  // Current coordinates for the ring (slow lerp)
  const ringRef = useRef({ x: 0, y: 0 });

  const dotElRef = useRef<HTMLDivElement>(null);
  const ringElRef = useRef<HTMLDivElement>(null);
  const actionRingElRef = useRef<HTMLDivElement>(null);
  const crosshairElRef = useRef<HTMLDivElement>(null);
  const ibeamElRef = useRef<HTMLDivElement>(null);
  const dragElRef = useRef<HTMLDivElement>(null);
  const labelElRef = useRef<HTMLDivElement>(null);

  // Ref de modo para evitar stale closure no RAF loop
  const modeRef = useRef<CursorMode>('default');
  // Ref do label para manter handleModeDetect estável (sem recriar a cada mudança)
  const cursorLabelRef = useRef('');

  // Persiste entre re-execuções do effect para nunca re-anexar listeners
  // a um elemento que já os recebeu (evita vazamento de memória).
  const wiredElementsRef = useRef(new WeakSet<Element>());

  const handleModeDetect = useCallback((e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const { mode, label } = detectCursorMode(el);
    if (mode !== modeRef.current) {
      modeRef.current = mode;
      setCursorMode(mode);
      setCursorLabel(label);
      cursorLabelRef.current = label;
    } else if (mode === 'action' && label !== cursorLabelRef.current) {
      setCursorLabel(label);
      cursorLabelRef.current = label;
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover)');
    setIsTouchDevice(!mediaQuery.matches);

    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setIsTouchDevice(!e.matches);
    };

    mediaQuery.addEventListener('change', handleMediaQueryChange);

    if (!mediaQuery.matches) {
      // Touch/no-hover device: the cursor renders null (see early return
      // below) — skip the mousemove/RAF/MutationObserver machinery entirely
      // instead of running a 60fps loop against elements that never exist.
      return () => mediaQuery.removeEventListener('change', handleMediaQueryChange);
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      setIsVisible(true);
      handleModeDetect(e);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // ── Lerp loop ──────────────────────────────────────────────────────────
    const lerp = (start: number, end: number, factor: number) =>
      start + (end - start) * factor;

    let animationId: number;

    const updatePosition = () => {
      const dotFactor = 0.35;
      const ringFactor = 0.08;

      dotRef.current.x = lerp(dotRef.current.x, mouseRef.current.x, dotFactor);
      dotRef.current.y = lerp(dotRef.current.y, mouseRef.current.y, dotFactor);

      ringRef.current.x = lerp(ringRef.current.x, mouseRef.current.x, ringFactor);
      ringRef.current.y = lerp(ringRef.current.y, mouseRef.current.y, ringFactor);

      const tx = dotRef.current.x;
      const ty = dotRef.current.y;
      const rx = ringRef.current.x;
      const ry = ringRef.current.y;

      if (dotElRef.current) {
        dotElRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      }
      if (ringElRef.current) {
        ringElRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      if (actionRingElRef.current) {
        actionRingElRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      }
      if (crosshairElRef.current) {
        crosshairElRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      }
      if (ibeamElRef.current) {
        ibeamElRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      }
      if (dragElRef.current) {
        dragElRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      }
      if (labelElRef.current) {
        labelElRef.current.style.transform = `translate3d(${tx + 16}px, ${ty - 20}px, 0)`;
      }

      animationId = requestAnimationFrame(updatePosition);
    };

    animationId = requestAnimationFrame(updatePosition);

    // ── Listeners automáticos em interactivos ──────────────────────────────
    // wiredElementsRef persiste entre re-execuções do effect, então um
    // elemento nunca recebe os listeners duas vezes (evita vazamento).
    const addListenersToInteractives = () => {
      const interactiveElements = document.querySelectorAll(
        'a, button, [role="button"], input[type="submit"], input[type="button"], select, [data-interactive]'
      );
      interactiveElements.forEach((el) => {
        if (wiredElementsRef.current.has(el)) return;
        wiredElementsRef.current.add(el);
        el.addEventListener('mouseenter', () => setCursorType('hover'));
        el.addEventListener('mouseleave', () => setCursorType('default'));
      });
    };

    addListenersToInteractives();

    const observer = new MutationObserver(() => {
      addListenersToInteractives();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [handleModeDetect]);

  if (isTouchDevice || type === 'hidden') {
    return null;
  }

  // ── Classes base do cursor legado ──────────────────────────────────────────
  let ringClasses = 'border border-[#006c49] dark:border-[#4bdfa1] w-8 h-8';
  let dotClasses = 'bg-[#006c49] dark:bg-[#4bdfa1] w-2 h-2';

  if (type === 'hover') {
    ringClasses =
      'bg-[#006c49]/10 dark:bg-[#4bdfa1]/10 border border-[#006c49] dark:border-[#4bdfa1] w-14 h-14 scale-110';
    dotClasses = 'bg-[#006c49] dark:bg-[#4bdfa1] w-1.5 h-1.5';
  } else if (type === 'magnetic') {
    ringClasses = 'bg-primary/20 border-2 border-primary w-16 h-16 scale-120';
    dotClasses = 'bg-primary w-1 h-1 opacity-0';
  } else if (type === 'text') {
    ringClasses = 'border-t-2 border-b-2 border-primary/45 w-4 h-10 rounded-sm';
    dotClasses = 'bg-primary w-1 h-4 rounded-full';
  }

  // Ocultar elementos legados quando modo contextual está ativo
  const isContextualMode = cursorMode !== 'default';
  const legacyOpacity = isContextualMode ? 'opacity-0' : 'opacity-100';

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[99999] transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* ── Legado: Outer elastic ring ──────────────────────────────────── */}
      <div
        ref={ringElRef}
        className={`absolute rounded-full transition-[width,height,background-color,border-color,border-width,opacity] duration-300 ease-out will-change-transform ${ringClasses} ${legacyOpacity}`}
        style={{
          transform: 'translate3d(-50%, -50%, 0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {text && type === 'hover' && (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase tracking-wider text-[#006c49] dark:text-[#4bdfa1] animate-pulse-subtle">
            {text}
          </span>
        )}
      </div>

      {/* ── Legado: Inner precise dot ───────────────────────────────────── */}
      <div
        ref={dotElRef}
        className={`absolute rounded-full transition-[width,height,background-color,opacity] duration-200 ease-out will-change-transform ${dotClasses} ${legacyOpacity}`}
        style={{
          transform: 'translate3d(-50%, -50%, 0)',
          backfaceVisibility: 'hidden',
        }}
      />

      {/* ── MODO TEXT: I-beam vertical pulsante ─────────────────────────── */}
      <div
        ref={ibeamElRef}
        className="absolute will-change-transform pointer-events-none"
        style={{
          transform: 'translate3d(-50%, -50%, 0)',
          opacity: cursorMode === 'text' ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
        }}
      >
        {/* Linha vertical principal */}
        <div
          style={{
            width: '2px',
            height: '22px',
            background: 'var(--color-primary, #006c49)',
            borderRadius: '1px',
            animation: cursorMode === 'text' ? 'ibeam-pulse 1.1s ease-in-out infinite' : 'none',
          }}
        />
        {/* Topo e base do I-beam */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '8px',
            height: '2px',
            background: 'var(--color-primary, #006c49)',
            borderRadius: '1px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '8px',
            height: '2px',
            background: 'var(--color-primary, #006c49)',
            borderRadius: '1px',
          }}
        />
      </div>

      {/* ── MODO CHART: Crosshair + dot ─────────────────────────────────── */}
      <div
        ref={crosshairElRef}
        className="absolute will-change-transform pointer-events-none"
        style={{
          transform: 'translate3d(-50%, -50%, 0)',
          opacity: cursorMode === 'chart' ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
        }}
      >
        {/* Linha horizontal */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '-16px',
            width: '32px',
            height: '1px',
            background: 'rgba(0,108,73,0.5)',
            transform: 'translateY(-50%)',
          }}
        />
        {/* Linha vertical */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '-16px',
            height: '32px',
            width: '1px',
            background: 'rgba(0,108,73,0.5)',
            transform: 'translateX(-50%)',
          }}
        />
        {/* Dot central */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#006c49',
            boxShadow: '0 0 0 2px rgba(0,108,73,0.2)',
          }}
        />
      </div>

      {/* ── MODO ACTION: Ring expandido + label flutuante ───────────────── */}
      <div
        ref={actionRingElRef}
        className="absolute will-change-transform pointer-events-none"
        style={{
          transform: 'translate3d(-50%, -50%, 0)',
          opacity: cursorMode === 'action' ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
          width: cursorMode === 'action' ? '48px' : '32px',
          height: cursorMode === 'action' ? '48px' : '32px',
          borderRadius: '50%',
          border: '1.5px solid rgba(0,108,73,0.6)',
          background: 'rgba(0,108,73,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
      {/* Label flutuante do modo ACTION */}
      <div
        ref={labelElRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: cursorMode === 'action' && cursorLabel ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
          pointerEvents: 'none',
          willChange: 'transform',
          whiteSpace: 'nowrap',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: '#006c49',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(0,108,73,0.2)',
          borderRadius: '4px',
          padding: '3px 7px',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        {cursorLabel || 'Ver mais'}
      </div>

      {/* ── MODO DRAG: Ícone de 4 setas ─────────────────────────────────── */}
      <div
        ref={dragElRef}
        className="absolute will-change-transform pointer-events-none"
        style={{
          transform: 'translate3d(-50%, -50%, 0)',
          opacity: cursorMode === 'drag' ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
          color: '#006c49',
          fontSize: '20px',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        ✥
      </div>

      {/* ── CSS de animação I-beam injetado inline ──────────────────────── */}
      <style>{`
        @keyframes ibeam-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
