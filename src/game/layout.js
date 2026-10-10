// Disposition déterministe d'un niveau : relief, zones goudronnées, rampes, plaques boost, pièces, gemmes.
// Fichier sans dépendance à Three.js pour pouvoir simuler la physique dans Node.
import { heightAt, rng } from '../assets3d.js';

export const LEVEL_LENGTH = 3000;
export const TRACK = { half: 22 };
const TARMAC_MU = 0.55; // la voiture glisse mieux sur le goudron

export function makeLayout(level, gemsTaken = []) {
  const r = rng(1000 + level * 77);
  const opt = { half: TRACK.half, slope: 0.148 - (Math.min(level, 20) - 1) * 0.0009 };
  const tarmac = [], ramps = [], plates = [], coins = [], gems = [], props = [], arches = [], forks = [];

  // Bifurcations : une colline infranchissable sépare la piste en deux chemins sur 150 à 200 m.
  // Un côté est le chemin des pièces (pièces d'or + rampe), l'autre le chemin rapide (goudron + plaque boost).
  const rf = rng(7000 + level * 31);
  for (let s = 420 + rf() * 120; s < LEVEL_LENGTH - 260; s += 560 + rf() * 260) {
    const len = 150 + rf() * 50;
    forks.push({ z0: -s, z1: -(s + len), cx: (rf() - 0.5) * 6, w: 6 + rf() * 2, h: 8 + rf() * 4, coinSide: rf() < 0.5 ? -1 : 1 });
  }
  const ridgeHalf = (f, z) => { const t = (f.z0 - z) / (f.z0 - f.z1); return t <= 0 || t >= 1 ? 0 : f.w * Math.pow(Math.sin(Math.PI * t), 0.45); };
  const inRidge = (x, z, pad = 0) => forks.some(f => z <= f.z0 + pad && z >= f.z1 - pad && Math.abs(x - f.cx) < ridgeHalf(f, Math.min(f.z0, Math.max(f.z1, z))) + 1 + pad);

  // Zones goudronnées : bandes larges régulières
  for (let s = 90; s < LEVEL_LENGTH - 60; s += 130 + r() * 120) {
    tarmac.push({ z0: -s, z1: -(s + 30 + r() * 30), x: (r() - 0.5) * 18, w: 7 + r() * 4 });
  }
  // Rampes : la première est assez loin du lanceur pour laisser la voiture se poser sur la piste
  for (let s = 140; s < LEVEL_LENGTH - 50; s += 160 + r() * 140) {
    ramps.push({ x: (r() - 0.5) * 24, z: -s, w: 6, l: 5, h: 1.7, boost: true });
  }
  // Plaques boost : avant les côtes (la pente remonte dans les 25 m suivants)
  let lastPlate = -100;
  for (let s = 60; s < LEVEL_LENGTH - 40; s += 5) {
    const climb = heightAt(0, -(s + 25), opt) - heightAt(0, -s, opt);
    if (climb > 0.6 && s - lastPlate > 120) { plates.push({ x: (r() - 0.5) * 20, z: -s, w: 5.5, l: 4.5 }); lastPlate = s; }
  }
  // Pièces : lignes de 5 à 8 pièces, plus de pièces dorées sur les trajectoires difficiles
  for (let s = 20; s < LEVEL_LENGTH; s += 22 + r() * 26) {
    const n = 5 + Math.floor(r() * 4), x0 = (r() - 0.5) * 34, dx = (r() - 0.5) * 0.8;
    const t = r(); const kind = t < 0.6 ? 'bronze' : t < 0.88 ? 'silver' : 'gold';
    for (let i = 0; i < n; i++) coins.push({ x: Math.max(-TRACK.half + 1, Math.min(TRACK.half - 1, x0 + dx * i)), z: -(s + i * 2.6), kind, taken: false });
  }
  // Objets cassables sur la piste (caisses, bottes de foin) : ils volent en éclats sans ralentir
  for (let s = 60; s < LEVEL_LENGTH - 30; s += 26 + r() * 30) {
    if (ramps.some(p => Math.abs(-s - p.z) < 14)) continue;
    const n = 1 + Math.floor(r() * 3), x0 = (r() - 0.5) * 36, kind = r() < 0.5 ? 'crate' : 'hay';
    for (let i = 0; i < n; i++) props.push({ x: Math.max(-TRACK.half + 1.5, Math.min(TRACK.half - 1.5, x0 + (i - (n - 1) / 2) * 1.8)), z: -(s + (r() - 0.5) * 2), kind, rot: r() * 3, hit: false });
  }
  // Arches au-dessus de la piste, à intervalles réguliers
  for (let s = 250; s < LEVEL_LENGTH - 100; s += 400 + r() * 200) arches.push({ z: -s, color: [0xE5383B, 0x2F86F0, 0xFFC21A, 0x16A34A][arches.length % 4] });
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
  // Aucune pièce sur une rampe ni juste devant (la voiture doit pouvoir viser la rampe librement)
  const onRamp = (c) => ramps.some(p => Math.abs(c.x - p.x) < p.w / 2 + 1.2 && c.z < p.z + p.l / 2 + 4 && c.z > p.z - p.l / 2 - 1.5);
  { const k = coins.filter(c => !onRamp(c)); coins.length = 0; coins.push(...k); }
  // Quelques gemmes, plutôt loin
  // Chaque gemme a un identifiant : une fois ramassée, elle ne réapparaît plus dans ce niveau
  for (let i = 0; i < 4; i++) gems.push({ id: i, x: (r() - 0.5) * 30, z: -(400 + i * 650 + r() * 300), taken: false });

  for (const g of gems) { if (inRidge(g.x, g.z, 1)) g.x = (g.x < 0 ? -1 : 1) * (TRACK.half - 6); if (gemsTaken.includes(g.id)) g.taken = true; }

  function surfaceMu(x, z) {
    for (const t of tarmac) if (z < t.z0 && z > t.z1 && Math.abs(x - t.x) < t.w) return TARMAC_MU;
    return 1;
  }
  return {
    level, opt, tarmac, ramps, plates, coins, gems, props, arches, forks, ridgeHalf,
    ground(x, z, baseMu) { return { h: heightAt(x, z, opt), mu: baseMu * surfaceMu(x, z) }; },
    rampAt(x, z) {
      for (const p of ramps) if (Math.abs(x - p.x) < p.w / 2 && z < p.z + p.l / 2 && z > p.z - p.l / 2) return p;
      return null;
    },
    plateAt(x, z) {
      for (const p of plates) if (Math.abs(x - p.x) < p.w / 2 && z < p.z + p.l / 2 && z > p.z - p.l / 2) return p;
      return null;
    },
    isTarmac(x, z) { return surfaceMu(x, z) < 1; },
    // Zone interdite (colline d'une bifurcation) : renvoie le centre et la demi-largeur à éviter
    barrier(x, z) {
      for (const f of forks) if (z <= f.z0 && z >= f.z1) { const hw = ridgeHalf(f, z) + 1; if (hw > 1 && Math.abs(x - f.cx) < hw) return { cx: f.cx, hw }; }
      return null;
    },
  };
}

export const COIN_VALUE = { bronze: 1, silver: 3, gold: 5 };
