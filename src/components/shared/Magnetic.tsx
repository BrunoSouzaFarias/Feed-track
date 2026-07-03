import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useCursor } from './CustomCursor';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(hover: none)').matches || 'ontouchstart' in window);

interface MagneticProps {
  children: React.ReactElement;
  strength?: number; // how much it pulls (0 to 1, default 0.35)
  cursorText?: string;
  className?: string;
}

export default function Magnetic({ children, strength = 0.35, cursorText, className = "inline-block" }: MagneticProps) {
  const isTouch = isTouchDevice();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { setCursorType, setCursorText } = useCursor();

  // On touch devices there's no real hover/mouse-move — a synthesized
  // mousemove on tap would displace the button toward the tap point and
  // never receive a mouseleave to reset it. Render children untouched.
  if (isTouch) {
    return <div className={className}>{children}</div>;
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    
    // Calculate center of the element
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // Distance between cursor and center
    const distanceX = clientX - centerX;
    const distanceY = clientY - centerY;

    // Apply strength to pull the element
    setPosition({
      x: distanceX * strength,
      y: distanceY * strength
    });

    setCursorType('hover');
    if (cursorText) {
      setCursorText(cursorText);
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
    setCursorType('default');
    setCursorText('');
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
