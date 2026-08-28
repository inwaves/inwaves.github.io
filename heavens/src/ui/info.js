const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Commentary paragraphs are authored in this repository and may contain <em> markup.
const list = (items) => `<ul>${items.map((p) => `<li>${p}</li>`).join('')}</ul>`;
const paras = (items) => items.map((p) => `<p>${p}</p>`).join('');

function table(t) {
  if (!t) return '';
  const head = t.head.map((c, i) => `<th class="${i ? 'num' : ''}">${esc(c)}</th>`).join('');
  const rows = t.rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<table><caption>${esc(t.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildInfo(container, { onPrev, onNext }) {
  return {
    render(model, index, total) {
      const t = model.text;
      container.innerHTML = `
        <div class="era">${esc(model.era)} \u00b7 ${index + 1} of ${total}</div>
        <h2>${esc(model.name)}</h2>
        <div class="place">${esc(model.place || '')}</div>
        <p class="tagline">${t.tagline}</p>
        <h3>The picture</h3>${paras(t.picture)}
        <h3>What changed</h3>${list(t.changes)}
        <h3>What to look for</h3>${list(t.lookFor)}
        ${table(t.table)}
        ${t.scale ? `<h3>Sizes and distances</h3><p>${t.scale}</p>` : ''}
        <h3>In Kuhn</h3><p class="kuhn">${t.kuhn}</p>
        <div class="nav">
          <button class="btn" data-nav="prev" ${index === 0 ? 'disabled' : ''}>\u2190 Earlier</button>
          <button class="btn" data-nav="next" ${index === total - 1 ? 'disabled' : ''}>Later \u2192</button>
        </div>`;
      container.querySelector('[data-nav="prev"]').addEventListener('click', onPrev);
      container.querySelector('[data-nav="next"]').addEventListener('click', onNext);
      container.scrollTop = 0;
    },
  };
}
