// Headless smoke test: stubs DOM + WebGL so Game can run in Node.
import * as THREE from 'three';
const listeners = {};
const enumMap = new Map(); let enumCounter = 1000;
const elem = () => {
  const e = {
    classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)); }, remove(...c) { c.forEach(x => this._s.delete(x)); }, toggle(c, force) { const on = force ?? !this._s.has(c); on ? this._s.add(c) : this._s.delete(c); return on; }, contains(c) { return this._s.has(c); } },
    style: new Proxy({ setProperty() {} }, { get: (t, k) => k === 'setProperty' ? () => {} : (t[k] ?? ''), set: (t, k, v) => { t[k] = v; return true; } }),
    children: [], textContent: '', innerHTML: '', value: '1', offsetWidth: 100,
    appendChild(c) { this.children.push(c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    addEventListener() {}, removeEventListener() {}, setAttribute() {}, get firstChild() { return this.children[0] ?? null; },
  };
  return e;
};
const elements = new Map();
const getEl = id => { if (!elements.has(id)) elements.set(id, elem()); return elements.get(id); };

const fakeCanvas = {
  width: 1280, height: 720, style: {},
  getContext: () => fakeGL,
  addEventListener() {}, removeEventListener() {},
  requestPointerLock() { fakeCanvas._locked = true; document.pointerLockElement = fakeCanvas; document._fire('pointerlockchange'); },
};

const genericNoop = (...a) => ({});
const glEnum = name => { if (!enumMap.has(name)) enumMap.set(name, enumCounter++); return enumMap.get(name); };
const funcOverrides = {
  getParameter: pname => {
    const byName = n => enumMap.get(n);
    if (pname === byName('MAX_TEXTURE_SIZE') || pname === byName('MAX_CUBE_MAP_TEXTURE_SIZE')) return 8192;
    if (pname === byName('MAX_VERTEX_ATTRIBS')) return 16;
    if (pname === byName('MAX_TEXTURE_IMAGE_UNITS') || pname === byName('MAX_VERTEX_TEXTURE_IMAGE_UNITS')) return 16;
    if (pname === byName('MAX_FRAGMENT_UNIFORM_VECTORS') || pname === byName('MAX_VERTEX_UNIFORM_VECTORS')) return 224;
    if (pname === byName('VERSION')) return 'WebGL 2.0 (stub)';
    if (pname === byName('VENDOR')) return 'stub';
    if (pname === byName('SHADING_LANGUAGE_VERSION')) return 'GLSL ES 3.0 (stub)';
    if (pname === byName('ALIASED_LINE_WIDTH_RANGE')) return [1, 8];
    if (pname === byName('ALIASED_POINT_SIZE_RANGE')) return [1, 64];
    return 0;
  },
  getShaderParameter: () => true,
  getProgramParameter: (prog, pname) => {
    const byName = n => enumMap.get(n);
    if (pname === byName('ACTIVE_UNIFORMS') || pname === byName('ACTIVE_ATTRIBUTES')) return 8;
    return true;
  },
  getActiveUniform: (prog, i) => ({ name: 'uStub' + i, type: enumMap.get('FLOAT') ?? glEnum('FLOAT'), size: 1 }),
  getActiveAttrib: (prog, i) => ({ name: 'aStub' + i, type: enumMap.get('FLOAT') ?? glEnum('FLOAT'), size: 1 }),
  getShaderInfoLog: () => '', getProgramInfoLog: () => '',
  getExtension: () => new Proxy({}, { get: () => (...a) => 0 }),
  getSupportedExtensions: () => [],
  getContextAttributes: () => ({ alpha: false, depth: true, stencil: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: false }),
  getShaderPrecisionFormat: () => ({ rangeMin: -127, rangeMax: 127, precision: 23 }),
  checkFramebufferStatus: () => glEnum('FRAMEBUFFER_COMPLETE'),
  createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}), createTexture: () => ({}),
  createFramebuffer: () => ({}), createRenderbuffer: () => ({}), createVertexArray: () => ({}),
  createUniformLocation: () => ({}),
  getUniformLocation: () => ({}), getAttribLocation: () => 0,
  isContextLost: () => false,
  deleteShader() {}, deleteProgram() {}, deleteBuffer() {}, deleteTexture() {},
};
const fakeGL = new Proxy({}, {
  get(t, prop) {
    if (typeof prop !== 'string') return undefined;
    if (prop === 'canvas') return fakeCanvas;
    if (prop === 'drawingBufferWidth') return 1280;
    if (prop === 'drawingBufferHeight') return 720;
    if (funcOverrides[prop]) return funcOverrides[prop];
    if (/^[A-Z][A-Z0-9_ x]*$/.test(prop)) return glEnum(prop);
    return genericNoop;
  },
  set() { return true; },
});

