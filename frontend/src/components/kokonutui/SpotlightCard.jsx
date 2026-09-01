import React, { useRef, useState } from 'react';

/**
 * Kokonut UI Spotlight Card
 * Features a subtle cursor-following radial gradient spotlight reflection.
 * Ensures the inner container expands to 100% height with full flex-1 layout.
 */
export function SpotlightCard({ 
  children, 
  className = '', 
  spotlightColor = 'rgba(255, 255, 255, 0.07)', 
  style = {},
  padding = '26px',
  ...props 
}) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-[var(--radius-lg,14px)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-all duration-200 hover:border-[var(--border-strong)] ${className}`}
      style={{
        boxShadow: 'var(--shadow-sm)',
        padding: padding,
        display: 'flex',
        flexDirection: 'column',
        ...style
      }}
      {...props}
    >
      {/* Spotlight Radial Glow Layer */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />
      {/* Content wrapper expanding to full height */}
      <div 
        className="relative z-10 flex flex-col flex-1 h-full w-full justify-between" 
        style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
      >
        {children}
      </div>
    </div>
  );
}
