// Small procedural textures so the app has no binary assets and works offline.
import * as THREE from 'three';

const cache = new Map();

function memo(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

/** Deterministic PRNG (mulberry32) so textures are identical between runs. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toTexture(c, { srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Soft radial glow for emissive bodies. */
export function glowTexture() {
  return memo('glow', () => {
    const c = canvas(128, 128);
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return toTexture(c);
  });
}

/** Cratered grey Moon (post-Galileo). */
export function moonTexture() {
  return memo('moon', () => {
    const w = 1024;
    const h = 512;
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const r = rng(7);
    g.fillStyle = '#a9a7a2';
    g.fillRect(0, 0, w, h);
    // maria: large dark patches
    for (let k = 0; k < 14; k++) {
      const x = r() * w;
      const y = h * (0.2 + 0.6 * r());
      const rad = 40 + r() * 110;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, 'rgba(70,72,78,0.55)');
      grad.addColorStop(1, 'rgba(70,72,78,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    // craters: dark floor, bright rim
    for (let k = 0; k < 260; k++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 2 + r() * r() * 26;
      g.fillStyle = `rgba(60,60,64,${0.25 + 0.35 * r()})`;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = `rgba(230,228,222,${0.3 + 0.4 * r()})`;
      g.lineWidth = Math.max(1, rad * 0.18);
      g.beginPath();
      g.arc(x - rad * 0.1, y - rad * 0.1, rad, 0, Math.PI * 2);
      g.stroke();
    }
    // fine grain
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 22;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    return toTexture(c);
  });
}

/** Sun with a belt of sunspots (post-1612). */
export function sunTexture() {
  return memo('sun', () => {
    const w = 1024;
    const h = 512;
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const r = rng(3);
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ffd36a');
    grad.addColorStop(0.5, '#ffc33a');
    grad.addColorStop(1, '#ffd36a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 1400; k++) {
      g.fillStyle = `rgba(255,${180 + r() * 60},${60 + r() * 80},${0.08 + r() * 0.12})`;
      g.beginPath();
      g.arc(r() * w, r() * h, 3 + r() * 14, 0, Math.PI * 2);
      g.fill();
    }
    for (let k = 0; k < 9; k++) {
      const x = r() * w;
      const y = h * (0.5 + (r() - 0.5) * 0.35);
      const rad = 5 + r() * 12;
      g.fillStyle = 'rgba(120,60,10,0.8)';
      g.beginPath();
      g.ellipse(x, y, rad * 1.6, rad, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(40,15,0,0.95)';
      g.beginPath();
      g.ellipse(x, y, rad * 0.9, rad * 0.55, 0, 0, Math.PI * 2);
      g.fill();
    }
    return toTexture(c);
  });
}

/** Blue-green Earth with schematic continents and polar caps. */
export function earthTexture() {
  return memo('earth', () => {
    const w = 1024;
    const h = 512;
    const c = canvas(w, h);
    const g = c.getContext('2d');
    const r = rng(11);
    g.fillStyle = '#27528f';
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 9; k++) {
      const cx = r() * w;
      const cy = h * (0.2 + 0.6 * r());
      g.fillStyle = k % 3 === 0 ? '#6f8a4a' : '#8a7d4e';
      for (let j = 0; j < 70; j++) {
        const ang = r() * Math.PI * 2;
        const dist = r() * r() * 150;
        g.beginPath();
        g.arc(cx + Math.cos(ang) * dist * 1.6, cy + Math.sin(ang) * dist, 8 + r() * 28, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.fillStyle = '#e9eef5';
    g.fillRect(0, 0, w, 26);
    g.fillRect(0, h - 30, w, 30);
    return toTexture(c);
  });
}

/** Saturn's ring as an annulus with a Cassini-like gap. */
export function ringTexture() {
  return memo('ring', () => {
    const w = 512;
    const c = canvas(w, 8);
    const g = c.getContext('2d');
    for (let x = 0; x < w; x++) {
      const f = x / w;
      let a = 0.85;
      if (f > 0.58 && f < 0.64) a = 0.15; // Cassini division
      if (f < 0.08) a = 0.25 + f * 5;
      const tone = 200 + Math.sin(f * 50) * 18;
      g.fillStyle = `rgba(${tone},${tone - 18},${tone - 60},${a})`;
      g.fillRect(x, 0, 1, 8);
    }
    return toTexture(c);
  });
}