let rafCb = null;
const winListeners = {};
globalThis.window = {
  addEventListener(type, cb) { (winListeners[type] ??= []).push(cb); },
  removeEventListener() {},
  innerWidth: 1280, innerHeight: 720,
  devicePixelRatio: 1,
};
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-stub' }, configurable: true }); } catch {}
globalThis.requestAnimationFrame = cb => { rafCb = cb; return 1; };
globalThis.localStorage = { _m: new Map(), getItem(k) { return this._m.get(k) ?? null; }, setItem(k, v) { this._m.set(k, String(v)); }, removeItem(k) { this._m.delete(k); } };
globalThis.document = {
  pointerLockElement: null,
  getElementById: getEl,
  createElement: tag => (tag === 'canvas' ? Object.assign(Object.create(fakeCanvas), elem()) : elem()),
  addEventListener() {}, removeEventListener() {},
  exitPointerLock() { document.pointerLockElement = null; },
  _fire() {},
  body: elem(),
};
globalThis.self = globalThis;

const { Game, MODES } = await import('../src/game.js');
const { settings } = await import('../src/settings.js');
const { WEAPONS } = await import('../src/weapons.js');

const game = new Game(fakeCanvas);
game.enterMenu();

let t = 0;
const step = (ms = 16.7) => { t += ms; const cb = rafCb; rafCb = null; cb && cb(t); };
for (let i = 0; i < 30; i++) step();
console.log('menu frames ok · showcase:', game.showcaseWeaponId);

for (const mode of MODES) {
  game.quitToMenu();
  for (let i = 0; i < 5; i++) step();
  game.startMatch(mode.id);
  for (let i = 0; i < 120; i++) step(); // ~2s of simulation
  // exercise combat verbs
  game.randomizeWeapon('all', true);
  game.randomizeWeapon('gun', true);
  game.randomizeWeapon('melee', true);
  game.meleeAttack('light'); game.meleeAttack('heavy');
  // force-set every weapon and fire it
  for (const w of WEAPONS) { game.setWeapon(w, true); game.fireWeapon(); game.meleeAttack('light'); }
  // damage the player to near-death and force a death
  game.damagePlayer(9999, 0, { name: 'TESTBOT', weaponDef: { name: 'TEST' } }, false);
  for (let i = 0; i < 30; i++) step();
  const botsAlive = game.bots.filter(b => b.alive).length;
  console.log(`mode ${mode.id.padEnd(8)} ok · bots: ${game.bots.length} (alive ${botsAlive}) · hp ${Math.round(game.player.hp)} · state ${game.state} · mag ${game.player.mag}`);
}

// pause/resume paths
game.quitToMenu(); game.startMatch('ffa');
game.pause(); game.resume(); game.pause();
console.log('pause/resume ok · state', game.state);
console.log('SMOKE TEST PASSED');

