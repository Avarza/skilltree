import type { ConfigSnapshot, Palette } from '../api/types';

/** Highest config schema this app version understands. Newer schemas are ignored until the app is updated. */
export const SUPPORTED_SCHEMA_VERSION = 1;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const PALETTE_KEYS: (keyof Palette)[] = [
  'primary', 'onPrimary', 'background', 'surface', 'textPrimary', 'textSecondary',
  'nodeCompleted', 'nodeInProgress', 'nodeAvailable', 'nodeLocked',
];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const inRange = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

function validPalette(p: unknown): boolean {
  return isObj(p) && PALETTE_KEYS.every(k => typeof p[k] === 'string' && HEX.test(p[k] as string));
}

/**
 * Defensive check of a downloaded snapshot. The server already validates, but the client only accepts
 * known keys with sane values so a broken or tampered config can never break the UI.
 */
export function isValidConfig(raw: unknown): raw is ConfigSnapshot {
  if (!isObj(raw) || raw.schemaVersion !== SUPPORTED_SCHEMA_VERSION || typeof raw.version !== 'number') {
    return false;
  }
  const { config, theme, templates } = raw;
  if (!isObj(config) || !isObj(theme) || !Array.isArray(templates)) {
    return false;
  }
  const ai = config.aiGeneration, prog = config.progression;
  if (!isObj(ai) || typeof ai.enabled !== 'boolean' || !inRange(ai.dailyLimitPerUser, 0, 100) || !inRange(ai.maxNodes, 3, 60)) {
    return false;
  }
  if (!isObj(prog) || !inRange(prog.xpPerLevel, 50, 100000) || !inRange(prog.defaultNodeXp, 1, 1000)) {
    return false;
  }
  if (!validPalette(theme.light) || !validPalette(theme.dark) || !isObj(theme.shape)) {
    return false;
  }
  if (!inRange(theme.shape.cardRadius, 0, 32) || !inRange(theme.shape.nodeBorderWidth, 0, 4)) {
    return false;
  }
  return templates.every(t => isObj(t) && typeof t.slug === 'string' && typeof t.title === 'string' && Array.isArray(t.nodes));
}
