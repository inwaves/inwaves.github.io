import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { circle, torus } from '../src/models/guides.js';
import { GuideLayer } from '../src/render/guides.js';

/**
 * Which machinery is drawn from which viewpoint. Guides with captions need a DOM
 * and are not exercised here; circles and wheels do not.
 */
const X = [1, 0, 0];
const Y = [0, 1, 0];
const ORIGIN = [0, 0, 0];

function scene() {
  const layer = new GuideLayer(new Group());
  layer.configure({ scale: 1 });
  const guides = [
    torus('sun-wheel', 'sun', 'wheel', ORIGIN, 27.5, 0.5, X, Y),
    circle('mars-deferent', 'mars', 'deferent', ORIGIN, 10, X, Y),
    circle('mars-epicycle', 'mars', 'epicycle', [10, 0, 0], 3, X, Y),
  ];
  const draw = (options) => {
    layer.update({ guides, selected: null, pixelSize: 0.001, cameraLocal: new Vector3(0, 0, 50), ...options });
    return Object.fromEntries([...layer.drawables].map(([id, d]) => [id, d.object.visible]));
  };
  return { draw };
}

const ALL_ON = { machinery: true, shells: true };

describe('what machinery can be seen, and from where', () => {
  it('shows everything from outside', () => {
    expect(scene().draw({ show: ALL_ON, fromEarth: false })).toEqual({ 'sun-wheel': true, 'mars-deferent': true, 'mars-epicycle': true });
  });

  it('from the Earth shows the wheels of fire, which are physical, and no geometrical constructions', () => {
    // Nobody ever saw a deferent in the sky. Anaximander's wheel is a rim of mist
    // with the Sun as a hole in it, and from his drum its arch is the whole picture.
    expect(scene().draw({ show: ALL_ON, fromEarth: true })).toEqual({ 'sun-wheel': true, 'mars-deferent': false, 'mars-epicycle': false });
  });

  it('hides the wheels too when the machinery is switched off, from either viewpoint', () => {
    const off = { machinery: false, shells: true };
    expect(Object.values(scene().draw({ show: off, fromEarth: true })).some(Boolean)).toBe(false);
    expect(Object.values(scene().draw({ show: off, fromEarth: false })).some(Boolean)).toBe(false);
  });

  it('treats an unspecified viewpoint as outside', () => {
    expect(scene().draw({ show: ALL_ON })).toEqual({ 'sun-wheel': true, 'mars-deferent': true, 'mars-epicycle': true });
  });

  it('brings the constructions back on returning outside', () => {
    const s = scene();
    s.draw({ show: ALL_ON, fromEarth: true });
    expect(s.draw({ show: ALL_ON, fromEarth: false })).toEqual({ 'sun-wheel': true, 'mars-deferent': true, 'mars-epicycle': true });
  });
});
