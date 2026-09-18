import { useState } from 'react';
import { useStore } from '../state/store';
import { getEra } from '../models/registry';
import { contentFor } from '../content';

type Tab = 'worldview' | 'mechanism' | 'evidence' | 'notes';

export function EraPanel() {
  const open = useStore((s) => s.panelOpen);
  const eraId = useStore((s) => s.eraId);
  const applyEvent = useStore((s) => s.applyEvent);
  const togglePanel = useStore((s) => s.togglePanel);
  const [tab, setTab] = useState<Tab>('worldview');
  if (!open) return null;
  const era = getEra(eraId);
  const content = contentFor(eraId);
  return (
    <aside className="era-panel panel-glass" aria-label={`About ${era.figure}`}>
      <div className="panel-head">
        <div className="tabs" role="tablist">
          {(['worldview', 'mechanism', 'evidence', 'notes'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t === 'worldview' ? 'Worldview' : t === 'mechanism' ? 'Motions' : t === 'evidence' ? 'Evidence' : 'Notes'}
            </button>
          ))}
        </div>
        <button className="icon-button" onClick={togglePanel} aria-label="Close panel">
          ×
        </button>
      </div>
      <div className="panel-body">
        {!content ? (
          <p className="muted">No narrative has been written for this worldview.</p>
        ) : tab === 'worldview' ? (
          <>
            <p className="headline">{content.headline}</p>
            {content.overview.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <div className="kuhn-note">
              <span className="kuhn-label">In Kuhn</span>
              {content.kuhn}
            </div>
            {era.events.length > 0 && (
              <section className="events">
                <h3>Moments to visit</h3>
                {era.events.map((ev) => (
                  <button key={ev.id} className="event" onClick={() => applyEvent(ev)}>
                    <span className="event-label">{ev.label}</span>
                    <span className="event-desc">{ev.description}</span>
                  </button>
                ))}
              </section>
            )}
            <section>
              <h3>Try this</h3>
              <ul className="try-list">
                {content.tryThis.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          </>
        ) : tab === 'mechanism' ? (
          content.mechanism.map((m) => (
            <section key={m.title} className="mechanism-item">
              <h3>{m.title}</h3>
              <p>{m.text}</p>
            </section>
          ))
        ) : tab === 'evidence' ? (
          <>
            <section>
              <h3>What it explained</h3>
              <ul className="check-list">
                {content.explained.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>What it could not</h3>
              <ul className="cross-list">
                {content.problems.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <>
            <section>
              <h3>About this simulation</h3>
              <ul className="notes-list">
                {content.modelNotes.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>Sources</h3>
              <ul className="notes-list">
                {content.sources.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
