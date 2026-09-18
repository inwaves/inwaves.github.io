import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import type { TelescopeReadout } from '../render/telescope';
import { seededRandom } from '../astro/math';
import { positionAngleRotation, ringHalves, ringRotation, satelliteScreen } from './telescopeGeometry';

const SIZE = 260;

/** Draw a phased disc lit from the +x direction (after rotating the context toward the Sun). */
function phasedDisc(ctx: CanvasRenderingContext2D, r: number, k: number, lit: string, dark: string) {
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  const rx = r * Math.abs(2 * k - 1);
  // Terminator: an ellipse from pole to pole, bulging toward the dark side when gibbous.
  ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, k < 0.5);
  ctx.fill();
}

function draw(canvas: HTMLCanvasElement, t: TelescopeReadout) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const c = SIZE / 2;
  const grad = ctx.createRadialGradient(c, c, 10, c, c, c);
  grad.addColorStop(0, '#0a0d18');
  grad.addColorStop(1, '#03040a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.translate(c, c);

  // Sky orientation: north up, east left, as a naked-eye observer sees the sky.
  const rotation = positionAngleRotation(t.brightLimbAngle);

  if (t.kind === 'sun') {
    const r = 88;
    const sun = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    sun.addColorStop(0, '#fff6d8');
    sun.addColorStop(1, '#f2b04a');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    if (t.surfaceDetail) {
      const rand = seededRandom(Math.floor(Date.now() / 86400000));
      for (let i = 0; i < 5; i++) {
        const a = rand() * Math.PI * 2;
        const rr = rand() * r * 0.7;
        ctx.fillStyle = 'rgba(60,30,10,0.85)';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.4, 2 + rand() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (t.kind === 'moon') {
    const r = 92;
    ctx.save();
    ctx.rotate(rotation);
    phasedDisc(ctx, r, t.illuminated, '#dcd6c6', '#15161c');
    ctx.restore();
    // Maria and, after Galileo, craters along the terminator.
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const rand = seededRandom(17);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = 'rgba(110,105,95,0.55)';
      ctx.beginPath();
      ctx.ellipse((rand() - 0.5) * r * 1.1, (rand() - 0.5) * r * 1.1, 10 + rand() * 22, 8 + rand() * 16, rand() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (t.surfaceDetail) {
      for (let i = 0; i < 60; i++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.sqrt(rand()) * r * 0.95;
        ctx.strokeStyle = 'rgba(80,75,70,0.6)';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.5 + rand() * 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  } else {
    const giant = t.bodyId === 'jupiter' || t.bodyId === 'saturn';
    const r = giant ? 22 : 40;
    const colors: Record<string, [string, string]> = {
      venus: ['#f7eccb', '#14151b'],
      mercury: ['#d4c8b8', '#131419'],
      mars: ['#e58a5c', '#15110f'],
      jupiter: ['#ead2ad', '#17140f'],
      saturn: ['#eedc9e', '#17150e'],
    };
    const [lit, dark] = colors[t.bodyId] ?? ['#dddddd', '#111111'];
    const halves = ringHalves(t.ringTiltSign);
    const drawRingHalf = (range: [number, number]) => {
      ctx.save();
      ctx.rotate(ringRotation(t.ringAngle));
      ctx.strokeStyle = 'rgba(232,214,170,0.85)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 2.0, Math.max(1, r * 2.0 * t.ringOpening), 0, range[0], range[1]);
      ctx.stroke();
      ctx.restore();
    };
    // Far half of the ring, then the planet, then the near half passing in front of it.
    if (t.rings === 'rings') drawRingHalf(halves.back);
    ctx.save();
    ctx.rotate(rotation);
    phasedDisc(ctx, r, t.illuminated, lit, dark);
    ctx.restore();
    if (t.rings === 'rings') drawRingHalf(halves.front);
    if (t.bodyId === 'jupiter') {
      ctx.fillStyle = 'rgba(150,100,60,0.45)';
      ctx.fillRect(-r * 0.95, -r * 0.3, r * 1.9, r * 0.14);
      ctx.fillRect(-r * 0.9, r * 0.15, r * 1.8, r * 0.12);
    }
    if (t.rings === 'ears') {
      ctx.save();
      ctx.rotate(ringRotation(t.ringAngle || 90));
      ctx.fillStyle = lit;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * r * 1.9, 0, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // The disc is exaggerated; moon offsets are compressed so the whole system fits the view.
    const pxPerRadius = t.bodyId === 'jupiter' ? r / 5.2 : r / 7.5;
    for (const s of t.satellites) {
      const p = satelliteScreen(s, pxPerRadius, c);
      if (p.hidden) continue;
      ctx.fillStyle = '#f2efe6';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,215,200,0.7)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(s.name, p.x - 10, p.y + 14);
    }
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(216,179,106,0.75)';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('E', 10, c + 3);
  ctx.fillText('W', SIZE - 18, c + 3);
  ctx.fillText('N', c - 3, 14);
}

export function Telescope() {
  const open = useStore((s) => s.telescopeOpen);
  const readout = useStore((s) => s.telescope);
  const selected = useStore((s) => s.selected);
  const toggle = useStore((s) => s.toggleTelescope);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (open && readout && ref.current) draw(ref.current, readout);
  }, [open, readout]);
  if (!open) return null;
  return (
    <div className="telescope panel-glass" aria-label="Telescope view">
      <div className="telescope-head">
        <span className="telescope-title">Telescope</span>
        <button className="icon-button" onClick={toggle} aria-label="Close telescope">
          ×
        </button>
      </div>
      {readout ? (
        <>
          <canvas ref={ref} className="telescope-canvas" style={{ width: SIZE, height: SIZE }} />
          <div className="telescope-caption">
            <strong>{readout.name}</strong> · {Math.round(readout.illuminated * 100)}% lit
            {readout.satellites.length > 0 && ` · ${readout.satellites.length} moon${readout.satellites.length > 1 ? 's' : ''}`}
            <br />
            {readout.telescopeExists
              ? 'As this worldview says a telescope would show it.'
              : 'No telescope yet: this is what the worldview’s geometry implies one would show.'}
          </div>
        </>
      ) : (
        <div className="telescope-caption muted">{selected ? 'Nothing to magnify here.' : 'Select a planet, the Moon or the Sun.'}</div>
      )}
    </div>
  );
}
