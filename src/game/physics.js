// Physique simplifiée de Hill Kicker.
// La voiture avance vers -z. Seul le relief la ralentit : pente, frottement de la surface et bosses.
// Unités : mètres, secondes. 1 unité Three.js = 1 m.

export const G = 9.81;
export const TRACK_HALF = 21; // demi-largeur roulable de la piste
export const RAMP_BOOST = 6;  // poussée (m/s) dès que la voiture touche une rampe à booster (≈ +12 km/h affichés)
const TRICK_TIME = 0.8;       // durée minimale d'une rotation complète (s)

// Paramètres dérivés des améliorations
export function tuning(up) {
  return {
    mu: 0.10 + 0.12 * Math.pow(0.87, up.pneus),      // frottement de roulement sur terrain de base
    bump: 0.55 * Math.pow(0.86, up.susp),               // perte d'énergie dans les bosses
    vmax: 20.5 + 2.2 * up.lanceur,                      // vitesse de départ à 100 %
  };
}

export function createCar() {
  return {
    x: 0, z: 0, y: 0,
    v: 0,            // vitesse vers l'avant (m/s)
    vx: 0,           // vitesse latérale
    vy: 0,           // vitesse verticale en l'air
    air: false,
    airTime: 0,
    pitch: 0, roll: 0,           // rotation visuelle (cascades)
    trickPitch: 0, trickRoll: 0, // rotation accumulée pendant le saut
    rampZ: null,                 // rampe en cours de montée
    stillTime: 0,
    boostLeft: 0,
    distance: 0,
    ended: false, endReason: '',
  };
}

// world : { ground(x, z) -> { h, mu } , rampAt(x, z) -> ramp | null }
// input : { steer: -1..1 } — les cascades sont automatiques
export function step(car, world, t, input, dt, events) {
  if (car.ended) return;
  const g = world.ground(car.x, car.z);

  // Latéral : direction au joystick, plus réactif quand on va vite
  // On dirige la voiture au sol comme en l'air, même pendant les cascades
  const targetVx = input.steer * steerSpeedFor(car.v);
  car.vx += (targetVx - car.vx) * Math.min(1, dt * 9);
  // Virage : la voiture glisse vers l'extérieur, d'autant plus vite qu'elle roule vite (il faut contre-braquer)
  car.drift = driftSpeed(world, car);
  car.x += (car.vx + car.drift) * dt;
  if (Math.abs(car.x) > TRACK_HALF) { car.x = Math.sign(car.x) * TRACK_HALF; car.vx = 0; }
  // Colline d'une bifurcation : la percuter arrête net la voiture et termine la course
  // (sauf si la voiture la survole en sautant plus haut que la colline)
  const bar = world.barrier && world.barrier(car.x, car.z);
  if (bar && !(car.air && car.y > bar.top)) {
    car.v = 0; car.vx = 0; car.vy = 0; car.air = false; car.pitch = 0; car.roll = 0;
    car.ended = true; car.crashed = true; car.endReason = 'colline';
    events.push({ type: 'crash', what: 'colline' });
    return;
  }
  // Rocher, statue ou autre obstacle sur la piste : même règle, la collision arrête la voiture
  const ob = world.obstacleAt && world.obstacleAt(car.x, car.z);
  if (ob && !(car.air && car.y > ob.top)) {
    car.v = 0; car.vx = 0; car.vy = 0; car.air = false; car.pitch = 0; car.roll = 0;
    car.ended = true; car.crashed = true; car.endReason = ob.kind;
    events.push({ type: 'crash', what: ob.kind });
    return;
  }

  if (!car.air) {
    // Rampe : la voiture grimpe le plan incliné puis décolle au sommet
    const ramp = world.rampAt(car.x, car.z);
    const e = 0.6;
    const hA = world.ground(car.x, car.z - e).h, hB = world.ground(car.x, car.z + e).h;
    const grade = (hA - hB) / (2 * e);                      // dénivelé par mètre parcouru (négatif = descente)
    const curv = Math.abs(hA - 2 * g.h + hB) / (e * e);     // variation de pente : bosses
    let a = -G * grade - g.mu * G - t.bump * curv * car.v * car.v * 0.08 - 0.0035 * car.v * car.v;
    if (car.boostLeft > 0) { a += 7; car.boostLeft -= dt; }
    car.v += a * dt;
    car.z -= car.v * dt;
    car.distance = Math.max(car.distance, -car.z);
    let y = world.ground(car.x, car.z).h;
    // Rampe à booster : la poussée est donnée au moindre contact de la carrosserie avec la rampe
    const touched = world.rampTouch ? world.rampTouch(car.x, car.z) : ramp;
    if (touched && touched.boost && car._rampHit !== touched) { car._rampHit = touched; car.v += RAMP_BOOST; events.push({ type: 'rampboost' }); }
    if (ramp) {
      const k = Math.min(1, Math.max(0, (ramp.z + ramp.l / 2 - car.z) / ramp.l));
      y += k * ramp.h;
      if (k >= 1 && car.v > 4) {
        car.air = true; car.airTime = 0;
        car.vy = car.v * (ramp.h / ramp.l) * 0.95 + 1.0;
        car.y = y;
        planTrick(car, world);
        events.push({ type: 'takeoff', boost: !!ramp.boost });
      }
    }
    car.y = y;
    // Fin de course : arrêt prolongé ou recul
    if (car.v < 0) { car.ended = true; car.endReason = 'recul'; car.v = 0; }
    if (car.v < 0.6 && a <= 0.05) car.stillTime += dt; else car.stillTime = 0;
    if (car.stillTime > 1.2) { car.ended = true; car.endReason = 'arret'; }
    car.pitch += (Math.atan(grade) - car.pitch) * Math.min(1, dt * 8);
    car.roll += (-car.vx * 0.012 - car.roll) * Math.min(1, dt * 8);
  } else {
    // En l'air : pas de frottement, gravité seule. La cascade se déroule toute seule.
    car.airTime += dt;
    if (car.boostLeft > 0) { car.v += 7 * dt; car.boostLeft -= dt; }
    car.z -= car.v * dt;
    car.distance = Math.max(car.distance, -car.z);
    car.vy -= G * dt;
    car.y += car.vy * dt;
    const ground = world.ground(car.x, car.z).h;
    // Rotation automatique jusqu'au nombre de tours prévu, puis la voiture se stabilise roues en bas
    const tr = car.trick;
    if (tr && tr.n > 0) {
      tr.a = Math.min(tr.target, tr.a + tr.rate * dt);
      if (tr.kind === 'flip') car.pitch = -tr.a; else car.roll = tr.dir * tr.a;
    }
    // Dernier tiers de seconde : retour en douceur à l'horizontale si besoin
    const tLeft = estimateAirLeft(car.y - ground, car.vy);
    if (!tr || tr.a >= tr.target) { const k = Math.min(1, dt * 10); car.pitch -= car.pitch * k * (tLeft < 0.4 ? 1 : 0.3); car.roll -= car.roll * k * (tLeft < 0.4 ? 1 : 0.3); }
    if (car.y <= ground) {
      // Atterrissage automatique roues en bas, sans perte de vitesse
      const flips = tr && tr.kind === 'flip' ? tr.done() : 0;
      const rolls = tr && tr.kind === 'roll' ? tr.done() : 0;
      const n = flips + rolls;
      if (n > 0) { car.v += 2.2 * n; events.push({ type: 'trick', flips, rolls }); }
      car.trick = null;
      events.push({ type: 'land', airTime: car.airTime });
      car.air = false; car.y = ground; car.vy = 0; car.pitch = 0; car.roll = 0;
    }
  }
}

