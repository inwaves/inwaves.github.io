import { useState } from 'react';
import { useStore } from '../state/store';
import { speedLabel } from '../state/speeds';
import { getEra } from '../models/registry';
import { localCalendarDate, localDateToJdTT, MONTH_NAMES, ttToUt } from '../astro/time';

export function TimeControls() {
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const togglePlay = useStore((s) => s.togglePlay);
  const faster = useStore((s) => s.faster);
  const slower = useStore((s) => s.slower);
  const reverse = useStore((s) => s.reverse);
  const resetToEpoch = useStore((s) => s.resetToEpoch);
  const [editing, setEditing] = useState(false);
  return (
    <div className="time-controls panel-glass">
      <div className="transport">
        <button className="icon-button" onClick={resetToEpoch} title="Back to this era's moment" aria-label="Back to era epoch">
          ⏮
        </button>
        <button className={`icon-button ${speed < 0 ? 'active' : ''}`} onClick={reverse} title="Reverse time" aria-label="Reverse time">
          ⇆
        </button>
        <button className="icon-button" onClick={slower} title="Slower ([)" aria-label="Slower">
          «
        </button>
        <button className="icon-button play" onClick={togglePlay} title="Play / pause (space)" aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button className="icon-button" onClick={faster} title="Faster (])" aria-label="Faster">
          »
        </button>
        <span className="speed-label">{playing ? speedLabel(speed) : 'paused'}</span>
        <button className="chip small" onClick={() => setEditing((x) => !x)} title="Choose a date">
          Set date
        </button>
      </div>
      {editing && <DateForm onDone={() => setEditing(false)} />}
    </div>
  );
}

function DateForm({ onDone }: { onDone: () => void }) {
  const eraId = useStore((s) => s.eraId);
  const clock = useStore((s) => s.clock);
  const jumpTo = useStore((s) => s.jumpTo);
  const era = getEra(eraId);
  const initial = clock
    ? localCalendarDate(ttToUt(clock.jd), era.location.lon, era.location.reformJd)
    : { year: era.epoch.year, month: era.epoch.month, day: era.epoch.day, hour: era.epoch.hour, minute: era.epoch.minute };
  const [year, setYear] = useState(Math.abs(initial.year <= 0 ? 1 - initial.year : initial.year));
  const [bce, setBce] = useState(initial.year <= 0);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const astronomicalYear = bce ? 1 - year : year;
    jumpTo(localDateToJdTT({ year: astronomicalYear, month, day, hour, minute }, era.location.lon, era.location.reformJd));
    onDone();
  };
  return (
    <form className="date-form" onSubmit={submit}>
      <label>
        Day
        <input type="number" min={1} max={31} value={day} onChange={(e) => setDay(Number(e.target.value))} />
      </label>
      <label>
        Month
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label>
        Year
        <input type="number" min={1} max={3000} value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </label>
      <label className="era-switch">
        <select value={bce ? 'bce' : 'ce'} onChange={(e) => setBce(e.target.value === 'bce')}>
          <option value="bce">BCE</option>
          <option value="ce">CE</option>
        </select>
      </label>
      <label>
        Time
        <span className="time-inputs">
          <input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} />:
          <input type="number" min={0} max={59} value={minute} onChange={(e) => setMinute(Number(e.target.value))} />
        </span>
      </label>
      <button type="submit" className="chip active">
        Go
      </button>
      <p className="form-note">Local mean time at {era.location.name}; Julian calendar before the local Gregorian reform.</p>
    </form>
  );
}
