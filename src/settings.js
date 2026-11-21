// ════════ RANDOM GUNNY — SETTINGS (persisted) ════════
const DEFAULTS = {
  sens: 1.0,
  fov: 80,
  camera: 'fps',
  volume: 80,
  difficulty: 'normal',
  randoEnabled: true,
  randoKill: true,
  randoTimerOn: false,
  randoInterval: 15,
  randoRound: true,
  pool: 'all',
  damageMult: 100,
};
export const settings = { ...DEFAULTS };

export function loadSettings() {
  try {
    const raw = localStorage.getItem('random-gunny-settings');
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch { /* fresh defaults */ }
  return settings;
}
export function saveSettings() {
  try { localStorage.setItem('random-gunny-settings', JSON.stringify(settings)); } catch {}
}
export function resetSettings() { Object.assign(settings, DEFAULTS); saveSettings(); }
