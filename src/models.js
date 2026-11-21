// ════════ RANDOM GUNNY — PROCEDURAL 3D WEAPON & CHARACTER MODELS ════════
import * as THREE from 'three';

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({
  color, metalness: opts.metal ?? 0.35, roughness: opts.rough ?? 0.55,
  emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
  flatShading: opts.flat ?? false,
});
const B = (w, h, d, color, o = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, o)); m.castShadow = true; return m; };
const CYL = (rt, rb, h, color, o = {}, seg = 14) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(color, o)); m.castShadow = true; return m; };
const SPH = (r, color, o = {}, w = 12, h = 10) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), M(color, o)); m.castShadow = true; return m; };
const CONE = (r, h, color, o = {}, seg = 12) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), M(color, o)); m.castShadow = true; return m; };
const at = (mesh, x, y, z) => { mesh.position.set(x, y, z); return mesh; };
const rotX = (mesh, a) => { mesh.rotation.x = a; return mesh; };
const rotZ = (mesh, a) => { mesh.rotation.z = a; return mesh; };
const cylZ = (rt, rb, len, color, o = {}, seg = 14) => rotX(CYL(rt, rb, len, color, o, seg), Math.PI / 2);

const GUNMETAL = 0x2e3138, DARK = 0x1d1f26, STEEL = 0x8b93a3, WOOD = 0x5e4023, POLY = 0x353a44, ORANGE = 0xff7a1a, CYAN = 0x27e0ff;

