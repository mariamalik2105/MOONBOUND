/**
 * Draws a companion with the exact same artwork the game uses on the Moon
 * (drawCompanion in game/artwork.ts), so the shop always matches the game.
 */
import React, { useEffect, useRef } from 'react';
import { drawCompanion } from '../game/artwork';

interface PetSpriteProps {
  petId: string;
  className?: string;
  /** Idle animation (blinking, wagging, the odd hop) and eyes that follow the pointer. */
  animate?: boolean;
  /** Accessible label; omit for decorative thumbnails. */
  label?: string;
}

// Artwork bounds in game pixels, around the pet's feet at (0, 0).
const ART_W = 34;
const ART_H = 36;

export const PetSprite: React.FC<PetSpriteProps> = ({ petId, className, animate = false, label }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lookRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced =
      document.body.dataset.reducedMotion === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const live = animate && !reduced;

    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const scale = Math.min(w / ART_W, h / ART_H);
      const t = live ? (now - start) / 1000 : 0;
      // a little hop every few seconds, like the pet does when something catches its eye
      const cycle = t % 4;
      const hop = live && cycle < 0.6 ? Math.abs(Math.sin((cycle / 0.6) * Math.PI)) * 4 : 0;
      ctx.translate(w / 2, h / 2 + (ART_H / 2 - 5) * scale);
      ctx.scale(scale, scale);
      drawCompanion(ctx, 0, 0, t, hop, lookRef.current, null, petId);
      if (live) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [petId, animate]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      onPointerMove={
        animate
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              lookRef.current = Math.max(-1.5, Math.min(1.5, ((e.clientX - r.left) / r.width - 0.5) * 3));
            }
          : undefined
      }
    />
  );
};
