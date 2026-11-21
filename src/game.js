// ════════ RANDOM GUNNY — GAME CORE ════════
import * as THREE from 'three';
import { Arena, resolveCapsule, floorHeightAt } from './arena.js';
import { buildWeaponModel, buildHumanoid, muzzleOffset } from './models.js';
import { WEAPONS, poolFor, rollWeapon, RARITY_COLOR } from './weapons.js';
import { Bot, BOT_NAMES } from './bot.js';
import { audio } from './audio.js';
import { settings } from './settings.js';

export const MODES = [
  { id:'rando',   name:'RANDO ARENA',      icon:'🎲', tag:'MODO ASSINATURA', color:'#ffb03a', bots:6, target:15, time:300, randoKill:true,  pool:'all',     objective:'Primeiro a 15 abates · cada abate troca sua arma' },
  { id:'ffa',     name:'FREE FOR ALL',     icon:'💥', tag:'CLÁSSICO',        color:'#ff7a1a', bots:6, target:20, time:300, pool:'settings',   objective:'Primeiro a 20 abates' },
  { id:'tdm',     name:'TEAM DEATHMATCH',  icon:'👥', tag:'ESQUADRÃO',       color:'#27e0ff', bots:0, allies:2, enemies:5, target:30, time:360, tdm:true, pool:'settings', objective:'Sua equipe vence com 30 abates' },
  { id:'elim',    name:'ELIMINAÇÃO',       icon:'☠️', tag:'RODADAS',         color:'#ff3b3b', bots:0, allies:2, enemies:4, elim:true, lives:3, roundsToWin:3, pool:'settings', randoRound:true, objective:'Vença 3 rodadas eliminando a equipe inimiga' },
  { id:'survive', name:'SOBREVIVÊNCIA',    icon:'🌊', tag:'ONDAS',           color:'#3dff88', bots:0, wave:true, pool:'settings',             objective:'Sobreviva ao maior número de ondas' },
  { id:'guns',    name:'SÓ ARMAS DE FOGO', icon:'🔫', tag:'GUNGAME',         color:'#ffb03a', bots:6, target:20, time:300, pool:'gun',       objective:'Só fogo · Primeiro a 20 abates' },
  { id:'melee',   name:'SÓ CORPO A CORPO', icon:'🗡️', tag:'SANGUE FRIO',    color:'#b26bff', bots:5, target:15, time:240, pool:'melee',     objective:'Só melee · Primeiro a 15 abates' },
  { id:'arena',   name:'ARENA TOTAL',      icon:'🏟️', tag:'CQC BRUTO',      color:'#3da8ff', bots:6, target:10, time:180, randoKill:true, pool:'all', objective:'Primeiro a 10 abates · brutal e rápido' },
];

