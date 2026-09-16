import { useEffect } from 'react';
import { CanvasHost } from './CanvasHost';
import { EraHeader } from './EraHeader';
import { TopBar } from './TopBar';
import { LayersMenu } from './LayersMenu';
import { EraPanel } from './EraPanel';
import { Inspector } from './Inspector';
import { TimeControls } from './TimeControls';
import { Timeline } from './Timeline';
import { Intro } from './Intro';
import { Telescope } from './Telescope';
import { useStore } from '../state/store';
import { shortcutFor } from './keyboard';

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const s = useStore.getState();
      const action = shortcutFor({
        key: e.key,
        targetTag: target?.tagName?.toUpperCase() ?? '',
        targetEditable: !!target?.isContentEditable,
        targetRole: target?.getAttribute?.('role') ?? null,
        defaultPrevented: e.defaultPrevented,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        introOpen: s.introOpen,
      });
      if (!action) return;
      switch (action) {
        case 'togglePlay':
          e.preventDefault();
          s.togglePlay();
          break;
        case 'slower':
          s.slower();
          break;
        case 'faster':
          s.faster();
          break;
        case 'previousEra':
          s.stepEra(-1);
          break;
        case 'nextEra':
          s.stepEra(1);
          break;
        case 'cosmosView':
          s.setView('cosmos');
          break;
        case 'skyView':
          s.setView('sky');
          break;
        case 'toggleLayersMenu':
          s.toggleLayers();
          break;
        case 'togglePanel':
          s.togglePanel();
          break;
        case 'toggleGhosts':
          s.toggleLayer('ghosts');
          break;
        case 'toggleTrails':
          s.toggleLayer('trails');
          break;
        case 'toggleTelescope':
          s.toggleTelescope();
          break;
        case 'escape':
          if (s.introOpen) s.closeIntro();
          else if (s.layersOpen) s.toggleLayers();
          else s.select(null);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function App() {
  useKeyboard();
  return (
    <div className="app">
      <CanvasHost />
      <EraHeader />
      <TopBar />
      <LayersMenu />
      <EraPanel />
      <Inspector />
      <TimeControls />
      <Timeline />
      <Telescope />
      <Intro />
    </div>
  );
}
