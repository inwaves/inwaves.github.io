/**
 * HTML labels ignore the depth buffer, so in the horizon view labels below the ground must be
 * hidden explicitly. Every frame starts from each label's base visibility, so a label that sets
 * and later rises, or a switch out of horizon mode, restores it.
 */
export const HORIZON_LABEL_MARGIN = -10;

export function labelVisibleAt(baseVisible: boolean, horizonMode: boolean, worldAltitudeY: number, margin = HORIZON_LABEL_MARGIN): boolean {
  if (!baseVisible) return false;
  if (!horizonMode) return true;
  return worldAltitudeY >= margin;
}
