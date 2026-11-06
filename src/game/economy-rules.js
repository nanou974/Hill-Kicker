// Règles chiffrées de l'économie (GDD Hill Kicker). Sans dépendance, utilisables dans Node.

export const UPGRADES = [
  { key: 'pneus', label: 'PNEUS', base: 100 },
  { key: 'susp', label: 'SUSPENS.', base: 100 },
  { key: 'lanceur', label: 'LANCEUR', base: 150 },
  { key: 'mult', label: 'GAINS', base: 100 },
];

const round5 = (x) => Math.round(x / 5) * 5;

// lvl = nombre d'améliorations déjà achetées pour cette catégorie.
// Toutes les catégories augmentent de façon exponentielle (× 1,3 par palier, × 1,25 pour le multiplicateur) : aucune ne devient bon marché en fin de niveau.
export function upgradeCost(key, lvl) {
  if (key === 'mult') return round5(100 * Math.pow(1.25, lvl));
  const base = UPGRADES.find(u => u.key === key).base;
  return round5(base * Math.pow(1.3, lvl));
}
export function multValue(lvl) { return 1 + 0.25 * lvl; }

export const LIVES_MAX = 25;
export const LIFE_REGEN_MS = 12 * 60 * 1000;
export const CHEST_MS = 60 * 60 * 1000;      // un coffre par heure (avant : toutes les 10 min)
export const GEM_MS = 3 * 60 * 60 * 1000;    // une gemme toutes les 3 heures (avant : 1 par heure)
export const BLUE_PER_RACE = 500;
export const CHEST_BLUE = 100;               // avant : 250
export const GEMS_LEVEL_END = 2;

// Coffre : une amélioration la moins chère, plafonnée au prix du multiplicateur. Le premier coffre donne 150.
export function chestYellow(up, chestCount) {
  if (chestCount === 0) return 150;
  const cheapest = Math.min(...UPGRADES.map(u => upgradeCost(u.key, up[u.key])));
  return Math.min(cheapest, upgradeCost('mult', up.mult));
}

export function boosterDuration(lvl) { return lvl <= 0 ? 0 : 1.5 + 0.5 * lvl; }
// Chaque booster coûte une gemme de plus que le précédent : 1, 2, 3…
export function boosterCost(lvl) { return lvl + 1; }

export const VEHICLE_PRICES = {
  citadine: 0, pickup: 2000, break: 2500, camionnette: 3000, taxi: 3500, buggy: 4000, retro: 5000,
  campingcar: 6000, q4x4: 7000, police: 8500, ambulance: 10000, muscle: 12000, rallye: 14500,
  monster: 17000, hotrod: 20500, limo: 24500, supercar: 29000, f1: 35000, retrofutur: 42000, fusee: 50000,
};
