// ════════ RANDOM GUNNY — WEAPON DATABASE ════════
// cat: 'gun' | 'melee'   ·   cls: display class   ·   rarity affects viewmodel glow accents
// gun stats: auto, rpm, dmg, pellets, mag, reload (s), spread (deg), range [full, falloff], sound
// melee stats: light [dmg, cd], heavy [dmg, cd], range, arc (deg), knockback, reach

export const WEAPONS = [
  // ───────── ARMAS DE FOGO ─────────
  { id:'m1911', name:'M1911', cat:'gun', cls:'PISTOLA', rarity:'common', sound:'pistol',
    auto:false, rpm:420, dmg:34, mag:7, reload:1.1, spread:1.15, range:[40,80], headshot:2.1,
    desc:'Pistola clássica. Confiável em qualquer situação.' },
  { id:'deagle', name:'DESERT EAGLE', cat:'gun', cls:'PISTOLA MAGNUM', rarity:'rare', sound:'deagle',
    auto:false, rpm:290, dmg:64, mag:7, reload:1.5, spread:1.5, range:[45,85], headshot:2.2,
    desc:'Mão de canhão. Uma bala muda o rumo da luta.' },
  { id:'revolver', name:'REVÓLVER .44', cat:'gun', cls:'REVÓLVER', rarity:'rare', sound:'revolver',
    auto:false, rpm:135, dmg:92, mag:6, reload:2.6, spread:1.7, range:[50,90], headshot:2.3, pierce:true,
    desc:'Revólver de ação única. Destrói atravessando cobertura leve.' },
  { id:'mp5', name:'MP5 "SURTO"', cat:'gun', cls:'SUBMETRALHADORA', rarity:'common', sound:'smg',
    auto:true, rpm:780, dmg:17, mag:30, reload:2.2, spread:1.55, range:[28,55], headshot:2.0,
    desc:'Cadência implacável em curta distância.' },
  { id:'vector', name:'VECTOR-9', cat:'gun', cls:'SUBMETRALHADORA', rarity:'rare', sound:'smg',
    auto:true, rpm:1120, dmg:14, mag:25, reload:2.0, spread:1.9, range:[25,50], headshot:2.0,
    desc:'1100 RPM. Tique-taque da morte.' },
  { id:'ak47', name:'AK-47 "KALASH"', cat:'gun', cls:'RIFLE DE ASSALTO', rarity:'common', sound:'rifle',
    auto:true, rpm:600, dmg:36, mag:30, reload:2.4, spread:1.85, range:[42,85], headshot:2.2,
    desc:'O clássico imortal. Dano pesado e personalidade própria.' },
  { id:'m4a1', name:'M4A1 CARBINE', cat:'gun', cls:'RIFLE DE ASSALTO', rarity:'common', sound:'rifle',
    auto:true, rpm:800, dmg:27, mag:30, reload:2.3, spread:1.4, range:[42,85], headshot:2.1,
    desc:'Precisão cirúrgica em rajadas controladas.' },
  { id:'shotgun', name:'AA-12 BREACHER', cat:'gun', cls:'ESCOPETA', rarity:'rare', sound:'shotgun',
    auto:false, rpm:78, dmg:9, pellets:9, mag:8, reload:2.9, spread:3.6, range:[10,28], headshot:1.8,
    desc:'9 pellets de puro argumento. Porta-abridora.' },
  { id:'sniper', name:'AWSM "CEIFADOR"', cat:'gun', cls:'RIFLE DE PRECISÃO', rarity:'epic', sound:'sniper',
    auto:false, rpm:42, dmg:215, mag:5, reload:3.2, spread:0.12, range:[9999,9999], headshot:2.5, zoom:true,
    desc:'Um tiro, uma história para contar no vestiário.' },
  { id:'m60', name:'M60 "CHUVA"', cat:'gun', cls:'METRALHADORA', rarity:'epic', sound:'lmg',
    auto:true, rpm:640, dmg:30, mag:100, reload:5.4, spread:3.1, range:[45,85], headshot:2.0,
    desc:'Cem munições de supressão contínua.' },
  { id:'plasma', name:'PULSO RX-7', cat:'gun', cls:'FUTURISTA', rarity:'epic', sound:'plasma',
    auto:true, rpm:880, dmg:25, mag:40, reload:2.4, spread:1.1, range:[55,95], headshot:2.1, energy:true,
    desc:'Projéteis de plasma superaquecido. Zumbido delicioso.' },
  { id:'railgun', name:'RAGS-0 "GÊNESIS"', cat:'gun', cls:'EXPERIMENTAL', rarity:'legendary', sound:'rail',
    auto:false, rpm:48, dmg:155, mag:1, reload:1.7, spread:0.06, range:[9999,9999], headshot:2.4, pierce:true, zoom:true, energy:true,
    desc:'Protótipo de aceleração magnética. Atravessa três alvos.' },

  // ───────── CORPO A CORPO ─────────
  { id:'faca', name:'FACA DE COMBATE', cat:'melee', cls:'FACA', rarity:'common',
    light:[30,.36], heavy:[62,1.05], range:2.25, arc:75, knock:4, lanim:'slash', hanim:'thrust',
    desc:'Silenciosa, rápida e letal no escuro.' },
  { id:'machete', name:'MACHETE TÁTICO', cat:'melee', cls:'MACHETE', rarity:'common',
    light:[36,.42], heavy:[78,1.15], range:2.45, arc:80, knock:4.5, lanim:'slash', hanim:'slash',
    desc:'Feito para a selva. Funciona em qualquer bioma.' },
  { id:'katana', name:'KATANA "KOTETSU"', cat:'melee', cls:'KATANA', rarity:'epic',
    light:[44,.34], heavy:[98,1.0], range:2.95, arc:85, knock:5, lanim:'slash', hanim:'slash',
    desc:'Aço dobrável mil vezes. Corte limpo e definitivo.' },
  { id:'espada', name:'ESPADA LONGA', cat:'melee', cls:'ESPADA', rarity:'rare',
    light:[40,.44], heavy:[88,1.25], range:2.65, arc:80, knock:5, lanim:'slash', hanim:'slash',
    desc:'Cavalaria medieval em combate urbano.' },
  { id:'lanca', name:'LANÇA DE FÁGON', cat:'melee', cls:'LANÇA', rarity:'rare',
    light:[30,.40], heavy:[68,1.1], range:4.15, arc:40, knock:6, lanim:'thrust', hanim:'thrust',
    desc:'Alcance de elite. Toque antes de ser tocado.' },
  { id:'machado', name:'MACHADO DE GUERRA', cat:'melee', cls:'MACHADO', rarity:'rare',
    light:[46,.52], heavy:[112,1.35], range:2.5, arc:70, knock:6.5, lanim:'chop', hanim:'chop',
    desc:'Cada golpe conta uma história antiga.' },
  { id:'martelo', name:'MARTELO DO JUÍZO', cat:'melee', cls:'MARTELO', rarity:'epic',
    light:[42,.56], heavy:[132,1.6], range:2.4, arc:75, knock:9, lanim:'chop', hanim:'chop', aoe:2.2,
    desc:'Comboio de duas toneladas. Impacto de área devastador.' },
  { id:'taco', name:'TACO "SWING KING"', cat:'melee', cls:'TACO DE BEISEBOL', rarity:'common',
    light:[27,.38], heavy:[72,1.0], range:2.35, arc:80, knock:8.5, lanim:'swing', hanim:'swing',
    desc:'Forreball oficial da liga dos incrédulos.' },
  { id:'baguette', name:'BAGUETTE FATAL', cat:'melee', cls:'BAGUETTE', rarity:'legendary',
    light:[24,.30], heavy:[64,.85], range:2.45, arc:85, knock:7, lanim:'swing', hanim:'swing',
    desc:'Crocante por fora, brutal por dentro. Paris era apenas o começo.' },
  { id:'frango', name:'FRANGO DE BORRACHA', cat:'melee', cls:'PIKIPIKI', rarity:'legendary',
    light:[13,.22], heavy:[36,.6], range:2.15, arc:70, knock:11, lanim:'swing', hanim:'swing',
    desc:'O terror dos campos de batalha. Estridente. Humilhante. Poderoso.' },
];

export const GUN_WEAPONS  = WEAPONS.filter(w => w.cat === 'gun');
export const MELEE_WEAPONS = WEAPONS.filter(w => w.cat === 'melee');
export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// random pick from a pool, guaranteeing a *different* weapon than `currentId` when possible
export function rollWeapon(pool, currentId, rng = Math.random) {
  const candidates = pool.filter(w => w.id !== currentId);
  const list = candidates.length ? candidates : pool;
  return list[Math.floor(rng() * list.length)];
}
export function poolFor(setting) {
  if (setting === 'gun')   return GUN_WEAPONS;
  if (setting === 'melee') return MELEE_WEAPONS;
  return WEAPONS;
}

export const RARITY_COLOR = { common:'#c9d1de', rare:'#3da8ff', epic:'#b26bff', legendary:'#ffb03a' };
