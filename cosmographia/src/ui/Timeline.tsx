import { useStore } from '../state/store';
import { ERAS, eraIndex } from '../models/registry';

export function Timeline() {
  const eraId = useStore((s) => s.eraId);
  const setEra = useStore((s) => s.setEra);
  const stepEra = useStore((s) => s.stepEra);
  const idx = eraIndex(eraId);
  return (
    <nav className="timeline" aria-label="Worldviews through history">
      <button className="icon-button nav" onClick={() => stepEra(-1)} disabled={idx <= 0} aria-label="Earlier worldview">
        ‹
      </button>
      <ol className="timeline-track">
        {ERAS.map((era, i) => (
          <li key={era.id} className={`timeline-item ${i === idx ? 'current' : ''} ${i < idx ? 'past' : ''}`}>
            <button onClick={() => setEra(era.id)} title={`${era.figure}: ${era.title}`}>
              <span className="dot" />
              <span className="t-name">{era.figure.split(' ').slice(-1)[0]}</span>
              <span className="t-date">{era.dates}</span>
            </button>
          </li>
        ))}
      </ol>
      <button className="icon-button nav" onClick={() => stepEra(1)} disabled={idx >= ERAS.length - 1} aria-label="Later worldview">
        ›
      </button>
    </nav>
  );
}