// ───────────── GUN BUILDERS (muzzle faces -Z) ─────────────
function pistol({ slide = STEEL, frame = DARK, grip = 0x3a2a1a, accent = ORANGE, longBarrel = false } = {}) {
  const g = new THREE.Group();
  g.add(at(B(0.052, 0.052, 0.19, frame), 0, 0, 0));                    // frame
  g.add(at(B(0.048, 0.045, 0.21, slide, { metal: .8, rough: .35 }), 0, 0.052, -0.01)); // slide
  g.add(at(cylZ(0.013, 0.013, longBarrel ? 0.16 : 0.07, GUNMETAL, { metal: .9, rough: .3 }), 0, 0.045, longBarrel ? -0.185 : -0.145)); // barrel
  g.add(at(B(0.043, 0.085, 0.05, grip), 0, -0.062, 0.075));            // grip
  const gripMesh = g.children[3]; gripMesh.rotation.x = 0.18;
  g.add(at(B(0.036, 0.075, 0.028, DARK), 0, -0.115, 0.083));           // mag base
  g.add(at(B(0.02, 0.016, 0.03, DARK), 0, 0.078, 0.06));               // rear sight
  g.add(at(B(0.014, 0.014, 0.012, accent, { emissive: accent, emissiveIntensity: .4 }), 0, 0.077, -0.088)); // front dot
  g.add(at(B(0.03, 0.012, 0.09, DARK), 0, -0.026, -0.03));             // trigger guard bar
  return g;
}
function revolver() {
  const g = new THREE.Group();
  g.add(at(B(0.05, 0.045, 0.16, DARK), 0, 0, 0.0));
  g.add(at(cylZ(0.034, 0.034, 0.09, STEEL, { metal: .9, rough: .25 }), 0, 0.012, 0.01)); // cylinder
  g.add(at(cylZ(0.013, 0.016, 0.24, GUNMETAL, { metal: .9, rough: .3 }), 0, 0.02, -0.2)); // long barrel
  g.add(at(B(0.03, 0.025, 0.06, DARK), 0, 0.048, -0.1));               // top rib
  g.add(at(B(0.042, 0.08, 0.05, 0x4a2c14, { rough: .6 }), 0, -0.058, 0.07)); // wood grip
  g.children[4].rotation.x = 0.22;
  g.add(at(SPH(0.016, STEEL, { metal: .9, rough: .2 }), 0, 0.012, 0.062));   // hammer
  return g;
}
function smg({ body = POLY, accent = ORANGE, vector = false } = {}) {
  const g = new THREE.Group();
  g.add(at(B(0.062, 0.085, 0.34, body), 0, 0, 0));                     // receiver
  g.add(at(cylZ(0.017, 0.017, 0.16, GUNMETAL, { metal: .85 }), 0, 0.008, -0.25)); // barrel
  g.add(at(cylZ(0.024, 0.024, 0.09, DARK), 0, 0.008, -0.3));           // shroud/suppressor
  g.add(at(B(0.045, 0.1, 0.05, DARK), 0, -0.085, 0.09));               // grip
  g.children[3].rotation.x = 0.16;
  g.add(at(B(0.05, 0.17, 0.045, DARK), 0, -0.11, -0.02));              // mag
  g.add(at(B(0.038, 0.03, 0.12, DARK), 0, -0.045, 0.245));             // stock stub
  g.add(at(B(0.03, 0.035, 0.05, DARK), 0, 0.062, -0.06));              // sight block
  g.add(at(B(0.012, 0.01, 0.01, accent, { emissive: accent, emissiveIntensity: .6 }), 0, 0.068, -0.062));
  if (vector) g.add(at(B(0.07, 0.05, 0.16, DARK), 0, -0.075, -0.1));   // vector lower
  return g;
}
function rifle({ wood = true, accent = ORANGE } = {}) {
  const g = new THREE.Group();
  const furn = wood ? WOOD : POLY;
  g.add(at(B(0.058, 0.07, 0.44, GUNMETAL), 0, 0, 0));                  // receiver
  g.add(at(cylZ(0.014, 0.014, 0.3, DARK, { metal: .9, rough: .3 }), 0, 0.006, -0.36)); // barrel
  g.add(at(cylZ(0.02, 0.02, 0.06, GUNMETAL), 0, 0.006, -0.19));        // gas block
  g.add(at(B(0.05, 0.055, 0.2, furn, { rough: .6 }), 0, -0.008, -0.26)); // handguard
  g.add(at(B(0.048, 0.075, 0.16, furn, { rough: .6 }), 0, -0.005, 0.31)); // stock
  g.add(at(B(0.042, 0.095, 0.045, DARK), 0, -0.078, 0.085));           // grip
  g.children[5].rotation.x = 0.2;
  const mag = B(0.04, 0.16, 0.05, GUNMETAL); at(mag, 0, -0.115, -0.06); mag.rotation.x = 0.32; g.add(mag); // curved mag
  g.add(at(B(0.028, 0.028, 0.09, DARK), 0, 0.055, -0.05));             // carry sight
  g.add(at(B(0.008, 0.012, 0.03, accent, { emissive: accent, emissiveIntensity: .5 }), 0, 0.055, -0.052));
  if (!wood) g.add(at(B(0.05, 0.02, 0.3, POLY), 0, 0.045, -0.08));     // top rail
  return g;
}
function shotgun() {
  const g = new THREE.Group();
  g.add(at(B(0.06, 0.075, 0.4, DARK), 0, 0, 0.02));
  g.add(at(cylZ(0.019, 0.019, 0.34, GUNMETAL, { metal: .85 }), 0, 0.024, -0.32));  // barrel
  g.add(at(cylZ(0.015, 0.015, 0.3, STEEL, { metal: .8 }), 0, -0.028, -0.3));       // tube mag
  g.add(at(B(0.055, 0.06, 0.18, WOOD, { rough: .6 }), 0, -0.01, -0.18));           // foregrip
  g.add(at(B(0.048, 0.07, 0.17, WOOD, { rough: .6 }), 0, -0.005, 0.33));           // stock
  g.add(at(B(0.044, 0.08, 0.045, DARK), 0, -0.075, 0.09));
  g.children[5].rotation.x = 0.18;
  g.add(at(B(0.014, 0.014, 0.02, ORANGE, { emissive: ORANGE, emissiveIntensity: .4 }), 0, 0.062, -0.44));
  return g;
}
function sniper() {
  const g = new THREE.Group();
  g.add(at(B(0.055, 0.07, 0.52, 0x2f4a2f, { rough: .5 }), 0, 0, 0.02));            // receiver (OD green)
  g.add(at(cylZ(0.013, 0.013, 0.62, GUNMETAL, { metal: .9, rough: .25 }), 0, 0.008, -0.55)); // long barrel
  g.add(at(cylZ(0.028, 0.028, 0.1, DARK), 0, 0.008, -0.78));                       // muzzle brake
  g.add(at(B(0.05, 0.075, 0.2, POLY), 0, -0.004, 0.36));                           // stock
  g.add(at(B(0.043, 0.085, 0.045, DARK), 0, -0.075, 0.09));
  g.children[4].rotation.x = 0.2;
  g.add(at(B(0.04, 0.09, 0.05, 0x2f4a2f), 0, -0.1, -0.05));                        // mag
  // scope
  g.add(at(cylZ(0.024, 0.024, 0.24, DARK, { metal: .7, rough: .3 }), 0, 0.085, -0.08));
  g.add(at(cylZ(0.031, 0.031, 0.05, DARK), 0, 0.085, -0.21));
  g.add(at(cylZ(0.02, 0.02, 0.02, CYAN, { emissive: CYAN, emissiveIntensity: .8 }), 0, 0.085, -0.235));
  return g;
}
function lmg() {
  const g = new THREE.Group();
  g.add(at(B(0.07, 0.095, 0.52, 0x33402f), 0, 0, 0));
  g.add(at(cylZ(0.017, 0.017, 0.3, GUNMETAL, { metal: .85 }), 0, 0.01, -0.4));
  g.add(at(cylZ(0.023, 0.023, 0.12, DARK), 0, 0.01, -0.28));                       // cooling shroud
  g.add(at(B(0.11, 0.12, 0.16, DARK), 0, -0.1, 0.0));                              // ammo box
  g.add(at(B(0.05, 0.07, 0.24, 0x33402f), 0, -0.002, 0.37));                       // stock
  g.add(at(B(0.042, 0.08, 0.045, DARK), 0, -0.075, 0.12));
  g.children[5].rotation.x = 0.18;
  g.add(at(cylZ(0.008, 0.008, 0.3, DARK), 0, -0.075, -0.32));                      // bipod leg L
  g.children[6].rotation.z = 0.5;
  g.add(at(cylZ(0.008, 0.008, 0.3, DARK), 0, -0.075, -0.32));                      // bipod leg R
  g.children[7].rotation.z = -0.5;
  g.add(at(B(0.03, 0.03, 0.06, DARK), 0, 0.065, -0.12));
  return g;
}
function plasma() {
  const g = new THREE.Group();
  const glow = M(CYAN, { emissive: CYAN, emissiveIntensity: 1.6, metal: .2, rough: .4 });
  const body = B(0.075, 0.085, 0.34, 0xe8e8ee, { rough: .35, metal: .1 }); g.add(at(body, 0, 0, 0));
  const coil1 = CYL(0.032, 0.032, 0.05, 0x222630); coil1.rotation.x = Math.PI / 2; at(coil1, 0, 0.01, -0.13); g.add(coil1);
  const coil2 = CYL(0.032, 0.032, 0.05, 0x222630); coil2.rotation.x = Math.PI / 2; at(coil2, 0, 0.01, -0.21); g.add(coil2);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 10), glow); core.rotation.x = Math.PI / 2; core.position.set(0, 0.045, -0.05); g.add(core);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.1, 10), glow); muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.01, -0.26); g.add(muzzle);
  g.add(at(B(0.045, 0.085, 0.05, 0x222630), 0, -0.075, 0.1));
  g.children[5].rotation.x = 0.2;
  g.add(at(B(0.05, 0.1, 0.07, 0x222630), 0, -0.06, -0.03));                        // cell pack
  g.add(at(B(0.056, 0.02, 0.12, CYAN, { emissive: CYAN, emissiveIntensity: 1 }), 0, -0.105, -0.03));
  return g;
}
function railgun() {
  const g = new THREE.Group();
  const glow = M(0xb26bff, { emissive: 0xb26bff, emissiveIntensity: 2, metal: .2 });
  g.add(at(B(0.08, 0.09, 0.5, 0x241f2e, { rough: .3, metal: .4 }), 0, 0, 0));
  const railT = B(0.018, 0.02, 0.44, 0x39334a, { metal: .8, rough: .25 }); g.add(at(railT, 0, 0.055, -0.3));
  const railB = B(0.018, 0.02, 0.44, 0x39334a, { metal: .8, rough: .25 }); g.add(at(railB, 0, -0.035, -0.3));
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 8), glow); beam.rotation.x = Math.PI / 2; beam.position.set(0, 0.012, -0.3); g.add(beam);
  g.add(at(B(0.1, 0.05, 0.1, 0x39334a), 0, 0.01, -0.52));                          // accelerator housing
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 8, 18), glow); at(ring, 0, 0.012, -0.56); g.add(ring);
  g.add(at(B(0.045, 0.085, 0.05, DARK), 0, -0.075, 0.1));
  g.children[6].rotation.x = 0.2;
  g.add(at(B(0.06, 0.07, 0.14, 0x39334a), 0, -0.055, 0.3));
  return g;
}

