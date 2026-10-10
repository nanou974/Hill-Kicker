// Hill Kicker — boucle de jeu jouable (niveau générique « Prairie fleurie »).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as A from '../assets3d.js';
import { makeLayout, LEVEL_LENGTH, COIN_VALUE } from './layout.js';
import { World } from './world.js';
import { createCar, step, tuning, launchSpeed } from './physics.js';
import { Economy, UPGRADES, VEHICLE_PRICES } from './economy.js';
import { Joystick } from './input.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);
const eco = new Economy();
const sfx = new Sound();
const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ');
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const ICONS = { pneus: 'i_pneus', susp: 'i_susp', lanceur: 'i_lanceur', mult: 'i_multi' };

// ---------- rendu ----------
const host = $('gl');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const sky = document.createElement('canvas'); sky.width = 4; sky.height = 256;
{ const g = sky.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#6DB8EC'); gr.addColorStop(0.6, '#B4E0F7'); gr.addColorStop(1, '#E4F5FF'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }
const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
scene.fog = new THREE.Fog(0xCFEAF7, 60, 230);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
scene.add(new THREE.HemisphereLight(0xDDF1FF, 0x6A8A4A, 0.75));
const sun = new THREE.DirectionalLight(0xFFF4DE, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 600);

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------- état ----------
let state = 'home';
let layout, world, carMesh, car, tune;
let pct = 0, holding = false, maxed = false;
let runCoins = 0, runGems = 0, boostUsed = false, trickTimer = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let camSide = 0; // décalage latéral de la caméra : vue de trois quarts dans les virages
const joy = new Joystick($('app'), $('joy-base'), $('joy-knob'));

function buildLevel() {
  if (world) world.dispose();
  layout = makeLayout(eco.s.level);
  world = new World(scene, layout);
  placeCarOnLauncher();
}
function buildCarMesh() {
  if (carMesh) scene.remove(carMesh);
  const key = eco.s.car;
  const up = eco.s.up;
  carMesh = A.car(key, { upgraded: key === 'citadine' && (up.pneus + up.susp) >= 3 });
  carMesh.rotation.order = 'YXZ';
  scene.add(carMesh);
}
function placeCarOnLauncher() {
  car = createCar(); car.z = 5.8; car.y = world.launcherTop; car.x = 0;
  if (carMesh) { carMesh.position.set(0, car.y, car.z); carMesh.rotation.set(0, 0, 0); }
  world.update(car.z, 0);
}

// ---------- interface ----------
function show(id, on) { $(id).hidden = !on; }
function setScreen(s) {
  state = s;
  show('s-home', s === 'home'); show('s-launch', s === 'launch'); show('s-run', s === 'run');
  show('hud-top', s === 'home' || s === 'launch' || s === 'end');
  joy.enabled = s === 'run'; if (s !== 'run') joy.reset();
  sfx.engineStart(); sfx.engineSet(s === 'launch' ? 0.05 : 0, s === 'launch' || s === 'run');
  $('app').classList.remove('shake');
}
function refreshTop() {
  const s = eco.s;
  $('v-lives').textContent = s.lives; $('v-yellow').textContent = fmt(s.yellow); $('v-blue').textContent = fmt(s.blue); $('v-gems').textContent = s.gems;
  const nl = eco.nextLifeIn(); $('v-lifetimer').hidden = nl <= 0; $('v-lifetimer').textContent = mmss(nl);
}
function refreshHome() {
  const s = eco.s;
  refreshTop();
  $('v-level').textContent = `NIVEAU ${s.level}`;
  $('v-carthumb').src = `assets/renders/vehicules/t_${s.car}.png`;
  const ci = eco.chestIn(); $('v-chest').textContent = ci > 0 ? mmss(ci) : 'OUVRIR !';
  document.querySelector('#b-chest .tile-img').classList.toggle('ready', ci <= 0);
  const bt = eco.boosterTime();
  $('v-boostlvl').textContent = s.booster;
  $('v-boosttxt').textContent = s.booster === 0 ? 'BOOSTER' : `BOOSTER ${String(bt).replace('.', ',')} s`;
  $('b-booster').disabled = s.gems < 1;
  const cards = $('cards'); cards.innerHTML = '';
  for (const u of UPGRADES) {
    const lvl = s.up[u.key], cost = eco.cost(u.key);
    const on = lvl === 0 ? 0 : ((lvl - 1) % 5) + 1;
    const el = document.createElement('div'); el.className = 'card' + (u.key === 'mult' ? ' gold' : '');
    el.innerHTML = `<span class="name">${u.label}</span><span class="badge">${lvl}</span>
      <span class="img"><img src="assets/renders/icones/${ICONS[u.key]}.png" alt="">${u.key === 'mult' ? `<span class="val">×${String(eco.mult()).replace('.', ',')}</span>` : ''}</span>
      <span class="pips">${[0, 1, 2, 3, 4].map(i => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span>
      <button type="button" class="btn ${u.key === 'mult' ? 'brown' : 'blue'}">AMÉLIORER<br><span class="cost"><svg class="ico s"><use href="#i-coin"/></svg>${fmt(cost)}</span></button>`;
    const b = el.querySelector('button'); b.disabled = s.yellow < cost;
    b.addEventListener('click', () => { if (eco.buy(u.key)) { sfx.buy(); buildCarMesh(); placeCarOnLauncher(); refreshHome(); } });
    cards.appendChild(el);
  }
}

// ---------- accueil ----------
$('b-play').addEventListener('click', () => {
  if (!eco.canLaunch()) { $('v-nolives').textContent = mmss(eco.nextLifeIn()); show('p-nolives', true); return; }
  tune = tuning(eco.s.up); pct = 0; maxed = false; updateGauge(); setScreen('launch');
});
$('b-nolives').addEventListener('click', () => show('p-nolives', false));
$('b-chest').addEventListener('click', () => { const r = eco.openChest(); if (!r) return; sfx.win(); $('v-c-yellow').textContent = fmt(r.yellow); $('v-c-blue').textContent = fmt(r.blue); show('p-chest', true); refreshHome(); });
$('b-chestok').addEventListener('click', () => show('p-chest', false));
$('b-booster').addEventListener('click', () => { if (eco.buyBooster()) { sfx.buy(); refreshHome(); } });
function refreshSoundBtn() { $('b-sound').textContent = sfx.muted ? 'SON : COUPÉ' : 'SON : ACTIVÉ'; }
$('b-sound').addEventListener('click', () => { sfx.setMuted(!sfx.muted); refreshSoundBtn(); });
refreshSoundBtn();
$('b-menu').addEventListener('click', () => show('p-menu', true));
$('b-menuclose').addEventListener('click', () => show('p-menu', false));
$('b-reset').addEventListener('click', () => { eco.reset(); show('p-menu', false); buildCarMesh(); buildLevel(); refreshHome(); });

// ---------- lanceur ----------
const hold = $('b-hold');
function updateGauge() {
  $('gauge-fill').style.height = `calc(${pct}% - 4px)`;
  $('v-pct').textContent = `${Math.floor(pct)}%`;
  $('gauge').classList.toggle('max', maxed); hold.classList.toggle('max', maxed);
  $('v-gaugechip').textContent = maxed ? 'BLOQUÉE' : 'min 50%';
  $('app').classList.toggle('shake', maxed && holding);
}
hold.addEventListener('pointerdown', (e) => { e.preventDefault(); hold.setPointerCapture(e.pointerId); holding = true; pct = 0; maxed = false; hold.classList.add('pressed'); });
const release = () => {
  if (!holding) return;
  holding = false; hold.classList.remove('pressed'); $('app').classList.remove('shake');
  if (pct < 50) { sfx.fail(); sfx.engineSet(0.05); $('v-faux').textContent = `Lâché à ${Math.floor(pct)} %`; show('p-faux', true); return; }
  sfx.launch();
  eco.useLife(); refreshTop();
  car.v = launchSpeed(tune, pct);
  runCoins = 0; runGems = 0; boostUsed = false;
  $('b-boost').disabled = eco.boosterTime() <= 0; $('b-boost').classList.remove('on');
  setScreen('run');
};
hold.addEventListener('pointerup', release);
hold.addEventListener('pointercancel', release);
$('b-retry').addEventListener('click', () => { show('p-faux', false); pct = 0; maxed = false; updateGauge(); });
$('b-launchback').addEventListener('click', () => { setScreen('home'); refreshHome(); });

// ---------- course ----------
function useBoost() {
  if (state !== 'run' || boostUsed || eco.boosterTime() <= 0) return;
  boostUsed = true; car.boostLeft = eco.boosterTime(); $('b-boost').classList.add('on'); $('b-boost').disabled = true; sfx.boost();
}
$('b-boost').addEventListener('click', useBoost);
addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); if (state === 'launch' && !holding) hold.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1 })); else useBoost(); } });
addEventListener('keyup', (e) => { if (e.code === 'Space' && state === 'launch') release(); });

