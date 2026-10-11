// Profil de piste de chaque monde : relief, virages, obstacles typiques, zones lentes.
// Même ordre que THEMES (themes.js) : le monde 1 est la Prairie fleurie, le monde 10 le Bayou brumeux.
// La longueur et la difficulté montent avec le numéro du niveau ; elles continuent de monter quand le jeu reboucle.
// Fichier sans dépendance à Three.js pour pouvoir simuler la physique dans Node.
import { rng } from '../assets3d.js';

// relief : ondulations le long de la piste [amplitude (m), fréquence (rad/m), phase], dévers (cross),
//          dunes en biais (dunes), bosses serrées (bumps), terrasses avec une descente raide en bout (terraces)
// curves : courbure maximale (1/rayon en m), longueurs des lignes droites et des virages (m), chance d'enchaîner en S
// passages : poids de chaque type de passage étroit · logs : troncs couchés en travers (0 = aucun, 1 = beaucoup)
// slow : zones de sable, de boue ou d'eau qui freinent (une tous les « every » m environ, frottement, couleur, nom affiché)
// rocks : densité des rochers (1 = normal) · statues : part des obstacles « statue » du monde · ramps : densité des rampes
export const TRACKS = [
  { // 1 · Prairie fleurie : collines douces, grandes courbes tranquilles
    relief: { waves: [[2.2, 0.045, 0], [0.9, 0.11, 1.3]], cross: 0.6 },
    curves: { k: 1 / 240, straight: [260, 460], arc: [120, 200], s: 0.5 },
    passages: { gate: 3, arch: 2, tunnel: 1 },
    rocks: 1, statues: 0.35, ramps: 1, logs: 0,
  },
  { // 2 · Champs de lavande : longues vagues régulières qui suivent les rangs, virages en S
    relief: { waves: [[3.0, 0.032, 0.4], [0.7, 0.085, 2]], cross: 1.1 },
    curves: { k: 1 / 190, straight: [220, 380], arc: [100, 150], s: 0.85 },
    passages: { gate: 2, ruins: 2, arch: 1 },
    rocks: 0.9, statues: 0.3, ramps: 1, logs: 0,
  },
  { // 3 · Forêt d'automne : pente bosselée, virages serrés, troncs et tunnels
    relief: { waves: [[2.4, 0.05, 0.2], [1.1, 0.13, 1]], cross: 0.5, bumps: 0.3 },
    curves: { k: 1 / 150, straight: [160, 300], arc: [90, 150], s: 0.6 },
    passages: { tunnel: 3, cave: 2, gate: 1 },
    rocks: 0.8, statues: 0.3, ramps: 1, logs: 0.6,
  },
  { // 4 · Plage tropicale : petites dunes de sable, très longues courbes, sable mou
    relief: { waves: [[1.4, 0.04, 0]], cross: 0.4, dunes: [1.1, 0.11] },
    curves: { k: 1 / 220, straight: [240, 420], arc: [140, 220], s: 0.4 },
    passages: { arch: 3, gate: 1 },
    rocks: 0.7, statues: 0.4, ramps: 1.1, logs: 0,
    slow: { every: 230, mu: 1.7, color: [0.72, 0.60, 0.42], name: 'sable mouillé' },
  },
  { // 5 · Savane : grandes houles qui font décoller, piste presque droite
    relief: { waves: [[3.0, 0.02, 0.8], [0.5, 0.07, 2]], cross: 0.5 },
    curves: { k: 1 / 380, straight: [450, 750], arc: [140, 200], s: 0.3 },
    passages: { canyon: 2, arch: 2 },
    rocks: 1, statues: 0.5, ramps: 1.3, logs: 0,
  },
  { // 6 · Canyons du désert : dunes en biais, gorges, sable mou
    relief: { waves: [[1.8, 0.04, 0]], cross: 0.3, dunes: [1.5, 0.09] },
    curves: { k: 1 / 175, straight: [220, 400], arc: [110, 170], s: 0.5 },
    passages: { canyon: 4, arch: 2 },
    rocks: 1.1, statues: 0.4, ramps: 1, logs: 0,
    slow: { every: 280, mu: 1.7, color: [0.99, 0.90, 0.70], name: 'sable mou' },
  },
  { // 7 · Ville fantôme du Far West : plateaux en paliers, portails de ranch
    relief: { waves: [[0.5, 0.05, 0.6]], cross: 0.4, terraces: [150, 0.55] },
    curves: { k: 1 / 200, straight: [260, 440], arc: [110, 170], s: 0.45 },
    passages: { gate: 3, canyon: 2 },
    rocks: 1.1, statues: 0.4, ramps: 1.1, logs: 0,
  },
  { // 8 · Jungle : la piste serpente sans arrêt, bosses, grottes et troncs
    relief: { waves: [[2.0, 0.06, 0.5], [1.0, 0.15, 2]], cross: 0.4, bumps: 0.25 },
    curves: { k: 1 / 130, straight: [120, 240], arc: [80, 130], s: 0.9 },
    passages: { cave: 3, tunnel: 2 },
    rocks: 0.8, statues: 0.35, ramps: 1, logs: 0.8,
    slow: { every: 420, mu: 1.8, color: [0.24, 0.17, 0.10], name: 'boue' },
  },
  { // 9 · Temples aztèques : grands escaliers (paliers serrés), ruines et arches
    relief: { waves: [[0.4, 0.05, 1]], cross: 0.3, terraces: [110, 0.6] },
    curves: { k: 1 / 175, straight: [220, 380], arc: [100, 160], s: 0.6 },
    passages: { ruins: 4, arch: 2 },
    rocks: 0.9, statues: 0.55, ramps: 1.3, logs: 0,
  },
  { // 10 · Bayou brumeux : piste plate et sinueuse, flaques de boue et d'eau, troncs
    relief: { waves: [[1.0, 0.03, 0], [0.5, 0.09, 1]], cross: 0.3 },
    curves: { k: 1 / 150, straight: [180, 320], arc: [120, 190], s: 0.7 },
    passages: { gate: 2, tunnel: 1, ruins: 1 },
    rocks: 0.7, statues: 0.35, ramps: 1, logs: 0.5,
    slow: { every: 230, mu: 1.7, color: [0.20, 0.33, 0.33], name: 'eau' },
  },
];

