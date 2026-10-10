// Physique simplifiée de Hill Kicker.
// La voiture avance vers -z. Seul le relief la ralentit : pente, frottement de la surface et bosses.
// Unités : mètres, secondes. 1 unité Three.js = 1 m.

export const G = 9.81;
export const TRACK_HALF = 21; // demi-largeur roulable de la piste
export const RAMP_BOOST = 12; // poussée (m/s) dès que la voiture touche une rampe à booster (≈ +43 km/h)

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
// input : { steer: -1..1, up: 0..1 (joystick vers l'avant) }
export function step(car, world, t, input, dt, events) {
  if (car.ended) return;
  const g = world.ground(car.x, car.z);

  // Latéral : direction au joystick, plus réactif quand on va vite
  const steerSpeed = 3 + Math.min(car.v, 30) * 0.32;
  const targetVx = car.air ? car.vx : input.steer * steerSpeed;
  car.vx += (targetVx - car.vx) * Math.min(1, dt * 6);
  car.x += car.vx * dt;
  if (Math.abs(car.x) > TRACK_HALF) { car.x = Math.sign(car.x) * TRACK_HALF; car.vx = 0; }
  // Colline d'une bifurcation : la voiture glisse sur le côté le plus proche, sans perdre de vitesse
  const bar = world.barrier && world.barrier(car.x, car.z);
  if (bar) { const side = Math.sign(car.x - bar.cx) || (car.vx >= 0 ? 1 : -1); car.x = bar.cx + side * bar.hw; car.vx = 0; }

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
    // Rampe à booster : la poussée est donnée dès le contact, pas au sommet
    if (ramp && ramp.boost && car._rampHit !== ramp) { car._rampHit = ramp; car.v += RAMP_BOOST; events.push({ type: 'rampboost' }); }
    if (ramp) {
      const k = Math.min(1, Math.max(0, (ramp.z + ramp.l / 2 - car.z) / ramp.l));
      y += k * ramp.h;
      if (k >= 1 && car.v > 4) {
        car.air = true; car.airTime = 0;
        car.vy = car.v * (ramp.h / ramp.l) * (ramp.boost ? 1.3 : 1.05) + (ramp.boost ? 3.5 : 1.2);
        car.trickPitch = 0; car.trickRoll = 0;
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
    // En l'air : pas de frottement, gravité seule. Cascades au joystick.
    car.airTime += dt;
    if (car.boostLeft > 0) { car.v += 7 * dt; car.boostLeft -= dt; }
    car.z -= car.v * dt;
    car.distance = Math.max(car.distance, -car.z);
    car.vy -= G * dt;
    car.y += car.vy * dt;
    const spin = 5.2; // rad/s
    // Une cascade n'est lancée que si le temps de vol restant permet de la finir
    const ground = world.ground(car.x, car.z).h;
    const tLeft = estimateAirLeft(car.y - ground, car.vy);
    if (input.up > 0.5 && tLeft > 0.45) car.trickPitch -= spin * dt;
    if (Math.abs(input.steer) > 0.5 && tLeft > 0.45) car.trickRoll += Math.sign(input.steer) * spin * dt;
    car.pitch = car.trickPitch; car.roll = car.trickRoll;
    if (car.y <= ground) {
      // Atterrissage automatique roues en bas, sans perte de vitesse
      const flips = Math.round(Math.abs(car.trickPitch) / (Math.PI * 2));
      const rolls = Math.round(Math.abs(car.trickRoll) / (Math.PI * 2));
      const n = flips + rolls;
      if (n > 0) { car.v += 2.2 * n; events.push({ type: 'trick', flips, rolls }); }
      events.push({ type: 'land', airTime: car.airTime });
      car.air = false; car.y = ground; car.vy = 0; car.pitch = 0; car.roll = 0;
    }
  }
}

function estimateAirLeft(height, vy) {
  // temps restant avant de toucher le sol : y(t) = height + vy t - g t²/2 = 0
  const d = vy * vy + 2 * G * Math.max(0, height);
  return (vy + Math.sqrt(d)) / G;
}

export function launchSpeed(t, pct) {
  return t.vmax * Math.min(1, pct / 100);
}
