import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Crosshair,
  Eye,
  Globe2,
  Layers3,
  Maximize2,
  MoveUpRight,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { SceneSettings } from "./Scene";
import { eras, getEra, hasJovianMoons, sources, type ModelId } from "./history";
import { apparentLongitudes, getBodies } from "./model";
const Scene = lazy(() => import("./Scene"));

function Mark({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "orbis-mark small" : "orbis-mark"}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="22" />
      <ellipse cx="32" cy="32" rx="10" ry="28" transform="rotate(-34 32 32)" />
      <ellipse cx="32" cy="32" rx="28" ry="9" transform="rotate(-19 32 32)" />
      <path d="M32 0v9M32 55v9M0 32h9M55 32h9" />
      <circle className="mark-center" cx="32" cy="32" r="3.5" />
    </svg>
  );
}
function MotionChart({
  model,
  body,
  time,
}: {
  model: ModelId;
  body: string;
  time: number;
}) {
  const values = useMemo(
    () => apparentLongitudes(model, body, Math.floor(time / 20) * 20),
    [model, body, time],
  );
  const lo = Math.min(...values),
    hi = Math.max(...values),
    span = Math.max(0.01, hi - lo);
  const points = values
    .map(
      (value, i) => `${(i / 120) * 260 + 5},${66 - ((value - lo) / span) * 55}`,
    )
    .join(" ");
  return (
    <div className="motion-chart">
      <svg
        viewBox="0 0 270 80"
        role="img"
        aria-label="Apparent longitude from Earth over 860 days. A descending segment means retrograde motion."
      >
        <path d="M5 70H265M5 40H265M5 10H265" className="chart-grid" />
        <path d="M135 5V70" className="chart-now" />
        <polyline points={points} />
        <circle cx="135" cy={66 - ((values[60] - lo) / span) * 55} r="3" />
      </svg>
      <div>
        <span>−430 days</span>
        <span>NOW</span>
        <span>+430 days</span>
      </div>
    </div>
  );
}

