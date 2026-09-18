/**
 * Small procedural textures, drawn to canvases so the application needs no image
 * assets. A seeded generator keeps every surface identical between sessions.
 */
import { CanvasTexture, SRGBColorSpace } from 'three';

/** Deterministic pseudo-random numbers in [0, 1) (mulberry32). */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return { c, ctx: c.getContext('2d') };
}

function asTexture(c) {
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Soft round glow for the Sun and for planets seen as points of light. */
export function glowTexture() {
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return asTexture(c);
}

/**
 * The Moon. Before the telescope it is a smooth, faintly mottled disc, as the
 * unaided eye and Aristotle's physics had it. With `relief`, maria and craters
 * appear: the rough, earthlike surface Galileo reported.
 */
export function moonTexture(relief) {
  const { c, ctx } = canvas(512, 256);
  const rand = seeded(1610);
  ctx.fillStyle = '#c9ccd2';
  ctx.fillRect(0, 0, 512, 256);
  const blobs = relief ? 16 : 7;
  for (let i = 0; i < blobs; i += 1) {
    const x = rand() * 512;
    const y = 40 + rand() * 176;
    const r = 18 + rand() * (relief ? 58 : 40);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, relief ? 'rgba(70,74,84,0.75)' : 'rgba(120,124,134,0.35)');
    g.addColorStop(1, 'rgba(90,94,104,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  if (relief) {
    for (let i = 0; i < 170; i += 1) {
      const x = rand() * 512;
      const y = rand() * 256;
      const r = 1.5 + rand() ** 2 * 11;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(60,62,70,0.45)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - r * 0.18, y - r * 0.18, r * 0.82, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(225,227,232,0.5)';
      ctx.fill();
    }
  }
  return asTexture(c);
}

/** Jupiter's cloud belts, visible only once there is a telescope to see them. */
export function jupiterTexture() {
  const { c, ctx } = canvas(64, 256);
  const rand = seeded(1664);
  const bands = ['#e9d6b4', '#c99f74', '#efe1c6', '#b98658', '#ead9bb', '#d2ab80', '#f0e4cc', '#c2946a', '#e6d2b0'];
  let y = 0;
  while (y < 256) {
    const h = 10 + rand() * 30;
    ctx.fillStyle = bands[Math.floor(rand() * bands.length)];
    ctx.fillRect(0, y, 64, h + 1);
    y += h;
  }
  return asTexture(c);
}

/** A schematic Earth: oceans with a scatter of land, enough to show that it turns. */
export function earthTexture() {
  const { c, ctx } = canvas(512, 256);
  const rand = seeded(1543);
  ctx.fillStyle = '#2c5f9e';
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i += 1) {
    const x = rand() * 512;
    const y = 36 + rand() * 184;
    const r = 14 + rand() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(96,142,82,0.95)');
    g.addColorStop(0.7, 'rgba(120,138,84,0.7)');
    g.addColorStop(1, 'rgba(120,138,84,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.fillStyle = 'rgba(240,244,250,0.9)';
  ctx.fillRect(0, 0, 512, 14);
  ctx.fillRect(0, 242, 512, 14);
  return asTexture(c);
}

/** Radial banding for Saturn's ring, with the Cassini division. Mapped along u. */
export function ringTexture() {
  const { c, ctx } = canvas(256, 4);
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0.0, 'rgba(190,170,130,0.15)');
  g.addColorStop(0.18, 'rgba(215,196,150,0.75)');
  g.addColorStop(0.62, 'rgba(232,214,170,0.95)');
  g.addColorStop(0.69, 'rgba(40,36,28,0.10)');
  g.addColorStop(0.74, 'rgba(222,204,160,0.85)');
  g.addColorStop(1.0, 'rgba(200,182,140,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 4);
  return asTexture(c);
}