// ════════ Scenario tests ════════
console.log('— scenarios —');
game.quitToMenu();
game.startMatch('ffa');
for (let i = 0; i < 10; i++) step();
const bot = game.bots[0];
// place bot directly in front of player, zero spread weapon
bot.pos.set(game.player.pos.x + Math.sin(game.player.yaw + Math.PI) * 0, 0, 0); // reset
// simpler: put bot at fixed spot and aim yaw at it
bot.pos.set(game.player.pos.x, 0, game.player.pos.z); // same spot? no—offset forward
const fwd = (yaw) => new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
{
  const f = fwd(game.player.yaw);
  bot.pos.set(game.player.pos.x + f.x * 8, 0, game.player.pos.z + f.z * 8);
  for (let i = 0; i < 3; i++) step(); // sync model matrices
  const sniper = WEAPONS.find(w => w.id === 'sniper');
  game.setWeapon(sniper, true);
  const hpBefore = bot.hp;
  game.fireWeapon();
  console.log('debug · cam', game.camera.position.toArray().map(v=>v.toFixed(1)).join(','), '· botPos', bot.pos.toArray().map(v=>v.toFixed(1)).join(','), '· yaw', game.player.yaw.toFixed(2));
  console.log('sniper shot: hp', hpBefore, '→', bot.hp, bot.hp < hpBefore ? 'HIT ✓' : 'MISS ✗');

  // rocket-wreck the bot to force onBotKilled path
  bot.takeDamage(9999, 0, game.player, true);
  console.log('player kills:', game.player.kills, '· score:', game.player.score, '· killfeed children:', game.hud['killfeed'].children.length);

  // elimination flow: kill all enemies → round should resolve after bot corpses settle
  game.quitToMenu();
  game.startMatch('elim');
  for (const b of game.bots.filter(b => b.team === 'enemy')) b.takeDamage(9999, 0, game.player, false);
  for (let i = 0; i < 60; i++) step();
  console.log('elim round wins ally:', game.roundWins.ally, '(expect ≥1) · round:', game.round);

  // survival flow: clear wave 1 → wave increments
  game.quitToMenu();
  game.startMatch('survive');
  for (const b of game.bots.filter(b => b.team === 'enemy')) b.takeDamage(9999, 0, game.player, false);
  for (let i = 0; i < 40; i++) step();
  console.log('survival wave cleared state:', game.waveState, '· wave:', game.wave);
  for (let i = 0; i < 300; i++) step(); // wait out the 4s intermission
  console.log('survival next wave:', game.wave, '· enemies:', game.bots.filter(b => b.alive && b.team === 'enemy').length);
  // rando mode: weapon changes after a player kill
  game.quitToMenu();
  game.startMatch('rando');
  for (let i = 0; i < 10; i++) step();
  const wBefore = game.weaponDef.id;
  const victim = game.bots[0];
  const f2 = fwd(game.player.yaw);
  victim.pos.set(game.player.pos.x + f2.x * 6, 0, game.player.pos.z + f2.z * 6);
  for (let i = 0; i < 3; i++) step();
  victim.takeDamage(9999, 0, game.player, false);
  for (let i = 0; i < 5; i++) step();
  console.log('rando kill-swap:', wBefore, '→', game.weaponDef.id, '(expect different)');

  // 45s FFA soak — bots fight, player may die & respawn
  game.quitToMenu();
  game.startMatch('ffa');
  let pDeaths = 0, firstDeathTick = -1;
  for (let i = 0; i < 2700; i++) {
    step();
    if (game.player.hp <= 0) { pDeaths++; if (firstDeathTick < 0) firstDeathTick = i; }
  }
  console.log('ffa first death at ~' + (firstDeathTick < 0 ? 'never' : Math.round(firstDeathTick / 60) + 's (standing still)'));
  const alive = game.bots.filter(b => b.alive).length;
  console.log(`soak ffa 45s · player deaths seen ticks ${pDeaths} · kills ${game.player.kills} · bots alive ${alive} · state ${game.state} · no crashes ✓`);

  // 40s TDM soak
  game.quitToMenu();
  game.startMatch('tdm');
  for (let i = 0; i < 2400; i++) step();
  console.log(`soak tdm 40s · ally ${game.teamScore.ally} – enemy ${game.teamScore.enemy} · state ${game.state} ✓`);
  console.log('SCENARIOS DONE');
  process.exit(0);
}
