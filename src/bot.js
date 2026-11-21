// ════════ RANDOM GUNNY — BOT AI ════════
import * as THREE from 'three';
import { buildHumanoid, buildWeaponModel } from './models.js';
import { resolveCapsule, floorHeightAt, hasLineOfSight } from './arena.js';
import { WEAPONS, GUN_WEAPONS } from './weapons.js';

export const BOT_NAMES = ['Gabe', 'Zeca', 'Igor', 'Rafa', 'Dudu', 'Bruno', 'Vini', 'Leo', 'Thiago', 'Marcos', 'Pivete', 'Caio'];
export const DIFFICULTY = {
  easy:   { reaction: 1.2,  spread: 4.4, dmgMult: 0.38, speed: 2.7, strafeIq: 0.35, aimLead: 0 },
  normal: { reaction: 0.75, spread: 2.6, dmgMult: 0.55, speed: 3.5, strafeIq: 0.6,  aimLead: 0.15 },
  hard:   { reaction: 0.4,  spread: 1.35, dmgMult: 0.85, speed: 4.3, strafeIq: 0.9,  aimLead: 0.4 },
};
const EYE = 1.62;

export class Bot {
  constructor(game, opts) {
    this.game = game;
    this.name = opts.name;
    this.team = opts.team ?? null;           // 'ally' | 'enemy' | null (FFA)
    this.difficulty = opts.difficulty ?? 'normal';
    this.cfg = DIFFICULTY[this.difficulty];
    this.alive = true;
    this.hp = 100;
    this.maxHp = 100;
    this.kills = 0; this.deaths = 0;
    this.pos = opts.spawn.clone(); this.pos.y = 0;
    this.velY = 0; this.yaw = Math.random() * Math.PI * 2;
    this.walkPhase = Math.random() * 10;
    this.weapon = null; this.weaponDef = null; this.weaponCooldown = 0; this.reloadTimer = 0; this.mag = 0;
    this.attackAnim = 0; this.attackKind = 'light';
    this.reactionTimer = this.cfg.reaction * (0.6 + Math.random() * 0.8);
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeTimer = 2 + Math.random() * 2;
    this.wanderTimer = 0; this.wanderTarget = null;
    this.lastSeen = null;
    this.idealRange = 9 + Math.random() * 12;
    this.fireTimer = 0; this.burstTimer = 0; this.burstCount = 0;
    this.crouch = false; this.crouchTimer = 0;
    this._lastPos = this.pos.clone(); this._stuckTimer = 0;
    this.burstShots = 0; this.burstPause = 0;
    this.deadTimer = 0; this.hitFlash = 0;

    const teamColor = this.team === 'ally' ? 0x2a7fff : this.team === 'enemy' ? 0xcc2a2a : [0x6a4ad0, 0x2a8f5a, 0xc77422, 0x707a8c][Math.floor(Math.random() * 4)];
    const { group, parts, hitMeshes } = buildHumanoid({ team: teamColor });
    group.position.copy(this.pos);
    this.model = group; this.parts = parts;
    this.hitMeshes = hitMeshes;
    for (const m of hitMeshes) m.userData.bot = this;
    game.scene.add(group);

    this.setWeapon(opts.weaponDef ?? GUN_WEAPONS[Math.floor(Math.random() * GUN_WEAPONS.length)], true);
  }

  setWeapon(def, silent = false) {
    this.weaponDef = def;
    this.mag = def.mag ?? Infinity;
    this.weaponCooldown = 0; this.reloadTimer = 0;
    if (this.weapon) { this.model.remove(this.weapon); }
    const wm = buildWeaponModel(def.id);
    wm.scale.setScalar(0.85);
    // fixed offset in model space: in front of chest, right side, muzzle facing -Z (model forward)
    wm.position.set(0.3, 1.18, -0.42);
    wm.rotation.set(0, 0, 0);
    this.model.add(wm);
    this.weapon = wm;
    if (!silent) this.game.onBotSwappedWeapon?.(this, def);
  }

  randomizeWeapon(poolOverride) {
    const pool = poolOverride ?? WEAPONS;
    const options = pool.filter(w => w.id !== this.weaponDef?.id);
    const def = options[Math.floor(Math.random() * options.length)];
    if (def) this.setWeapon(def, true);
  }

  takeDamage(amount, fromDir, attacker, isHead = false) {
    if (!this.alive) return 0;
    this.hp -= amount;
    this.hitFlash = 0.12;
    // brief knockback
    this.pos.x += Math.sin(fromDir) * 0.12; this.pos.z += Math.cos(fromDir) * 0.12;
    this.lastSeen = this.game.player.pos.clone();
    if (this.hp <= 0) {
      this.hp = 0; this.alive = false; this.deaths++;
      this.deadTimer = 0;
      this.game.onBotKilled(this, attacker, isHead);
    }
    return amount;
  }

