export function buildHelp(container) {
  container.innerHTML = `
    <div class="card">
      <button class="icon-btn close" data-close>Close</button>
      <h2>Conceptions of the Heavens</h2>
      <p>A walk through the models of the cosmos from Anaximander to Newton, each one a working mechanism:
      the heavens as the astronomers of that age imagined them, moving as their theory says they move.
      All models are driven from the same modern mean elements, so the sky they predict is the real one;
      the <em>machinery</em> that produces it is theirs.</p>
      <h3>Controls</h3>
      <ul>
        <li><kbd>\u2190</kbd> <kbd>\u2192</kbd> earlier / later worldview &nbsp;\u00b7&nbsp; <kbd>Space</kbd> pause</li>
        <li><kbd>[</kbd> <kbd>]</kbd> slower / faster &nbsp;\u00b7&nbsp; <kbd>0</kbd> return to this worldview's date</li>
        <li><kbd>E</kbd> toggle the view from the Earth &nbsp;\u00b7&nbsp; <kbd>R</kbd> reset the camera &nbsp;\u00b7&nbsp; <kbd>F</kbd> clear the followed body</li>
        <li><kbd>T</kbd> trails &nbsp;\u00b7&nbsp; <kbd>M</kbd> mechanism &nbsp;\u00b7&nbsp; <kbd>S</kbd> crystalline spheres &nbsp;\u00b7&nbsp; <kbd>L</kbd> labels &nbsp;\u00b7&nbsp; <kbd>D</kbd> daily rotation</li>
        <li><kbd>H</kbd> or <kbd>?</kbd> this help</li>
      </ul>
      <h3>Reading the scene</h3>
      <ul>
        <li>Thin coloured circles are deferents, epicycles and orbits; white marks are circle centres, magenta marks are equants, cyan marks are empty foci. Follow a body and its own marks are labelled.</li>
        <li>Proportions: the legible layout compresses distances and enlarges bodies; "as conceived" uses each period's own sizes and distances in Earth radii (Ptolemy's 20,000-radius cosmos, Copernicus' 1,142 radii to the Sun, Newton's 19,600), in which the planets are specks until you follow one.</li>
        <li>Faint arms join each mechanism point to the body it carries. Translucent spheres are the crystalline spheres of the model.</li>
        <li>The gold circle is the ecliptic with its zodiac band; the blue circle is the celestial equator <em>of date</em>, which precesses, so the pole star changes from Thuban to Kochab to Polaris as the centuries pass.</li>
        <li>Trails fade with age. Drawn relative to the Earth, they reveal the retrograde loops that every model had to account for.</li>
        <li>The daily turning of the heavens is shown when the clock runs at half a day per second or slower. Faster than that it would blur, so the sky is drawn at the same sidereal time each day and the slower motions stand out.</li>
        <li>Sizes of bodies and the orbits of moons are exaggerated for visibility; distances within each model are to its own scale.</li>
      </ul>
      <p class="kuhn">Star catalogue and constellation figures from the d3-celestial data (Olaf Frohn), derived from the HYG database.</p>
    </div>`;
  const hide = () => { container.hidden = true; };
  container.querySelector('[data-close]').addEventListener('click', hide);
  container.addEventListener('click', (e) => { if (e.target === container) hide(); });
  return {
    show() { container.hidden = false; },
    hide,
    toggle() { container.hidden = !container.hidden; },
    get open() { return !container.hidden; },
  };
}
