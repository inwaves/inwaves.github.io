/** Keyboard shortcuts, kept pure so the routing rules can be tested without a DOM. */

export type ShortcutAction =
  | 'togglePlay'
  | 'slower'
  | 'faster'
  | 'previousEra'
  | 'nextEra'
  | 'cosmosView'
  | 'skyView'
  | 'toggleLayersMenu'
  | 'togglePanel'
  | 'toggleGhosts'
  | 'toggleTrails'
  | 'toggleTelescope'
  | 'escape';

export interface KeyContext {
  key: string;
  /** tagName of the event target, upper case */
  targetTag: string;
  targetEditable: boolean;
  /** ARIA role of the target, when any */
  targetRole: string | null;
  defaultPrevented: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  introOpen: boolean;
}

const INTERACTIVE_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'SUMMARY']);
const INTERACTIVE_ROLES = new Set(['button', 'tab', 'checkbox', 'switch', 'menuitem', 'option', 'slider', 'textbox']);

const KEYMAP: Record<string, ShortcutAction> = {
  ' ': 'togglePlay',
  '[': 'slower',
  ']': 'faster',
  ArrowLeft: 'previousEra',
  ArrowRight: 'nextEra',
  c: 'cosmosView',
  C: 'cosmosView',
  s: 'skyView',
  S: 'skyView',
  l: 'toggleLayersMenu',
  L: 'toggleLayersMenu',
  i: 'togglePanel',
  I: 'togglePanel',
  g: 'toggleGhosts',
  G: 'toggleGhosts',
  t: 'toggleTrails',
  T: 'toggleTrails',
  o: 'toggleTelescope',
  O: 'toggleTelescope',
  Escape: 'escape',
};

/**
 * The shortcut a key press should trigger, or null to leave the event to the browser.
 * Focused controls keep their native keys (Space presses a focused button, arrows move within
 * inputs), and while the intro dialog is open only Escape reaches the application.
 */
export function shortcutFor(ctx: KeyContext): ShortcutAction | null {
  if (ctx.defaultPrevented || ctx.altKey || ctx.ctrlKey || ctx.metaKey) return null;
  const action = KEYMAP[ctx.key];
  if (!action) return null;
  if (ctx.introOpen) return action === 'escape' ? 'escape' : null;
  if (action === 'escape') return action;
  if (ctx.targetEditable || INTERACTIVE_TAGS.has(ctx.targetTag)) return null;
  if (ctx.targetRole && INTERACTIVE_ROLES.has(ctx.targetRole)) return null;
  return action;
}