  // ─────── AI CORE ───────
  update(dt) {
    if (!this.alive) {
      this.deadTimer += dt;
      // fall over + sink
      const t = Math.min(this.deadTimer / 0.55, 1);
      this.model.rotation.x = -t * Math.PI / 2 * 0.92;
      this.model.position.y = Math.max(0, this.pos.y - Math.max(0, this.deadTimer - 1.4) * 0.9);
      this.model.position.copy(this.pos); this.model.position.y = this.pos.y;
      return false; // signal removal when deadTimer > 3 (handled by game)
    }

    const game = this.game;
    this.weaponCooldown -= dt; this.fireTimer -= dt; this.strafeTimer -= dt; this.crouchTimer -= dt; this.attackAnim = Math.max(0, this.attackAnim - dt); this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.reloadTimer > 0) { this.reloadTimer -= dt; if (this.reloadTimer <= 0) this.mag = this.weaponDef.mag; }
    this.burstPause = Math.max(0, this.burstPause - dt);

    // ── target selection ──
    const targets = game.getAliveTargets(this);
    let target = null, best = Infinity;
    for (const t of targets) { const d = t.pos.distanceToSquared(this.pos); if (d < best) { best = d; target = t; } }
    const dist = target ? Math.sqrt(best) : Infinity;
    const myEye = this.pos.clone(); myEye.y += EYE;
    const tgtEye = target ? target.pos.clone().setY(target.pos.y + EYE) : null;
    const canSee = target && hasLineOfSight(myEye, tgtEye, game.arena.boxes) && dist < 70;
    if (canSee) this.lastSeen = target.pos.clone();

    const isMelee = this.weaponDef.cat === 'melee';
    const reach = isMelee ? this.weaponDef.range : this.idealRange;

    // ── movement decision ──
    let moveX = 0, moveZ = 0, wantSpeed = this.cfg.speed;
    if (canSee) {
      const dir = new THREE.Vector3().subVectors(target.pos, this.pos); dir.y = 0; dir.normalize();
      // face target (lerp)
      const targetYaw = Math.atan2(dir.x, dir.z);
      this.yaw = lerpAngle(this.yaw, targetYaw, Math.min(1, dt * (4 + this.cfg.strafeIq * 6)));
      this.reactionTimer -= dt;

      if (isMelee || dist > reach + 2.5) {
        moveX = dir.x; moveZ = dir.z; // close in
      } else if (dist < reach - 1.2 && !isMelee) {
        moveX = -dir.x * 0.7; moveZ = -dir.z * 0.7; wantSpeed *= 0.6; // back off a bit
      } else {
        // strafe orbit
        if (this.strafeTimer <= 0) { this.strafeDir *= -1; this.strafeTimer = 1.4 + Math.random() * 2.2; }
        moveX = -dir.z * this.strafeDir; moveZ = dir.x * this.strafeDir; wantSpeed *= 0.72;
        this.crouch = this.crouchTimer <= 0 ? this.crouch : this.crouch;
        if (Math.random() < dt * 0.25 * this.cfg.strafeIq) this.crouch = !this.crouch;
      }
    } else if (this.lastSeen) {
      const dir = new THREE.Vector3().subVectors(this.lastSeen, this.pos); dir.y = 0;
      if (dir.length() > 2) { dir.normalize(); moveX = dir.x; moveZ = dir.z; this.yaw = lerpAngle(this.yaw, Math.atan2(dir.x, dir.z), dt * 3); wantSpeed *= 0.9; }
      else this.lastSeen = null;
    } else {
      // wander
      if (!this.wanderTarget || this.pos.distanceTo(this.wanderTarget) < 2 || this.wanderTimer <= 0) {
        const cps = this.game.arena.coverPoints;
        this.wanderTarget = cps[Math.floor(Math.random() * cps.length)].clone();
        this.wanderTimer = 6 + Math.random() * 4;
      }
      this.wanderTimer -= dt;
      const dir = new THREE.Vector3().subVectors(this.wanderTarget, this.pos); dir.y = 0; dir.normalize();
      moveX = dir.x; moveZ = dir.z; wantSpeed *= 0.55;
      this.yaw = lerpAngle(this.yaw, Math.atan2(dir.x, dir.z), dt * 2);
    }