// Prévoit la durée du saut (balistique au-dessus du relief) et choisit la cascade automatique :
// front flip ou tonneau en alternance, autant de tours que le temps de vol le permet (2 au maximum).
let trickCount = 0;
function planTrick(car, world) {
  let x = car.x, z = car.z, y = car.y, vy = car.vy, T = 0;
  for (; T < 8; T += 1 / 60) { vy -= G / 60; y += vy / 60; z -= car.v / 60; if (y <= world.ground(x, z).h) break; }
  const n = Math.max(0, Math.min(2, Math.floor((T - 0.35) / TRICK_TIME)));
  const kind = trickCount++ % 2 === 0 ? 'flip' : 'roll';
  const target = n * Math.PI * 2;
  const tr = { kind, n, a: 0, target, dir: Math.random() < 0.5 ? -1 : 1, rate: n > 0 ? target / Math.max(0.3, T - 0.35) : 0 };
  tr.done = () => Math.round(tr.a / (Math.PI * 2));
  car.trick = tr; car.pitch = 0; car.roll = 0;
}

function estimateAirLeft(height, vy) {
  // temps restant avant de toucher le sol : y(t) = height + vy t - g t²/2 = 0
  const d = vy * vy + 2 * G * Math.max(0, height);
  return (vy + Math.sqrt(d)) / G;
}

// Glissement latéral dans un virage (m/s, vers l'extérieur) : courbure × vitesse², plafonné
export const DRIFT = 0.6, DRIFT_MAX = 6;
export function driftSpeed(world, car) {
  const k = world.curveAt ? world.curveAt(car.z) : 0;
  return Math.max(-DRIFT_MAX, Math.min(DRIFT_MAX, -k * car.v * car.v * DRIFT));
}
// Braquage qui compense exactement le glissement (pour le pilote automatique des simulations)
export function driftSteer(car) { return -(car.drift || 0) / steerSpeedFor(car.v); }
// Vitesse latérale à fond de braquage (m/s) : de bord à bord de la piste (42 m) en un peu plus de 2 s à pleine vitesse
export function steerSpeedFor(v) { return 6 + Math.min(v, 30) * 0.45; }

export function launchSpeed(t, pct) {
  return t.vmax * Math.min(1, pct / 100);
}
