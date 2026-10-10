// Disposition déterministe d'un niveau : relief, zones goudronnées, rampes, plaques boost, pièces, gemmes.
// Fichier sans dépendance à Three.js pour pouvoir simuler la physique dans Node.
import { heightAt, rng } from '../assets3d.js';

export const LEVEL_LENGTH = 3000;
export const TRACK = { half: 22 };
const TARMAC_MU = 0.55; // la voiture glisse mieux sur le goudron

export function makeLayout(level) {
  const r = rng(1000 + level * 77);
  const opt = { half: TRACK.half, slope: 0.148 - (Math.min(level, 20) - 1) * 0.0009 };
  const tarmac = [], ramps = [], plates = [], coins = [], gems = [];

  // Zones goudronnées : bandes larges régulières
  for (let s = 90; s < LEVEL_LENGTH - 60; s += 130 + r() * 120) {
    tarmac.push({ z0: -s, z1: -(s + 30 + r() * 30), x: (r() - 0.5) * 18, w: 7 + r() * 4 });
  }
  // Rampes
  for (let s = 40; s < LEVEL_LENGTH - 50; s += 160 + r() * 140) {
    ramps.push({ x: (r() - 0.5) * 24, z: -s, w: 6, l: 5, h: 1.7 });
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
  // Quelques gemmes, plutôt loin
  for (let i = 0; i < 4; i++) gems.push({ x: (r() - 0.5) * 30, z: -(400 + i * 650 + r() * 300), taken: false });

  function surfaceMu(x, z) {
    for (const t of tarmac) if (z < t.z0 && z > t.z1 && Math.abs(x - t.x) < t.w) return TARMAC_MU;
    return 1;
  }
  return {
    level, opt, tarmac, ramps, plates, coins, gems,
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
  };
}

export const COIN_VALUE = { bronze: 1, silver: 3, gold: 5 };
