// Simulation de calibrage : distance par lancer selon les améliorations, et progression jusqu'à l'arrivée.
// Usage : node tools/sim.mjs
import { createCar, step, tuning, launchSpeed } from '../src/game/physics.js';
import { makeLayout, LEVEL_LENGTH } from '../src/game/layout.js';
import { upgradeCost, multValue } from '../src/game/economy-rules.js';

function run(level, up, pct = 100, steer = 0) {
  const L = makeLayout(level), t = tuning(up), car = createCar();
  car.v = launchSpeed(t, pct);
  const world = { gravity: L.gravity, ground: (x, z) => L.ground(x, z, t.mu), rampAt: L.rampAt, rampTouch: L.rampTouch, barrier: L.barrier, obstacleAt: L.obstacleAt };
  const ev = [];
  for (let i = 0; i < 60 * 600 && !car.ended; i++) {
    if (!car.air && L.plateTouch(car.x, car.z) && !car._plate) { car.v += 5; car._plate = true; }
    if (!L.plateTouch(car.x, car.z)) car._plate = false;
    // Pilote automatique : contourne les collines des bifurcations par le chemin rapide
    let s = steer; const f = L.forks.find(f => car.z > f.z1 && car.z < f.z0 + 60);
    if (f) { const tx = f.cx - f.coinSide * (f.w + 7.5); s = Math.max(-1, Math.min(1, (tx - car.x) * 0.4)); } else s = Math.max(-1, Math.min(1, -car.x * 0.1));
    // ... vise l'ouverture des passages étroits (portails, arches, tunnels, grottes, gorges, ruines)
    const px = L.passageTarget(car.x, car.z);
    if (px !== null) s = Math.max(-1, Math.min(1, (px - car.x) * 0.5));
    // ... et évite les rochers, statues et stalagmites en se décalant
    const o = L.obstacles.find(o => o.z < car.z && o.z > car.z - 30 && Math.abs(o.x - car.x) < o.r + 2.5);
    if (o) s = car.x >= o.x ? 1 : -1;
    // ... et contourne les zones lentes (boue, sable mou…) comme le ferait un joueur
    const zs = L.tarmac.find(t => t.slow && car.z > t.z1 && car.z < t.z0 + 25 && Math.abs(car.x - t.x) < t.w + 1.5);
    if (zs && !o && px === null) s = car.x >= zs.x ? 1 : -1;
    step(car, world, t, { steer: s, up: 0 }, 1 / 60, ev);
    if (car.distance >= LEVEL_LENGTH) break;
  }
  if (car.endReason && process.env.DEBUG) console.log('   fin :', car.endReason, Math.round(car.distance), 'm');
  return car.distance;
}

for (const level of (process.env.LEVELS ? process.env.LEVELS.split(',').map(Number) : [1, 5, 10, 20])) {
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
