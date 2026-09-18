import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from 'three';
import { seededRandom } from '../astro/math';

/**
 * Procedural textures, generated once on demand. Photographic maps are used only for the Earth
 * and the Moon (NASA, public domain); everything else is painted so that pre-telescopic
 * worldviews are not dressed in spacecraft imagery.
 */

const cache = new Map<string, Texture>();

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [c, ctx];
}

function cached(key: string, make: () => Texture): Texture {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

function finish(c: HTMLCanvasElement, srgb = true): CanvasTexture {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Soft radial glow for halos and flares (alpha texture). */
export function glowTexture(): Texture {
  return cached('glow', () => {
    const [c, ctx] = canvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.22)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.05)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return finish(c, false);
  });
}

/** Banded gas-giant surface. */
export function bandedTexture(key: string, bands: string[], seed: number, storms = false): Texture {
  return cached(`bands:${key}`, () => {
    const [c, ctx] = canvas(512, 256);
    const rand = seededRandom(seed);
    const h = 256;
    let y = 0;
    while (y < h) {
      const bh = 6 + rand() * 22;
      ctx.fillStyle = bands[Math.floor(rand() * bands.length)];
      ctx.fillRect(0, y, 512, bh + 1);
      y += bh;
    }
    // Wavy turbulence between bands.
    for (let i = 0; i < 900; i++) {
      const yy = rand() * h;
      ctx.fillStyle = bands[Math.floor(rand() * bands.length)];
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(rand() * 512, yy, 8 + rand() * 40, 1 + rand() * 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (storms) {
      ctx.fillStyle = '#c0704a';
      ctx.beginPath();
      ctx.ellipse(330, 160, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const t = finish(c);
    t.wrapS = RepeatWrapping;
    return t;
  });
}

/** Mottled rocky surface. */
export function mottledTexture(key: string, base: string, spots: string[], seed: number): Texture {
  return cached(`mottled:${key}`, () => {
    const [c, ctx] = canvas(512, 256);
    const rand = seededRandom(seed);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = spots[Math.floor(rand() * spots.length)];
      ctx.globalAlpha = 0.08 + rand() * 0.2;
      ctx.beginPath();
      ctx.ellipse(rand() * 512, rand() * 256, 4 + rand() * 50, 3 + rand() * 24, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const t = finish(c);
    t.wrapS = RepeatWrapping;
    return t;
  });
}

/** The top face of Anaximander's drum: the inhabited world ringed by Ocean. */
export function drumTopTexture(): Texture {
  return cached('drum-top', () => {
    const [c, ctx] = canvas(512, 512);
    ctx.fillStyle = '#2f5d7c';
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b89a66';
    ctx.beginPath();
    ctx.arc(256, 256, 205, 0, Math.PI * 2);
    ctx.fill();
    const rand = seededRandom(7);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = rand() > 0.5 ? '#9a7f4f' : '#c7ad7a';
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(256 + (rand() - 0.5) * 380, 256 + (rand() - 0.5) * 380, 6 + rand() * 30, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // The Mediterranean at the centre, with the Black Sea beyond.
    ctx.fillStyle = '#3f7396';
    ctx.beginPath();
    ctx.ellipse(236, 262, 120, 34, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(330, 196, 42, 16, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9d7a8';
    ctx.beginPath();
    ctx.arc(318, 238, 5, 0, Math.PI * 2);
    ctx.fill();
    return finish(c);
  });
}

/** The drum's flank, a banded rock face. */
export function drumSideTexture(): Texture {
  return cached('drum-side', () => {
    const [c, ctx] = canvas(512, 128);
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#8a6c46');
    g.addColorStop(0.5, '#6b5236');
    g.addColorStop(1, '#4a3825');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 128);
    const rand = seededRandom(3);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = 'rgba(40,28,18,0.35)';
      ctx.beginPath();
      const y = rand() * 128;
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + (rand() - 0.5) * 10);
      ctx.stroke();
    }
    const t = finish(c);
    t.wrapS = RepeatWrapping;
    return t;
  });
}

/** Rings of Saturn, as a radial strip (alpha in the texture). */
export function ringTexture(): Texture {
  return cached('rings', () => {
    const [c, ctx] = canvas(512, 8);
    const img = ctx.createImageData(512, 8);
    for (let x = 0; x < 512; x++) {
      const r = x / 511;
      let a = 0;
      if (r > 0.02 && r < 0.3) a = 0.25 + 0.2 * Math.sin(r * 90);
      else if (r >= 0.3 && r < 0.62) a = 0.85 + 0.1 * Math.sin(r * 140);
      else if (r >= 0.62 && r < 0.68) a = 0.08; // Cassini division
      else if (r >= 0.68 && r < 0.95) a = 0.6 + 0.12 * Math.sin(r * 120);
      for (let y = 0; y < 8; y++) {
        const i = (y * 512 + x) * 4;
        img.data[i] = 232;
        img.data[i + 1] = 214;
        img.data[i + 2] = 170;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return finish(c);
  });
}

const loader = new TextureLoader();

/** Photographic map from /public, with sRGB decoding. */
export function photoTexture(url: string): Texture {
  return cached(`photo:${url}`, () => {
    const t = loader.load(url);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

export const SURFACE_TEXTURES = {
  earth: () => photoTexture(`${import.meta.env.BASE_URL}textures/earth.jpg`),
  moon: () => photoTexture(`${import.meta.env.BASE_URL}textures/moon.jpg`),
  jupiter: () => bandedTexture('jupiter', ['#d9b38c', '#e8d2b0', '#b98a64', '#f1e3c8', '#a67b58'], 11, true),
  saturn: () => bandedTexture('saturn', ['#e6d19a', '#d6bd82', '#efe0b4', '#c9ad72'], 23),
  mars: () => mottledTexture('mars', '#c4643a', ['#8e3f22', '#e0875a', '#6e3420'], 5),
  mercury: () => mottledTexture('mercury', '#9d9388', ['#7a7168', '#b8afa4', '#655d55'], 9),
  venus: () => mottledTexture('venus', '#e9dcb4', ['#d8c796', '#f5ecd0', '#c9b684'], 13),
  counter: () => mottledTexture('counter', '#43375a', ['#2e2640', '#5a4a78'], 17),
} as const;