// ───────────── MELEE BUILDERS (blade toward -Z, held low-right) ─────────────
function blade({ len = 0.5, w = 0.055, color = STEEL, hilt = 0x2b2018, katana = false } = {}) {
  const g = new THREE.Group();
  const steel = M(color, { metal: .92, rough: .18 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, len), steel); b.position.set(0, 0, -0.14 - len / 2); b.castShadow = true; g.add(b);
  const tip = CONE(w * 0.55, 0.14, color, { metal: .92, rough: .18 }, 4); tip.rotation.x = -Math.PI / 2; at(tip, 0, 0, -0.21 - len); g.add(tip);
  if (katana) rotZ(b, 0.03);
  g.add(at(B(0.02, 0.05, 0.05, hilt, { rough: .6 }), 0, 0, -0.12));                 // guard
  const grip = CYL(0.016, 0.018, 0.17, hilt, { rough: .7 }); grip.rotation.x = Math.PI / 2; at(grip, 0, 0, 0.0); g.add(grip);
  g.add(at(SPH(0.02, hilt), 0, 0, 0.09));                                          // pommel
  return g;
}
function spear() {
  const g = new THREE.Group();
  const shaft = CYL(0.02, 0.024, 1.7, 0x4a3220, { rough: .65 }); shaft.rotation.x = Math.PI / 2; at(shaft, 0, 0, -0.35); g.add(shaft);
  const head = CONE(0.055, 0.42, STEEL, { metal: .92, rough: .15 }, 6); head.rotation.x = -Math.PI / 2; at(head, 0, 0, -1.35); g.add(head);
  const collar = CYL(0.03, 0.03, 0.06, ORANGE, { metal: .6 }); collar.rotation.x = Math.PI / 2; at(collar, 0, 0, -1.1); g.add(collar);
  return g;
}
function axe() {
  const g = new THREE.Group();
  const haft = CYL(0.022, 0.026, 0.95, 0x4a3220, { rough: .65 }); haft.rotation.x = Math.PI / 2; at(haft, 0, 0, -0.15); g.add(haft);
  const head = B(0.05, 0.22, 0.26, STEEL, { metal: .9, rough: .2 }); at(head, 0, 0.02, -0.62); g.add(head);
  const edge = B(0.052, 0.2, 0.05, 0xd8dde8, { metal: .95, rough: .1 }); at(edge, 0, 0.02, -0.78); g.add(edge);
  g.add(at(SPH(0.028, DARK), 0, 0, 0.34));
  return g;
}
function hammer() {
  const g = new THREE.Group();
  const haft = CYL(0.024, 0.028, 1.15, 0x3a2a1a, { rough: .6 }); haft.rotation.x = Math.PI / 2; at(haft, 0, 0, -0.2); g.add(haft);
  g.add(at(B(0.11, 0.13, 0.3, 0x555c68, { metal: .85, rough: .35 }), 0, 0, -0.78));  // head block
  g.add(at(B(0.115, 0.135, 0.05, 0x707a8c, { metal: .9, rough: .25 }), 0, 0, -0.93)); // face
  g.add(at(SPH(0.03, ORANGE), 0, 0, 0.39));
  return g;
}
function baseballBat() {
  const g = new THREE.Group();
  const taper = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.047, 0.95, 12), M(0xc8a06a, { rough: .5 })); taper.rotation.x = Math.PI / 2; taper.position.set(0, 0, -0.25); taper.castShadow = true; g.add(taper);
  const grip = CYL(0.026, 0.026, 0.16, 0x8a6a3a); grip.rotation.x = Math.PI / 2; at(grip, 0, 0, 0.22); g.add(grip);
  g.add(at(B(0.075, 0.02, 0.02, DARK), 0, 0.041, -0.5));
  return g;
}
function baguette() {
  const g = new THREE.Group();
  const bread = M(0xd9a860, { rough: .75 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.72, 4, 10), bread); body.rotation.x = Math.PI / 2; body.position.set(0, 0, -0.28); body.castShadow = true; g.add(body);
  for (let i = 0; i < 4; i++) { const slash = B(0.02, 0.005, 0.09, 0xb8813e); at(slash, 0, 0.062, -0.5 + i * 0.17); slash.rotation.y = 0.5; g.add(slash); }
  return g;
}
function rubberChicken() {
  const g = new THREE.Group();
  const yellow = M(0xffd23a, { rough: .55, emissive: 0x302400, emissiveIntensity: .4 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 4, 12), yellow); body.rotation.x = Math.PI / 2; body.position.set(0, 0, -0.2); body.castShadow = true; g.add(body);
  const head = SPH(0.075, 0xffd23a, { rough: .55 }); at(head, 0, 0.05, -0.47); g.add(head);
  const beak = CONE(0.028, 0.09, 0xff7a1a); beak.rotation.x = -Math.PI / 2; at(beak, 0, 0.04, -0.55); g.add(beak);
  const comb1 = SPH(0.025, 0xff3b3b); at(comb1, 0, 0.12, -0.45); g.add(comb1);
  const comb2 = SPH(0.02, 0xff3b3b); at(comb2, 0, 0.125, -0.38); g.add(comb2);
  const eye1 = SPH(0.012, 0x111111); at(eye1, 0.045, 0.075, -0.5); g.add(eye1);
  const eye2 = SPH(0.012, 0x111111); at(eye2, -0.045, 0.075, -0.5); g.add(eye2);
  const tail = CONE(0.06, 0.16, 0xffd23a); tail.rotation.x = Math.PI / 2.6; at(tail, 0, 0.08, 0.02); g.add(tail);
  return g;
}

