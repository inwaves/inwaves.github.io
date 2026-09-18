/** Minimal DOM helpers, so the interface can be built without a framework. */

/**
 * Creates an element. Attributes whose value is null or undefined are omitted;
 * keys beginning with "on" are attached as event listeners. Children may be
 * nodes, strings, or null.
 */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === null || value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value);
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    el.append(child);
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
