/**
 * Keeping on-screen text legible.
 *
 * Several worldviews crowd their inner bodies into a few pixels at the scale that
 * shows the whole cosmos, and the machinery adds captions of its own ("equant",
 * "empty focus") right beside them. Text printed across other text is worse than
 * text left out, so where two labels would collide the less important one is
 * hidden. Nothing else changes: the body or point it names stays on screen, and
 * zooming in separates the labels and brings the hidden one back.
 *
 * This module is pure geometry on rectangles, so it can be tested without a DOM.
 * Body names and guide captions are resolved together in a single pass; doing
 * them separately is what once let "empty focus" print straight across "Sun".
 */

/** True when two boxes, each [left, top, right, bottom], share any area. Touching edges do not count. */
export function boxesOverlap(a, b) {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

/**
 * The rectangle a label occupies, in CSS pixels, as [left, top, right, bottom].
 * Labels are anchored at their left edge, `gap` pixels to the right of the point
 * they name, and centred on it vertically. The width is estimated from the
 * character count, which is accurate enough for deciding collisions.
 *
 * @param {number} ndcX anchor in normalised device coordinates, -1 to 1
 * @param {number} ndcY anchor in normalised device coordinates, -1 to 1 (up is positive)
 * @param {number} width viewport width, CSS pixels
 * @param {number} height viewport height, CSS pixels
 * @param {number} gap pixels between the anchor and the text
 * @param {number} chars number of characters
 * @param {number} charWidth estimated width of one character
 * @param {number} halfHeight half the line height
 */
export function labelBox(ndcX, ndcY, width, height, gap, chars, charWidth, halfHeight) {
  const left = (ndcX * 0.5 + 0.5) * width + gap;
  const y = (-ndcY * 0.5 + 0.5) * height;
  return [left, y - halfHeight, left + chars * charWidth, y + halfHeight];
}

/**
 * Decides which labels to hide. Labels are visited from most to least important
 * (lowest `rank` first; ties keep their given order) and each is kept unless it
 * would overlap one already kept. A hidden label claims no space, so it cannot
 * in turn push out a label that only collided with it.
 *
 * @param {{rank: number, box: number[]}[]} candidates
 * @returns {number[]} indices into `candidates` of the labels to hide
 */
export function resolveOverlaps(candidates) {
  const order = candidates.map((_, index) => index).sort((i, j) => candidates[i].rank - candidates[j].rank);
  const kept = [];
  const hidden = [];
  for (const index of order) {
    const { box } = candidates[index];
    if (kept.some((other) => boxesOverlap(box, other))) hidden.push(index);
    else kept.push(box);
  }
  return hidden;
}