// Valeur ramassée qui s'envole près de la voiture : +1 bronze, +3 argent, +5 or, +1 gemme
function popValue(text, kind) {
  const el = document.createElement('div'); el.className = `pop ${kind}`; el.textContent = text;
  el.style.left = `${46 + (Math.random() - 0.5) * 16}%`; el.style.top = `${56 + (Math.random() - 0.5) * 6}%`;
  $('s-run').appendChild(el); setTimeout(() => el.remove(), 900);
}
function showTrick(html) { const t = $('trick'); t.innerHTML = html; t.hidden = false; trickTimer = 1.4; }

function finishRace(finished) {
  setScreen('end');
  if (finished) sfx.win();
  const r = eco.endRace({ distance: Math.min(car.distance, LEVEL_LENGTH), coins: runCoins, gems: runGems, finished });
  $('v-r-calc').textContent = `${fmt(r.distance)} m × multiplicateur ×${String(r.mult).replace('.', ',')}`;
  $('v-r-dist').textContent = fmt(r.fromDistance); $('v-r-coins').textContent = `+${fmt(r.coins)}`;
  $('v-r-blue').textContent = fmt(r.blue); $('v-r-gems').textContent = r.gems;
  $('v-r-record').hidden = !r.record || finished;
  refreshTop();
  show(finished ? 'p-level' : 'p-results', true);
}
$('b-continue').addEventListener('click', () => { show('p-results', false); backHome(); });
$('b-nextlevel').addEventListener('click', () => { show('p-level', false); buildCarMesh(); backHome(); });
function backHome() { buildLevel(); setScreen('home'); refreshHome(); }

