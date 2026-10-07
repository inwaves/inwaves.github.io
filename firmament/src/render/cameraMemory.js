/**
 * Remembers where the outside camera stood while the user visits the view from
 * the Earth, so that coming back does not throw away their framing.
 *
 * The memory refers to one particular scene. A remembered position is a point in
 * that era's scaled coordinates, and means nothing in another era: Jupiter's
 * neighbourhood under Galileo is measured in astronomical units, while Ptolemy's
 * cosmos is measured in Earth radii. It must therefore be invalidated whenever
 * the era changes, and it is consumed when used so that it can never be restored
 * twice.
 */
export class CameraMemory {
  constructor() {
    this.saved = null;
  }

  /** Records copies of the camera's position and the point it orbits. */
  save(position, target) {
    this.saved = { position: position.clone(), target: target.clone() };
  }

  /** Forgets. Call whenever the scene the memory refers to is replaced. */
  invalidate() {
    this.saved = null;
  }

  get hasMemory() {
    return this.saved !== null;
  }

  /** Returns the remembered state and forgets it, or null if there is none. */
  take() {
    const saved = this.saved;
    this.saved = null;
    return saved;
  }
}
