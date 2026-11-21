// ════════ RANDOM GUNNY — ARENA "GALPÃO NEON-7" (procedural) ════════
import * as THREE from 'three';

// canvas-generated textures
function makeFloorTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#2b2d33'; x.fillRect(0, 0, 512, 512);
  // concrete noise
  for (let i = 0; i < 2600; i++) {
    const v = 38 + Math.random() * 30;
    x.fillStyle = `rgba(${v},${v},${v + 6},${0.35 + Math.random() * 0.4})`;
    x.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 5, 2 + Math.random() * 5);
  }
  // expansion joint grid
  x.strokeStyle = 'rgba(12,13,17,0.85)'; x.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.stroke();
    x.beginPath(); x.moveTo(0, i * 128); x.lineTo(512, i * 128); x.stroke();
  }
  // hazard stripes on diagonals
  x.save(); x.globalAlpha = 0.16; x.strokeStyle = '#ffb03a'; x.lineWidth = 14;
  for (let d = -512; d < 1024; d += 90) { x.beginPath(); x.moveTo(d, 0); x.lineTo(d + 512, 512); x.stroke(); }
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makeWallTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#232630'; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 900; i++) { const v = 26 + Math.random() * 26; x.fillStyle = `rgba(${v},${v},${v + 8},0.5)`; x.fillRect(Math.random() * 512, Math.random() * 256, 3 + Math.random() * 6, 3 + Math.random() * 6); }
  // corrugation vertical ribs
  for (let i = 0; i < 512; i += 32) { x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(i, 0, 6, 256); x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(i + 22, 0, 8, 256); }
  // horizontal beam
  x.fillStyle = '#16181f'; x.fillRect(0, 108, 512, 40);
  x.fillStyle = '#ff7a1a'; x.fillRect(0, 122, 512, 6);   // neon pipe line
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const ARENA_SIZE = 84;   // square floor 84×84
export const WALL_H = 7.5;

// obstacle AABB list (min/max), flagged walkable for standing on top
export class Arena {
  constructor() {
    this.group = new THREE.Group();
    this.boxes = [];        // {min:Vector3, max:Vector3, walk:true}
    this.coverPoints = [];  // Vector3 list for bot tactics
    this.spawnPoints = [];  // Vector3 list
    this._build();
  }