// ───────────── DISPATCH TABLE ─────────────
export function buildWeaponModel(id) {
  switch (id) {
    case 'm1911': return pistol({ slide: STEEL, frame: DARK, grip: 0x3a2a1a });
    case 'deagle': return pistol({ slide: 0x3c4048, frame: 0x2a2d34, grip: 0x222226, accent: 0xffb03a, longBarrel: true });
    case 'revolver': return revolver();
    case 'mp5': return smg({ body: 0x2a2d34, accent: 0xff7a1a });
    case 'vector': return smg({ body: 0x3a3430, accent: 0x27e0ff, vector: true });
    case 'ak47': return rifle({ wood: true, accent: 0xff7a1a });
    case 'm4a1': return rifle({ wood: false, accent: 0x3dff88 });
    case 'shotgun': return shotgun();
    case 'sniper': return sniper();
    case 'm60': return lmg();
    case 'plasma': return plasma();
    case 'railgun': return railgun();
    case 'faca': return blade({ len: 0.42, w: 0.045, hilt: 0x1d1f26 });
    case 'machete': return blade({ len: 0.55, w: 0.06, color: 0xa8b2c2, hilt: 0x2b2018 });
    case 'katana': return blade({ len: 0.82, w: 0.038, color: 0xe6ecf7, hilt: 0x14161c, katana: true });
    case 'espada': return blade({ len: 0.78, w: 0.055, color: 0xd0d6e2, hilt: 0x3a2a14 });
    case 'lanca': return spear();
    case 'machado': return axe();
    case 'martelo': return hammer();
    case 'taco': return baseballBat();
    case 'baguette': return baguette();
    case 'frango': return rubberChicken();
    default: return pistol();
  }
}

