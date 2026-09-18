import { useStore } from '../state/store';

export function Intro() {
  const open = useStore((s) => s.introOpen);
  const close = useStore((s) => s.closeIntro);
  if (!open) return null;
  return (
    <div className="intro-backdrop" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro panel-glass">
        <div className="brand">Cosmographia</div>
        <h1 id="intro-title">How the heavens were imagined</h1>
        <p>
          Each stop on the timeline is a working model of the cosmos as one tradition understood it, from Anaximander’s rings of fire to Newton’s
          universal gravitation. Every model runs on its own geometry and parameters, and every one is placed at a real place and a real night.
        </p>
        <ul>
          <li>
            <strong>Cosmos</strong> shows the machinery from outside: spheres, epicycles, orbits. Drag to orbit, scroll to zoom, click a body.
          </li>
          <li>
            <strong>Sky</strong> puts you beside the astronomer. Drag to look around, scroll to zoom, and speed time up to watch the planets loop.
          </li>
          <li>
            <strong>Modern positions</strong> (under Layers) shows where the bodies really were, so you can see how well each worldview predicted the sky.
          </li>
        </ul>
        <p className="muted">Keys: space play/pause · [ ] speed · ← → eras · C/S views · L layers · G modern positions</p>
        <p className="muted intro-credits">
          Stars and constellations from d3-celestial (© Olaf Frohn, BSD-3-Clause) and the HYG Database (CC BY-SA 2.5); Earth and Moon
          imagery from NASA.{' '}
          <a href={`${import.meta.env.BASE_URL}THIRD_PARTY_NOTICES.txt`} target="_blank" rel="noreferrer">
            Third-party notices
          </a>
        </p>
        <button className="chip active big" onClick={close}>
          Begin
        </button>
      </div>
    </div>
  );
}
