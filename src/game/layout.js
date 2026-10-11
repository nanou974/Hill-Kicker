// Disposition déterministe d'un niveau : relief, zones goudronnées, rampes, plaques boost, pièces, gemmes,
// obstacles et passages étroits (portails, arches, tunnels, grottes, gorges, ruines).
// Fichier sans dépendance à Three.js pour pouvoir simuler la physique dans Node.
import { heightAt, rng } from '../assets3d.js';
import { trackFor, difficulty, levelLength, makeCurve } from './tracks.js';

// Longueur du niveau 1 ; les niveaux suivants sont plus longs (layout.length, voir tracks.js)
export const LEVEL_LENGTH = 3000;
export const TRACK = { half: 22 };
const TARMAC_MU = 0.55; // la voiture glisse mieux sur le goudron
const CAR_HALF = 0.9;   // demi-largeur de la voiture pour les collisions
const CAR_HALF_LEN = 2.0; // demi-longueur de la voiture : le moindre contact avec une plaque ou une rampe compte

// Passages étroits : longueur (m) et hauteur infranchissable (au-dessus du sol) de chaque type
export const PASSAGE_KINDS = ['gate', 'arch', 'canyon', 'tunnel', 'cave', 'ruins'];
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

// Tire un type au hasard selon des poids : { gate: 3, arch: 1 } → 'gate' trois fois sur quatre
function pick(weights, v) {
  const keys = Object.keys(weights), tot = keys.reduce((a, k) => a + weights[k], 0);
  let acc = 0; for (const k of keys) { acc += weights[k] / tot; if (v < acc) return k; }
  return keys[keys.length - 1];
}
// Distance entre un point et le bord d'un obstacle (cercle, ou barre pour un tronc couché)
export function obstacleGap(o, x, z) {
  if (o.w) return Math.hypot(Math.max(0, Math.abs(x - o.x) - o.w), Math.max(0, Math.abs(z - o.z) - o.r));
  return Math.hypot(x - o.x, z - o.z) - o.r;
}

