/**
 * Helpers for parsing JPL Horizons API text results (CSV_FORMAT='YES').
 *
 * Horizons CSV rows contain blank columns (e.g. the solar and lunar presence flags of observer
 * tables), so values must be located by header name rather than by position among numeric cells.
 */

/**
 * Split a Horizons result into its header columns and data rows.
 * @param {string} result Text returned in the API's `result` field.
 * @returns {{ header: string[], rows: string[][] }}
 */
export function parseHorizonsCsv(result) {
  const start = result.indexOf('$$SOE');
  const end = result.indexOf('$$EOE');
  if (start < 0 || end < 0 || end < start) {
    throw new Error(`No $$SOE/$$EOE ephemeris block in result:\n${result.slice(0, 800)}`);
  }
  const before = result.slice(0, start).split('\n');
  let headerLine;
  for (let i = before.length - 1; i >= 0; i--) {
    const line = before[i].trim();
    if (!line || /^\*+$/.test(line)) continue;
    headerLine = line;
    break;
  }
  if (!headerLine) throw new Error('Could not find the CSV header line preceding $$SOE');
  const header = splitCsv(headerLine);
  const rows = result
    .slice(start + 5, end)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(splitCsv);
  for (const row of rows) {
    if (row.length !== header.length) {
      throw new Error(`Row has ${row.length} columns but header has ${header.length}: ${row.join('|')}`);
    }
  }
  return { header, rows };
}

/** Horizons terminates every CSV line with a trailing comma; drop the resulting empty cell. */
function splitCsv(line) {
  const cells = line.split(',').map((c) => c.trim());
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/**
 * Read named numeric columns from parsed rows, failing loudly on missing columns or non-numbers.
 * @param {{ header: string[], rows: string[][] }} table
 * @param {string[]} names Column names exactly as printed in the header.
 * @returns {number[][]} One array per row, values in the order of `names`.
 */
export function numericColumns(table, names) {
  const indices = names.map((name) => {
    const i = table.header.indexOf(name);
    if (i < 0) throw new Error(`Column "${name}" not in header: ${table.header.join(' | ')}`);
    return i;
  });
  return table.rows.map((row) =>
    indices.map((i, k) => {
      const cell = row[i];
      const v = cell === '' ? Number.NaN : Number(cell);
      if (!Number.isFinite(v)) throw new Error(`Non-numeric value "${cell}" in column "${names[k]}"`);
      return v;
    }),
  );
}

/**
 * Julian Date (0h) of a calendar date, Meeus ch. 7. Uses the Julian calendar when `gregorian`
 * is false (astronomical year numbering: 1 BCE = year 0).
 */
export function calendarToJd(year, month, day, gregorian) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  let b = 0;
  if (gregorian) {
    const a = Math.floor(y / 100);
    b = 2 - a + Math.floor(a / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}