function runStep(dt) {
  const worldPhys = { ground: (x, z) => layout.ground(x, z, tune.mu), rampAt: layout.rampAt };
  const events = [];
  const sub = 4, h = dt / sub;
  for (let i = 0; i < sub; i++) {
    const onLauncher = car.z > 3;
    if (onLauncher) { car.z -= car.v * h; car.y = world.launcherTop; car.distance = 0; }
    else step(car, worldPhys, tune, { steer: joy.steer, up: joy.up }, h, events);
    if (!car.air && !onLauncher) {
      const p = layout.plateAt(car.x, car.z);
      if (p && car._plate !== p) { car.v += 5; car._plate = p; showTrick('BOOST !'); sfx.boost(); }
    }
  }
  // Pièces et gemmes
  for (const c of layout.coins) if (!c.taken && Math.abs(c.z - car.z) < 1.6 && Math.abs(c.x - car.x) < 1.5) {
    const gy = layout.ground(c.x, c.z, 1).h + 0.95;
    if (Math.abs(car.y + 0.6 - gy) < 2.2) { world.take(c); runCoins += COIN_VALUE[c.kind]; sfx.coin(c.kind); popValue(`+${COIN_VALUE[c.kind]}`, c.kind); }
  }
  for (const g of layout.gems) if (!g.taken && Math.abs(g.z - car.z) < 1.8 && Math.abs(g.x - car.x) < 1.8) { world.take(g); runGems++; sfx.gem(); popValue('+1', 'gem'); }
  for (const e of events) {
    if (e.type === 'takeoff') { sfx.takeoff(); if (e.boost) { sfx.boost(); showTrick('RAMPE BOOST !'); } }
    if (e.type === 'land') sfx.land();
    if (e.type === 'trick') {
      const parts = []; if (e.flips) parts.push(e.flips > 1 ? `${e.flips} FRONT FLIPS` : 'FRONT FLIP'); if (e.rolls) parts.push(e.rolls > 1 ? `${e.rolls} TONNEAUX` : 'TONNEAU');
      showTrick(`${parts.join(' + ')} !<small>+${Math.round((e.flips + e.rolls) * 2.2 * 3.6)} km/h</small>`); sfx.trick();
    }
  }
  if (car.distance >= LEVEL_LENGTH) { finishRace(true); return; }
  if (car.ended) finishRace(false);
}

function updateRunHud() {
  const d = Math.min(car.distance, LEVEL_LENGTH);
  $('v-dist').textContent = `${fmt(d)}m`;
  $('v-runcoins').textContent = `+${runCoins}`; $('v-rungems').textContent = `+${runGems}`;
  const p = d / LEVEL_LENGTH * 100;
  $('prog-fill').style.height = `${p}%`; $('prog-dot').style.bottom = `${p}%`; $('v-prog').textContent = `${Math.floor(p)}%`;
  $('prog-best').style.bottom = `${Math.min(100, eco.s.best / LEVEL_LENGTH * 100)}%`; $('prog-best').hidden = eco.s.best <= 0;
  const kmh = Math.max(0, car.v * 3.6);
  $('v-kmh').textContent = Math.round(kmh);
  $('speed-arc').setAttribute('stroke-dasharray', `${Math.min(100, kmh / 160 * 100)} 100`);
  if (car.boostLeft <= 0) $('b-boost').classList.remove('on');
}

