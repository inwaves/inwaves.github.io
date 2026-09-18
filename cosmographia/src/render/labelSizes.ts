/**
 * Remembers the last non-zero rendered size of each label. CSS2DRenderer hides invisible labels with
 * `display: none`, which makes their measured size zero; reusing the last real measurement keeps
 * decluttering stable instead of oscillating between the estimate and the real size.
 */
export class LabelSizeCache {
  private readonly sizes = new Map<string, { width: number; height: number }>();

  size(id: string, measuredWidth: number, measuredHeight: number, estimate: { width: number; height: number }): { width: number; height: number } {
    if (measuredWidth > 0 && measuredHeight > 0) {
      const cached = this.sizes.get(id);
      if (!cached || cached.width !== measuredWidth || cached.height !== measuredHeight) {
        this.sizes.set(id, { width: measuredWidth, height: measuredHeight });
      }
    }
    return this.sizes.get(id) ?? estimate;
  }

  clear(): void {
    this.sizes.clear();
  }
}
