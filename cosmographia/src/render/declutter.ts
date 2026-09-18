/** A label's screen rectangle and its priority (lower is more important). */
export interface LabelBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
}

/**
 * The screen box of a CSS2D label. CSS2DRenderer translates the element by (−center.x, −center.y)
 * of its own size, so the box centre sits at anchor + (0.5 − center) · size.
 */
export function anchoredBox(
  id: string,
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  center: { x: number; y: number },
  priority: number,
): LabelBox {
  return { id, x: anchorX + (0.5 - center.x) * width, y: anchorY + (0.5 - center.y) * height, width, height, priority };
}

/**
 * Greedy declutter: place labels in priority order (ties broken by id for stability) and hide any
 * label whose box overlaps one already placed. Returns the ids of labels to show.
 */
export function declutter(boxes: LabelBox[], padding = 2): Set<string> {
  const ordered = [...boxes].sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const placed: LabelBox[] = [];
  const shown = new Set<string>();
  for (const box of ordered) {
    const hits = placed.some(
      (p) =>
        Math.abs(p.x - box.x) * 2 < p.width + box.width + padding * 2 && Math.abs(p.y - box.y) * 2 < p.height + box.height + padding * 2,
    );
    if (hits) continue;
    placed.push(box);
    shown.add(box.id);
  }
  return shown;
}
