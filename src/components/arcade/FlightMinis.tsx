/**
 * Small hands-on flight games:
 *  - CraneDrop: drop 3 kits into the glowing cargo slot with good timing.
 *  - ScannerFlyover: fly a scanner over three landing sites.
 */

import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../game/audio';
import { roundRect } from './RocketRun';

function useLoop(cb: (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, t: number) => void) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const f = useRef(cb);
  f.current = cb;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(r.width * dpr)) {
        c.width = Math.round(r.width * dpr);
        c.height = Math.round(r.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      f.current(ctx, r.width, r.height, dt, now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return ref;
}

// ---------------------------------------------------------------------------
// Crane drop
// ---------------------------------------------------------------------------

export const KIT_LIST = [
  { id: 'power', name: 'Solar kit', color: '#544c9c' },
  { id: 'hab', name: 'Habitat kit', color: '#e8e3d7' },
  { id: 'air', name: 'Oxygen kit', color: '#7fd1a0' },
];

export const CraneDrop: React.FC<{ enabled: boolean; done: boolean; onPacked: (n: number) => void; onAllPacked: () => void }> = ({ enabled, done, onPacked, onAllPacked }) => {
  const st = useRef({ x: 0.2, dir: 1, drop: -1 as number, dropX: 0, packed: done ? 3 : 0, msg: '', msgT: 0, miss: 0, stack: [] as number[], wobble: 0 });
  const [packed, setPacked] = useState(done ? 3 : 0);
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__moonbound) (window as unknown as Record<string, unknown>).__mbCrane = st;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const drop = () => {
    const s = st.current;
    if (s.packed >= 3 || s.drop >= 0) return;
    s.drop = 0;
    s.dropX = s.x;
    sound.playClick();
  };

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (!enabledRef.current || e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, []);

  const ref = useLoop((ctx, w, h, dt, t) => {
    const s = st.current;
    const speed = 0.35 + s.packed * 0.12;
    if (s.packed < 3 && s.drop < 0 && enabledRef.current) {
      s.x += s.dir * speed * dt;
      if (s.x > 0.9) (s.x = 0.9), (s.dir = -1);
      if (s.x < 0.1) (s.x = 0.1), (s.dir = 1);
    }
    s.msgT -= dt;
    s.wobble = Math.max(0, s.wobble - dt * 3);
    const slotX = 0.5;
    const slotW = 0.13;
    const groundY = h - 40;

    // background: hangar
    ctx.fillStyle = '#1d1c21';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2c2a33';
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }
    ctx.fillStyle = '#3a3842';
    ctx.fillRect(0, groundY, w, h - groundY);
    // rail
    ctx.fillStyle = '#8b877f';
    ctx.fillRect(0, 26, w, 6);
    // lander cargo bay
    const bx = slotX * w;
    ctx.fillStyle = '#c9a24a';
    roundRect(ctx, bx - 110, groundY - 70, 220, 70, 10);
    ctx.fill();
    ctx.strokeStyle = '#26252c';
    ctx.lineWidth = 2;
    ctx.stroke();
    // slot glow
    const glow = 0.5 + Math.sin(t * 5) * 0.3;
    ctx.fillStyle = s.packed < 3 ? `rgba(242,184,75,${glow})` : 'rgba(127,209,160,0.6)';
    ctx.fillRect(bx - slotW * w * 0.5, groundY - 74, slotW * w, 8);
    // packed kits inside the bay
    s.stack.forEach((_, i) => {
      ctx.fillStyle = KIT_LIST[i].color;
      roundRect(ctx, bx - 90 + i * 62, groundY - 56, 52, 40, 6);
      ctx.fill();
      ctx.stroke();
    });
    ctx.fillStyle = '#f3efe6';
    ctx.font = 'bold 14px "Atkinson Hyperlegible", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Cargo bay ${s.packed}/3`, bx, groundY + 24);

    // crane trolley + cable + kit
    const kit = KIT_LIST[Math.min(2, s.packed)];
    const cx = (s.drop >= 0 ? s.dropX : s.x) * w;
    ctx.fillStyle = '#e8e3d7';
    roundRect(ctx, cx - 22, 18, 44, 20, 5);
    ctx.fill();
    ctx.stroke();
    if (s.packed < 3) {
      const hangY = 90;
      let ky = hangY;
      if (s.drop >= 0) {
        s.drop += dt;
        ky = hangY + s.drop * s.drop * 900;
        const landY = groundY - 96;
        if (ky >= landY) {
          const off = Math.abs(s.dropX - slotX);
          if (off < slotW * 0.5) {
            s.packed += 1;
            s.stack.push(s.packed);
            setPacked(s.packed);
            onPacked(s.packed);
            sound.playCollect();
            s.msg = ['Nice drop!', 'Perfect!', 'All packed!'][s.packed - 1];
            s.msgT = 1.4;
            if (s.packed === 3) {
              sound.playVictory();
              setTimeout(onAllPacked, 700);
            }
          } else {
            s.miss += 1;
            s.wobble = 1;
            sound.playMineImpact();
            s.msg = s.dropX < slotX ? 'Too early! Wait a little.' : 'Too late! Drop a bit sooner.';
            s.msgT = 1.6;
          }
          s.drop = -1;
          ky = hangY;
        }
      }
      ctx.strokeStyle = '#8b877f';
      ctx.beginPath();
      ctx.moveTo(cx, 38);
      ctx.lineTo(cx, s.drop >= 0 ? hangY - 20 : ky - 20);
      ctx.stroke();
      const wob = Math.sin(t * 30) * 6 * s.wobble;
      ctx.fillStyle = kit.color;
      roundRect(ctx, cx - 26 + wob, ky - 20, 52, 40, 6);
      ctx.fill();
      ctx.strokeStyle = '#26252c';
      ctx.stroke();
      ctx.fillStyle = kit.color === '#e8e3d7' ? '#26252c' : '#f3efe6';
      ctx.font = 'bold 11px "Atkinson Hyperlegible", sans-serif';
      ctx.fillText(kit.name, cx + wob, ky + 4);
      // aim guide
      if (s.drop < 0) {
        ctx.strokeStyle = 'rgba(243,239,230,0.18)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(cx, ky + 22);
        ctx.lineTo(cx, groundY - 74);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (s.msgT > 0) {
      ctx.font = 'bold 22px "Fredoka", "Atkinson Hyperlegible", sans-serif';
      ctx.fillStyle = s.msg.startsWith('Too') ? '#ff7a6b' : '#f2b84b';
      ctx.fillText(s.msg, w / 2, 70);
    }
  });

  return (
    <div className="space-y-2">
      <canvas ref={ref} onPointerDown={drop} className="w-full h-[250px] rounded-xl block cursor-pointer touch-none" aria-label="Crane game. Drop each kit when the crane is above the glowing slot." />
      <button onClick={drop} disabled={packed >= 3} className="w-full h-12 rounded-xl bg-moon-accent text-[#18161f] font-bold text-lg disabled:opacity-40">
        {packed >= 3 ? 'All 3 kits packed ✓' : 'Drop!'} {packed < 3 && <kbd className="ml-1 rounded bg-[#18161f]/20 px-1.5 text-xs">Space</kbd>}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scanner flyover
// ---------------------------------------------------------------------------

export interface SiteSpot {
  id: string;
  name: string;
  pos: { x: number; y: number };
}

export const ScannerFlyover: React.FC<{
  sites: SiteSpot[];
  scanned: string[];
  selected: string | null;
  enabled: boolean;
  onScanned: (id: string) => void;
  onSelect: (id: string) => void;
}> = ({ sites, scanned, selected, enabled, onScanned, onSelect }) => {
  const st = useRef({ x: 0.12, y: 0.82, vx: 0, vy: 0, target: null as null | { x: number; y: number }, progress: {} as Record<string, number>, keys: new Set<string>() });
  const props = useRef({ sites, scanned, selected, onScanned, onSelect, enabled });
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__moonbound) (window as unknown as Record<string, unknown>).__mbScan = { st, props };
  props.current = { sites, scanned, selected, onScanned, onSelect, enabled };

  useEffect(() => {
    const map: Record<string, string> = { arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd', arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r' };
    const kd = (e: KeyboardEvent) => {
      if (!props.current.enabled) return;
      const k = map[e.key.toLowerCase()];
      if (k) {
        e.preventDefault();
        st.current.keys.add(k);
        st.current.target = null;
      }
    };
    const ku = (e: KeyboardEvent) => {
      const k = map[e.key.toLowerCase()];
      if (k) st.current.keys.delete(k);
    };
    const bl = () => st.current.keys.clear();
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', bl);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', bl);
    };
  }, []);

  const ref = useLoop((ctx, w, h, dt, t) => {
    const s = st.current;
    const P = props.current;
    if (P.enabled) {
      const ax = (s.keys.has('r') ? 1 : 0) - (s.keys.has('l') ? 1 : 0);
      const ay = (s.keys.has('d') ? 1 : 0) - (s.keys.has('u') ? 1 : 0);
      if (ax || ay) {
        const len = Math.hypot(ax, ay);
        s.x += (ax / len) * 0.55 * dt;
        s.y += (ay / len) * 0.55 * dt * (w / h);
      } else if (s.target) {
        const k = Math.min(1, dt * 7);
        s.x += (s.target.x - s.x) * k;
        s.y += (s.target.y - s.y) * k;
      }
      s.x = Math.max(0.04, Math.min(0.96, s.x));
      s.y = Math.max(0.06, Math.min(0.94, s.y));
    }
    // background: moon map
    ctx.fillStyle = '#2a2926';
    ctx.fillRect(0, 0, w, h);
    const crater = (x: number, y: number, r: number) => {
      ctx.fillStyle = '#1b1a1e';
      ctx.beginPath();
      ctx.arc(x * w, y * h, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8b877f';
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    crater(0.36, 0.5, 34);
    crater(0.52, 0.66, 20);
    crater(0.15, 0.3, 14);
    crater(0.85, 0.4, 12);
    ctx.strokeStyle = '#a39f95';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0.52 * w, 0.28 * h);
    ctx.quadraticCurveTo(0.6 * w, 0.2 * h, 0.7 * w, 0.3 * h);
    ctx.stroke();
    ctx.fillStyle = '#b3ada2';
    ctx.font = '12px "Atkinson Hyperlegible", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SOUTH POLE ↑', 8, 18);
    ctx.fillText('↓ toward the equator', 8, h - 8);

    // sites
    for (const [i, site] of P.sites.entries()) {
      const sx = site.pos.x * w;
      const sy = site.pos.y * h;
      const done = P.scanned.includes(site.id);
      const prog = done ? 1 : s.progress[site.id] || 0;
      const sel = P.selected === site.id;
      ctx.fillStyle = sel ? '#f2b84b' : done ? '#55525e' : '#1d1c21';
      ctx.beginPath();
      ctx.arc(sx, sy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = done ? '#7fd1a0' : '#f2b84b';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (!done && prog > 0) {
        ctx.strokeStyle = '#9d8cff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(sx, sy, 28, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = sel ? '#1a1a20' : '#f3efe6';
      ctx.font = 'bold 16px "Atkinson Hyperlegible", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(done ? '✓' : String(i + 1), sx, sy + 6);
      ctx.fillStyle = '#f3efe6';
      ctx.font = '12px "Atkinson Hyperlegible", sans-serif';
      if (done) ctx.fillText(site.name, sx, sy + 40);

      const over = Math.hypot(s.x - site.pos.x, (s.y - site.pos.y) * (h / w)) < 0.05;
      if (over && !done && P.enabled) {
        s.progress[site.id] = Math.min(1, (s.progress[site.id] || 0) + dt / 1.1);
        if (Math.random() < 0.15) sound.playClick();
        if (s.progress[site.id] >= 1) {
          sound.playScan();
          P.onScanned(site.id);
          P.onSelect(site.id);
        }
      } else if (!done) s.progress[site.id] = Math.max(0, (s.progress[site.id] || 0) - dt * 0.6);
    }

    // scanner drone + beam
    const dx = s.x * w;
    const dy = s.y * h;
    ctx.fillStyle = 'rgba(157,140,255,0.16)';
    ctx.beginPath();
    ctx.arc(dx, dy, 30 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9d8cff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(dx, dy, 14, 0, Math.PI * 2);
    ctx.moveTo(dx - 24, dy);
    ctx.lineTo(dx - 8, dy);
    ctx.moveTo(dx + 8, dy);
    ctx.lineTo(dx + 24, dy);
    ctx.moveTo(dx, dy - 24);
    ctx.lineTo(dx, dy - 8);
    ctx.moveTo(dx, dy + 8);
    ctx.lineTo(dx, dy + 24);
    ctx.stroke();
  });

  const point = (e: React.PointerEvent<HTMLCanvasElement>, click: boolean) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (e.pointerType === 'mouse' && !click) st.current.target = { x, y };
    if (click) {
      st.current.target = { x, y };
      const hit = props.current.sites.find((s) => Math.hypot(s.pos.x - x, (s.pos.y - y) * (r.height / r.width)) < 0.06);
      if (hit && props.current.scanned.includes(hit.id)) props.current.onSelect(hit.id);
    }
  };

  return (
    <canvas
      ref={ref}
      onPointerMove={(e) => point(e, false)}
      onPointerDown={(e) => point(e, true)}
      className="w-full aspect-[4/3] rounded-xl block cursor-crosshair touch-none"
      aria-label="Moon map. Fly the scanner over each numbered site until its ring fills."
    />
  );
};
