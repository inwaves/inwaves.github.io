import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CameraMemory } from '../src/render/cameraMemory.js';

describe('remembering the outside camera', () => {
  it('starts with nothing to restore', () => {
    const memory = new CameraMemory();
    expect(memory.hasMemory).toBe(false);
    expect(memory.take()).toBeNull();
  });

  it('gives back what was saved', () => {
    const memory = new CameraMemory();
    memory.save(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
    const saved = memory.take();
    expect(saved.position.toArray()).toEqual([1, 2, 3]);
    expect(saved.target.toArray()).toEqual([4, 5, 6]);
  });

  it('copies, so that the camera moving afterwards does not alter the memory', () => {
    const memory = new CameraMemory();
    const position = new Vector3(1, 2, 3);
    const target = new Vector3(0, 0, 0);
    memory.save(position, target);
    // In the sky view the live camera is moved to the observer every frame.
    position.set(99, 99, 99);
    target.set(7, 7, 7);
    const saved = memory.take();
    expect(saved.position.toArray()).toEqual([1, 2, 3]);
    expect(saved.target.toArray()).toEqual([0, 0, 0]);
  });

  it('forgets when the era changes, so stale framing from another model is never restored', () => {
    // Zoom in on Jupiter's moons, visit the sky, change era, come back: the new
    // cosmos must be framed whole, not at a point in the old era's coordinates.
    const memory = new CameraMemory();
    memory.save(new Vector3(37.2, 0.01, -12.9), new Vector3(37.1, 0, -12.9));
    expect(memory.hasMemory).toBe(true);
    memory.invalidate();
    expect(memory.hasMemory).toBe(false);
    expect(memory.take()).toBeNull();
  });

  it('can be restored only once', () => {
    const memory = new CameraMemory();
    memory.save(new Vector3(1, 1, 1), new Vector3());
    expect(memory.take()).not.toBeNull();
    expect(memory.take()).toBeNull();
  });

  it('keeps only the most recent visit', () => {
    const memory = new CameraMemory();
    memory.save(new Vector3(1, 0, 0), new Vector3());
    memory.save(new Vector3(2, 0, 0), new Vector3());
    expect(memory.take().position.x).toBe(2);
  });
});
