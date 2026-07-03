import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(hover: none)').matches || 'ontouchstart' in window);

interface Tilt3DProps {
  children: React.ReactNode;
  maxRotation?: number; // Maximum rotation in degrees (default: 12)
  scaleOnHover?: number; // Scale on hover (default: 1.02)
  perspective?: number; // 3D Perspective (default: 1000)
  className?: string;
}

export default function Tilt3D({
  children,
  maxRotation = 12,
  scaleOnHover = 1.02,
  perspective = 1000,
  className = "",
}: Tilt3DProps) {
  const isTouch = isTouchDevice();
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  if (isTouch) {
    return <div className={`inline-block w-full ${className}`}>{children}</div>;
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();

    // Mouse coordinates relative to the element center
    const x = clientX - left - width / 2;
    const y = clientY - top - height / 2;

    // Normalised positions (-0.5 to 0.5)
    const normX = x / width;
    const normY = y / height;

    // Compute rotation angles
    // Moving mouse to the right (positive X) rotates around Y-axis in positive direction
    // Moving mouse to the bottom (positive Y) rotates around X-axis in negative direction
    setRotateY(normX * maxRotation);
    setRotateX(-normY * maxRotation);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      style={{ perspective }}
      className={`inline-block w-full ${className}`}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: isHovered ? rotateX : 0,
          rotateY: isHovered ? rotateY : 0,
          scale: isHovered ? scaleOnHover : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 20,
          mass: 0.2,
        }}
        className="w-full h-full transform-style-3d"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