export default function App() {
  const [eraId, setEraId] = useState<ModelId>(
    () => getEra(new URLSearchParams(window.location.search).get("era")).id,
  );
  const era = getEra(eraId),
    index = eras.findIndex((e) => e.id === eraId);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [speed, setSpeed] = useState(12);
  const [time, setTime] = useState(0);
  const clock = useRef(0);
  const [view, setView] = useState<"cosmic" | "earth">("cosmic");
  const [settings, setSettings] = useState<SceneSettings>({
    paths: true,
    labels: true,
    sphere: true,
    trail: false,
  });
  const [layersOpen, setLayersOpen] = useState(false);
  const [selected, setSelected] = useState("earth");
  const [focusToken, setFocusToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [topView, setTopView] = useState(false);
  const [experiment, setExperiment] = useState(false);
  const [modal, setModal] = useState<"guide" | "sources" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const priorFocus = useRef<HTMLElement | null>(null);
  const activeChapter = useRef<HTMLButtonElement>(null);
  const sceneShell = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");
  const bodies = useMemo(() => getBodies(eraId, 0), [eraId]);
  const body = bodies.find((b) => b.id === selected) ?? bodies[0];
  const changeEra = useCallback((id: ModelId) => {
    setEraId(id);
    setExperiment(false);
    setTopView(false);
    clock.current = 0;
    setTime(0);
    setSelected(id === "hipparchus" ? "sun" : "earth");
    setSettings((current) => ({ ...current, trail: false }));
    const url = new URL(window.location.href);
    url.searchParams.set("era", id);
    window.history.replaceState({}, "", url);
  }, []);
  useEffect(() => {
    const chapter = activeChapter.current;
    const track = chapter?.parentElement;
    if (chapter && track)
      track.scrollTo({
        left:
          chapter.offsetLeft -
          track.offsetLeft -
          track.clientWidth / 2 +
          chapter.clientWidth / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }, [eraId]);
  // Cancel the running clock before paint and publish its final value on pause.
  // Playback is independent of WebGL so charts also work without a 3D context.
  useLayoutEffect(() => {
    setTime(clock.current);
    let animation = 0,
      last = performance.now(),
      lastUpdate = last;
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.075);
      last = now;
      if (playing && !document.hidden) clock.current += delta * speed;
      if (now - lastUpdate > 120) {
        setTime(clock.current);
        lastUpdate = now;
      }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [playing, speed]);
  useEffect(() => {
    if (modal && !dialog.current?.open) {
      priorFocus.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else if (!modal) {
      dialog.current?.close();
      priorFocus.current?.focus();
    }
  }, [modal]);
  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (modal || element.closest("input, select, textarea, button, a"))
        return;
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((p) => !p);
      }
      if (event.key.toLowerCase() === "r") {
        setResetToken((t) => t + 1);
        setTopView(false);
      }
      if (event.key === "ArrowRight" && index < eras.length - 1)
        changeEra(eras[index + 1].id);
      if (event.key === "ArrowLeft" && index > 0) changeEra(eras[index - 1].id);
    };
    const onFullscreen = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener("keydown", handleKeys);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("keydown", handleKeys);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [index, modal, changeEra]);
  const focus = (id = selected) => {
    setSelected(id);
    setFocusToken((n) => n + 1);
  };
  const startExperiment = () => {
    if (experiment) {
      setExperiment(false);
      setSettings((s) => ({ ...s, trail: false }));
      return;
    }
    setExperiment(true);
    setView("cosmic");
    setTopView(false);
    setResetToken((n) => n + 1);
    setSettings((s) => ({
      ...s,
      paths: true,
      labels: true,
      trail: !experiment,
    }));
    const id = hasJovianMoons(eraId)
      ? "jupiter"
      : eraId === "kepler"
        ? "mercury"
        : eraId === "hipparchus" || eraId === "anaximander" || eraId === "tycho"
          ? "sun"
          : "mars";
    setSelected(id);
    if (hasJovianMoons(eraId)) {
      setSpeed(0.5);
      focus(id);
    } else setSpeed(20);
    setPlaying(true);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (sceneShell.current?.requestFullscreen)
        await sceneShell.current.requestFullscreen();
      else setNotice("Fullscreen is not supported by this browser.");
    } catch {
      setNotice(
        "The browser did not allow fullscreen. The 3D view is still interactive.",
      );
    }
  };
  const seek = (value: number) => {
    clock.current = value;
    setTime(value);
  };
  const progress = Math.min(time, 1095);
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="./" aria-label="Orbis home">
          <Mark />
          <div>
            ORBIS<span>THE CHANGING HEAVENS</span>
          </div>
        </a>
        <div className="header-caption">
          <span /> A journey through our idea of the universe
        </div>
        <button className="guide-button" onClick={() => setModal("guide")}>
          <BookOpen size={16} />
          <span>Field guide</span>
          <MoveUpRight size={13} />
        </button>
      </header>
      <main className="explorer">
        <aside
          className={`story-panel ${detailsOpen ? "expanded" : ""}`}
          aria-label="Historical model description"
        >
          <div className="chapter-kicker">
            <span className="chapter-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>A HISTORY OF THE HEAVENS</span>
          </div>
          <div className="story-heading">
            <div className="era-meta">
              <span>{era.date}</span>
              <span className="era-family">
                {eraId === "galileo"
                  ? "OBSERVATIONAL"
                  : ["copernicus", "kepler", "harmony"].includes(eraId)
                    ? "HELIOCENTRIC"
                    : eraId === "tycho"
                      ? "GEOHELIOCENTRIC"
                      : "GEOCENTRIC"}
              </span>
            </div>
            <h1 key={era.id}>{era.title}</h1>
            <div className="author-line">
              <span>{era.name}</span>
              <span className="author-line-rule" />
            </div>
            <p className="location">{era.place}</p>
          </div>
          <p className="story-description">{era.description}</p>
          <button
            className="mobile-details"
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? "Less about this model" : "About this worldview"}
            <ChevronDown size={15} />
          </button>
          <div className="story-details">
            <div className="model-facts">
              <div>
                <Crosshair size={17} />
                <p>
                  <span>AT THE CENTER</span>
                  {era.center}
                </p>
              </div>
              <div>
                <Orbit size={17} />
                <p>
                  <span>IN MOTION</span>
                  {era.motion}
                </p>
              </div>
              <div>
                <Eye size={17} />
                <p>
                  <span>KNOWN HEAVENS</span>
                  {eraId === "anaximander"
                    ? "Sun, Moon & star apertures"
                    : eraId === "hipparchus"
                      ? "Solar theory in focus"
                      : hasJovianMoons(eraId)
                        ? "Five planets + four Jovian moons"
                        : "Sun, Moon & five planets"}
                </p>
              </div>
            </div>
            <div className="turning-point">
              <span className="eyebrow">
                <Sparkles size={13} /> THE SHIFT IN THINKING
              </span>
              <p>{era.change}</p>
            </div>
            <button className="source-link" onClick={() => setModal("sources")}>
              <BookOpen size={13} /> Historical notes & sources{" "}
              <MoveUpRight size={12} />
            </button>
          </div>
          <div className="story-footnote">
            <span className="status-dot" />
            {era.evidence}
          </div>
        </aside>
        <section
          className="cosmos-panel"
          ref={sceneShell}
          aria-label="Interactive cosmos"
        >
          <Suspense
            fallback={
              <div className="scene-loading">Assembling the heavens…</div>
            }
          >
            <Scene
              model={eraId}
              clock={clock}
              playing={playing}
              view={view}
              settings={settings}
              selected={selected}
              focusToken={focusToken}
              resetToken={resetToken}
              topView={topView}
              onSelect={setSelected}
            />
          </Suspense>
          <div className="canvas-vignette" />
          <div className="scene-topbar">
            <div className="view-tabs" role="group" aria-label="Viewpoint">
              <button
                className={view === "cosmic" ? "active" : ""}
                aria-pressed={view === "cosmic"}
                onClick={() => setView("cosmic")}
              >
                <Orbit size={15} /> Cosmic view
              </button>
              <button
                className={view === "earth" ? "active" : ""}
                aria-pressed={view === "earth"}
                onClick={() => setView("earth")}
              >
                <Globe2 size={15} /> From Earth
              </button>
            </div>
            <div className="layers-wrap">
              <button
                className={`layer-button ${layersOpen ? "active" : ""}`}
                aria-expanded={layersOpen}
                onClick={() => setLayersOpen((v) => !v)}
              >
                <Layers3 size={16} />
                <span>Layers</span>
                <ChevronDown size={13} />
              </button>
              {layersOpen && (
                <div className="layers-menu">
                  <span className="eyebrow">VISIBLE IN THIS WORLD</span>
                  {(
                    [
                      ["paths", "Orbital paths"],
                      ["labels", "Celestial labels"],
                      ["sphere", "Celestial sphere"],
                      ["trail", "Motion trail"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={settings[key]}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            [key]: e.target.checked,
                          }))
                        }
                      />
                    </label>
                  ))}
                  <p>
                    Orbits are guides, not physical tracks. The star field is
                    illustrative.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="scene-caption">
            <div className="eyebrow">
              <span className="tiny-cross">+</span>
              {era.subtitle}
            </div>
            <span>
              {view === "earth"
                ? "An Earth-centered perspective · not a local sky chart"
                : "An imagined universe, made explorable"}
            </span>
            <button
              className={`experiment-button ${experiment ? "active" : ""}`}
              onClick={startExperiment}
            >
              <Orbit size={15} />
              <span>{experiment ? "End exploration" : era.experiment}</span>
              {experiment ? <X size={14} /> : <ArrowRight size={15} />}
            </button>
          </div>
          <div className="scene-toolbar" aria-label="Camera controls">
            <button
              onClick={() => {
                setTopView(false);
                setResetToken((n) => n + 1);
              }}
              title="Reset camera (R)"
              aria-label="Reset camera"
            >
              <RotateCcw size={17} />
            </button>
            <button
              className={topView ? "active" : ""}
              onClick={() => {
                setView("cosmic");
                setTopView((t) => !t);
              }}
              title="Top-down view"
              aria-label="Top-down view"
              aria-pressed={topView}
            >
              <Compass size={19} />
            </button>
            <span />
            <button
              onClick={toggleFullscreen}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <Maximize2 size={17} />
            </button>
          </div>
          <div className="orientation">
            <svg viewBox="0 0 58 58" aria-hidden="true">
              <path d="M29 5V51M7 42L50 17M8 19L48 42" />
              <circle cx="29" cy="29" r="2" />
              <text x="26" y="9">
                N
              </text>
            </svg>
            <span>
              {view === "cosmic" ? "ORBITAL PLANE" : "EARTH-CENTERED"}
            </span>
          </div>
          {experiment ? (
            <div className="discovery-card" aria-live="polite">
              <div className="card-heading">
                <span className="eyebrow">LOOK A LITTLE CLOSER</span>
                <button
                  aria-label="Close exploration"
                  onClick={() => {
                    setExperiment(false);
                    setSettings((s) => ({ ...s, trail: false }));
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              <h2>{era.idea}</h2>
              <p>{era.experimentText}</p>
              {!["anaximander", "hipparchus"].includes(eraId) && (
                <>
                  <MotionChart
                    model={eraId}
                    body={selected === "earth" ? "mars" : selected}
                    time={Math.floor(time / 20) * 20}
                  />
                  <div className="chart-caption">
                    Apparent longitude from Earth · down = retrograde
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="selected-card">
              <div className="selected-card-label">
                <span className="eyebrow">IN YOUR UNIVERSE</span>
                <span
                  className="selected-dot"
                  style={{ background: body.color }}
                />
              </div>
              <div className="selected-card-body">
                <div>
                  <label className="sr-only" htmlFor="body-picker">
                    Selected celestial body
                  </label>
                  <select
                    id="body-picker"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {bodies.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <span>
                    {selected === "earth"
                      ? ["copernicus", "kepler", "galileo", "harmony"].includes(
                          eraId,
                        )
                        ? "Our world becomes a wanderer"
                        : "Still, at the heart of the cosmos"
                      : body.parent === "jupiter"
                        ? "A Medicean star · discovered 1610"
                        : selected === "sun"
                          ? "The light that orders the day"
                          : selected === "moon"
                            ? "Our nearest celestial companion"
                            : "One of the wandering stars"}
                  </span>
                </div>
                <button
                  aria-label={`Focus on ${body.name}`}
                  title={`Focus on ${body.name}`}
                  onClick={() => focus()}
                >
                  <Crosshair size={19} />
                </button>
              </div>
              {hasJovianMoons(eraId) && (
                <div className="moon-discovery">
                  <Sparkles size={12} /> Four Jovian moons are now visible
                </div>
              )}
            </div>
          )}
          <div className="scene-bottomline">
            <span>
              <span className="live-dot" />
              {playing ? "SIMULATION RUNNING" : "SIMULATION PAUSED"}
            </span>
            <p>
              {view === "cosmic" ? "Drag to orbit" : "Drag to look"}
              <i />
              Scroll to zoom
              <i />
              Click to discover
            </p>
          </div>
          {notice && (
            <button className="notice" onClick={() => setNotice("")}>
              {notice}
              <X size={13} />
            </button>
          )}
        </section>
      </main>
      <section className="timeline-section" aria-label="Historical timeline">
        <div className="timeline-heading">
          <div>
            <span className="eyebrow">THE CHANGING HEAVENS</span>
            <span className="timeline-invitation">
              Travel through a history of ideas
            </span>
          </div>
          <div className="timeline-arrows">
            <span>
              {String(index + 1).padStart(2, "0")}{" "}
              <i>/ {String(eras.length).padStart(2, "0")}</i>
            </span>
            <button
              aria-label="Previous worldview"
              disabled={index === 0}
              onClick={() => changeEra(eras[index - 1].id)}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              aria-label="Next worldview"
              disabled={index === eras.length - 1}
              onClick={() => changeEra(eras[index + 1].id)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
        <div className="mobile-era-picker">
          <label htmlFor="era-picker">JUMP TO A WORLDVIEW</label>
          <select
            id="era-picker"
            value={eraId}
            onChange={(event) => changeEra(event.target.value as ModelId)}
          >
            {eras.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name} · {chapter.date}
              </option>
            ))}
          </select>
        </div>
        <nav
          className="timeline-track"
          aria-label="Choose a historical worldview"
        >
          {eras.map((chapter, i) => (
            <button
              ref={chapter.id === eraId ? activeChapter : undefined}
              key={chapter.id}
              className={`era-stop ${chapter.id === eraId ? "current" : ""} ${i < index ? "past" : ""}`}
              aria-current={chapter.id === eraId ? "step" : undefined}
              aria-label={`${chapter.name}, ${chapter.date}`}
              onClick={() => changeEra(chapter.id)}
            >
              <span className="era-year">{chapter.date}</span>
              <span className="timeline-line">
                <span className="timeline-node" />
              </span>
              <span className="era-name">{chapter.name}</span>
            </button>
          ))}
        </nav>
      </section>
      <footer className="transport">
        <div className="playback">
          <button
            className="rewind-button"
            aria-label="Restart simulation"
            title="Restart simulation"
            onClick={() => seek(0)}
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="play-button"
            aria-label={playing ? "Pause simulation" : "Play simulation"}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" />
            )}
          </button>
          <div className="elapsed">
            <span>ELAPSED TIME</span>
            <strong data-testid="elapsed">
              {Math.floor(time).toLocaleString("en-US")} <small>days</small>
            </strong>
          </div>
        </div>
        <div className="time-scrubber">
          <label className="sr-only" htmlFor="simulation-time">
            Simulation time in days
          </label>
          <input
            id="simulation-time"
            type="range"
            min="0"
            max="1095"
            step="1"
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
          />
          <div>
            <span>0</span>
            <span>1 YEAR</span>
            <span>2 YEARS</span>
            <span>3 YEARS</span>
          </div>
        </div>
        <div className="speed-control">
          <SlidersHorizontal size={15} />
          <label className="sr-only" htmlFor="speed">
            Simulation speed
          </label>
          <select
            id="speed"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value="0.5">0.5 day / sec</option>
            <option value="1">1 day / sec</option>
            <option value="12">12 days / sec</option>
            <option value="20">20 days / sec</option>
            <option value="60">60 days / sec</option>
            <option value="120">120 days / sec</option>
          </select>
        </div>
        <button className="scale-note" onClick={() => setModal("sources")}>
          <CircleHelp size={14} />
          <span>Ideas to explore. Not to scale.</span>
        </button>
      </footer>
      <dialog
        ref={dialog}
        className="field-dialog"
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
      >
        <div className="dialog-content">
          <button
            className="dialog-close"
            aria-label="Close field guide"
            onClick={() => setModal(null)}
          >
            <X size={21} />
          </button>
          <Mark small />
          <span className="eyebrow">THE ORBIS FIELD GUIDE</span>
          {modal === "guide" ? (
            <>
              <h2>
                The sky was not
                <br />
                always this sky.
              </h2>
              <p className="dialog-intro">
                A history of astronomy is also a history of imagination. Step
                inside a model, watch its machinery, and ask what it made
                possible to see.
              </p>
              <div className="guide-instructions">
                <div>
                  <Orbit />
                  <h3>Change your perspective</h3>
                  <p>
                    Drag the cosmos to orbit it. Scroll or pinch to zoom. Choose
                    “From Earth” to look outward from our moving—or
                    stationary—world.
                  </p>
                </div>
                <div>
                  <ArrowDownRight />
                  <h3>Move through history</h3>
                  <p>
                    Choose a thinker on the timeline. The geometry changes, not
                    just the name. Jupiter’s moons enter the atlas in 1610.
                  </p>
                </div>
                <div>
                  <Eye />
                  <h3>Follow a wandering star</h3>
                  <p>
                    Select a body by its label or the body menu. The crosshair
                    moves closer. Open each chapter’s exploration to reveal its
                    mechanism.
                  </p>
                </div>
              </div>
              <h3>One thread, not the whole story</h3>
              <p>
                This atlas follows the Greek-to-early-modern-European thread at
                the heart of Thomas Kuhn’s <em>The Copernican Revolution</em>.
                It is not a universal timeline of humanity: Babylonian,
                Egyptian, Islamic, Indian, Chinese, and other astronomical
                traditions shaped histories far beyond these selected chapters.
              </p>
              <h3>A reconstruction, not a time machine</h3>
              <p>
                These are schematic, educational models, not accurate historical
                ephemerides. Sizes and distances are exaggerated or compressed;
                colors and the star field are illustrative. Daily rotation is
                factored out to reveal slower orbital motion. Earth view has no
                observing location, horizon, atmospheric effects, or real date.
                It is not a substitute for Stellarium.
              </p>
              <p>
                Dates mark a representative proposal, publication, or
                discovery—not an instant when everyone changed their minds. The
                last chapter combines Kepler’s laws with observations already
                available in 1619.
              </p>
              <div className="shortcut-row">
                <span>
                  <kbd>Space</kbd> Play / pause
                </span>
                <span>
                  <kbd>←</kbd>
                  <kbd>→</kbd> Change era
                </span>
                <span>
                  <kbd>R</kbd> Reset view
                </span>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setModal(null);
                  changeEra("anaximander");
                }}
              >
                Begin with Anaximander <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <h2>
                {era.name}
                <br />
                <em>Behind the model.</em>
              </h2>
              <span className="evidence-label">
                <Check size={13} />
                {era.evidence}
              </span>
              <h3>What you are seeing</h3>
              <p>{era.limitation}</p>
              <h3>Shared visual conventions</h3>
              <p>
                Enlarged bodies, compressed orbital distances, arbitrary initial
                phases, symbolic surfaces, and a synthetic star field make these
                structures legible. Elapsed days measure model time, not a real
                observation date. Daily sky rotation is removed in both views.
                No Uranus, Neptune, Saturnian rings, or undiscovered satellites
                have been inserted into these worldviews.
              </p>
              <h3>Read the sources</h3>
              <div className="source-list">
                {era.sourceIds.map((id) => (
                  <a
                    key={id}
                    href={sources[id].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div>
                      <span>{sources[id].author}</span>
                      <strong>{sources[id].title}</strong>
                    </div>
                    <MoveUpRight size={17} />
                  </a>
                ))}
              </div>
              <div className="historical-note">
                <BookOpen size={18} />
                <p>
                  Models are not simply replaced on a single date. Galileo’s
                  moons challenged a single center of motion, but they did not
                  distinguish Copernicus’s system from Tycho’s.
                </p>
              </div>
              <button className="text-button" onClick={() => setModal("guide")}>
                <ArrowLeft size={15} /> Read the field guide
              </button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
