/**
 * On-screen controls for phones and tablets: a thumbstick to walk or drive,
 * and a Use button (same as E / Space). Tapping the ground or an object on
 * the map also works, like clicking with a mouse.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Hand } from 'lucide-react';

/** True on touch-first devices (phones, tablets). */
export function useCoarsePointer() {
  const query = '(pointer: coarse)';
  const [coarse, setCoarse] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setCoarse(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return coarse;
}

const RADIUS = 52; // how far the knob can travel, px

export const TouchControls: React.FC<{ onMove: (x: number, y: number) => void; onUse: () => void }> = ({ onMove, onUse }) => {
  const base = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (clientX: number, clientY: number) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    // small dead zone so a resting thumb does not drift
    const m = Math.min(1, d / RADIUS);
    if (m < 0.18) onMove(0, 0);
    else onMove(dx / RADIUS, dy / RADIUS);
  };

  const end = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  // let go of the stick if the controls disappear mid-drag
  useEffect(() => () => onMove(0, 0), [onMove]);

  return (
    <>
      <div
        ref={base}
        role="img"
        aria-label="Move stick: drag to walk or drive"
        className="pointer-events-auto absolute z-20 left-4 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+4.75rem)] w-32 h-32 rounded-full bg-moon-panel/45 border-2 border-white/25 touch-none select-none"
        onPointerDown={(e) => {
          e.preventDefault();
          pointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          update(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (pointer.current === e.pointerId) update(e.clientX, e.clientY);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <div
          className="absolute left-1/2 top-1/2 w-14 h-14 -ml-7 -mt-7 rounded-full bg-white/80 border-2 border-white shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
      <button
        type="button"
        onClick={onUse}
        className="pointer-events-auto absolute z-20 right-4 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+5.5rem)] w-20 h-20 rounded-full bg-moon-accent text-[#18161f] border-4 border-white/80 shadow-xl flex flex-col items-center justify-center font-bold text-sm touch-manipulation"
      >
        <Hand className="w-6 h-6" aria-hidden />
        Use
      </button>
    </>
  );
};