export function makeLayout(level, gemsTaken = []) {
  const r = rng(1000 + level * 77);
  const P = trackFor(level), D = difficulty(level), LEN = levelLength(level); // longueur de ce niveau
  const opt = { half: TRACK.half, slope: 0.148 - (Math.min(level, 20) - 1) * 0.0009, relief: P.relief };
  const tarmac = [], ramps = [], plates = [], coins = [], gems = [], props = [], arches = [], forks = [], obstacles = [], passages = [], slow = [];

  // Bifurcations : une colline infranchissable sépare la piste en deux chemins sur 150 à 200 m.
  // Un côté est le chemin des pièces (pièces d'or + rampe), l'autre le chemin rapide (goudron + plaque boost).
  const rf = rng(7000 + level * 31);
  for (let s = 420 + rf() * 120; s < LEN - 260; s += 560 + rf() * 260) {
    const len = 150 + rf() * 50;
    forks.push({ z0: -s, z1: -(s + len), cx: (rf() - 0.5) * 6, w: 6 + rf() * 2, h: 8 + rf() * 4, coinSide: rf() < 0.5 ? -1 : 1 });
  }
  const ridgeHalf = (f, z) => { const t = (f.z0 - z) / (f.z0 - f.z1); return t <= 0 || t >= 1 ? 0 : f.w * Math.pow(Math.sin(Math.PI * t), 0.45); };
  const inRidge = (x, z, pad = 0) => forks.some(f => z <= f.z0 + pad && z >= f.z1 - pad && Math.abs(x - f.cx) < ridgeHalf(f, Math.min(f.z0, Math.max(f.z1, z))) + 1 + pad);

  // Passages étroits : toute la largeur de la piste est bouchée sauf une ou deux ouvertures.
  // Percuter la partie pleine arrête la voiture, comme un rocher.
  const rp = rng(12000 + level * 41);
  const rx = (a) => (rp() - 0.5) * 2 * a;
  // Types de passages propres au monde ; ils se rapprochent quand la difficulté monte
  for (let s = 380 + rp() * 80; s < LEN - 160; s += (330 + rp() * 230) * (1 - 0.25 * D)) {
    const kind = pick(P.passages, rp());
    const len = { gate: 1.2, arch: 6, canyon: 55 + rp() * 25, tunnel: 34 + rp() * 16, cave: 45 + rp() * 20, ruins: 2.4 }[kind];
    const z0 = -s, z1 = -(s + len);
    if (forks.some(f => z1 < f.z0 + 70 && z0 > f.z1 - 50)) continue;
    // holeH : hauteur sous voûte des passages couverts (la caméra descend en dessous pour ne pas traverser la roche)
    const p = { kind, z0, z1, len, openings: [], top: Infinity, seed: Math.floor(rp() * 1e6), columns: [], holeH: { arch: 10, tunnel: 9.5, cave: 9 }[kind] || 0 };
    if (kind === 'gate') {
      // Portail de ferme : une clôture haute avec deux portes ouvertes (sautable en l'air au-dessus de 2,4 m)
      p.top = 2.4; const a = rx(5); p.openings.push({ c0: a - 9, c1: a - 9, w: 6.5 }, { c0: a + 9, c1: a + 9, w: 6.5 });
    } else if (kind === 'arch') {
      // Arche rocheuse : une ou deux arches dans une barre de roche
      if (rp() < 0.5) { const a = rx(4); p.openings.push({ c0: a - 8.5, c1: a - 8.5, w: 8 }, { c0: a + 8.5, c1: a + 8.5, w: 8 }); }
      else { const c = rx(10); p.openings.push({ c0: c, c1: c, w: 9 }); }
    } else if (kind === 'canyon') {
      // Gorge : deux falaises resserrent la piste, le passage serpente
      p.openings.push({ c0: rx(6), c1: rx(6), w: 13 });
    } else if (kind === 'tunnel') {
      const c = rx(8); p.openings.push({ c0: c, c1: c, w: 10 });
    } else if (kind === 'cave') {
      // Grotte : l'entrée et la sortie ne sont pas alignées, et des stalagmites barrent une partie du passage
      p.openings.push({ c0: rx(7), c1: rx(7), w: 11 });
    } else if (kind === 'ruins') {
      // Ruines : une colonnade en travers de la piste, quelques colonnes tombées ou cassées
      p.openings = null;
      const n = 6, gone = new Set([Math.floor(rp() * n)]); if (rp() < 0.4) gone.add(Math.floor(rp() * n));
      for (let i = 0; i < n; i++) {
        if (gone.has(i)) continue;
        const broken = rp() < 0.3;
        p.columns.push({ x: -18 + i * 7.2 + rx(0.5), z: (z0 + z1) / 2, r: 1.05, h: broken ? 1.6 : 7, broken });
      }
    }
    passages.push(p);
  }
  // Tracé : virages hors des passages étroits (la piste y reste droite, de 70 m avant l'entrée à 25 m après la sortie)
  const curve = makeCurve(level, LEN, passages.map(p => [-p.z0 - 70, -p.z1 + 25]));
  const openX = (o, p, z) => o.c0 + (o.c1 - o.c0) * smooth((p.z0 - z) / (p.z0 - p.z1));
  // Zone autour d'un passage (avant l'entrée et après la sortie) où rien d'autre ne doit gêner
  const nearPassage = (z, before, after) => passages.some(p => z < p.z0 + before && z > p.z1 - after);
  // Position dans une ouverture (avec une marge) ?
  const inOpening = (x, z, margin) => passages.some(p => z <= p.z0 && z >= p.z1 && p.openings && p.openings.some(o => Math.abs(x - openX(o, p, z)) < o.w / 2 - margin));

  // Zones goudronnées : bandes larges régulières
  for (let s = 90; s < LEN - 60; s += 130 + r() * 120) {
    tarmac.push({ z0: -s, z1: -(s + 30 + r() * 30), x: (r() - 0.5) * 18, w: 7 + r() * 4 });
  }
  // Rampes : la première est assez loin du lanceur pour laisser la voiture se poser sur la piste
  for (let s = 140; s < LEN - 50; s += (160 + r() * 140) / P.ramps) {
    ramps.push({ x: (r() - 0.5) * 24, z: -s, w: 6, l: 5, h: 1.7, boost: true });
  }
  // Plaques boost : avant les côtes (la pente remonte dans les 25 m suivants)
  let lastPlate = -100;
  for (let s = 60; s < LEN - 40; s += 5) {
    const climb = heightAt(0, -(s + 25), opt) - heightAt(0, -s, opt);
    if (climb > 0.6 && s - lastPlate > 120) { plates.push({ x: (r() - 0.5) * 20, z: -s, w: 5.5, l: 4.5 }); lastPlate = s; }
  }
  // Pièces : lignes de 5 à 8 pièces, plus de pièces dorées sur les trajectoires difficiles
  for (let s = 20; s < LEN; s += 22 + r() * 26) {
    const n = 5 + Math.floor(r() * 4), x0 = (r() - 0.5) * 34, dx = (r() - 0.5) * 0.8;
    const t = r(); const kind = t < 0.6 ? 'bronze' : t < 0.88 ? 'silver' : 'gold';
    for (let i = 0; i < n; i++) coins.push({ x: Math.max(-TRACK.half + 1, Math.min(TRACK.half - 1, x0 + dx * i)), z: -(s + i * 2.6), kind, taken: false });
  }
  // Objets cassables sur la piste (caisses, bottes de foin) : ils volent en éclats sans ralentir
  for (let s = 60; s < LEN - 30; s += 26 + r() * 30) {
    if (ramps.some(p => Math.abs(-s - p.z) < 14)) continue;
    const n = 1 + Math.floor(r() * 3), x0 = (r() - 0.5) * 36, kind = r() < 0.5 ? 'crate' : 'hay';
    for (let i = 0; i < n; i++) props.push({ x: Math.max(-TRACK.half + 1.5, Math.min(TRACK.half - 1.5, x0 + (i - (n - 1) / 2) * 1.8)), z: -(s + (r() - 0.5) * 2), kind, rot: r() * 3, hit: false });
  }
  // Arches décoratives au-dessus de la piste, à intervalles réguliers (pas sur un passage,
  // ni dans un virage : elles traversent la piste en ligne droite et y paraîtraient de travers)
  const inTurn = (s) => [-25, 0, 25].some(d => Math.abs(curve.kAt(s + d)) > 1e-5);
  for (let s = 250; s < LEN - 100; s += 400 + r() * 200) if (!nearPassage(-s, 40, 40) && !inTurn(s)) arches.push({ z: -s, color: [0xE5383B, 0x2F86F0, 0xFFC21A, 0x16A34A][arches.length % 4] });
  // Contenu propre à chaque chemin des bifurcations
  for (const f of forks) {
    const sc = f.coinSide, xc = f.cx + sc * (f.w + 7.5), xf = f.cx - sc * (f.w + 7.5), mid = (f.z0 + f.z1) / 2;
    for (let i = 0; i < 12; i++) coins.push({ x: xc + Math.sin(i * 0.6) * 1.5, z: f.z0 - 18 - i * 3, kind: 'gold', taken: false });
    for (let i = 0; i < 8; i++) coins.push({ x: xc, z: mid - 30 - i * 2.6, kind: 'gold', taken: false });
    ramps.push({ x: xc, z: mid, w: 6, l: 5, h: 1.7, boost: true, fork: true });
    tarmac.push({ z0: f.z0 - 8, z1: f.z1 + 8, x: xf, w: 5.5, fork: true });
    plates.push({ x: xf, z: f.z0 - 26, w: 5.5, l: 4.5, fork: true });
    plates.push({ x: xf, z: mid - 10, w: 5.5, l: 4.5, fork: true });
  }
  // Rien ne doit se trouver sous la colline
  const keep = (arr, pad) => { const k = arr.filter(o => o.fork || !inRidge(o.x, o.z, pad)); arr.length = 0; arr.push(...k); };
  keep(ramps, 4); keep(plates, 3); keep(coins, 0.5); keep(props, 1);
  const filt = (arr, fn) => { const k = arr.filter(fn); arr.length = 0; arr.push(...k); };
  // Pas de rampe dans les 90 m avant une colline : la voiture serait en l'air au moment de choisir son chemin
  filt(ramps, p => p.fork || !forks.some(f => p.z > f.z0 && p.z < f.z0 + 90));
  // Autour des passages : pas de rampe juste avant (la voiture volerait dans la roche), pas de plaque ni d'objet dedans
  filt(ramps, p => !nearPassage(p.z, 80, 15));
  filt(plates, p => !nearPassage(p.z, 10, 5));
  filt(props, p => !nearPassage(p.z, 4, 3));
  filt(coins, c => !nearPassage(c.z, 1, 1) || inOpening(c.x, c.z, 1));
  filt(tarmac, t => t.fork || !passages.some(p => t.z1 < p.z0 && t.z0 > p.z1));
  // Pièces qui guident vers une ouverture (ou un trou de la colonnade)
  const rc = rng(13000 + level * 17);
  for (const p of passages) {
    let x0;
    if (p.openings) x0 = p.openings[Math.floor(rc() * p.openings.length)];
    const kind = p.kind === 'cave' || p.kind === 'tunnel' ? 'silver' : 'bronze';
    if (p.openings) {
      for (let zz = p.z0 + 24; zz > p.z1 - 6; zz -= 3) { const zc = Math.min(p.z0, Math.max(p.z1, zz)); coins.push({ x: openX(x0, p, zc), z: zz, kind, taken: false }); }
    } else {
      const xs = [-TRACK.half + 1, ...p.columns.map(c => c.x), TRACK.half - 1].sort((a, b) => a - b);
      let best = 0, gx = 0; for (let i = 0; i < xs.length - 1; i++) if (xs[i + 1] - xs[i] > best) { best = xs[i + 1] - xs[i]; gx = (xs[i] + xs[i + 1]) / 2; }
      for (let i = 0; i < 7; i++) coins.push({ x: gx, z: p.z0 + 12 - i * 3, kind: 'gold', taken: false });
    }
  }
  // Obstacles sur la piste : rochers de formes variées et statues. Les percuter arrête la voiture.
  // Pas avant 260 m (le premier lancer doit pouvoir se dérouler sans), ni près des rampes, plaques, collines et passages.
  const ro = rng(9100 + level * 53);
  const ROCKS = {
    round:   { r: 1.3, h: 1.6 },  // gros rocher arrondi
    spire:   { r: 0.9, h: 3.8 },  // aiguille dressée
    slab:    { r: 1.7, h: 0.9 },  // dalle plate
    cluster: { r: 2.0, h: 1.8 },  // amas de 3 ou 4 pierres
    stack:   { r: 1.2, h: 3.0 },  // pierres empilées en équilibre
  };
  const rockTypes = Object.keys(ROCKS);
  // Plus d'obstacles quand la difficulté monte ; la densité et la part de statues dépendent du monde
  for (let s = 260 + ro() * 60; s < LEN - 40; s += (70 + ro() * 90) * (1 - 0.3 * D) / P.rocks) {
    const n = 1 + (ro() < 0.35 + 0.2 * D ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const statue = ro() < P.statues;
      const shape = rockTypes[Math.floor(ro() * rockTypes.length)];
      const o = statue
        ? { kind: 'statue', r: 0.95, h: 3.9 }
        : { kind: 'boulder', shape, r: ROCKS[shape].r, h: ROCKS[shape].h, seed: Math.floor(ro() * 1e6) };
      o.x = (ro() - 0.5) * 2 * (TRACK.half - 3); o.z = -(s + k * 6); o.rot = ro() * 6;
      if (inRidge(o.x, o.z, 4) || nearPassage(o.z, 35, 35) || ramps.some(p => Math.abs(o.x - p.x) < 7 && Math.abs(o.z - p.z) < 18) || plates.some(p => Math.abs(o.x - p.x) < 6 && Math.abs(o.z - p.z) < 10)) continue;
      o.top = heightAt(o.x, o.z, opt) + o.h; obstacles.push(o);
    }
  }
  // Troncs couchés en travers d'une partie de la piste (forêt, jungle, bayou) : on passe à côté, ou par-dessus en sautant
  if (P.logs > 0) {
    const rl = rng(16000 + level * 23);
    for (let s = 330 + rl() * 120; s < LEN - 60; s += (300 + rl() * 260) * (1 - 0.3 * D) / P.logs) {
      const w = 3.5 + rl() * 3, side = rl() < 0.5 ? -1 : 1;
      // Le tronc part d'un bord de la piste (ou se pose au milieu) et laisse toujours un passage d'au moins 10 m
      const x = rl() < 0.3 ? (rl() - 0.5) * 8 : side * (TRACK.half - w + 1.5 - rl() * 5);
      const o = { kind: 'log', x, z: -s, w, r: 0.55, h: 1.0, rot: (rl() - 0.5) * 0.25, seed: Math.floor(rl() * 1e6) };
      if (inRidge(o.x, o.z, w + 4) || nearPassage(o.z, 40, 35) || ramps.some(p => Math.abs(o.z - p.z) < 22) || plates.some(p => Math.abs(o.z - p.z) < 12)
        || obstacles.some(q => Math.abs(q.z - o.z) < 14)) continue;
      o.top = heightAt(o.x, o.z, opt) + o.h; obstacles.push(o);
    }
  }
  // Zones lentes : sable mou, boue ou eau. Elles freinent sans arrêter la voiture.
  if (P.slow) {
    const rz = rng(17000 + level * 19);
    for (let s = 300 + rz() * 100; s < LEN - 80; s += P.slow.every * (0.7 + rz() * 0.6)) {
      const len = 22 + rz() * 26, z0 = -s, z1 = -(s + len), w = 5 + rz() * 5, x = (rz() - 0.5) * 2 * (TRACK.half - w * 0.6);
      if (nearPassage(z0, 20, 20) || forks.some(f => z1 < f.z0 + 20 && z0 > f.z1 - 20) || tarmac.some(t => z1 < t.z0 && z0 > t.z1)) continue;
      slow.push({ z0, z1, x, w });
    }
  }
  // Obstacles propres aux passages (construits avec le passage, pas avec le décor) : stalagmites et colonnes
  for (const p of passages) {
    if (p.kind === 'cave') {
      const rs = rng(p.seed + 5), o = p.openings[0];
      for (const t of [0.35, 0.7]) {
        const z = p.z0 - t * p.len, c = openX(o, p, z), side = rs() < 0.5 ? -1 : 1;
        obstacles.push({ kind: 'stalagmite', own: true, x: c + side * 2.6, z, r: 0.8, h: 2.6, top: Infinity, rot: rs() * 6 });
      }
    }
    for (const c of p.columns) obstacles.push({ kind: 'column', own: true, x: c.x, z: c.z, r: c.r, h: c.h, broken: c.broken, top: c.broken ? heightAt(c.x, c.z, opt) + c.h : Infinity, rot: 0 });
  }
  filt(coins, c => !obstacles.some(o => obstacleGap(o, c.x, c.z) < 1.5));
  filt(props, c => !obstacles.some(o => obstacleGap(o, c.x, c.z) < 2.5));
  // Aucune pièce sur une rampe ni juste devant (la voiture doit pouvoir viser la rampe librement)
  const onRamp = (c) => ramps.some(p => Math.abs(c.x - p.x) < p.w / 2 + 1.2 && c.z < p.z + p.l / 2 + 4 && c.z > p.z - p.l / 2 - 1.5);
  filt(coins, c => !onRamp(c));
  // Quelques gemmes, plutôt loin
  // Chaque gemme a un identifiant : une fois ramassée, elle ne réapparaît plus dans ce niveau
  for (let i = 0; i < 4; i++) gems.push({ id: i, x: (r() - 0.5) * 30, z: -(400 + (i * 650 + r() * 300) * LEN / 3000), taken: false });

  for (const g of gems) {
    if (inRidge(g.x, g.z, 1)) g.x = (g.x < 0 ? -1 : 1) * (TRACK.half - 6);
    // Dans un passage, la gemme se place au milieu d'une ouverture
    const p = passages.find(p => g.z < p.z0 + 2 && g.z > p.z1 - 2);
    if (p && p.openings) g.x = openX(p.openings[0], p, Math.min(p.z0, Math.max(p.z1, g.z)));
    else if (p) g.z = p.z0 + 8;
    if (gemsTaken.includes(g.id)) g.taken = true;
  }

  // Bords arrondis des zones lentes (flaques, bancs de sable)
  const inSlow = (t, x, z) => { const u = (x - t.x) / t.w, v = (z - (t.z0 + t.z1) / 2) / ((t.z0 - t.z1) / 2); return u * u + v * v < 1 + 0.12 * Math.sin(x * 0.9 + z * 0.7); };
  function surfaceMu(x, z) {
    for (const t of tarmac) if (z < t.z0 && z > t.z1 && Math.abs(x - t.x) < t.w) return TARMAC_MU;
    for (const t of slow) if (z < t.z0 + 2 && z > t.z1 - 2 && inSlow(t, x, z)) return P.slow.mu;
    return 1;
  }
  function obstacleAt(x, z) {
    for (const o of obstacles) if (Math.abs(z - o.z) < 3 + (o.w || 0) && (o.w ? Math.abs(z - o.z) < o.r + CAR_HALF_LEN * 0.5 && Math.abs(x - o.x) < o.w + CAR_HALF : Math.hypot(x - o.x, z - o.z) < o.r + CAR_HALF)) return o;
    // Partie pleine d'un passage : la voiture doit être entièrement dans une ouverture
    for (const p of passages) if (p.openings && z <= p.z0 && z >= p.z1) {
      if (!p.openings.some(o => Math.abs(x - openX(o, p, z)) < o.w / 2 - CAR_HALF)) return { kind: p.kind, top: p.top === Infinity ? Infinity : heightAt(x, z, opt) + p.top };
    }
    return null;
  }
  return {
    length: LEN, profile: P, curve, slow,
    // Courbure de la piste à la position z de la voiture (1/m) : elle pousse la voiture vers l'extérieur du virage
    curveAt(z) { return curve.kAt(-z); },
    level, opt, tarmac, ramps, plates, coins, gems, props, arches, forks, obstacles, passages, ridgeHalf, openX,
    ground(x, z, baseMu) { return { h: heightAt(x, z, opt), mu: baseMu * surfaceMu(x, z) }; },
    rampAt(x, z) {
      for (const p of ramps) if (Math.abs(x - p.x) < p.w / 2 && z < p.z + p.l / 2 && z > p.z - p.l / 2) return p;
      return null;
    },
    plateAt(x, z) {
      for (const p of plates) if (Math.abs(x - p.x) < p.w / 2 && z < p.z + p.l / 2 && z > p.z - p.l / 2) return p;
      return null;
    },
    // Contact de la carrosserie (et pas seulement du centre) avec une plaque boost ou une rampe
    plateTouch(x, z) {
      for (const p of plates) if (Math.abs(x - p.x) < p.w / 2 + CAR_HALF && Math.abs(z - p.z) < p.l / 2 + CAR_HALF_LEN) return p;
      return null;
    },
    rampTouch(x, z) {
      for (const p of ramps) if (Math.abs(x - p.x) < p.w / 2 + CAR_HALF && Math.abs(z - p.z) < p.l / 2 + CAR_HALF_LEN) return p;
      return null;
    },
    isTarmac(x, z) { return surfaceMu(x, z) < 1; },
    isSlow(x, z) { return surfaceMu(x, z) > 1; },
    // Zone interdite (colline d'une bifurcation) : renvoie le centre et la demi-largeur à éviter
    barrier(x, z) {
      for (const f of forks) if (z <= f.z0 && z >= f.z1) {
        const hw = ridgeHalf(f, z) + 1;
        if (hw > 1 && Math.abs(x - f.cx) < hw) { const t = (f.z0 - z) / (f.z0 - f.z1); return { cx: f.cx, hw, top: heightAt(x, z, opt) + f.h * Math.pow(Math.sin(Math.PI * t), 0.55) }; }
      }
      return null;
    },
    obstacleAt,
    // Hauteur maximale de la caméra (au-dessus du sol) à cette position : sous la voûte d'un tunnel, d'une grotte ou d'une arche
    ceilingAt(z) {
      for (const p of passages) if (p.holeH && z < p.z0 + 10 && z > p.z1 - 2) return p.holeH - (p.kind === 'cave' ? 3.2 : 1.4); // dans la grotte, sous les stalactites
      return Infinity;
    },
    // Pour le pilote automatique : où viser pour franchir le prochain passage (null si aucun à l'approche)
    passageTarget(x, z) {
      const p = passages.find(p => z < p.z0 + 60 && z > p.z1);
      if (!p) return null;
      const zc = Math.min(p.z0, Math.max(p.z1, z - 4));
      if (p.openings) return p.openings.map(o => openX(o, p, zc)).reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
      const xs = [-TRACK.half + 1, ...p.columns.map(c => c.x), TRACK.half - 1].sort((a, b) => a - b);
      let best = null; for (let i = 0; i < xs.length - 1; i++) if (xs[i + 1] - xs[i] > 4.5) { const m = (xs[i] + xs[i + 1]) / 2; if (best === null || Math.abs(m - x) < Math.abs(best - x)) best = m; }
      return best;
    },
  };
}

export const COIN_VALUE = { bronze: 1, silver: 3, gold: 5 };
