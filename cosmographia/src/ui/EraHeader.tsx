import { useStore } from '../state/store';
import { getEra } from '../models/registry';

export function EraHeader() {
  const eraId = useStore((s) => s.eraId);
  const clock = useStore((s) => s.clock);
  const era = getEra(eraId);
  return (
    <header className="era-header panel-glass">
      <div className="brand">Cosmographia</div>
      <h1 className="era-figure">{era.figure}</h1>
      <div className="era-title">{era.title}</div>
      <div className="era-meta">
        {era.dates} · {era.location.name}
      </div>
      {clock && (
        <div className="era-clock" title="Local mean time at the astronomer's place, in the calendar then in civil use">
          <span className="clock-date">{clock.date}</span>
          <span className="clock-time">{clock.time}</span>
          <span className="clock-cal">{clock.calendar}</span>
        </div>
      )}
    </header>
  );
}
