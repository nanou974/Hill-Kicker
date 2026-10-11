// Simulation de calibrage : distance par lancer selon les améliorations, et progression jusqu'à l'arrivée.
// Usage : node tools/sim.mjs            (niveaux 1 à 20 + 25 et 30)
//         DEBUG=1 node tools/sim.mjs 7  (cause de fin de chaque lancer)
//         node tools/sim.mjs 3 8 13     (niveaux choisis)
import { createCar, step, tuning, launchSpeed, driftSteer } from '../src/game/physics.js';
import { makeLayout } from '../src/game/layout.js';
import { upgradeCost, multValue } from '../src/game/economy-rules.js';

const ends = {};
function run(level, up, pct = 100, steer = 0) {
  const L = makeLayout(level), t = tuning(up), car = createCar();
  car.v = launchSpeed(t, pct);
  const world = { ground: (x, z) => L.ground(x, z, t.mu), rampAt: L.rampAt, rampTouch: L.rampTouch, barrier: L.barrier, obstacleAt: L.obstacleAt, curveAt: L.curveAt };
  const ev = [];
  for (let i = 0; i < 60 * 600 && !car.ended; i++) {
    if (!car.air && L.plateTouch(car.x, car.z) && !car._plate) { car.v += 5; car._plate = true; }
    if (!L.plateTouch(car.x, car.z)) car._plate = false;
    // Pilote automatique : contourne les collines des bifurcations par le chemin rapide
    let s = steer; const f = L.forks.find(f => car.z > f.z1 && car.z < f.z0 + 60);
    if (f) { const tx = f.cx - f.coinSide * (f.w + 7.5); s = (tx - car.x) * 0.4; } else s = -car.x * 0.1;
    // ... vise l'ouverture des passages étroits (portails, arches, tunnels, grottes, gorges, ruines)
    // (on vise un peu en avant : l'ouverture d'une grotte ou d'une gorge se décale le long du passage)
    let px = L.passageTarget(car.x, car.z - Math.min(12, car.v * 0.35));
    // ... et évite les rochers, statues, troncs et stalagmites en se décalant
    const o = L.obstacles.find(o => o.z < car.z && o.z > car.z - 30 && Math.abs(o.x - car.x) < (o.w || o.r) + 2.5);
    // stalagmite ou colonne dans un passage : on la contourne du côté de l'ouverture
    if (o && o.own && px !== null) px = o.x + Math.sign(px - o.x || 1) * (o.r + 2.4);
    if (px !== null) s = (px - car.x) * 0.5;
    if (o && !o.own) s = o.w ? (Math.abs(o.x - o.w - car.x) < Math.abs(o.x + o.w - car.x) ? -1 : 1) : car.x >= o.x ? 1 : -1;
    // ... et compense le glissement dans les virages
    s += driftSteer(car);
    // TRACE=distance : affiche le pilote automatique autour de cette distance (débogage)
    if (process.env.TRACE && Math.abs(-car.z - +process.env.TRACE) < 40 && i % 6 === 0) console.log('   z', (-car.z).toFixed(1), 'x', car.x.toFixed(2), 'v', car.v.toFixed(1), 'braquage', s.toFixed(2), 'cible', px, 'obstacle', o && o.kind, 'glisse', (car.drift || 0).toFixed(2), car.air ? 'en l\'air' : '');
    step(car, world, t, { steer: Math.max(-1, Math.min(1, s)), up: 0 }, 1 / 60, ev);
    if (car.distance >= L.length) break;
  }
  if (car.endReason) ends[car.endReason] = (ends[car.endReason] || 0) + 1;
  if (car.endReason && process.env.DEBUG) console.log('   fin :', car.endReason, Math.round(car.distance), 'm');
  return { d: car.distance, len: L.length };
}

const levels = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [...Array(20).keys()].map(i => i + 1).concat([25, 30]);
for (const level of levels) {
  const first = run(level, { pneus: 0, susp: 0, lanceur: 0, mult: 0 });
  const up = { pneus: 0, susp: 0, lanceur: 0, mult: 0 };
  let yellow = 0, runs = 0, buys = 0, r;
  while (runs < 200) {
    r = run(level, up); runs++;
    if (r.d >= r.len) break;
    yellow += Math.round(r.d * multValue(up.mult)) + 15;
    for (;;) {
      const keys = ['pneus', 'susp', 'lanceur', 'mult'];
      const k = keys.reduce((a, b) => upgradeCost(b, up[b]) < upgradeCost(a, up[a]) ? b : a);
      const c = upgradeCost(k, up[k]);
      if (c > yellow) break;
      yellow -= c; up[k]++; buys++;
    }
  }
  const L = makeLayout(level);
  console.log(`Niv. ${String(level).padStart(2)} ${String(L.length).padStart(4)} m · 1er lancer ${String(Math.round(first.d)).padStart(4)} m · arrivée en ${String(runs).padStart(3)} lancers, ${String(buys).padStart(3)} améliorations · virages ${L.curve.turns.length} · obstacles ${L.obstacles.length} · zones lentes ${L.slow.length}`);
}
console.log('fins de course :', JSON.stringify(ends));