    // ── physics ──
    const crouchHeight = this.crouch;
    const speed = wantSpeed * (crouchHeight ? 0.55 : 1);
    this.pos.x += moveX * speed * dt;
    this.pos.z += moveZ * speed * dt;
    // gravity / floor
    const h = crouchHeight ? 1.15 : 1.75;
    const floor = floorHeightAt(this.pos.x, this.pos.z, 0.4, this.pos.y, this.game.arena.boxes);
    this.velY -= 22 * dt;
    this.pos.y += this.velY * dt;
    if (this.pos.y <= floor) { this.pos.y = floor; this.velY = 0; }
    resolveCapsule(this.pos, 0.38, h, this.game.arena.boxes);

    // clamp arena bounds
    const S = 40.5;
    this.pos.x = Math.max(-S, Math.min(S, this.pos.x));
    this.pos.z = Math.max(-S, Math.min(S, this.pos.z));

    // stuck detection — refresh wander target when wedged against geometry
    this._stuckTimer += dt;
    if (this._stuckTimer > 1.1) {
      const moved = this.pos.distanceTo(this._lastPos);
      if ((moveX !== 0 || moveZ !== 0) && moved < 0.35) { this.wanderTarget = null; this.wanderTimer = 0; this.yaw += (Math.random() - 0.5) * 2.2; }
      this._lastPos.copy(this.pos); this._stuckTimer = 0;
    }

    // ── combat ──
    this.tryAttack(dt, target, dist, canSee);

    // ── visuals ──
    const moving = (moveX !== 0 || moveZ !== 0);
    this.walkPhase += dt * (moving ? speed * 2.4 : 0);
    this.model.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.model.rotation.y = this.yaw;
    const swing = moving ? Math.sin(this.walkPhase) * 0.65 : 0;
    this.parts.legL.rotation.x = swing;
    this.parts.legR.rotation.x = -swing;
    // gun pose: right arm extended forward
    if (this.weaponDef.cat === 'gun') {
      this.parts.armR.rotation.x = -1.15 + Math.sin(this.walkPhase * 0.5) * 0.03;
      this.parts.armL.rotation.x = -0.95;
      this.parts.armL.rotation.z = 0.35;
    } else {
      // melee pose: wind up when attacking
      const t = this.attackAnim > 0 ? Math.sin((1 - this.attackAnim / 0.32) * Math.PI) : 0;
      this.parts.armR.rotation.x = -0.4 - t * 2.1;
      this.parts.armL.rotation.x = -0.25;
    }
    // crouch visual
    this.model.scale.y = crouchHeight ? 0.82 : 1;
    // hit flash via emissive tint
    if (this.hitFlash > 0 && !this._flashApplied) { this._tintEmissive(0xff2222, 0.55); this._flashApplied = true; }
    else if (this.hitFlash <= 0 && this._flashApplied) { this._tintEmissive(0x000000, 1); this._flashApplied = false; }
    return true;
  }

  _tintEmissive(color, intensity) {
    this.model.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.emissive) return;
      if (color === 0x000000) {
        if (o.userData._origEmissive !== undefined) { o.material.emissive.setHex(o.userData._origEmissive.hex); o.material.emissiveIntensity = o.userData._origEmissive.int; }
        return;
      }
      if (o.userData._origEmissive === undefined) o.userData._origEmissive = { hex: o.material.emissive.getHex(), int: o.material.emissiveIntensity };
      o.material.emissive.setHex(0xff2222); o.material.emissiveIntensity = intensity;
    });
  }

  canShootCooldownReady() { return this.weaponCooldown <= 0; }

  tryAttack(dt, target, dist, canSee) {
    if (!canSee || this.reactionTimer > 0 || !target) return;
    const def = this.weaponDef;

    if (def.cat === 'gun') {
      if (this.reloadTimer > 0 || this.burstPause > 0) return;
      if (this.mag <= 0) { this.reloadTimer = def.reload; return; }
      const fireInterval = 60 / def.rpm;
      if (this.weaponCooldown > 0) return;
      if (dist > 62) return;
      this.weaponCooldown = fireInterval * (def.auto ? 1 : 2.4);
      this.mag--;
      this.burstShots++;
      const burstCap = def.auto ? 5 : 3;
      if (this.burstShots >= burstCap) { this.burstShots = 0; this.burstPause = 0.65 + Math.random() * 0.7; }
      this.game.botFireWeapon(this, target, dist);
      if (this.mag <= 0) this.reloadTimer = def.reload;
    } else {
      // melee: lunge when in range
      if (this.weaponCooldown > 0) return;
      if (dist > def.range + 0.4) return;
      this.weaponCooldown = def.light[1] * 1.6;
      this.attackAnim = 0.32;
      // delayed damage check
      this.game.botMeleeHit(this, target, def);
    }
  }
}

function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}
