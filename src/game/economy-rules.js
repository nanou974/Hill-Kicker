// Règles chiffrées de l'économie (GDD Hill Kicker). Sans dépendance, utilisables dans Node.

export const UPGRADES = [
  { key: 'pneus', label: 'PNEUS', base: 100 },
  { key: 'susp', label: 'SUSPENS.', base: 100 },
  { key: 'lanceur', label: 'LANCEUR', base: 150 },
  { key: 'mult', label: 'GAINS', base: 100 },
];

const round5 = (x) => Math.round(x / 5) * 5;

// lvl = nombre d'améliorations déjà achetées pour cette catégorie
export function upgradeCost(key, lvl) {
  if (key === 'mult') return lvl === 0 ? 100 : round5(100 * 1.25 * lvl);
  const base = UPGRADES.find(u => u.key === key).base;
  return round5(base * Math.pow(1.35, lvl));
}
export function multValue(lvl) { return 1 + 0.25 * lvl; }

export const LIVES_MAX = 25;
export const LIFE_REGEN_MS = 12 * 60 * 1000;
export const CHEST_MS = 10 * 60 * 1000;
export const GEM_MS = 60 * 60 * 1000;
export const BLUE_PER_RACE = 500;
export const CHEST_BLUE = 250;
export const GEMS_LEVEL_END = 2;

export function chestYellow(up, chestCount) {
  if (chestCount === 0) return 200;
  const cheapest = Math.min(...UPGRADES.map(u => upgradeCost(u.key, up[u.key])));
  return Math.min(2 * cheapest, upgradeCost('mult', up.mult));
}

export function boosterDuration(lvl) { return lvl <= 0 ? 0 : 1.5 + 0.5 * lvl; }

export const VEHICLE_PRICES = {
  citadine: 0, pickup: 2000, break: 2500, camionnette: 3000, taxi: 3500, buggy: 4000, retro: 5000,
  campingcar: 6000, q4x4: 7000, police: 8500, ambulance: 10000, muscle: 12000, rallye: 14500,
  monster: 17000, hotrod: 20500, limo: 24500, supercar: 29000, f1: 35000, retrofutur: 42000, fusee: 50000,
};