const EYE_STAND = 1.62, EYE_CROUCH = 1.05;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = 'menu';   // menu | playing | paused | over
    this.time = 0;

    // ── renderer ──
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── scene & camera ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c12);
    this.scene.fog = new THREE.Fog(0x0a0c12, 48, 120);
    this.camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.05, 220);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // ── arena ──
    this.arena = new Arena();
    this.scene.add(this.arena.group);
    this.wallMeshes = this.arena.boxes.map(b => b.mesh).filter(Boolean);

    // ── menu showcase weapon (floats above central beacon) ──
    this.showcase = new THREE.Group();
    this.scene.add(this.showcase);
    this.showcaseWeaponId = null;

    // ── player body (visible in 3rd person) ──
    const pb = buildHumanoid({ primary: 0xd8541e, secondary: 0x1d1f26, skin: 0xb98a5a });
    this.playerModel = pb.group;
    this.playerParts = pb.parts;
    this.playerModel.visible = false;
    this.scene.add(this.playerModel);

    // ── player state ──
    this.player = {
      pos: new THREE.Vector3(6, 0, 24), velY: 0, yaw: Math.PI, pitch: 0,
      hp: 100, maxHp: 100, crouch: false, grounded: true,
      kills: 0, deaths: 0, streak: 0, bestStreak: 0, score: 0, headshots: 0,
      fireCooldown: 0, reloadTimer: 0, mag: 0, lives: 3,
    };

    // ── weapon / viewmodel ──
    this.weaponDef = null;
    this.viewGroup = new THREE.Group();
    this.viewGroup.position.set(0.26, -0.25, -0.52);
    this.camera.add(this.viewGroup);
    this.recoil = 0; this.swapAnim = 0; this.reloadAnim = 0; this.ads = 0;
    this.bobPhase = 0; this.footTimer = 0; this.pendingShots = [];

    // ── effects pools ──
    this.tracers = []; this.particles = []; this.casings = [];
    this.fxGroup = new THREE.Group(); this.scene.add(this.fxGroup);
    this.muzzleLight = new THREE.PointLight(0xffc46b, 0, 6, 2);
    this.scene.add(this.muzzleLight);

    // ── bots ──
    this.bots = [];
    this.respawnQueue = [];

    // ── mode / match ──
    this.mode = null; this.matchTime = 0; this.wave = 0; this.waveState = 'idle'; this.waveTimer = 0;
    this.round = 1; this.allyLives = 3; this.enemyLives = 3; this.roundWins = { ally: 0, enemy: 0 };
    this.teamScore = { ally: 0, enemy: 0 };
    this.matchOver = false;

    // ── input ──
    this.keys = {};
    this.mouseDown = false; this.mouseRight = false; this._lmbEdge = false; this._rmbEdge = false;
    this._bindInput();

    // ── HUD refs ──
    this.hud = {};
    for (const id of ['hud','hud-mode','hud-objective','hud-timer','hud-score-teams','score-ally','score-enemy','killfeed','hp-bar','hp-num','lives-row','kill-streak','weapon-class','weapon-name','ammo-mag','ammo-reserve','reload-hint','banner','banner-title','banner-sub','toast','wave-progress','wave-label','wave-bar','vignette-damage','scope-overlay','fader','crosshair','hitmarker','scoreboard','scoreboard-rows','click-to-play','hud-tl','chip-kill','chip-timer','chip-manual','chip-pool']) {
      this.hud[id] = document.getElementById(id);
    }

    window.addEventListener('resize', () => this._onResize());
    this._lastT = performance.now();
    requestAnimationFrame(t => this._loop(t));
  }

  // ══════════════ INPUT ══════════════
  _bindInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['Tab','Space'].includes(e.code)) e.preventDefault();
      if (this.state !== 'playing') return;
      if (e.code === 'KeyR') this.startReload();
      if (e.code === 'KeyF') this.toggleCamera();
      if (e.code === 'KeyG') this.randomizeWeapon('all', true);
      if (e.code === 'KeyZ') this.randomizeWeapon('gun', true);
      if (e.code === 'KeyX') this.randomizeWeapon('melee', true);
      if (e.code === 'Tab') this._showScoreboard(true);
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; if (e.code === 'Tab') this._showScoreboard(false); });
    window.addEventListener('mousedown', e => {
      if (this.state !== 'playing') return;
      if (e.button === 0) { this.mouseDown = true; this._lmbEdge = true; }
      if (e.button === 2) {
        this.mouseRight = true; this._rmbEdge = true;
        if (this.weaponDef?.cat === 'melee') this.meleeAttack('heavy');
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.mouseRight = false;
    });
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousemove', e => {
      if (document.pointerLockElement !== this.canvas || this.state !== 'playing') return;
      const sens = 0.0022 * settings.sens;
      this.player.yaw -= e.movementX * sens;
      this.player.pitch = clamp(this.player.pitch - e.movementY * sens, -1.45, 1.45);
    });
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      if (!locked && this.state === 'playing' && !this.matchOver) this.pause();
      this.hud['click-to-play']?.classList.toggle('hidden', locked || this.state !== 'playing');
    });
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing' && document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock();
    });
  }
  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ══════════════ MENU / SHOWCASE ══════════════
  enterMenu() {
    this.state = 'menu';
    this.matchOver = false;
    this._clearBots();
    this._resetEffects();
    this.playerModel.visible = false;
    this.viewGroup.visible = false;
    this._hideHud();
    this._rollShowcase(true);
  }
  _rollShowcase(instant = false) {
    const def = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
    if (def.id === this.showcaseWeaponId && !instant) return;
    this.showcaseWeaponId = def.id;
    this.showcase.clear();
    const model = buildWeaponModel(def.id);
    model.scale.setScalar(def.cat === 'melee' ? 1.7 : 2.4);
    this.showcase.add(model);
    this.showcase.position.set(0, 5.35, 0);
    const nameEl = document.getElementById('showcase-name');
    const clsEl = document.getElementById('showcase-class');
    if (nameEl) { nameEl.textContent = def.name; nameEl.style.color = RARITY_COLOR[def.rarity] ?? '#fff'; }
    if (clsEl) clsEl.textContent = `${def.cls} · ${String(def.rarity).toUpperCase()}`;
  }

  // ══════════════ MATCH LIFECYCLE ══════════════
  startMatch(modeId) {
    this.mode = MODES.find(m => m.id === modeId) ?? MODES[0];
    this.state = 'playing';
    this.matchOver = false;
    this.time = 0; this.matchTime = this.mode.time ?? 0;
    this.teamScore = { ally: 0, enemy: 0 };
    this.wave = 0; this.waveState = 'idle'; this.waveTimer = 0;
    this.round = 1; this.allyLives = 3; this.enemyLives = 3; this.roundWins = { ally: 0, enemy: 0 };
    this.respawnQueue.length = 0;

    this.player.hp = this.player.maxHp = 100;
    this.player.kills = 0; this.player.deaths = 0; this.player.streak = 0; this.player.bestStreak = 0; this.player.score = 0; this.player.headshots = 0;
    this.player.lives = this.mode.lives ?? 1;
    this.player.velY = 0; this.player.crouch = false;
    this._respawnPlayer(true);

    this._clearBots();
    this._spawnMatchBots();

    // starting weapon
    const pool = this._effectivePool();
    this.setWeapon(pool[Math.floor(Math.random() * pool.length)], true);

    // camera
    this._thirdPerson = settings.camera === 'tps';
    this.playerModel.visible = this._thirdPerson;
    this.viewGroup.visible = !this._thirdPerson;

    // HUD
    this._showHud();
    this.hud['hud-mode'].textContent = this.mode.name;
    this.hud['hud-objective'].textContent = this.mode.objective;
    this._updateChips();
    this._updateTeamHud();
    this._updateLivesHud();
    this._updateHpHud();

    const waveMode = !!this.mode.wave;
    this.hud['wave-progress'].classList.toggle('hidden', !waveMode);
    this.hud['hud-score-teams'].classList.toggle('hidden', !(this.mode.tdm || this.mode.elim));

    if (waveMode) { this.wave = 1; this._startWave(1); }

    this.showBanner(this.mode.name, this.mode.objective, 2.6);
    this.canvas.requestPointerLock?.();
  }

  _effectivePool() {
    const m = this.mode;
    const src = m?.pool && m.pool !== 'settings' ? m.pool : settings.pool;
    return poolFor(src);
  }
  _effectivePoolLabel() {
    const m = this.mode;
    const src = m?.pool && m.pool !== 'settings' ? m.pool : settings.pool;
    return src === 'gun' ? 'POOL: FOGO' : src === 'melee' ? 'POOL: MELEE' : 'POOL: TOTAL';
  }
  _randoKillActive() { const m = this.mode; return (m?.randoKill === true) || (settings.randoEnabled && settings.randoKill && m?.randoKill !== false); }
  _randoTimerActive() { return settings.randoEnabled && settings.randoTimerOn; }
  _randoRoundActive() { const m = this.mode; return (m?.randoRound === true) || (settings.randoEnabled && settings.randoRound); }

  _spawnMatchBots() {
    const m = this.mode;
    const diff = settings.difficulty;
    const usedNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const pick = () => usedNames.pop() ?? 'Bot';
    const pool = this._effectivePool();
    // bots spawn at least ~17m away from the player
    const spawns = [...this.arena.spawnPoints]
      .filter(s => s.distanceTo(this.player.pos) > 17)
      .sort(() => Math.random() - 0.5);
    for (const s of this.arena.spawnPoints) if (spawns.length < 7 && !spawns.includes(s)) spawns.push(s);

    const mkBot = (team, i) => {
      const spawn = spawns.pop() ?? new THREE.Vector3((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60);
      const weaponDef = pool[Math.floor(Math.random() * pool.length)];
      const b = new Bot(this, { name: pick(), team, spawn, difficulty: diff, weaponDef });
      b.respawnIndex = i;
      this.bots.push(b);
      return b;
    };

    if (m.tdm || m.elim) {
      for (let i = 0; i < (m.allies ?? 2); i++) mkBot('ally', i);
      for (let i = 0; i < (m.enemies ?? 5); i++) mkBot('enemy', i);
    } else if (!m.wave) {
      for (let i = 0; i < (m.bots ?? 6); i++) mkBot(null, i);
    }
    // survival waves spawn bots via _startWave()
  }

  _startWave(n) {
    this.wave = n; this.waveState = 'active';
    const count = Math.min(2 + n, 8);
    const diff = settings.difficulty === 'hard' || n >= 4 ? 'hard' : settings.difficulty === 'easy' ? (n >= 5 ? 'normal' : 'easy') : (n >= 3 ? 'hard' : 'normal');
    const usedNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const pool = this._effectivePool();
    for (let i = 0; i < count; i++) {
      const spawn = this.arena.spawnPoints[Math.floor(Math.random() * this.arena.spawnPoints.length)].clone();
      const weaponDef = pool[Math.floor(Math.random() * pool.length)];
      const b = new Bot(this, { name: usedNames[i % usedNames.length] + (n > 3 ? '·' + n : ''), team: 'enemy', spawn, difficulty: diff, weaponDef });
      this.bots.push(b);
    }
    this.hud['wave-label'].textContent = `ONDA ${n} — ${count} HOSTIS`;
    this.hud['wave-bar'].style.width = '100%';
    this.showBanner(`ONDA ${n}`, 'Elimine todos os hostis', 1.8);
    audio.waveHorn();
  }

  _clearBots() {
    for (const b of this.bots) { this.scene.remove(b.model); }
    this.bots.length = 0;
  }
  _resetEffects() {
    for (const t of this.tracers) this.fxGroup.remove(t.mesh);
    for (const p of this.particles) this.fxGroup.remove(p.mesh ?? p);
    for (const c of this.casings) this.fxGroup.remove(c.mesh);
    this.tracers.length = this.particles.length = this.casings.length = 0;
  }
  _respawnPlayer(initial = false) {
    const spawns = this.arena.spawnPoints;
    const s = spawns[Math.floor(Math.random() * spawns.length)];
    this.player.pos.set(s.x, 0, s.z);
    this.player.velY = 0; this.player.yaw = Math.atan2(s.x, s.z); this.player.pitch = 0;
    if (!initial) this.respawnQueue.length = 0;
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    document.getElementById('pause-screen')?.classList.remove('hidden');
    document.getElementById('click-to-play')?.classList.add('hidden');
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }
  resume() {
    if (this.state !== 'paused') return;
    document.getElementById('pause-screen')?.classList.add('hidden');
    this.state = 'playing';
    this.canvas.requestPointerLock?.();
  }
  quitToMenu() {
    this.state = 'menu';
    document.getElementById('pause-screen')?.classList.add('hidden');
    document.getElementById('end-screen')?.classList.add('hidden');
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.enterMenu();
    document.getElementById('menu')?.classList.remove('hidden');
  }

  // ══════════════ WEAPONS / RANDOMIZER ══════════════
  setWeapon(def, instant = false) {
    this.weaponDef = def;
    this.player.mag = def.mag ?? Infinity;
    this.player.reloadTimer = 0; this.player.fireCooldown = 0;
    this.recoil = 0; this.reloadAnim = 0;
    // rebuild viewmodel
    for (const c of [...this.viewGroup.children]) this.viewGroup.remove(c);
    const model = buildWeaponModel(def.id);
    model.position.set(0, 0, 0);
    this.viewGroup.add(model);
    this.viewGroup.visible = this._thirdPerson ? false : true;
    this.swapAnim = instant ? 0 : 1;
    this._updateWeaponHud();
  }

  randomizeWeapon(category = 'all', manual = false) {
    let pool = this._effectivePool();
    if (category === 'gun') pool = pool.filter(w => w.cat === 'gun');
    else if (category === 'melee') pool = pool.filter(w => w.cat === 'melee');
    if (!pool.length) return;
    const def = rollWeapon(pool, this.weaponDef?.id);
    this.setWeapon(def);
    audio.randomize();
    if (manual) this.showToast(`⟳ ${def.name}`);
    // accent flash on viewmodel
    this.recoil = Math.min(this.recoil + 0.25, 0.6);
  }

  startReload() {
    const def = this.weaponDef;
    if (!def || def.cat !== 'gun') return;
    if (this.player.reloadTimer > 0 || this.player.mag === def.mag) return;
    this.player.reloadTimer = def.reload;
    this.reloadAnim = 1;
    audio.reloadStart();
  }

  toggleCamera() {
    this._thirdPerson = !this._thirdPerson;
    this.playerModel.visible = this._thirdPerson;
    this.viewGroup.visible = !this._thirdPerson;
    audio.uiClick();
  }

  // ══════════════ COMBAT — PLAYER ══════════════
  _spreadDir(baseDir, spreadDeg) {
    const spread = THREE.MathUtils.degToRad(spreadDeg) / 2;
    const theta = Math.random() * Math.PI * 2;
    const r = Math.tan(spread) * Math.sqrt(Math.random());
    const dir = baseDir.clone();
    const up = Math.abs(dir.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const realUp = new THREE.Vector3().crossVectors(right, dir).normalize();
    dir.addScaledVector(right, Math.cos(theta) * r).addScaledVector(realUp, Math.sin(theta) * r).normalize();
    return dir;
  }
  _currentSpread() {
    const def = this.weaponDef; if (!def || def.cat !== 'gun') return 0;
    const moving = this._isMoving();
    let s = def.spread * (moving ? 1.7 : 1) * (this.player.crouch ? 0.7 : 1);
    if (this.ads > 0.5) s *= def.zoom ? 0.12 : 0.35;
    return s;
  }
  _isMoving() {
    return this.keys['KeyW'] || this.keys['KeyA'] || this.keys['KeyS'] || this.keys['KeyD'];
  }

  fireWeapon() {
    const def = this.weaponDef;
    if (!def || def.cat !== 'gun') return;
    const p = this.player;
    if (p.hp <= 0) return;
    if (p.reloadTimer > 0) return;
    if (p.fireCooldown > 0) return;
    if (p.mag <= 0) { audio.dryFire(); this.startReload(); return; }

    p.fireCooldown = 60 / def.rpm;
    if (def.mag !== undefined) p.mag--;
    this.recoil = Math.min(this.recoil + (def.zoom ? 0.32 : def.pellets ? 0.42 : 0.2), 0.75);
    audio.shoot(def.sound);

    const origin = new THREE.Vector3(); this.camera.getWorldPosition(origin);
    const baseDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const pellets = def.pellets ?? 1;
    const meshes = [];
    for (const b of this.bots) if (b.alive) meshes.push(...b.hitMeshes);
    // clear raycaster
    const rc = new THREE.Raycaster();
    rc.far = def.range[1] < 9000 ? def.range[1] + 40 : 300;

    // collect per-pellet results
    for (let i = 0; i < pellets; i++) {
      const dir = this._spreadDir(baseDir, this._currentSpread());
      rc.set(origin, dir);
      // walls first: a solid wall blocks the shot entirely
      const wallHits = this.wallMeshes.length ? rc.intersectObjects(this.wallMeshes, false) : [];
      const wallDist = wallHits.length ? wallHits[0].distance : Infinity;
      const hitsAll = rc.intersectObjects(meshes, false);
      const hits = hitsAll.filter(h => h.distance < wallDist);
      let hitBot = null, hitPoint = null, isHead = false, dist = rc.far;
      if (hits.length) {
        const h = hits[0];
        hitPoint = h.point; dist = h.distance;
        hitBot = h.object.userData.bot; isHead = !!h.object.userData.isHead;
      }
      let end = hitPoint ?? origin.clone().addScaledVector(dir, Math.min(rc.far, 80));
      let wallPoint = null;
      if (wallDist < end.distanceTo(origin)) { end = wallHits[0].point.clone(); wallPoint = end; }
      this._spawnTracer(this._muzzleWorld(), end);
      if (!hitPoint && wallPoint) this._spawnImpact(wallPoint, 0x9aa3b2, 5);
      if (hitBot) {
        let dmg = def.dmg * this._falloff(def, dist);
        if (isHead) dmg *= def.headshot;
        dmg *= settings.damageMult / 100;
        hitBot.takeDamage(dmg, Math.atan2(dir.x, dir.z), this.player, isHead);
        this._spawnImpact(hitPoint, 0xff5040, 6);
        this._registerHit(dmg, isHead, hitBot);
        // pierce continues through targets
        if (def.pierce) {
          const seen = new Set([hitBot]);
          let fall = 0.75;
          for (const h of hits.slice(1)) {
            const b2 = h.object.userData.bot;
            if (!b2 || seen.has(b2)) continue;
            seen.add(b2);
            b2.takeDamage(def.dmg * fall * (h.object.userData.isHead ? def.headshot : 1) * settings.damageMult / 100, Math.atan2(dir.x, dir.z), this.player, !!h.object.userData.isHead);
            this._registerHit(def.dmg * fall, !!h.object.userData.isHead, b2);
            fall *= 0.72;
          }
        }
      } else if (hitPoint) {
        this._spawnImpact(hitPoint, 0xffc873, 5);
      }
    }

    this._ejectCasing();
    this._muzzleFlash();
    this._updateWeaponHud();
    // auto reload when empty
    if (p.mag === 0) this.startReload();
  }

  _falloff(def, dist) {
    const [full, zero] = def.range;
    if (dist <= full) return 1;
    if (dist >= zero) return 0.45;
    return lerp(1, 0.45, (dist - full) / (zero - full));
  }
  _registerHit(dmg, isHead, bot) {
    this._showHitmarker(isHead);
    audio.hitmarker(isHead);
    this.player.score += Math.round(dmg * 0.5);
  }
  _muzzleWorld() {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    if (this._thirdPerson) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      return this.player.pos.clone().addScaledVector(forward, 1.0).addScaledVector(right, 0.28).add(new THREE.Vector3(0, 1.38, 0));
    }
    const v = new THREE.Vector3(0, 0.055, -(this.weaponDef ? muzzleOffset(this.weaponDef.id) + 0.08 : 0.4));
    return this.viewGroup.localToWorld(v.clone());
  }

  meleeAttack(kind) {
    const def = this.weaponDef;
    if (!def || def.cat !== 'melee') return;
    const p = this.player;
    if (p.hp <= 0) return;
    const [dmg, cd] = kind === 'heavy' ? def.heavy : def.light;
    if (p.fireCooldown > 0) return;
    p.fireCooldown = cd;
    this.meleeAnimKind = kind; this.meleeAnimT = 1;
    audio.meleeSwing(kind === 'heavy');

    const origin = this.player.pos.clone(); origin.y += 1.3;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion); forward.y = 0; forward.normalize();
    const fdirYaw = Math.atan2(forward.x, forward.z);
    let hitAny = false;

    const consider = (target, isPlayer) => {
      const tpos = target.pos ?? target;
      const d = origin.distanceTo(tpos.clone().setY(origin.y));
      if (d > def.range + 0.35) return;
      const toT = tpos.clone().sub(origin); toT.y = 0;
      const ang = Math.acos(clamp(toT.normalize().dot(forward), -1, 1)) * (180 / Math.PI);
      if (!def.aoe && ang > def.arc / 2 + 12) return;
      hitAny = true;
      const finalDmg = dmg * settings.damageMult / 100;
      if (isPlayer) { /* not applicable: player attacking self never */ }
      else target.takeDamage(finalDmg, fdirYaw, this.player, false);
      this._spawnImpact(tpos.clone().setY(tpos.y + 1.2), 0xffe0b0, 6);
      // knockback
      const kb = def.knock * (kind === 'heavy' ? 1.6 : 1);
      target.pos.x += Math.sin(fdirYaw) * kb * 0.14; target.pos.z += Math.cos(fdirYaw) * kb * 0.14;
    };

    for (const b of this.bots) if (b.alive) consider(b, false);
    if (hitAny) { audio.meleeHit(kind === 'heavy'); this._showHitmarker(kind === 'heavy'); }
    else audio.meleeMiss();
    this.recoil = Math.min(this.recoil + (kind === 'heavy' ? 0.35 : 0.18), 0.6);
  }

  // ══════════════ COMBAT — BOTS ══════════════
  getAliveTargets(bot) {
    const out = [];
    const p = this.player;
    const pAlive = p.hp > 0;
    if (bot.team === 'ally') {
      // allies target enemies
      for (const b of this.bots) if (b.alive && b.team === 'enemy') out.push(b);
      return out;
    }
    if (bot.team === 'enemy') {
      if (pAlive) out.push(this._playerAsTarget());
      for (const b of this.bots) if (b.alive && b.team === 'ally') out.push(b);
      return out;
    }
    // FFA: everyone is hostile
    if (pAlive) out.push(this._playerAsTarget());
    for (const b of this.bots) if (b.alive && b !== bot) out.push(b);
    return out;
  }
  _playerAsTarget() {
    return {
      pos: this.player.pos,
      isPlayer: true,
      takeDamage: (amount, fromDir, attacker, isHead) => this.damagePlayer(amount, fromDir, attacker, isHead),
    };
  }

  botFireWeapon(bot, target, dist) {
    const def = bot.weaponDef;
    const spreadDeg = bot.cfg.spread * (target.isPlayer ? 1 : 0.85);
    const from = bot.pos.clone(); from.y += 1.42;
    const toPos = target.pos.clone(); toPos.y += 1.15 + (Math.random() - 0.5) * 0.6;
    // aim error grows with distance & lowers with difficulty
    const err = spreadDeg * 0.05 * dist * 0.45;
    toPos.x += (Math.random() - 0.5) * err; toPos.z += (Math.random() - 0.5) * err;
    const dir = toPos.sub(from).normalize();
    const rc = new THREE.Raycaster();
    rc.set(from, dir);
    rc.far = dist + 12;
    // targets: hit meshes of everyone hostile to this bot
    const meshes = [];
    if (bot.team !== 'enemy') { /* enemies may shoot allies? no */ }
    for (const b of this.bots) { if (!b.alive || b === bot || b.team === bot.team) continue; meshes.push(...b.hitMeshes); }
    if ((bot.team === 'enemy' || bot.team === null) && this.player.hp > 0) {
      // test player via math spheres instead of meshes
      meshes.push(...this._playerHitProxy());
    }
    const wallHits = this.wallMeshes.length ? rc.intersectObjects(this.wallMeshes, false) : [];
    const wallDist = wallHits.length ? wallHits[0].distance : Infinity;
    const hits = rc.intersectObjects(meshes, false).filter(h => h.distance < wallDist);
    let end = from.clone().addScaledVector(dir, rc.far);
    if (hits.length) {
      const h = hits[0]; end = h.point.clone();
      const victim = h.object.userData.bot;
      let dmg = def.dmg * bot.cfg.dmgMult;
      if (victim == null || h.object.userData.isPlayerProxy) dmg *= 0.5;   // mercy rule vs player
      dmg *= this._falloff(def, h.distance);
      if (h.object.userData.isHead) dmg *= def.headshot;
      if (victim) victim.takeDamage(dmg, Math.atan2(dir.x, dir.z), bot, !!h.object.userData.isHead);
      else this.damagePlayer(dmg, Math.atan2(dir.x, dir.z), bot, !!h.object.userData.isHead);
      this._spawnImpact(h.point, h.object.userData.bot ? 0xff5040 : 0xffc873, 4);
    }
    if (wallDist < end.distanceTo(from)) end = wallHits[0].point.clone();
    this._spawnTracer(from.clone().addScaledVector(dir, 0.8), end);
    this._spawnBotFlash(from.clone().addScaledVector(dir, 0.8));
    const distToPlayer = bot.pos.distanceTo(this.player.pos);
    if (distToPlayer < 42) audio.shoot(def.sound);
  }
  _playerHitProxy() {
    if (!this._pProxy) {
      const mk = (r, y, isHead) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), new THREE.MeshBasicMaterial({ visible: false }));
        m.userData.isHead = isHead; m.userData.bot = null; m.userData.isPlayerProxy = true;
        this.scene.add(m); return m;
      };
      this._pProxy = [mk(0.42, 1.15, false), mk(0.2, 1.66, true)];
    }
    const [body, head] = this._pProxy;
    body.position.copy(this.player.pos); body.position.y += 1.15;
    head.position.copy(this.player.pos); head.position.y += 1.66;
    return this._pProxy;
  }

  botMeleeHit(bot, target, def) {
    const d = bot.pos.distanceTo(target.pos);
    if (d > def.range + 0.6) return;
    audio.meleeSwing(true);
    const dmg = def.light[0] * bot.cfg.dmgMult;
    if (target.isPlayer) this.damagePlayer(dmg, Math.atan2(bot.pos.x - this.player.pos.x, bot.pos.z - this.player.pos.z), bot, false);
    else target.takeDamage(dmg, Math.atan2(bot.pos.x - target.pos.x, bot.pos.z - target.pos.z), bot, false);
  }

  onBotKilled(bot, attacker, isHead) {
    const p = this.player;
    const attackerIsPlayer = attacker === this.player;
    const weaponName = attackerIsPlayer ? this.weaponDef?.name : (attacker?.weaponDef?.name ?? '—');
    this._addKillfeed(attackerIsPlayer ? 'VOCÊ' : (attacker?.name ?? '?'), bot.name, weaponName, attackerIsPlayer, attacker?.team ?? null);

    if (attackerIsPlayer) {
      p.kills++; p.streak++; p.bestStreak = Math.max(p.bestStreak, p.streak);
      p.score += 100 + (isHead ? 50 : 0) + Math.min(p.streak - 1, 5) * 25;
      if (isHead) p.headshots++;
      audio.killChime();
      // team score tracking
      if (this.mode.tdm || this.mode.elim) this.teamScore.ally++;
      if (this._randoKillActive()) { this.randomizeWeapon('all'); this.showToast('⟳ ABATE! ARMA TROCADA'); }
      // survival wave tracking
      if (this.mode.wave) this.hud['wave-bar'].style.width = `${Math.max(0, (this.bots.filter(b => b.alive && b.team === 'enemy').length - 1) / Math.max(1, this.bots.filter(b => b.team === 'enemy').length)) * 100}%`;
    } else {
      if (attacker?.team === 'ally' || (attacker === this.player)) { /* ally bot killed */ }
      if (this.mode.tdm || this.mode.elim) {
        if (attacker?.team === 'enemy') this.teamScore.enemy++; else if (attacker?.team === 'ally') this.teamScore.ally++;
      }
    }
    // deaths counter for player-team
    this._updateTeamHud();

    // respawn logic
    if (this.mode.tdm || (!this.mode.elim && !this.mode.wave)) {
      this.respawnQueue.push({ bot, timer: 2.5 });
    }
    this._checkObjectives();
  }

  damagePlayer(amount, fromDir, attacker, isHead = false) {
    const p = this.player;
    if (p.hp <= 0) return;
    p.hp -= amount;
    audio.hurt();
    const vg = this.hud['vignette-damage'];
    if (vg) { vg.style.opacity = '1'; setTimeout(() => vg.style.opacity = '0', 130); }
    if (p.hp <= 0) {
      p.hp = 0; p.deaths++; p.streak = 0;
      this._addKillfeed(attacker?.name ?? '?', 'VOCÊ', attacker?.weaponDef?.name ?? '', false, attacker?.team ?? null);
      this._onPlayerDeath();
    }
    this._updateHpHud();
  }

  _onPlayerDeath() {
    const m = this.mode;
    if (m.elim) {
      // out for the round — spectate / round end handled by _checkObjectives
      this._collateElimination();
      return;
    }
    if (m.wave) {
      this.endMatch(false, `SOBREVIVEU ATÉ A ONDA ${this.wave}`);
      return;
    }
    // free respawn
    showCenterBannerSafe(this, 'VOCÊ FOI ELIMINADO', 'Respawn em 3 segundos…', 2.2);
    setTimeout(() => {
      if (this.state !== 'playing' || this.matchOver) return;
      this.player.hp = this.player.maxHp;
      this._respawnPlayer();
      this._updateHpHud();
    }, 3000);
  }

  // ══════════════ ELIMINATION LOGIC ══════════════
  _collateElimination() {
    const alliesAlive = this.player.hp > 0 || this.bots.some(b => b.alive && b.team === 'ally');
    const enemiesAlive = this.bots.some(b => b.alive && b.team === 'enemy');
    if (enemiesAlive && alliesAlive) return; // round continues
    if (!enemiesAlive && !alliesAlive) { this._endRound('draw'); return; }
    this._endRound(enemiesAlive ? 'enemy' : 'ally');
  }
  _endRound(winner) {
    if (this.matchOver) return;
    if (winner === 'ally') { this.roundWins.ally++; audio.roundWin(); }
    else if (winner === 'enemy') { this.roundWins.enemy++; audio.roundLose(); }
    this._updateTeamHud();
    const need = this.mode.roundsToWin ?? 3;
    if (this.roundWins.ally >= need) { this.endMatch(true, 'SUA EQUIPE DOMINOU A ARENA'); return; }
    if (this.roundWins.enemy >= need) { this.endMatch(false, 'A EQUIPE INIMIGA LEVOU A MELHOR'); return; }
    // next round
    this.round++;
    this.showBanner(winner === 'ally' ? 'RODADA VENCIDA' : winner === 'enemy' ? 'RODADA PERDIDA' : 'EMPATE', `RODADA ${this.round}`, 2.2);
    setTimeout(() => {
      if (this.matchOver || this.state === 'menu') return;
      // reset combatants
      this.player.hp = this.player.maxHp;
      this._respawnPlayer();
      if (this._randoRoundActive()) this.randomizeWeapon('all');
      for (const b of this.bots) {
        if (!b.alive) { this.scene.remove(b.model); }
        else { b.pos.copy(this.arena.spawnPoints[Math.floor(Math.random() * this.arena.spawnPoints.length)]); b.pos.y = 0; b.velY = 0; b.hp = b.maxHp; b.model.position.copy(b.pos); b.model.rotation.set(0, b.yaw, 0); b.model.scale.y = 1; }
        if (this._randoRoundActive()) b.randomizeWeapon(this._effectivePool());
      }
      this.bots = this.bots.filter(b => b.alive);
      // respawn any dead bots for next round
      const needAllies = (this.mode.allies ?? 2) - this.bots.filter(b => b.team === 'ally').length;
      const needEnemies = (this.mode.enemies ?? 4) - this.bots.filter(b => b.team === 'enemy').length;
      const pool = this._effectivePool();
      const usedNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);
      for (let i = 0; i < needAllies; i++) { const s = this.arena.spawnPoints[Math.floor(Math.random() * 8)].clone(); this.bots.push(new Bot(this, { name: usedNames.pop(), team: 'ally', spawn: s, difficulty: settings.difficulty, weaponDef: pool[Math.floor(Math.random() * pool.length)] })); }
      for (let i = 0; i < needEnemies; i++) { const s = this.arena.spawnPoints[Math.floor(Math.random() * 8)].clone(); this.bots.push(new Bot(this, { name: usedNames.pop(), team: 'enemy', spawn: s, difficulty: settings.difficulty, weaponDef: pool[Math.floor(Math.random() * pool.length)] })); }
      this._updateHpHud();
    }, 2600);
  }

  // ══════════════ OBJECTIVES / WIN ══════════════
  _checkObjectives() {
    const m = this.mode; if (!m) return;
    if (m.wave) {
      const alive = this.bots.filter(b => b.alive && b.team === 'enemy').length;
      if (alive === 0 && this.waveState === 'active') this._onWaveCleared();
      return;
    }
    if (m.elim) { this._collateElimination(); return; }
    const target = m.target ?? Infinity;
    if (!m.tdm && !m.elim && !m.wave && this.player.kills >= target) { this.endMatch(true, `${target} ABATES — ALVO ATINGIDO`); return; }
    if (m.tdm) {
      const enemyTarget = m.target ?? 30;
      if (this.teamScore.ally >= enemyTarget) this.endMatch(true, '30 ABATES DE EQUIPE');
      else if (this.teamScore.enemy >= enemyTarget) this.endMatch(false, 'EQUIPE INIMIGA ATINGIU 30');
    }
  }
  _onWaveCleared() {
    this.waveState = 'cleared';
    this.player.score += 250 + this.wave * 100;
    this.player.hp = clamp(this.player.hp + 30, 0, this.player.maxHp);
    this._updateHpHud();
    this.showBanner(`ONDA ${this.wave} ELIMINADA`, '+250 pontos · +30 vida', 2.2);
    audio.roundWin();
    this.waveTimer = 4;
  }

  endMatch(victory, subtitle = '') {
    if (this.matchOver) return;
    this.matchOver = true;
    this.state = 'over';
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    const p = this.player;
    document.getElementById('end-result').textContent = victory ? 'VITÓRIA' : 'DERROTA';
    document.getElementById('end-result').classList.toggle('defeat', !victory);
    document.getElementById('end-mode').textContent = this.mode.name;
    document.getElementById('es-kills').textContent = p.kills;
    document.getElementById('es-deaths').textContent = p.deaths;
    document.getElementById('es-streak').textContent = p.bestStreak;
    document.getElementById('es-score').textContent = p.score;
    document.getElementById('end-screen')?.classList.remove('hidden');
    this._hideHud();
    victory ? audio.roundWin() : audio.roundLose();
  }

  // ══════════════ FX ══════════════
  _spawnTracer(from, to) {
    const len = from.distanceTo(to);
    const geo = new THREE.BoxGeometry(0.025, 0.025, len);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from).lerp(to, 0.5);
    mesh.lookAt(to);
    this.fxGroup.add(mesh);
    this.tracers.push({ mesh, life: 0.14 });
  }
  _spawnImpact(point, color, n = 6) {
    for (let i = 0; i < n; i++) {
      const geo = new THREE.TetrahedronGeometry(0.045 + Math.random() * 0.05);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(point);
      this.fxGroup.add(mesh);
      this.particles.push({ mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4.5 + 1, (Math.random() - 0.5) * 5), life: 0.55 + Math.random() * 0.3 });
    }
  }
  _ejectCasing() {
    const geo = new THREE.BoxGeometry(0.028, 0.028, 0.045);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd8a838, metalness: .9, roughness: .3 });
    const mesh = new THREE.Mesh(geo, mat);
    const from = this._muzzleWorld();
    mesh.position.copy(from);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.fxGroup.add(mesh);
    this.casings.push({ mesh, vel: right.multiplyScalar(1.6 + Math.random()).add(new THREE.Vector3(0, 2.2 + Math.random(), 0)), life: 1.3, spin: (Math.random() - 0.5) * 12 });
  }
  _muzzleFlash() {
    this.muzzleLight.position.copy(this._muzzleWorld());
    this.muzzleLight.intensity = 14;
    this.recoil = Math.min(this.recoil + 0.05, 0.8);
  }
  _spawnBotFlash(pos) {
    const geo = new THREE.SphereGeometry(0.12, 6, 5);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.fxGroup.add(mesh);
    this.particles.push({ mesh, vel: new THREE.Vector3(), life: 0.07, grow: true });
  }

  // ══════════════ HUD ══════════════
  _showHud() { document.getElementById('hud')?.classList.remove('hidden'); document.getElementById('menu')?.classList.add('hidden'); }
  _hideHud() { document.getElementById('hud')?.classList.add('hidden'); }
  showBanner(title, sub = '', dur = 2) {
    const b = this.hud.banner; if (!b) return;
    this.hud['banner-title'].textContent = title;
    this.hud['banner-sub'].textContent = sub;
    b.classList.remove('hidden');
    clearTimeout(this._bannerTo);
    this._bannerTo = setTimeout(() => b.classList.add('hidden'), dur * 1000);
  }
  showToast(text, dur = 1.6) {
    const t = this.hud.toast; if (!t) return;
    t.textContent = text; t.classList.remove('hidden');
    clearTimeout(this._toastTo);
    this._toastTo = setTimeout(() => t.classList.add('hidden'), dur * 1000);
  }
  _showHitmarker(crit) {
    const h = this.hud.hitmarker; if (!h) return;
    h.classList.remove('show', 'crit'); void h.offsetWidth;
    h.classList.add('show'); if (crit) h.classList.add('crit');
  }
  _addKillfeed(attacker, victim, weapon, byPlayer, attackerTeam) {
    const feed = this.hud.killfeed; if (!feed) return;
    const div = document.createElement('div');
    div.className = 'kf-item';
    const aColor = attackerTeam === 'ally' || byPlayer ? '#27e0ff' : attackerTeam === 'enemy' ? '#ff6b6b' : '#ffb03a';
    div.innerHTML = `<b style="color:${aColor}">${escapeHtml(attacker)}</b> ▸ ${escapeHtml(victim)} <span class="kf-w">· ${escapeHtml(weapon)}</span>`;
    feed.appendChild(div);
    while (feed.children.length > 4) feed.removeChild(feed.firstChild);
    setTimeout(() => div.remove(), 4200);
  }
  _updateHpHud() {
    const p = this.player;
    const pct = clamp(p.hp / p.maxHp, 0, 1);
    const bar = this.hud['hp-bar'];
    if (bar) { bar.style.width = `${pct * 100}%`; bar.classList.toggle('low', pct < 0.3); }
    if (this.hud['hp-num']) this.hud['hp-num'].textContent = Math.ceil(p.hp);
    const streakEl = this.hud['kill-streak'];
    if (streakEl) streakEl.textContent = p.streak >= 3 ? `🔥 SEQUÊNCIA DE ${p.streak} ABATES` : '';
  }
  _updateLivesHud() {
    const row = this.hud['lives-row']; if (!row) return;
    if (!this.mode?.elim) { row.classList.add('hidden'); return; }
    row.classList.remove('hidden');
    const need = this.mode.roundsToWin ?? 3;
    let html = '';
    for (let i = 0; i < need; i++) html += `<div class="life-pip ${i < this.roundWins.ally ? '' : 'lost'}"></div>`;
    row.innerHTML = html;
  }
  _updateTeamHud() {
    this._updateLivesHud();
    const el = this.hud['hud-score-teams'];
    if (!this.mode?.tdm && !this.mode?.elim) { el?.classList.add('hidden'); return; }
    el?.classList.remove('hidden');
    this.hud['score-ally'].textContent = this.mode.elim ? this.roundWins.ally : this.teamScore.ally;
    this.hud['score-enemy'].textContent = this.mode.elim ? this.roundWins.enemy : this.teamScore.enemy;
  }
  _updateWeaponHud() {
    const def = this.weaponDef; if (!def) return;
    this.hud['weapon-name'].textContent = def.name;
    this.hud['weapon-class'].textContent = def.cls;
    this.hud['weapon-class'].style.color = RARITY_COLOR[def.rarity] ?? '#ffb03a';
    if (def.cat === 'melee') {
      this.hud['ammo-mag'].textContent = '∞';
      this.hud['ammo-reserve'].textContent = 'MELEE';
    } else {
      this.hud['ammo-mag'].textContent = this.player.mag;
      this.hud['ammo-reserve'].textContent = '∞';
    }
    this.hud['reload-hint'].classList.toggle('hidden', !(def.cat === 'gun' && this.player.mag <= Math.floor(def.mag * 0.25)));
  }
  _updateChips() {
    this.hud['chip-kill']?.classList.toggle('hidden', !this._randoKillActive());
    this.hud['chip-timer']?.classList.toggle('hidden', !this._randoTimerActive());
    if (this.hud['chip-timer']) this.hud['chip-timer'].textContent = `⟳ AUTO ${settings.randoInterval}s`;
    this.hud['chip-manual']?.classList.toggle('hidden', false);
    this.hud['chip-pool']?.classList.toggle('hidden', false);
    if (this.hud['chip-pool']) this.hud['chip-pool'].textContent = this._effectivePoolLabel();
  }
  _showScoreboard(show) {
    const sb = this.hud.scoreboard; if (!sb) return;
    if (!show) { sb.classList.add('hidden'); return; }
    sb.classList.remove('hidden');
    const rows = [];
    rows.push({ name: 'VOCÊ', k: this.player.kills, d: this.player.deaths, me: true, team: 'ally' });
    for (const b of this.bots) rows.push({ name: b.name, k: b.kills, d: b.deaths, me: false, team: b.team });
    rows.sort((a, b) => b.k - a.k);
    this.hud['scoreboard-rows'].innerHTML = rows.map(r =>
      `<div class="sb-row ${r.me ? 'me' : ''} ${r.team === 'ally' ? 'team-ally' : r.team === 'enemy' ? 'team-enemy' : ''}"><span class="sb-name">${escapeHtml(r.name)}</span><span class="sb-k">${r.k} ABATES</span><span class="sb-d">${r.d} MORTES</span></div>`
    ).join('');
  }

  // ══════════════ MAIN LOOP ══════════════
  _loop(now) {
    requestAnimationFrame(t => this._loop(t));
    let dt = Math.min((now - this._lastT) / 1000, 0.05);
    this._lastT = now;
    this.time += dt;

    if (this.state === 'menu') {
      // cinematic orbit + showcase
      const t = this.time * 0.12;
      const r = 23;
      this.camera.position.set(Math.cos(t) * r, 9.5 + Math.sin(this.time * 0.3) * 1.4, Math.sin(t) * r);
      this.camera.lookAt(0, 2.2, 0);
      this.showcase.rotation.y = this.time * 1.4;
      this.showcase.position.y = 5.35 + Math.sin(this.time * 1.7) * 0.22;
      this.showcase.visible = true;
      this._updateFx(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.showcase.visible = false;

    if (this.state === 'playing') this._updatePlaying(dt);
    // paused / over: render static frame (frozen world)
    this.renderer.render(this.scene, this.camera);
  }

  _updatePlaying(dt) {
    const p = this.player;
    // timers
    p.fireCooldown -= dt;
    if (p.reloadTimer > 0) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0 && this.weaponDef?.cat === 'gun') {
        p.mag = this.weaponDef.mag;
        audio.reloadEnd();
        this._updateWeaponHud();
      }
    }
    this.recoil = Math.max(0, this.recoil - dt * 2.6);
    this.reloadAnim = Math.max(0, this.reloadAnim - dt * 1.6);
    this.swapAnim = Math.max(0, this.swapAnim - dt * 2.2);
    this.meleeAnimT = Math.max(0, (this.meleeAnimT ?? 0) - dt * 3.2);
    this.matchTime = Math.max(0, this.matchTime - dt);
    this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 90);

    // randomizer timer
    if (this._randoTimerActive()) {
      this._randoAccum = (this._randoAccum ?? 0) + dt;
      if (this._randoAccum >= settings.randoInterval) { this._randoAccum = 0; this.randomizeWeapon('all'); this.showToast('⟳ TEMPO ESGOTADO — NOVA ARMA'); }
    }

    // ── movement ──
    const fwd = (this.keys['KeyW'] ? 1 : 0) - (this.keys['KeyS'] ? 1 : 0);
    const strafe = (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0);
    p.crouch = !!(this.keys['ControlLeft'] || this.keys['KeyC']);
    const sprinting = this.keys['ShiftLeft'] && fwd > 0 && !p.crouch;
    const speed = (p.crouch ? 2.4 : sprinting ? 6.4 : 4.4) * (this._thirdPerson ? 1 : 1);

    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    let mx = (-sin * fwd + cos * strafe);
    let mz = (-cos * fwd - sin * strafe);
    const mlen = Math.hypot(mx, mz);
    if (mlen > 1e-4) { mx = mx / mlen * speed * dt; mz = mz / mlen * speed * dt; p.pos.x += mx; p.pos.z += mz; this.bobPhase += dt * speed * 1.65; }

    // gravity & jump
    const floor = floorHeightAt(p.pos.x, p.pos.z, 0.36, p.pos.y, this.arena.boxes);
    if (this.keys['Space'] && p.grounded && !p.crouch) { p.velY = 7.6; p.grounded = false; audio.jump(); }
    p.velY -= 21 * dt;
    p.pos.y += p.velY * dt;
    if (p.pos.y <= floor) { p.pos.y = floor; p.velY = 0; p.grounded = true; } else p.grounded = false;
    resolveCapsule(p.pos, 0.36, p.crouch ? 1.15 : 1.75, this.arena.boxes);
    const S = 41; p.pos.x = clamp(p.pos.x, -S, S); p.pos.z = clamp(p.pos.z, -S, S);

    // footsteps
    if (mlen > 1e-4 && p.grounded) {
      this.footTimer -= dt * (sprinting ? 1.6 : 1);
      if (this.footTimer <= 0) { audio.footstep(); this.footTimer = 0.38; }
    }

    // ── camera & viewmodel ──
    const eyeH = p.crouch ? EYE_CROUCH : EYE_STAND;
    const bobY = mlen > 1e-4 ? Math.sin(this.bobPhase * 2) * 0.033 : 0;
    const bobX = mlen > 1e-4 ? Math.cos(this.bobPhase) * 0.02 : 0;
    // ADS
    const wantAds = this.mouseRight && this.weaponDef?.cat === 'gun';
    this.ads = clamp(this.ads + (wantAds ? dt * 9 : -dt * 9), 0, 1);
    const baseFov = settings.fov;
    const aimFov = this.weaponDef?.zoom ? 22 : baseFov - 18;
    this.camera.fov = lerp(baseFov, aimFov, this.ads);
    this.camera.updateProjectionMatrix();

    if (this._thirdPerson) {
      const back = 3.4, up = 1.15;
      const camDir = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
      this.camera.position.set(p.pos.x + camDir.x * back, p.pos.y + eyeH + up, p.pos.z + camDir.z * back);
      // camera collision pull-in
      const camFloor = floorHeightAt(this.camera.position.x, this.camera.position.z, 0.2, this.camera.position.y, this.arena.boxes);
      this.camera.position.y = Math.max(this.camera.position.y, camFloor + 0.3);
      this.camera.lookAt(p.pos.x, p.pos.y + eyeH - 0.15, p.pos.z);
      // hide viewmodel in TPS; show body
      this.playerModel.visible = true;
      this.playerModel.position.copy(p.pos);
      this.playerModel.rotation.y = p.yaw + Math.PI;
      this.playerModel.scale.y = p.crouch ? 0.82 : 1;
      const swing = mlen > 1e-4 ? Math.sin(this.bobPhase) * 0.7 : 0;
      this.playerParts.legL.rotation.x = swing; this.playerParts.legR.rotation.x = -swing;
      if (this.weaponDef?.cat === 'gun') { this.playerParts.armR.rotation.x = -1.15; this.playerParts.armL.rotation.x = -0.95; }
      this.viewGroup.visible = false;
    } else {
      this.camera.position.set(p.pos.x + bobX * Math.cos(p.yaw), p.pos.y + eyeH + bobY, p.pos.z + bobX * -Math.sin(p.yaw));
      this.camera.rotation.set(p.pitch, p.yaw, 0);
      this.viewGroup.visible = true;
    }

    // viewmodel pose: sway / recoil / reload dip / swap pop / melee swing
    const def = this.weaponDef;
    const spreadHud = this._currentSpread();
    const gap = 10 + spreadHud * 2.4 + this.recoil * 40;
    this.hud.crosshair?.style.setProperty('--gap', `${gap}px`);

    const swayX = Math.sin(this.time * 1.3) * 0.006, swayY = Math.cos(this.time * 1.7) * 0.005;
    let vx = 0.26 * (1 - this.ads) + 0.0 * this.ads;
    let vy = -0.25 * (1 - this.ads) + -0.185 * this.ads + bobY * 0.6;
    let vz = -0.52;
    vz += this.recoil * 0.16;   // kick back
    let rx = this.recoil * 0.35; // muzzle flip up
    let ry = this.reloadAnim > 0 ? Math.sin(this.reloadAnim * Math.PI) * -0.9 : 0;
    let rz = this.reloadAnim > 0 ? Math.sin(this.reloadAnim * Math.PI) * 0.5 : 0;
    // swap pop-in
    let s = 1;
    if (this.swapAnim > 0) { const t = 1 - this.swapAnim; s = 0.4 + 0.6 * easeOutBack(t); }
    // melee swing: arc the viewmodel
    let meleeRotX = 0, meleeRotY = 0;
    if (this.meleeAnimT > 0) {
      const t = 1 - this.meleeAnimT;
      const wind = Math.sin(t * Math.PI * 2);
      if (this.meleeAnimKind === 'heavy') { meleeRotX = -wind * 1.5 - 0.6; meleeRotY = 0.4 * Math.sin(t * Math.PI); }
      else { meleeRotX = -wind * 0.9; meleeRotY = -Math.sin(t * Math.PI * 2) * 0.7; }
    }
    const adsHide = this.ads > 0.65 && def?.zoom;
    this.viewGroup.visible = !this._thirdPerson && !adsHide;
    this.viewGroup.position.set(vx + swayX, vy + swayY, vz);
    this.viewGroup.rotation.set(rx + ry + meleeRotX, meleeRotY, rz);
    this.viewGroup.scale.setScalar(s);

    // scope overlay for zoom weapons
    const scopeEl = this.hud['scope-overlay'];
    if (scopeEl) scopeEl.classList.toggle('hidden', !(this.ads > 0.65 && def?.zoom));

    // ── firing ──
    if (this.mouseDown && def?.cat === 'gun' && def.auto) this.fireWeapon();
    if (this._lmbEdge && def) { if (def.cat === 'gun' && !def.auto) this.fireWeapon(); else if (def.cat === 'melee') this.meleeAttack('light'); }
    this._lmbEdge = false; this._rmbEdge = false;

    // ── bots ──
    for (const bot of this.bots) bot.update(dt);
    // remove long-dead bots
    for (let i = this.bots.length - 1; i >= 0; i--) {
      const b = this.bots[i];
      if (!b.alive && b.deadTimer > 2.6) { this.scene.remove(b.model); this.bots.splice(i, 1); }
    }
    // respawn queue
    for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
      const r = this.respawnQueue[i]; r.timer -= dt;
      if (r.timer <= 0) {
        r.bot.alive = true; r.bot.hp = r.bot.maxHp; r.bot.pos.copy(this.arena.spawnPoints[Math.floor(Math.random() * 8)]); r.bot.pos.y = 0;
        r.bot.model.position.copy(r.bot.pos); r.bot.model.rotation.set(0, Math.random() * Math.PI * 2, 0); r.bot.model.scale.y = 1;
        this.scene.add(r.bot.model);
        this.respawnQueue.splice(i, 1);
      }
    }

    // ── survival waves ──
    if (this.mode.wave) {
      if (this.waveState === 'cleared') {
        this.waveTimer -= dt;
        if (this.waveTimer <= 0) { this._startWave(this.wave + 1); }
      }
      // update alive count bar
      const total = this.bots.filter(b => b.team === 'enemy').length;
      const alive = this.bots.filter(b => b.alive && b.team === 'enemy').length;
      const bar = this.hud['wave-bar'];
      if (bar && total) bar.style.width = `${(alive / total) * 100}%`;
    }

    // ── match timer ──
    if (this.matchTime > 0) {
      if (this.matchTime <= 0.01 && !this.matchOver) {
        if (this.mode.elim) this.endMatch(this.roundWins.ally >= this.roundWins.enemy, 'TEMPO ESGOTADO — RODADAS DECIDEM');
        else if (this.mode.tdm) this.endMatch(this.teamScore.ally >= this.teamScore.enemy, 'TEMPO ESGOTADO');
        else this.endMatch(this.player.kills >= (this.mode.target ?? 20) * 0.5, 'TEMPO ESGOTADO');
      }
      const t = Math.ceil(this.matchTime);
      const timerEl = this.hud['hud-timer'];
      if (timerEl) timerEl.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    } else if (this.mode.wave) {
      const timerEl = this.hud['hud-timer']; if (timerEl) timerEl.textContent = '∞';
    } else if (this.mode.elim) {
      const timerEl = this.hud['hud-timer']; if (timerEl) timerEl.textContent = `R${this.round}`;
    }

    // ── FX ──
    this._updateFx(dt);

    // weapon HUD (cooldown display)
    this._updateWeaponHud();
  }

  _updateFx(dt) {
    // tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i]; t.life -= dt;
      t.mesh.material.opacity = Math.max(0, t.life / 0.14) * 0.9;
      if (t.life <= 0) { this.fxGroup.remove(t.mesh); this.tracers.splice(i, 1); }
    }
    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i]; pt.life -= dt;
      if (pt.vel) { pt.vel.y -= 9.5 * dt; pt.mesh.position.addScaledVector(pt.vel, dt); }
      if (pt.grow) pt.mesh.scale.multiplyScalar(1 + dt * 9);
      pt.mesh.material.opacity = clamp(pt.life / 0.55, 0, 1);
      pt.mesh.rotation.x += dt * 6; pt.mesh.rotation.y += dt * 5;
      if (pt.mesh.position.y < 0.03) { pt.mesh.position.y = 0.03; if (pt.vel) pt.vel.y *= -0.4; }
      if (pt.life <= 0) { this.fxGroup.remove(pt.mesh); this.particles.splice(i, 1); }
    }
    // casings
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i]; c.life -= dt;
      c.vel.y -= 12 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += c.spin * dt; c.mesh.rotation.z += c.spin * 0.7 * dt;
      if (c.mesh.position.y < 0.02) { c.mesh.position.y = 0.02; c.vel.y *= -0.35; c.vel.x *= 0.6; c.vel.z *= 0.6; }
      if (c.life <= 0) { this.fxGroup.remove(c.mesh); this.casings.splice(i, 1); }
    }
  }
}

function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function showCenterBannerSafe(game, title, sub, dur) { game.showBanner(title, sub, dur); }
