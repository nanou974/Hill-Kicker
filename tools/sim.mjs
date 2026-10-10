// Simulation de calibrage : distance par lancer selon les améliorations, et progression jusqu'à l'arrivée.
// Usage : node tools/sim.mjs
import { createCar, step, tuning, launchSpeed } from '../src/game/physics.js';
import { makeLayout, LEVEL_LENGTH } from '../src/game/layout.js';
import { upgradeCost, multValue } from '../src/game/economy-rules.js';

function run(level, up, pct = 100, steer = 0) {
  const L = makeLayout(level), t = tuning(up), car = createCar();
  car.v = launchSpeed(t, pct);
  const world = { ground: (x, z) => L.ground(x, z, t.mu), rampAt: L.rampAt, barrier: L.barrier };
  const ev = [];
  for (let i = 0; i < 60 * 600 && !car.ended; i++) {
    if (!car.air && L.plateAt(car.x, car.z) && !car._plate) { car.v += 5; car._plate = true; }
    if (!L.plateAt(car.x, car.z)) car._plate = false;
    step(car, world, t, { steer, up: 0 }, 1 / 60, ev);
    if (car.distance >= LEVEL_LENGTH) break;
  }
  return car.distance;
}

for (const level of [1, 5, 10, 20]) {
  console.log(`Niveau ${level} — 1er lancer à 100 % : ${run(level, { pneus: 0, susp: 0, lanceur: 0, mult: 0 }).toFixed(0)} m`);
  const up = { pneus: 0, susp: 0, lanceur: 0, mult: 0 };
  let yellow = 0, runs = 0, buys = 0, d = 0;
  while (runs < 200) {
    d = run(level, up); runs++;
    if (d >= LEVEL_LENGTH) break;
    yellow += Math.round(d * multValue(up.mult)) + 15;
    for (;;) {
      const keys = ['pneus', 'susp', 'lanceur', 'mult'];
      const k = keys.reduce((a, b) => upgradeCost(b, up[b]) < upgradeCost(a, up[a]) ? b : a);
      const c = upgradeCost(k, up[k]);
      if (c > yellow) break;
      yellow -= c; up[k]++; buys++;
    }
  }
  console.log(`  arrivée en ${runs} lancers, ${buys} améliorations`, JSON.stringify(up));
}
