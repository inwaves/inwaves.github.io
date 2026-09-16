import { useStore } from '../state/store';

export function TopBar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const skyMode = useStore((s) => s.skyMode);
  const setSkyMode = useStore((s) => s.setSkyMode);
  const toggleLayers = useStore((s) => s.toggleLayers);
  const layersOpen = useStore((s) => s.layersOpen);
  const togglePanel = useStore((s) => s.togglePanel);
  const panelOpen = useStore((s) => s.panelOpen);
  const resetCamera = useStore((s) => s.resetCamera);
  const telescopeOpen = useStore((s) => s.telescopeOpen);
  const toggleTelescope = useStore((s) => s.toggleTelescope);
  return (
    <div className="top-bar">
      <div className="segmented" role="tablist" aria-label="View">
        <button className={view === 'cosmos' ? 'active' : ''} onClick={() => setView('cosmos')} title="The worldview from outside (C)">
          Cosmos
        </button>
        <button className={view === 'sky' ? 'active' : ''} onClick={() => setView('sky')} title="The astronomer's sky (S)">
          Sky
        </button>
      </div>
      {view === 'sky' ? (
        <div className="segmented small" aria-label="Sky orientation">
          <button className={skyMode === 'horizon' ? 'active' : ''} onClick={() => setSkyMode('horizon')} title="Horizon of the astronomer's place">
            Horizon
          </button>
          <button className={skyMode === 'ecliptic' ? 'active' : ''} onClick={() => setSkyMode('ecliptic')} title="Locked to the stars, zodiac level">
            Star-locked
          </button>
        </div>
      ) : (
        <button className="chip" onClick={resetCamera} title="Reset the camera">
          Reset view
        </button>
      )}
      <button className={`chip ${telescopeOpen ? 'active' : ''}`} onClick={toggleTelescope} title="Magnified view of the selected body (O)">
        Telescope
      </button>
      <button className={`chip ${layersOpen ? 'active' : ''}`} onClick={toggleLayers} title="Layers and options (L)">
        Layers
      </button>
      <button className={`chip ${panelOpen ? 'active' : ''}`} onClick={togglePanel} title="About this worldview (I)">
        Worldview
      </button>
    </div>
  );
}
