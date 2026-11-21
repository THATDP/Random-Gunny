// ════════ RANDOM GUNNY — ENTRY & UI WIRING ════════
import './style.css';
import { Game, MODES } from './game.js';
import { audio } from './audio.js';
import { settings, loadSettings, saveSettings } from './settings.js';

loadSettings();
audio.setVolume(settings.volume / 100);

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.enterMenu();

const $ = id => document.getElementById(id);
const show = id => $(id)?.classList.remove('hidden');
const hide = id => $(id)?.classList.add('hidden');
const screens = ['menu', 'mode-select', 'settings-screen', 'howto-screen', 'pause-screen', 'end-screen'];
const hideAll = () => screens.forEach(hide);

let settingsReturn = 'menu'; // where the back button from settings leads

function openSettings(from) {
  settingsReturn = from;
  hideAll();
  syncSettingsUI();
  show('settings-screen');
}
function syncSettingsUI() {
  $('set-sens').value = settings.sens; $('set-sens-val').textContent = Number(settings.sens).toFixed(2);
  $('set-fov').value = settings.fov; $('set-fov-val').textContent = settings.fov;
  $('set-vol').value = settings.volume; $('set-vol-val').textContent = settings.volume;
  $('set-dmg').value = settings.damageMult; $('set-dmg-val').textContent = settings.damageMult + '%';
  setSeg('set-cam', settings.camera); setSeg('set-diff', settings.difficulty); setSeg('set-rando-interval', String(settings.randoInterval)); setSeg('set-pool', settings.pool);
  setSwitch('set-rando-enabled', settings.randoEnabled); setSwitch('set-rando-kill', settings.randoKill);
  setSwitch('set-rando-timer-on', settings.randoTimerOn); setSwitch('set-rando-round', settings.randoRound);
}
function setSeg(id, value) { document.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle('on', b.dataset.v === String(value))); }
function setSwitch(id, on) { $(id)?.classList.toggle('on', !!on); }
function bindSeg(id, apply) { document.querySelectorAll(`#${id} button`).forEach(b => b.addEventListener('click', () => { apply(b.dataset.v); saveSettings(); syncSettingsUI(); audio.uiClick(); })); }
function bindSwitch(id, apply) { $(id)?.addEventListener('click', () => { const el = $(id); const on = !el.classList.contains('on'); apply(on); saveSettings(); syncSettingsUI(); audio.uiClick(); }); }

// ── sliders ──
$('set-sens').addEventListener('input', e => { settings.sens = +e.target.value; $('set-sens-val').textContent = settings.sens.toFixed(2); saveSettings(); });
$('set-fov').addEventListener('input', e => { settings.fov = +e.target.value; $('set-fov-val').textContent = settings.fov; saveSettings(); });
$('set-vol').addEventListener('input', e => { settings.volume = +e.target.value; $('set-vol-val').textContent = settings.volume; audio.setVolume(settings.volume / 100); saveSettings(); });
$('set-dmg').addEventListener('input', e => { settings.damageMult = +e.target.value; $('set-dmg-val').textContent = settings.damageMult + '%'; saveSettings(); });
// ── segments ──
bindSeg('set-cam', v => settings.camera = v);
bindSeg('set-diff', v => settings.difficulty = v);
bindSeg('set-rando-interval', v => settings.randoInterval = +v);
bindSeg('set-pool', v => settings.pool = v);
// ── switches ──
bindSwitch('set-rando-enabled', v => settings.randoEnabled = v);
bindSwitch('set-rando-kill', v => settings.randoKill = v);
bindSwitch('set-rando-timer-on', v => settings.randoTimerOn = v);
bindSwitch('set-rando-round', v => settings.randoRound = v);

// ── mode grid ──
const grid = $('mode-grid');
for (const mode of MODES) {
  const card = document.createElement('button');
  card.className = 'mode-card';
  card.style.setProperty('--mc', mode.color);
  card.innerHTML = `<div class="mode-tag">${mode.tag}</div><div class="mode-icon">${mode.icon}</div><div class="mode-name">${mode.name}</div><div class="mode-desc">${mode.objective}</div>`;
  card.addEventListener('mouseenter', () => audio.uiHover());
  card.addEventListener('click', () => { audio.uiClick(); startMode(mode.id); });
  grid.appendChild(card);
}

function startMode(id) {
  hideAll();
  game.startMatch(id);
}

// ── navigation ──
$('btn-play').addEventListener('click', () => { audio.uiClick(); startMode('rando'); });
$('btn-modes').addEventListener('click', () => { audio.uiClick(); hideAll(); show('mode-select'); });
$('btn-settings').addEventListener('click', () => { audio.uiClick(); openSettings('menu'); });
$('btn-howto').addEventListener('click', () => { audio.uiClick(); hideAll(); show('howto-screen'); });
$('modes-back').addEventListener('click', () => { audio.uiClick(); hideAll(); show('menu'); });
$('howto-back').addEventListener('click', () => { audio.uiClick(); hideAll(); show('menu'); });
$('settings-back').addEventListener('click', () => {
  audio.uiClick(); hideAll();
  if (settingsReturn === 'pause') show('pause-screen'); else show('menu');
});

// ── pause / end ──
$('btn-resume').addEventListener('click', () => { audio.uiClick(); game.resume(); });
$('btn-restart').addEventListener('click', () => { audio.uiClick(); hideAll(); game.startMatch(game.mode?.id ?? 'rando'); });
$('btn-pause-settings').addEventListener('click', () => { audio.uiClick(); openSettings('pause'); });
$('btn-quit').addEventListener('click', () => { audio.uiClick(); audio.setVolume(settings.volume / 100); game.quitToMenu(); });
$('btn-again').addEventListener('click', () => { audio.uiClick(); hideAll(); game.startMatch(game.mode?.id ?? 'rando'); });
$('btn-end-menu').addEventListener('click', () => { audio.uiClick(); hideAll(); game.quitToMenu(); });

// ── hover blips on main buttons ──
document.querySelectorAll('.btn, .btn-back').forEach(b => b.addEventListener('mouseenter', () => audio.uiHover()));

// ── mute shortcut ──
window.addEventListener('keydown', e => {
  if (e.code === 'KeyM') { const m = !audio.muted; audio.setMuted(m); game.showToast?.(m ? '🔇 SOM MUDO' : '🔊 SOM ATIVADO'); }
  if (e.code === 'Escape' && game.state === 'playing') game.pause();
});

// ── showcase weapon rotation in menu (handled by game loop); refresh caption periodically ──
setInterval(() => { if (game.state === 'menu') game._rollShowcase(); }, 6000);

// ── debug hook (harmless) ──
window.__randomGunny = { game, settings };
