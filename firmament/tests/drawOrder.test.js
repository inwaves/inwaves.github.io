import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ERAS } from '../src/data/eras.js';
import { torus } from '../src/models/guides.js';
import { DRAW_ORDER, isVent, ventBrightness, ventNarrowing } from '../src/render/drawOrder.js';
import { GuideLayer } from '../src/render/guides.js';

describe('a vent is a hole in the mist, so the mist must not veil it', () => {
  it('draws vents after mist', () => {
    expect(DRAW_ORDER.vent).toBeGreaterThan(DRAW_ORDER.mist);
  });

  it('gives every part of a wheel of fire the mist\'s place in the order', () => {
    const layer = new GuideLayer(new Group());
    layer.configure({ scale: 1 });
    layer.update({
      guides: [torus('sun-wheel', 'sun', 'wheel', [0, 0, 0], 27.5, 0.5)],
      selected: null,
      show: { machinery: true, shells: true },
      pixelSize: 0.001,
      cameraLocal: new Vector3(0, 0, 50),
    });
    const parts = layer.drawables.get('sun-wheel').object.children;
    expect(parts.length).toBe(2);
    for (const part of parts) expect(part.renderOrder).toBe(DRAW_ORDER.mist);
  });

  it('treats Anaximander\'s Sun and Moon as vents, and his Earth as a body', () => {
    const model = ERAS.find((era) => era.id === 'anaximander').createModel();
    expect(isVent(model, 'sun')).toBe(true);
    expect(isVent(model, 'moon')).toBe(true);
    expect(isVent(model, 'earth')).toBe(false);
  });

  it('shows a vent at full colour when open, dimly when shut, and never beyond either', () => {
    expect(ventBrightness(1)).toBe(1);
    expect(ventBrightness()).toBe(1);
    expect(ventBrightness(0)).toBe(0.25);
    expect(ventBrightness(-3)).toBe(0.25);
    expect(ventBrightness(7)).toBe(1);
    let previous = ventBrightness(0);
    for (let a = 0.05; a <= 1; a += 0.05) {
      expect(ventBrightness(a)).toBeGreaterThan(previous);
      previous = ventBrightness(a);
    }
  });

  it('narrows a vent as the square root of its aperture, and never to nothing', () => {
    expect(ventNarrowing(1)).toBe(1);
    expect(ventNarrowing(0.25)).toBeCloseTo(0.5, 12);
    expect(ventNarrowing(0)).toBe(0.18);
    expect(ventNarrowing(-1)).toBe(0.18);
    expect(ventNarrowing(4)).toBe(1);
  });

  it('treats nothing as a vent in any other worldview', () => {
    for (const era of ERAS) {
      if (era.id === 'anaximander') continue;
      const model = era.createModel();
      const { bodies } = model.state(era.defaultJd, { guides: false });
      for (const id of Object.keys(bodies)) expect(isVent(model, id), `${era.id}: ${id}`).toBe(false);
    }
  });
});