  addBox(min, max, mesh, walk = true) {
    this.group.add(mesh);
    this.boxes.push({ min: min.clone(), max: max.clone(), walk, mesh });
  }
  box(cx, cy, cz, w, h, d, color, opts = {}, walk = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, metalness: opts.metal ?? 0.25, roughness: opts.rough ?? 0.7, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1, map: opts.map ?? null }));
    mesh.position.set(cx, cy, cz); mesh.castShadow = true; mesh.receiveShadow = true;
    this.addBox(new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2), new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2), mesh, walk);
    return mesh;
  }

  _build() {
    const g = this.group;
    const S = ARENA_SIZE, H = WALL_H;

    // ── LIGHTING ──
    const hemi = new THREE.HemisphereLight(0xbdd7ff, 0x241a12, 0.9); g.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff2e0, 1.6);
    dir.position.set(28, 42, 18); dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -55; dir.shadow.camera.right = 55; dir.shadow.camera.top = 55; dir.shadow.camera.bottom = -55;
    dir.shadow.camera.far = 110; dir.shadow.bias = -0.0004;
    g.add(dir);
    const amb = new THREE.AmbientLight(0x404654, 0.6); g.add(amb);

    // ── FLOOR ──
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: .9, metalness: .05 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    // center decal (painted circle)
    const decal = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.4, 40), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    decal.rotation.x = -Math.PI / 2; decal.position.y = 0.02; g.add(decal);
    const decal2 = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ color: 0x27e0ff, transparent: true, opacity: 0.6 }));
    decal2.rotation.x = -Math.PI / 2; decal2.position.y = 0.021; g.add(decal2);

    // ── PERIMETER WALLS ──
    const wallMat = new THREE.MeshStandardMaterial({ map: makeWallTexture(), roughness: .8, metalness: .15 });
    const mkWall = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); this.boxes.push({ min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2), walk: false, mesh: m }); return m; };
    mkWall(S, H, 1.2, 0, H / 2, -S / 2 - 0.6);
    mkWall(S, H, 1.2, 0, H / 2, S / 2 + 0.6);
    mkWall(1.2, H, S, -S / 2 - 0.6, H / 2, 0);
    mkWall(1.2, H, S, S / 2 + 0.6, H / 2, 0);
    // wall neon strips (emissive, non-colliding)
    const neon = (w, h, d, x, y, z, color) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: 2.2 })); m.position.set(x, y, z); g.add(m); };
    neon(S * 0.7, 0.18, 0.1, 0, 4.6, -S / 2 + 0.02, 0xff7a1a);
    neon(S * 0.7, 0.18, 0.1, 0, 4.6, S / 2 - 0.02, 0x27e0ff);
    neon(0.1, 0.18, S * 0.7, -S / 2 + 0.02, 4.6, 0, 0x27e0ff);
    neon(0.1, 0.18, S * 0.7, S / 2 - 0.02, 4.6, 0, 0xff7a1a);

    // point lights (no shadow, cheap)
    const pl = (color, x, y, z, intensity, dist) => { const p = new THREE.PointLight(color, intensity, dist, 1.8); p.position.set(x, y, z); g.add(p); };
    pl(0xff8a2a, -22, 5.6, -22, 60, 30); pl(0x2ad4ff, 22, 5.6, -22, 60, 30);
    pl(0xff8a2a, 22, 5.6, 22, 60, 30);  pl(0x2ad4ff, -22, 5.6, 22, 60, 30);

    // ── CENTRAL TIERED PLATFORM (3 levels, walkable) ──
    this.box(0, 0.6, 0, 12, 1.2, 12, 0x3b3f4a, { rough: .6, metal: .3 });            // tier 1 (h 1.2)
    this.box(0, 1.5, 0, 7.6, 0.6, 7.6, 0x454a57, { rough: .6, metal: .3 });          // tier 2 top at 1.8
    this.box(0, 2.15, 0, 3.6, 0.7, 3.6, 0x505663, { rough: .55, metal: .35 });       // tier 3 top at 2.5
    // ramp steps (south side and north side)
    const step = (z0, dir) => { for (let i = 0; i < 4; i++) { const h = 0.3 * (i + 1); this.box(0, h / 2, z0 + dir * i * 1.05, 3.2, h, 1.05, 0x343843, { rough: .7 }); } };
    step(7.5, 1); step(-7.5, -1);
    // corner steps to tier1 on east/west
    const stepX = (x0, dir) => { for (let i = 0; i < 4; i++) { const h = 0.3 * (i + 1); this.box(x0 + dir * i * 1.05, h / 2, 0, 1.05, h, 3.2, 0x343843, { rough: .7 }); } };
    stepX(7.5, 1); stepX(-7.5, -1);

    // central beacon pillar (photogenic)
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 10), new THREE.MeshStandardMaterial({ color: 0x14161c, emissive: 0xff7a1a, emissiveIntensity: 2.6 }));
    beacon.position.set(0, 3.6, 0); g.add(beacon);

    // ── CONTAINER STACKS (corners) ──
    const cont = (cx, cz, color, rot) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.5, 2.6), new THREE.MeshStandardMaterial({ color, metalness: .45, roughness: .5 }));
      mesh.position.set(cx, 1.25, cz); mesh.rotation.y = rot; mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
      this.boxes.push({ min: new THREE.Vector3(cx - 3.4, 0, cz - 3.4), max: new THREE.Vector3(cx + 3.4, 2.5, cz + 3.4), walk: true });
      const top = new THREE.Mesh(mesh.geometry, mesh.material); // visual second tier
      top.position.set(cx, 3.75, cz); top.rotation.y = rot; top.castShadow = true; g.add(top);
      this.boxes.push({ min: new THREE.Vector3(cx - 3.4, 2.5, cz - 3.4), max: new THREE.Vector3(cx + 3.4, 5.0, cz + 3.4), walk: true });
    };
    cont(-26, -26, 0xb34a1e, 0.2); cont(26, -26, 0x1e5bb3, -0.15); cont(26, 26, 0xb38f1e, 0.35); cont(-26, 26, 0x2f8f4e, -0.3);

    // ── CRATE CLUSTERS (cover) ──
    const crates = [[-13, -6], [14, 7], [-8, 15], [9, -14], [-16, 9], [17, 12]];
    for (const [cx, cz] of crates) { this.box(cx, 0.75, cz, 1.5, 1.5, 1.5, 0x5b4a2e, { rough: .7 }); this.box(cx + 0.2, 1.9, cz - 0.1, 1.1, 0.8, 1.1, 0x6b5a38, { rough: .7 }); }

    // ── PILLAR PAIRS ──
    for (const [px, pz] of [[-17, 0], [17, 0], [0, -17], [0, 17]]) { this.box(px, H / 2, pz, 1.6, H, 1.6, 0x3a3e48, { rough: .55, metal: .35 }); }

    // ── ELEVATED WALKWAY (east edge) with stairs ──
    this.box(S / 2 - 3.4, 2.9, 0, 3.6, 0.5, 26, 0x41454f, { rough: .6, metal: .4 });       // deck top at ~3.15
    // support columns
    for (const z of [-11, 0, 11]) this.box(S / 2 - 3.4, 1.35, z, 0.5, 2.7, 0.5, 0x33363f);
    // stairs up (south end of deck)
    for (let i = 0; i < 6; i++) this.box(S / 2 - 3.4, 0.26 * (i + 1), 15.5 - i * 1.1, 3.4, 0.52 * (i + 1), 1.1, 0x343843, { rough: .7 });
    // railing neon
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 26), new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x27e0ff, emissiveIntensity: 1.8 }));
    rail.position.set(S / 2 - 1.75, 3.6, 0); g.add(rail);

    // ── SANDBAG-ish LOW WALLS ──
    const lowWall = (x, z, len, rot) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, 1.05, 0.7), new THREE.MeshStandardMaterial({ color: 0x4d4736, roughness: .85 }));
      mesh.position.set(x, 0.52, z); mesh.rotation.y = rot; mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
      this.boxes.push({ min: new THREE.Vector3(x - len / 2, 0, z - 0.6), max: new THREE.Vector3(x + len / 2, 1.05, z + 0.6), walk: true });
    };
    lowWall(-9, -11, 5, 0.35); lowWall(10, 12, 5, -0.3); lowWall(-12, 12, 4, -0.5); lowWall(12, -9, 4, 0.55);

    // ── FLOODLIGHT POLES ──
    for (const [fx, fz] of [[-33, 0], [33, 0], [0, -33], [0, 33]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 6.4, 8), new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: .5, metalness: .6 }));
      pole.position.set(fx, 3.2, fz); pole.castShadow = true; g.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.5), new THREE.MeshStandardMaterial({ color: 0x14161c, emissive: 0xfff4d6, emissiveIntensity: 2.4 }));
      head.position.set(fx, 6.5, fz); g.add(head);
      this.boxes.push({ min: new THREE.Vector3(fx - 0.35, 0, fz - 0.35), max: new THREE.Vector3(fx + 0.35, 6.4, fz + 0.35), walk: false });
    }

    // ── SPAWNS (8 points, ring near edges) ──
    const R = 33;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      this.spawnPoints.push(new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R));
    }
    // ── COVER POINTS (for bot AI strafing behind obstacles) ──
    const coverSpots = [[-13, -4.4], [14, 9.4], [-8, 17.4], [9, -11.6], [-16, 11.4], [17, 14.4], [-26, -22.6], [26, -22.6], [26, 22.6], [-26, 22.6], [-9, -8.6], [10, 15], [-17, 2.2], [17, -2.2], [0, -19.4], [0, 19.4]];
    this.coverPoints = coverSpots.map(([x, z]) => new THREE.Vector3(x, 0, z));
  }
}

