/** Simulation speeds in days per real second, with human labels. */
export const SPEED_PRESETS: readonly { value: number; label: string }[] = [
  { value: 1 / 86400, label: 'real time' },
  { value: 1 / 1440, label: '1 min / s' },
  { value: 1 / 144, label: '10 min / s' },
  { value: 1 / 24, label: '1 hour / s' },
  { value: 0.25, label: '6 hours / s' },
  { value: 1, label: '1 day / s' },
  { value: 3, label: '3 days / s' },
  { value: 7, label: '1 week / s' },
  { value: 30.44, label: '1 month / s' },
  { value: 91.31, label: '3 months / s' },
  { value: 365.25, label: '1 year / s' },
  { value: 3652.5, label: '10 years / s' },
];

/** Nearest preset index to a (possibly negative) speed. */
export function presetIndex(speed: number): number {
  const target = Math.abs(speed);
  let best = 0;
  let bestD = Infinity;
  SPEED_PRESETS.forEach((p, i) => {
    const d = Math.abs(Math.log(p.value) - Math.log(Math.max(target, 1e-9)));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

export function speedLabel(speed: number): string {
  const idx = presetIndex(speed);
  const preset = SPEED_PRESETS[idx];
  const exact = Math.abs(Math.abs(speed) - preset.value) / preset.value < 0.02;
  let label = preset.label;
  if (!exact) {
    const days = Math.abs(speed);
    label = days >= 1 ? `${days.toFixed(days < 10 ? 1 : 0)} days / s` : `${(days * 24).toFixed(1)} hours / s`;
  }
  return speed < 0 ? `\u2212 ${label}` : label;
}