// ---------- boucle ----------
let last = performance.now(), clock = 0, uiTimer = 0;
function frame(now) {
  const raw = Math.min(0.25, (now - last) / 1000); const dt = Math.min(0.05, raw); last = now; clock += dt;
  if (state === 'launch' && holding && !maxed) { pct = Math.min(100, pct + raw * 62); if (pct >= 100) maxed = true; updateGauge(); }
  if (state === 'launch' && holding && maxed) $('app').classList.add('shake');
  if (state === 'run') { runStep(dt); updateRunHud(); sfx.engineSet(Math.min(1, Math.max(0, car.v) / 40), !car.ended); }
  if (state === 'launch') sfx.engineSet(holding ? 0.15 + pct / 100 * 0.85 : 0.05);
  if (trickTimer > 0) { trickTimer -= dt; if (trickTimer <= 0) $('trick').hidden = true; }
  world.update(car.z, clock);
  world.start.visible = state !== 'run' || car.z > -1;

  // Voiture
  carMesh.position.set(car.x, car.y, car.z);
  const yaw = car.air ? 0 : Math.max(-0.3, Math.min(0.3, -car.vx * 0.035)); // la voiture s'oriente dans le virage
  carMesh.rotation.set(car.pitch, yaw, car.roll);
  if (state === 'launch' && holding) carMesh.position.x += Math.sin(clock * 60) * 0.02 * (pct / 100);

  // Caméra
  const y0 = world.launcherTop;
  if (state === 'home') { camPos.set(-7.8, y0 + 3.4, car.z - 11.2); camLook.set(0.3, y0 + 0.7, car.z + 0.4); camera.position.copy(camPos); camera.lookAt(camLook); }
  else {
    // Vue de trois quarts : quand la voiture tourne, la caméra glisse du côté opposé et voit son flanc
    const sideTarget = state === 'run' && !car.air ? Math.max(-4.5, Math.min(4.5, car.vx * 0.5)) : 0;
    camSide += (sideTarget - camSide) * Math.min(1, dt * 2.5);
    const tp = new THREE.Vector3(car.x * 0.6 - camSide, car.y + 5.4, car.z + 12.5);
    const tl = new THREE.Vector3(car.x * 0.85 + camSide * 0.5, car.y - 5.5, car.z - 24);
    if (state === 'launch') { camPos.copy(tp); camLook.copy(tl); }
    camPos.lerp(tp, Math.min(1, dt * 5)); camLook.lerp(tl, Math.min(1, dt * 5));
    camera.position.copy(camPos); camera.lookAt(camLook);
  }
  sun.position.set(car.x + 16, car.y + 30, car.z + 12); sun.target.position.set(car.x, car.y, car.z - 8);

  uiTimer -= dt; if (uiTimer <= 0) { uiTimer = 0.5; eco.tick(); if (state === 'home') refreshHome(); else refreshTop(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- garage ----------
let gSel = null;
function openGarage() { gSel = eco.s.car; renderGarage(); show('s-garage', true); }
function renderGarage() {
  const s = eco.s; $('v-gblue').textContent = fmt(s.blue);
  $('v-gname').textContent = A.CARS[gSel].name; $('v-ghero').src = `assets/renders/vehicules/t_${gSel}.png`;
  const owned = s.cars.includes(gSel), act = $('b-gact');
  if (s.car === gSel) { act.textContent = 'SÉLECTIONNÉ'; act.disabled = true; }
  else if (owned) { act.textContent = 'CHOISIR'; act.disabled = false; }
  else { act.innerHTML = `ACHETER <svg class="ico s"><use href="#i-blue"/></svg>${fmt(VEHICLE_PRICES[gSel])}`; act.disabled = s.blue < VEHICLE_PRICES[gSel]; }
  const grid = $('g-grid'); grid.innerHTML = '';
  for (const k of A.ORDER) {
    const own = s.cars.includes(k);
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'g-card' + (own ? '' : ' locked') + (k === gSel ? ' sel' : '');
    b.innerHTML = `<img src="assets/renders/vehicules/t_${k}.png" alt=""><span class="n">${A.CARS[k].name}</span>` +
      (own ? `<span class="p">${s.car === k ? 'ÉQUIPÉ' : 'À TOI'}</span>` : `<span class="p"><svg class="ico"><use href="#i-blue"/></svg>${fmt(VEHICLE_PRICES[k])}</span>`);
    b.addEventListener('click', () => { gSel = k; renderGarage(); });
    grid.appendChild(b);
  }
}
$('b-garage').addEventListener('click', openGarage);
$('b-garageclose').addEventListener('click', () => { show('s-garage', false); refreshHome(); });
$('b-gact').addEventListener('click', () => { if (eco.buyCar(gSel)) { buildCarMesh(); placeCarOnLauncher(); renderGarage(); } });

// ---------- démarrage ----------
resize();
buildCarMesh();
buildLevel();
setScreen('home');
refreshHome();
requestAnimationFrame(frame);
// Outils de test : avance rapide de la course
window.__hk = { eco, get car() { return car; }, get state() { return state; }, simulate(sec) { for (let t = 0; t < sec && state === 'run'; t += 1 / 30) runStep(1 / 30); } };