// ════════ COLLISION & MOVEMENT HELPERS ════════
export function resolveCapsule(pos, radius, height, boxes) {
  // pos = feet position. Pushes out of obstacle AABBs horizontally. Returns corrected pos (mutates + returns)
  const pMinY = pos.y, pMaxY = pos.y + height;
  for (const b of boxes) {
    if (pMaxY <= b.min.y + 0.05 || pMinY >= b.max.y - 0.05) continue;
    const cx = Math.max(b.min.x, Math.min(pos.x, b.max.x));
    const cz = Math.max(b.min.z, Math.min(pos.z, b.max.z));
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 > radius * radius) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2); pos.x = cx + (dx / d) * radius; pos.z = cz + (dz / d) * radius;
    } else {
      // center inside box: push along smallest penetration axis
      const px = Math.min(pos.x - b.min.x + radius, b.max.x - pos.x + radius);
      const pz = Math.min(pos.z - b.min.z + radius, b.max.z - pos.z + radius);
      if (px < pz) pos.x = (pos.x - b.min.x < b.max.x - pos.x) ? b.min.x - radius : b.max.x + radius;
      else pos.z = (pos.z - b.min.z < b.max.z - pos.z) ? b.min.z - radius : b.max.z + radius;
    }
  }
  return pos;
}

export function floorHeightAt(x, z, radius, feetY, boxes) {
  let floor = 0;
  for (const b of boxes) {
    if (!b.walk) continue;
    if (x < b.min.x - radius || x > b.max.x + radius || z < b.min.z - radius || z > b.max.z + radius) continue;
    const top = b.max.y;
    if (feetY >= top - 0.55 && top > floor) floor = top;   // only snap if near top (can step/jump onto)
  }
  return floor;
}

// segment vs AABB (slab method) — used for bot line-of-sight
export function segmentHitsBox(p0, p1, b) {
  const d = new THREE.Vector3().subVectors(p1, p0);
  let tmin = 0, tmax = 1;
  const axes = ['x', 'y', 'z'];
  for (const a of axes) {
    const o = p0[a], dir = d[a];
    const mn = b.min[a], mx = b.max[a];
    if (Math.abs(dir) < 1e-8) { if (o < mn || o > mx) return false; }
    else {
      let t1 = (mn - o) / dir, t2 = (mx - o) / dir;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}
export function hasLineOfSight(p0, p1, boxes) {
  for (const b of boxes) { if (segmentHitsBox(p0, p1, b)) return false; }
  return true;
}