export const worldIndex = (level) => (Math.max(1, level) - 1) % TRACKS.length;
export const trackFor = (level) => TRACKS[worldIndex(level)];

// Difficulté de 0 (niveau 1) à 1 (niveau 25 et au-delà)
export const difficulty = (level) => Math.min(1, (Math.max(1, level) - 1) / 24);
// Longueur du niveau : 3 000 m au niveau 1, puis 60 m de plus par niveau jusqu'à 4 500 m
export const levelLength = (level) => 3000 + 60 * Math.min(25, Math.max(1, level) - 1);

const STRAIGHT_START = 230; // départ toujours en ligne droite : le premier lancer reste simple
const RAMP_IN = 45;         // entrée et sortie de virage progressives (m)
const MAX_HEADING = 0.75;   // cap maximal (rad) avant que la piste reparte dans l'autre sens

// Tracé du niveau : courbure à chaque mètre, cap et décalage latéral de l'axe de la piste.
// La physique reste en ligne droite (axe z) ; le virage se voit à l'écran (bend.js) et pousse la voiture vers l'extérieur.
// avoid : tronçons [début, fin] (m) où la piste doit rester droite (passages étroits et leurs abords)
export function makeCurve(level, length, avoid = []) {
  const P = trackFor(level).curves, d = difficulty(level);
  const r = rng((Math.imul(level, 2654435761) ^ 15000) >>> 0); // graine bien mélangée : chaque niveau a son propre tracé
  const n = Math.ceil(length + 700);
  const k = new Float32Array(n), turns = [];
  const kMax = P.k * (1 + 0.3 * d);
  let s = STRAIGHT_START + r() * 80, dir = r() < 0.5 ? -1 : 1, heading = 0;
  while (s < length - 120) {
    const arc = P.arc[0] + r() * (P.arc[1] - P.arc[0]);
    const kk = kMax * (0.85 + 0.15 * r());
    // Le cap ne doit pas trop s'écarter : au-delà, le virage suivant repart dans l'autre sens
    if (Math.abs(heading) > MAX_HEADING * 0.5) dir = -Math.sign(heading);
    // Pas de virage dans un passage étroit ni juste avant : on repousse le virage après le passage
    // (un virage déjà bien engagé est raccourci pour se terminer avant le passage)
    let len = arc;
    const hit = avoid.find(a => s < a[1] && s + arc > a[0]);
    if (hit) {
      if (hit[0] - s >= 100) len = hit[0] - s;
      else { s = hit[1] + 15 + r() * 30; continue; }
    }
    const s0 = Math.round(s), s1 = Math.round(Math.min(length - 40, s + len));
    for (let i = s0; i < s1 && i < n; i++) {
      const t = Math.min(1, (i - s0) / RAMP_IN, (s1 - i) / RAMP_IN);
      k[i] = dir * kk * t * t * (3 - 2 * t);
      heading += k[i];
    }
    turns.push({ s0, s1, dir, k: kk });
    // En S : le virage suivant part dans l'autre sens, sans ligne droite ou presque
    if (r() < P.s) { dir = -dir; s = s1 + 10 + r() * 40; }
    else { s = s1 + P.straight[0] + r() * (P.straight[1] - P.straight[0]); if (r() < 0.5) dir = -dir; }
  }
  // Cap et décalage latéral de l'axe (petits angles : le décalage est l'intégrale du cap)
  const head = new Float32Array(n), off = new Float32Array(n);
  for (let i = 1; i < n; i++) { head[i] = head[i - 1] + k[i - 1]; off[i] = off[i - 1] + head[i - 1]; }
  const at = (arr, sv) => { const i = Math.max(0, Math.min(n - 2, Math.floor(sv))), f = Math.min(1, Math.max(0, sv - i)); return arr[i] + (arr[i + 1] - arr[i]) * f; };
  return {
    turns,
    // Courbure à la distance s (1/m, positive : virage vers +x)
    kAt: (sv) => sv < 0 || sv >= n - 1 ? 0 : at(k, sv),
    // Décalage de l'axe à la distance s vu depuis sRef (la piste est droite sous la voiture, le virage apparaît devant)
    offsetFrom(sRef, sv) {
      const hr = sRef <= 0 ? 0 : at(head, sRef), orf = sRef <= 0 ? 0 : at(off, sRef);
      const o = (v) => v <= 0 ? 0 : v < n - 1 ? at(off, v) : at(off, n - 1) + at(head, n - 1) * (v - n + 1);
      return o(sv) - orf - hr * (Math.max(0, sv) - Math.max(0, sRef));
    },
  };
}
