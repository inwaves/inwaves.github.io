import { describe, expect, it } from 'vitest';
import { shortcutFor, type KeyContext } from './keyboard';

const base: KeyContext = {
  key: ' ',
  targetTag: 'BODY',
  targetEditable: false,
  targetRole: null,
  defaultPrevented: false,
  introOpen: false,
};

describe('keyboard shortcuts', () => {
  it('toggles playback with Space on the page body', () => {
    expect(shortcutFor(base)).toBe('togglePlay');
  });

  it('leaves Space to a focused button so it activates natively', () => {
    expect(shortcutFor({ ...base, targetTag: 'BUTTON' })).toBeNull();
    expect(shortcutFor({ ...base, targetTag: 'DIV', targetRole: 'tab' })).toBeNull();
  });

  it('never steals keys from form fields or editable content', () => {
    expect(shortcutFor({ ...base, key: 'ArrowLeft', targetTag: 'INPUT' })).toBeNull();
    expect(shortcutFor({ ...base, key: 's', targetTag: 'DIV', targetEditable: true })).toBeNull();
  });

  it('respects defaultPrevented and modifier keys', () => {
    expect(shortcutFor({ ...base, defaultPrevented: true })).toBeNull();
    expect(shortcutFor({ ...base, key: 'l', ctrlKey: true })).toBeNull();
  });

  it('suppresses simulation shortcuts while the intro dialog is open, except Escape', () => {
    expect(shortcutFor({ ...base, introOpen: true })).toBeNull();
    expect(shortcutFor({ ...base, key: 'ArrowRight', introOpen: true })).toBeNull();
    expect(shortcutFor({ ...base, key: 'Escape', targetTag: 'BUTTON', introOpen: true })).toBe('escape');
  });

  it('maps letters regardless of case and ignores unknown keys', () => {
    expect(shortcutFor({ ...base, key: 'G' })).toBe('toggleGhosts');
    expect(shortcutFor({ ...base, key: 'g' })).toBe('toggleGhosts');
    expect(shortcutFor({ ...base, key: 'x' })).toBeNull();
  });
});
