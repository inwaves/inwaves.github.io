import { useEffect, useRef } from 'react';
import { Engine } from '../render/Engine';

/** Mounts the WebGL engine once. */
export function CanvasHost() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let engine: Engine | null = null;
    try {
      engine = new Engine(el);
      engine.start();
    } catch (err) {
      el.innerHTML = `<div class="webgl-error">This exploration needs WebGL, which this browser could not start.<br/><small>${String(
        err,
      )}</small></div>`;
    }
    return () => engine?.dispose();
  }, []);
  return <div ref={ref} className="canvas-host" />;
}
