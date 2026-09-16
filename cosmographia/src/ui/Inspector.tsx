import { useStore } from '../state/store';

export function Inspector() {
  const readout = useStore((s) => s.readout);
  const view = useStore((s) => s.view);
  const select = useStore((s) => s.select);
  const focusOn = useStore((s) => s.focusOn);
  const lookAt = useStore((s) => s.lookAt);
  const ghosts = useStore((s) => s.layers.ghosts);
  const toggleLayer = useStore((s) => s.toggleLayer);
  if (!readout) return null;
  const error = readout.errorDeg;
  const errorClass = error === undefined ? '' : error < 1 ? 'good' : error < 5 ? 'fair' : 'poor';
  return (
    <div className="inspector panel-glass" aria-live="polite">
      <div className="inspector-head">
        <h2>{readout.name}</h2>
        <button className="icon-button" onClick={() => select(null)} aria-label="Deselect">
          ×
        </button>
      </div>
      <p className="role">{readout.role}</p>
      {readout.longitude !== '\u2014' && (
        <dl className="readout-grid">
          <dt>Longitude</dt>
          <dd>{readout.longitude}</dd>
          <dt>Latitude</dt>
          <dd>{readout.latitude}</dd>
          <dt>Distance</dt>
          <dd>{readout.distance}</dd>
          {readout.elongationDeg !== undefined && (
            <>
              <dt>From the Sun</dt>
              <dd>{readout.elongationDeg.toFixed(1)}°</dd>
            </>
          )}
          {readout.illuminated !== undefined && (
            <>
              <dt>Lit fraction</dt>
              <dd>{Math.round(readout.illuminated * 100)}%</dd>
            </>
          )}
          {readout.realLongitude && (
            <>
              <dt>Really at</dt>
              <dd>{readout.realLongitude}</dd>
              <dt>Model error</dt>
              <dd className={`error ${errorClass}`}>{error!.toFixed(2)}°</dd>
            </>
          )}
        </dl>
      )}
      <div className="inspector-actions">
        {view === 'cosmos' ? (
          <button className="chip" onClick={() => focusOn(readout.id)}>
            Follow
          </button>
        ) : (
          <button className="chip" onClick={() => lookAt(readout.id)}>
            Center
          </button>
        )}
        {readout.realLongitude && (
          <button className={`chip ${ghosts ? 'active' : ''}`} onClick={() => toggleLayer('ghosts')}>
            {ghosts ? 'Hide real sky' : 'Show real sky'}
          </button>
        )}
      </div>
    </div>
  );
}
