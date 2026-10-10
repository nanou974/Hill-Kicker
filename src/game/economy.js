// État du joueur, sauvegarde locale et règles de l'économie (voir docs/GDD.md).
import {
  UPGRADES, upgradeCost, multValue, LIVES_MAX, LIFE_REGEN_MS, CHEST_MS, GEM_MS,
  BLUE_PER_RACE, CHEST_BLUE, GEMS_LEVEL_END, chestYellow, boosterDuration, VEHICLE_PRICES,
} from './economy-rules.js';

const KEY = 'hill-kicker-save-v1';

function fresh(now) {
  return {
    level: 1, yellow: 0, blue: 0, gems: 0,
    lives: LIVES_MAX, lifeClock: now,
    chestAt: now + CHEST_MS, chestCount: 0,
    gemClock: now,
    up: { pneus: 0, susp: 0, lanceur: 0, mult: 0 },
    booster: 0,
    cars: ['citadine'], car: 'citadine',
    best: 0,
  };
}

export class Economy {
  constructor() {
    const now = Date.now();
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    this.s = s && s.up ? { ...fresh(now), ...s } : fresh(now);
    this.tick();
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { /* stockage indisponible */ } }
  reset() { this.s = fresh(Date.now()); this.save(); }

  // Recharges dans le temps : vies (1 / 12 min, max 25) et gemmes (1 / heure)
  tick() {
    const s = this.s, now = Date.now();
    if (s.lives >= LIVES_MAX) s.lifeClock = now;
    else {
      const n = Math.floor((now - s.lifeClock) / LIFE_REGEN_MS);
      if (n > 0) { s.lives = Math.min(LIVES_MAX, s.lives + n); s.lifeClock += n * LIFE_REGEN_MS; if (s.lives >= LIVES_MAX) s.lifeClock = now; }
    }
    const g = Math.floor((now - s.gemClock) / GEM_MS);
    if (g > 0) { s.gems += g; s.gemClock += g * GEM_MS; }
    this.save();
  }
  nextLifeIn() { return this.s.lives >= LIVES_MAX ? 0 : Math.max(0, LIFE_REGEN_MS - (Date.now() - this.s.lifeClock)); }
  chestIn() { return Math.max(0, this.s.chestAt - Date.now()); }

  cost(key) { return upgradeCost(key, this.s.up[key]); }
  mult() { return multValue(this.s.up.mult); }
  boosterTime() { return boosterDuration(this.s.booster); }

  buy(key) {
    const c = this.cost(key);
    if (this.s.yellow < c) return false;
    this.s.yellow -= c; this.s.up[key]++; this.save(); return true;
  }
  buyBooster() {
    if (this.s.gems < 1) return false;
    this.s.gems -= 1; this.s.booster++; this.save(); return true;
  }
  openChest() {
    if (this.chestIn() > 0) return null;
    const y = chestYellow(this.s.up, this.s.chestCount);
    this.s.yellow += y; this.s.blue += CHEST_BLUE; this.s.chestCount++;
    this.s.chestAt = Date.now() + CHEST_MS; this.save();
    return { yellow: y, blue: CHEST_BLUE };
  }

  canLaunch() { this.tick(); return this.s.lives > 0; }
  useLife() {
    if (this.s.lives >= LIVES_MAX) this.s.lifeClock = Date.now();
    this.s.lives--; this.save();
  }

  // Fin de course : distance × multiplicateur + pièces, +500 bleues, gemmes ramassées
  endRace({ distance, coins, gems, finished }) {
    const fromDistance = Math.round(distance * this.mult());
    const r = { distance: Math.round(distance), mult: this.mult(), fromDistance, coins, yellow: fromDistance + coins, blue: BLUE_PER_RACE, gems, levelGems: 0, finished, record: distance > this.s.best };
    this.s.yellow += r.yellow; this.s.blue += r.blue; this.s.gems += gems;
    if (r.record) this.s.best = distance;
    if (finished) {
      // Fin de niveau : la monnaie jaune et toutes les améliorations repartent de zéro
      r.levelGems = GEMS_LEVEL_END; this.s.gems += GEMS_LEVEL_END;
      this.s.level++; this.s.yellow = 0; this.s.up = { pneus: 0, susp: 0, lanceur: 0, mult: 0 }; this.s.booster = 0; this.s.best = 0;
    }
    this.save(); return r;
  }

  buyCar(key) {
    const p = VEHICLE_PRICES[key];
    if (this.s.cars.includes(key)) { this.s.car = key; this.save(); return true; }
    if (this.s.blue < p) return false;
    this.s.blue -= p; this.s.cars.push(key); this.s.car = key; this.save(); return true;
  }
}

export { UPGRADES, VEHICLE_PRICES };
