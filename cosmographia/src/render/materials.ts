import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  Texture,
  Vector3,
  type Side,
} from 'three';
import type { ShellStyle } from './palette';

/** Lit planetary surface: the lit hemisphere always faces the model's Sun. */
export function createBodyMaterial(options: { color: string; map?: Texture | null; lit: boolean; tint?: number }): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      map: { value: options.map ?? null },
      hasMap: { value: options.map ? 1 : 0 },
      color: { value: new Color(options.color) },
      sunDir: { value: new Vector3(1, 0, 0) },
      lit: { value: options.lit ? 1 : 0 },
      ambient: { value: 0.07 },
      tint: { value: options.tint ?? 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float hasMap;
      uniform vec3 color;
      uniform vec3 sunDir;
      uniform float lit;
      uniform float ambient;
      uniform float tint;
      varying vec3 vNormalW;
      varying vec2 vUv;
      void main() {
        vec3 base = hasMap > 0.5 ? texture2D(map, vUv).rgb : color;
        // Sepia wash for pre-modern eras: the Earth as an old globe rather than a photograph.
        float lum = dot(base, vec3(0.299, 0.587, 0.114));
        base = mix(base, vec3(lum * 1.08, lum * 0.95, lum * 0.72), tint);
        float ndl = dot(normalize(vNormalW), normalize(sunDir));
        float light = lit > 0.5 ? smoothstep(-0.12, 0.35, ndl) + ambient : 1.0;
        gl_FragColor = vec4(base * light, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Self-luminous Sun (or Central Fire): limb darkening and a slow granulation shimmer. */
export function createSunMaterial(inner: string, outer: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      inner: { value: new Color(inner) },
      outer: { value: new Color(outer) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalV;
      varying vec3 vPos;
      void main() {
        vNormalV = normalize(normalMatrix * normal);
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform vec3 inner;
      uniform vec3 outer;
      varying vec3 vNormalV;
      varying vec3 vPos;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float noise(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        float n = mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        return n;
      }
      void main() {
        float mu = clamp(dot(normalize(vNormalV), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
        float limb = 0.35 + 0.65 * pow(mu, 0.45);
        vec3 p = normalize(vPos) * 6.0;
        float g = noise(p + time * 0.05) * 0.6 + noise(p * 2.3 - time * 0.03) * 0.4;
        vec3 c = mix(outer, inner, limb) * (0.9 + 0.2 * g);
        gl_FragColor = vec4(c * 1.15, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Translucent crystalline or elemental shell with a Fresnel rim, optionally cut away toward the viewer. */
export function createShellMaterial(style: ShellStyle, cutaway: boolean, side: Side = DoubleSide): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      color: { value: new Color(style.color) },
      opacity: { value: style.opacity },
      rimPower: { value: style.rimPower },
      cutaway: { value: cutaway ? 1 : 0 },
      dim: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalV;
      varying vec3 vPosV;
      varying vec3 vWorldPos;
      varying vec3 vCenterW;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vPosV = mv.xyz;
        vNormalV = normalize(normalMatrix * normal);
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vCenterW = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float opacity;
      uniform float rimPower;
      uniform float cutaway;
      uniform float dim;
      varying vec3 vNormalV;
      varying vec3 vPosV;
      varying vec3 vWorldPos;
      varying vec3 vCenterW;
      void main() {
        if (cutaway > 0.5) {
          vec3 toCam = normalize(cameraPosition - vCenterW);
          vec3 toFrag = normalize(vWorldPos - vCenterW);
          if (dot(toCam, toFrag) > 0.25) discard;
        }
        float facing = abs(dot(normalize(vNormalV), normalize(-vPosV)));
        float rim = pow(1.0 - facing, rimPower);
        float a = opacity * dim * (0.15 + 2.4 * rim);
        gl_FragColor = vec4(color * (0.7 + 0.8 * rim), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side,
    blending: AdditiveBlending,
  });
}

/** Point sprites for stars: size in CSS pixels per vertex, colour per vertex, horizon extinction. */
export function createStarMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      pixelRatio: { value: 1 },
      scale: { value: 1 },
      fade: { value: 1 },
      horizonFade: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute vec3 color;
      uniform float pixelRatio;
      uniform float scale;
      uniform float horizonFade;
      varying vec3 vColor;
      varying float vHorizon;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        float alt = normalize(world.xyz - cameraPosition).y;
        vHorizon = mix(1.0, smoothstep(-0.03, 0.18, alt) * 0.75 + 0.25 * step(0.0, alt), horizonFade);
        vColor = color;
        vec4 mv = viewMatrix * world;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * scale * pixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float fade;
      varying vec3 vColor;
      varying float vHorizon;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float core = exp(-d * d * 5.5);
        float halo = exp(-d * 2.4) * 0.25;
        float a = (core + halo) * fade * vHorizon;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/** Screen-space markers (planets, ghosts) with glow; per-vertex size, colour and alpha. */
export function createMarkerMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { pixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute vec3 color;
      attribute float alpha;
      attribute float shape;
      uniform float pixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vShape;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vShape = shape;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vShape;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a;
        if (vShape > 0.5) {
          // hollow ring (modern position ghost)
          a = smoothstep(0.62, 0.72, d) * (1.0 - smoothstep(0.86, 0.98, d));
        } else {
          float core = 1.0 - smoothstep(0.18, 0.32, d);
          float glow = exp(-d * 3.2) * 0.55;
          a = max(core, glow);
        }
        a *= vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}