// Muzzle offset (local Z, negative = forward) for flash placement — per archetype
export function muzzleOffset(id) {
  const gun = { m1911: .19, deagle: .30, revolver: .34, mp5: .36, vector: .36, ak47: .55, m4a1: .55, shotgun: .52, sniper: .90, m60: .60, plasma: .33, railgun: .60 };
  return gun[id] ?? 0.3;
}

// ───────────── HUMANOID CHARACTER BUILDER ─────────────
// Returns { group, parts, hitMeshes } — hitMeshes carry userData { isHead }
export function buildHumanoid({ primary = 0x3a5a8c, secondary = 0x23262e, skin = 0xc9986a, team = null } = {}) {
  const cBody = team ?? primary;
  const g = new THREE.Group();
  const parts = {};

  const matBody = M(cBody, { rough: .6, metal: .1 });
  const matDark = M(secondary, { rough: .6 });
  const matSkin = M(skin, { rough: .55 });

  // legs (pivot at hip y=0.86)
  const legGeo = new THREE.BoxGeometry(0.17, 0.82, 0.17);
  const legL = new THREE.Group(), legR = new THREE.Group();
  const legLm = new THREE.Mesh(legGeo, matDark); legLm.position.y = -0.41; legLm.castShadow = true; legL.add(legLm);
  const legRm = new THREE.Mesh(legGeo, matDark); legRm.position.y = -0.41; legRm.castShadow = true; legR.add(legRm);
  legL.position.set(0.12, 0.86, 0); legR.position.set(-0.12, 0.86, 0);
  g.add(legL, legR); parts.legL = legL; parts.legR = legR;

  // torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.27), matBody); torso.position.y = 1.18; torso.castShadow = true; g.add(torso); parts.torso = torso;
  // vest
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.3, 0.29), matDark); vest.position.y = 1.12; g.add(vest);
  // shoulder pads
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.2), matDark); pad.position.set(0.28, 1.42, 0); pad.castShadow = true; g.add(pad);
  const pad2 = pad.clone(); pad2.position.x = -0.28; g.add(pad2);

  // arms (pivot at shoulder y=1.42)
  const armGeo = new THREE.BoxGeometry(0.13, 0.62, 0.13);
  const armL = new THREE.Group(), armR = new THREE.Group();
  const armLm = new THREE.Mesh(armGeo, matBody); armLm.position.y = -0.28; armLm.castShadow = true; armL.add(armLm);
  const armRm = new THREE.Mesh(armGeo, matBody); armRm.position.y = -0.28; armRm.castShadow = true; armR.add(armRm);
  const handGeo = new THREE.BoxGeometry(0.12, 0.1, 0.12);
  const handL = new THREE.Mesh(handGeo, matSkin); handL.position.y = -0.6; armL.add(handL);
  const handR = new THREE.Mesh(handGeo, matSkin); handR.position.y = -0.6; armR.add(handR);
  armL.position.set(0.3, 1.42, 0); armR.position.set(-0.3, 1.42, 0);
  g.add(armL, armR); parts.armL = armL; parts.armR = armR;

  // head + helmet
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 12), matSkin); head.position.y = 1.66; head.castShadow = true;
  head.userData.isHead = true; g.add(head); parts.head = head;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.185, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), matDark); helmet.position.y = 1.685; g.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.06), M(0x27e0ff, { emissive: 0x27e0ff, emissiveIntensity: team === 0xff3b3b ? 0 : .9 })); visor.position.set(0, 1.66, -0.12); g.add(visor);

  // hitboxes: invisible-ish boxes used for raycast (visible = false meshes still raycast if in list)
  const hitBody = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.15, 0.36), new THREE.MeshBasicMaterial({ visible: false }));
  hitBody.position.y = 1.12; hitBody.userData.isHead = false; g.add(hitBody);
  const hitHead = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  hitHead.position.y = 1.66; hitHead.userData.isHead = true; g.add(hitHead);

  return { group: g, parts, hitMeshes: [hitBody, hitHead] };
}
