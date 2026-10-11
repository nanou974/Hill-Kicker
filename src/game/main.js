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
import { Music } from './music.js';
import { decodeSave } from './transfer.js';
import { VERSION } from './version.js';

const $ = (id) => document.getElementById(id);
// Vitesse affichée : le décor low-poly donne une impression de vitesse plus faible que la vitesse physique,
// on affiche donc une valeur à l'échelle du visuel (m/s × 3,6 × 0,55)
const KMH = 3.6 * 0.55;
$('v-version').textContent = `v${VERSION}`;
const eco = new Economy();
const sfx = new Sound();
const music = new Music(sfx);
// La musique démarre au premier geste du joueur (après l'activation du son)
addEventListener('pointerdown', () => music.start()); addEventListener('keydown', () => music.start());
const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ');
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const ICONS = { pneus: 'i_pneus', susp: 'i_susp', lanceur: 'i_lanceur', mult: 'i_multi' };

// ---------- rendu ----------
const host = $('gl');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // au-delà, la différence ne se voit pas mais coûte très cher sur tablette
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; // ombres filtrées simples : bien moins coûteuses que les ombres douces
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const sky = document.createElement('canvas'); sky.width = 4; sky.height = 256;
{ const g = sky.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#6DB8EC'); gr.addColorStop(0.6, '#B4E0F7'); gr.addColorStop(1, '#E4F5FF'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }
const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
// Brouillard lointain : on voit venir les pièces et gemmes de loin (jusqu'à ~280 m)
scene.fog = new THREE.Fog(0xCFEAF7, 85, 270);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
A.carEnvironment(renderer); // ciel extérieur pour les reflets de la carrosserie
scene.add(new THREE.HemisphereLight(0xDDF1FF, 0x6A8A4A, 0.75));
const sun = new THREE.DirectionalLight(0xFFF4DE, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
// zone d'ombre resserrée autour de la voiture : même finesse avec une carte 4 fois plus petite
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 120 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 700);
let carHeight = 1.5; // hauteur du véhicule choisi : la caméra monte pour les gros véhicules

function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  // Interface agrandie sur les grands écrans (calibrée pour un téléphone de 420 × 860)
  document.documentElement.style.setProperty('--ui', Math.max(1, Math.min(w / 420, h / 860, 2)).toFixed(3));
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

// ---------- Qualité graphique : Auto (le jeu s'adapte), Haute, Moyenne, Économie ----------
// Chaque niveau règle la résolution de calcul et les ombres. En Auto, le jeu mesure sa fluidité et descend d'un cran
// s'il reste sous 48 images/s ; il remonte s'il tient 59 images/s pendant 20 s.
const QUALITY = [
  { name: 'HAUTE', pr: 1.5, shadow: 1024, shadows: true },
  { name: 'MOYENNE', pr: 1.15, shadow: 1024, shadows: true },
  { name: 'ÉCONOMIE', pr: 0.9, shadow: 512, shadows: true },
  { name: 'MINIMUM', pr: 0.75, shadow: 512, shadows: false },
];
let qualityMode = 'auto', qualityLevel = 0;
try { qualityMode = localStorage.getItem('hill-kicker-quality') || 'auto'; qualityLevel = +(localStorage.getItem('hill-kicker-quality-auto') || 0); } catch (e) { /* stockage indisponible */ }
function applyQuality(level) {
  qualityLevel = Math.max(0, Math.min(QUALITY.length - 1, level));
  const q = QUALITY[qualityLevel];
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.pr)); resize();
  if (sun.shadow.mapSize.x !== q.shadow) { sun.shadow.mapSize.set(q.shadow, q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (sun.castShadow !== q.shadows) sun.castShadow = q.shadows;
  if (qualityMode === 'auto') try { localStorage.setItem('hill-kicker-quality-auto', String(qualityLevel)); } catch (e) { /* stockage indisponible */ }
  if ($('b-quality')) refreshQualityBtn();
}
const qAuto = { time: 0, frames: 0, good: 0, cool: 3 };
function autoQuality(raw) {
  if (qualityMode !== 'auto' || document.hidden) return;
  qAuto.time += raw; qAuto.frames++; qAuto.cool -= raw;
  if (qAuto.time < 2) return;
  const fps = qAuto.frames / qAuto.time; qAuto.time = 0; qAuto.frames = 0;
  if (qAuto.cool > 0) return; // on laisse le temps au réglage précédent de faire effet
  if (fps < 48 && qualityLevel < QUALITY.length - 1) { applyQuality(qualityLevel + 1); qAuto.cool = 4; qAuto.good = 0; }
  else if (fps >= 59 && qualityLevel > 0) { qAuto.good += 2; if (qAuto.good >= 20) { applyQuality(qualityLevel - 1); qAuto.cool = 4; qAuto.good = 0; } }
  else qAuto.good = 0;
}

// ---------- état ----------
let state = 'home';
let layout, world, carMesh, car, tune;
let pct = 0, holding = false, maxed = false;
let runCoins = 0, runGems = 0, boostUsed = false, trickTimer = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let camSide = 0;  // décalage latéral de la caméra : vue de trois quarts dans les virages
let crashShake = 0; // secousse de la caméra quand la voiture percute un obstacle
let fovKick = 0;  // effet de vitesse (élargissement du champ de vision) quand un boost propulse la voiture
let fovNow = 0;   // valeur réellement appliquée : elle suit fovKick en douceur (pas de saut d'image)
const joy = new Joystick($('app'), $('joy-base'), $('joy-knob'));

function buildLevel() {
  if (world) world.dispose();
  layout = makeLayout(eco.s.level, eco.s.gemsTaken);
  world = new World(scene, layout);
  world.setLauncherTier(A.tierOf(eco.s.up.lanceur));
  placeCarOnLauncher();
}
function buildCarMesh() {
  if (carMesh) scene.remove(carMesh);
  const key = eco.s.car;
  const up = eco.s.up;
  carMesh = A.car(key, { tiers: { pneus: up.pneus, susp: up.susp } }); // paliers visuels toutes les 5 améliorations
  if (world) world.setLauncherTier(A.tierOf(up.lanceur));
  carMesh.rotation.order = 'YXZ';
  carHeight = new THREE.Box3().setFromObject(carMesh).getSize(new THREE.Vector3()).y;
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
  music.setLead(s === 'run'); // la mélodie entre en jeu pendant la course
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
    b.addEventListener('click', () => {
      if (!eco.buy(u.key)) return;
      // Nouveau palier visuel (toutes les 5 améliorations) : fanfare et carte qui s'illumine
      const tierUp = u.key !== 'mult' && s.up[u.key] % A.TIER_STEP === 0 && A.tierOf(s.up[u.key]) <= 5;
      tierUp ? sfx.win() : sfx.buy();
      buildCarMesh(); placeCarOnLauncher(); refreshHome();
      if (tierUp) { const c = $('cards').children[UPGRADES.indexOf(u)]; if (c) { c.classList.add('tierup'); c.insertAdjacentHTML('beforeend', `<span class="tiertag">PALIER ${A.tierOf(s.up[u.key])} !</span>`); } }
    });
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
// Paramètres : volumes de la musique et des effets sonores
function initSliders() {
  const r = (id, v) => { $('r-' + id).value = Math.round(v * 100); $('v-' + id).textContent = Math.round(v * 100); };
  r('music', sfx.volumes.music); r('sfx', sfx.volumes.sfx);
}
$('r-music').addEventListener('input', (e) => { const v = e.target.value / 100; $('v-music').textContent = e.target.value; music.setVolume(v); });
$('r-sfx').addEventListener('input', (e) => { const v = e.target.value / 100; $('v-sfx').textContent = e.target.value; sfx.setSfxVolume(v); });
$('r-sfx').addEventListener('change', () => sfx.coin('gold')); // petit son pour entendre le niveau choisi
initSliders();
// Sauvegarde : code de transfert à copier, ou à saisir pour récupérer une partie
let importArmed = false;
function codeMsg(text, err) { $('v-codemsg').textContent = text; $('v-codemsg').classList.toggle('err', !!err); }
$('b-transfer').addEventListener('click', () => {
  $('v-code').textContent = eco.exportCode(A.ORDER); $('i-code').value = ''; codeMsg(''); importArmed = false; $('b-importcode').textContent = 'RÉCUPÉRER';
  show('p-menu', false); show('p-transfer', true);
});
$('b-transferclose').addEventListener('click', () => { show('p-transfer', false); show('p-menu', true); });
$('b-copycode').addEventListener('click', async () => {
  const code = $('v-code').textContent;
  try { await navigator.clipboard.writeText(code); codeMsg('Code copié !'); }
  catch (e) { const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents($('v-code')); sel.removeAllRanges(); sel.addRange(rg); codeMsg('Sélectionné : appuie longuement pour copier'); }
});
$('i-code').addEventListener('input', () => { importArmed = false; $('b-importcode').textContent = 'RÉCUPÉRER'; codeMsg(''); });
$('b-importcode').addEventListener('click', () => {
  const code = $('i-code').value.trim();
  if (!code) { codeMsg('Entre un code de transfert', true); return; }
  // Vérifie le code avant de demander confirmation
  try { decodeSave(code, A.ORDER); } catch (e) { codeMsg('Code refusé : ' + e.message, true); return; }
  if (!importArmed) { importArmed = true; $('b-importcode').textContent = 'CONFIRMER'; codeMsg('Ta partie actuelle sera remplacée. Appuie sur CONFIRMER.'); return; }
  const d = eco.importCode(code, A.ORDER);
  importArmed = false; $('b-importcode').textContent = 'RÉCUPÉRER';
  buildCarMesh(); buildLevel(); refreshHome();
  $('v-code').textContent = eco.exportCode(A.ORDER);
  codeMsg(`Partie récupérée : niveau ${d.level} !`); sfx.win();
});
// Effacer la partie : il faut appuyer deux fois (rien n'est effacé au premier appui)
let resetArmed = false;
function disarmReset() { resetArmed = false; $('b-reset').textContent = 'EFFACER LA PARTIE'; }
$('b-menu').addEventListener('click', () => { initSliders(); disarmReset(); show('p-menu', true); });
$('b-menuclose').addEventListener('click', () => show('p-menu', false));
$('b-reset').addEventListener('click', () => {
  if (!resetArmed) { resetArmed = true; $('b-reset').textContent = 'SÛR ? APPUIE ENCORE'; return; }
  disarmReset(); eco.reset(); show('p-menu', false); buildCarMesh(); buildLevel(); refreshHome();
});

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
  buildGemMarkers();
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
  boostUsed = true; car.boostLeft = eco.boosterTime(); $('b-boost').classList.add('on'); $('b-boost').disabled = true; sfx.boost(); fovKick = Math.max(fovKick, 8);
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
  const worldPhys = { ground: (x, z) => layout.ground(x, z, tune.mu), rampAt: layout.rampAt, rampTouch: layout.rampTouch, barrier: layout.barrier, obstacleAt: layout.obstacleAt };
  const events = [];
  const sub = 4, h = dt / sub;
  for (let i = 0; i < sub; i++) {
    const onLauncher = car.z > 3;
    if (onLauncher) { car.z -= car.v * h; car.y = world.launcherTop; car.distance = 0; }
    else step(car, worldPhys, tune, { steer: joy.steer }, h, events);
    if (!car.air && !onLauncher) {
      const p = layout.plateTouch(car.x, car.z); // le moindre contact avec la plaque déclenche le boost
      if (p && car._plate !== p) { car.v += 5; car._plate = p; showTrick('BOOST !'); sfx.boost(); fovKick = Math.max(fovKick, 6); }
    }
  }
  // Pièces et gemmes
  for (const c of layout.coins) if (!c.taken && Math.abs(c.z - car.z) < 1.6 && Math.abs(c.x - car.x) < 1.5) {
    const gy = layout.ground(c.x, c.z, 1).h + 0.95;
    if (Math.abs(car.y + 0.6 - gy) < 2.2) { world.take(c); runCoins += COIN_VALUE[c.kind]; sfx.coin(c.kind); popValue(`+${COIN_VALUE[c.kind]}`, c.kind); }
  }
  // Objets cassables : ils volent en éclats sans ralentir la voiture
  for (const b of layout.props) if (!b.hit && b.mesh && Math.abs(b.z - car.z) < 1.6 && Math.abs(b.x - car.x) < 1.5 && car.y < layout.ground(b.x, b.z, 1).h + 1.4) {
    b.hit = true; sfx.smash();
    world.fling(b, car.vx * 0.6 + (b.x - car.x) * 3 + (Math.random() - 0.5) * 4, 5 + Math.random() * 4, -Math.max(6, car.v * 0.9));
  }
  for (const g of layout.gems) if (!g.taken && Math.abs(g.z - car.z) < 1.8 && Math.abs(g.x - car.x) < 1.8) { world.take(g); if (eco.takeGem(g.id)) { runGems++; sfx.gem(); popValue('+1', 'gem'); removeGemMarker(g.id); } }
  for (const e of events) {
    if (e.type === 'rampboost') { sfx.boost(); showTrick('RAMPE BOOST !'); fovKick = Math.max(fovKick, 8); }
    if (e.type === 'takeoff') sfx.takeoff();
    if (e.type === 'land') sfx.land();
    if (e.type === 'crash') { sfx.smash(); sfx.fail(); showTrick('CRASH !'); crashShake = 0.5; }
    if (e.type === 'trick') {
      const parts = []; if (e.flips) parts.push(e.flips > 1 ? `${e.flips} FRONT FLIPS` : 'FRONT FLIP'); if (e.rolls) parts.push(e.rolls > 1 ? `${e.rolls} TONNEAUX` : 'TONNEAU');
      showTrick(`${parts.join(' + ')} !<small>+${Math.round((e.flips + e.rolls) * 2.2 * KMH)} km/h</small>`); sfx.trick();
    }
  }
  if (car.distance >= LEVEL_LENGTH) { finishRace(true); return; }
  // Après un crash, on laisse une seconde pour voir l'impact avant le bilan
  if (car.ended) { if (!car.crashed) finishRace(false); else if (crashShake <= -0.6) finishRace(false); }
}

// Gemmes restantes du niveau, placées sur la barre de progression à leur distance
function buildGemMarkers() {
  const track = document.querySelector('.progress .track');
  track.querySelectorAll('.gm').forEach(e => e.remove());
  for (const g of layout.gems) if (!g.taken) {
    const el = document.createElement('div'); el.className = 'gm'; el.dataset.id = g.id;
    el.style.bottom = `${Math.min(100, -g.z / LEVEL_LENGTH * 100)}%`;
    el.innerHTML = '<svg width="24" height="26" aria-hidden="true"><use href="#i-gem"/></svg>';
    track.appendChild(el);
  }
}
function removeGemMarker(id) {
  const el = document.querySelector(`.progress .gm[data-id="${id}"]`);
  if (el) { el.classList.add('got'); setTimeout(() => el.remove(), 500); }
}

function updateRunHud() {
  const d = Math.min(car.distance, LEVEL_LENGTH);
  $('v-dist').textContent = `${fmt(d)}m`;
  $('v-runcoins').textContent = `+${runCoins}`; $('v-rungems').textContent = `+${runGems}`;
  const p = d / LEVEL_LENGTH * 100;
  $('prog-fill').style.height = `${p}%`; $('prog-dot').style.bottom = `${p}%`; $('v-prog').textContent = `${Math.floor(p)}%`;
  $('prog-best').style.bottom = `${Math.min(100, eco.s.best / LEVEL_LENGTH * 100)}%`; $('prog-best').hidden = eco.s.best <= 0;
  const kmh = Math.max(0, car.v * KMH);
  $('v-kmh').textContent = Math.round(kmh);
  $('speed-arc').setAttribute('stroke-dasharray', `${Math.min(100, kmh / 90 * 100)} 100`);
  if (car.boostLeft <= 0) $('b-boost').classList.remove('on');
}

// ---------- boucle ----------
let last = performance.now(), clock = 0, uiTimer = 0;
// Compteur d'images par seconde (Paramètres) : moyenne sur une demi-seconde
let fpsOn = false, fpsFrames = 0, fpsTime = 0;
try { fpsOn = localStorage.getItem('hill-kicker-fps') === '1'; } catch (e) { /* stockage indisponible */ }
function refreshFpsBtn() { $('b-fps').textContent = fpsOn ? 'FPS : AFFICHÉS' : 'FPS : MASQUÉS'; show('fps', fpsOn); }
$('b-fps').addEventListener('click', () => { fpsOn = !fpsOn; try { localStorage.setItem('hill-kicker-fps', fpsOn ? '1' : '0'); } catch (e) { /* stockage indisponible */ } refreshFpsBtn(); });
refreshFpsBtn();
// Bouton Qualité des Paramètres : Auto → Haute → Moyenne → Économie → Auto
const Q_MODES = ['auto', 'haute', 'moyenne', 'economie'];
function refreshQualityBtn() { $('b-quality').textContent = 'QUALITÉ : ' + (qualityMode === 'auto' ? `AUTO (${QUALITY[qualityLevel].name})` : QUALITY[{ haute: 0, moyenne: 1, economie: 2 }[qualityMode]].name); }
$('b-quality').addEventListener('click', () => {
  qualityMode = Q_MODES[(Q_MODES.indexOf(qualityMode) + 1) % Q_MODES.length];
  try { localStorage.setItem('hill-kicker-quality', qualityMode); } catch (e) { /* stockage indisponible */ }
  applyQuality(qualityMode === 'auto' ? 0 : { haute: 0, moyenne: 1, economie: 2 }[qualityMode]); qAuto.cool = 3; refreshQualityBtn();
});
refreshQualityBtn();
function frame(now) {
  const raw = Math.min(0.25, (now - last) / 1000); const dt = Math.min(0.05, raw); last = now; clock += dt;
  if (fpsOn) { fpsFrames++; fpsTime += (now - (frame.prev ?? now)) / 1000; if (fpsTime >= 0.5) { const f = Math.round(fpsFrames / fpsTime); $('fps').textContent = f + ' FPS'; $('fps').classList.toggle('low', f < 45); fpsFrames = 0; fpsTime = 0; } }
  autoQuality(Math.min(1, (now - (frame.prev ?? now)) / 1000)); // durée réelle de l'image (non plafonnée)
  frame.prev = now;
  if (state === 'launch' && holding && !maxed) { pct = Math.min(100, pct + raw * 62); if (pct >= 100) maxed = true; updateGauge(); }
  if (state === 'launch' && holding && maxed) $('app').classList.add('shake');
  if (state === 'run' && !window.__hk.freeze) { runStep(dt); updateRunHud(); sfx.engineSet(Math.min(1, Math.max(0, car.v) / 40), !car.ended); }
  if (state === 'launch') sfx.engineSet(holding ? 0.15 + pct / 100 * 0.85 : 0.05);
  if (trickTimer > 0) { trickTimer -= dt; if (trickTimer <= 0) $('trick').hidden = true; }
  world.update(car.z, clock, dt);
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
    // La caméra suit la voiture sur toute la largeur : elle reste toujours au centre de l'écran
    // Vue surélevée qui regarde loin devant : la voiture occupe le bas de l'écran, la piste se lit jusqu'à l'horizon.
    // Plus le véhicule est haut, plus la caméra monte, pour voir ce qui arrive juste devant lui.
    const lift = Math.max(0, carHeight - 1.5) * 1.6;
    const tp = new THREE.Vector3(car.x - camSide, car.y + 8.2 + lift, car.z + 12 + lift * 0.4);
    const tl = new THREE.Vector3(car.x + camSide * 0.35, car.y - 4 + lift * 0.3, car.z - 40);
    // Sous une voûte, la caméra descend pour rester dans le passage
    const ceil = layout.ceilingAt(tp.z);
    if (ceil < Infinity) { const gy = layout.ground(tp.x, tp.z, 1).h; tp.y = Math.min(tp.y, gy + ceil); tl.y = Math.min(tl.y, gy + ceil - 3); }
    if (state === 'launch') { camPos.copy(tp); camLook.copy(tl); }
    const snap = window.__hk && window.__hk.freeze, kx = snap ? 1 : Math.min(1, dt * 9), k = snap ? 1 : Math.min(1, dt * 5);
    const ky = !snap && tp.y < camPos.y - 0.5 && ceil < Infinity ? Math.min(1, dt * 12) : k;
    // en profondeur, la caméra reste collée à la voiture : un coup d'accélérateur ne la fait pas décrocher (pas d'effet de recul)
    camPos.set(camPos.x + (tp.x - camPos.x) * kx, camPos.y + (tp.y - camPos.y) * ky, state === 'run' ? tp.z : camPos.z + (tp.z - camPos.z) * k);
    camLook.set(camLook.x + (tl.x - camLook.x) * kx, camLook.y + (tl.y - camLook.y) * k, state === 'run' ? tl.z : camLook.z + (tl.z - camLook.z) * k);
    camera.position.copy(camPos); camera.lookAt(camLook);
  }
  if (car.boostLeft > 0) fovKick = Math.max(fovKick, 7);
  if (state === 'run' && car.ended && crashShake > -0.6) crashShake -= dt;
  if (crashShake > 0) { crashShake -= dt; camera.position.x += (Math.random() - 0.5) * crashShake; camera.position.y += (Math.random() - 0.5) * crashShake; }
  fovKick *= Math.pow(0.35, dt); fovNow += (fovKick - fovNow) * Math.min(1, dt * 4); camera.fov = 60 + fovNow; camera.updateProjectionMatrix();
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
applyQuality(qualityMode === 'auto' ? qualityLevel : { haute: 0, moyenne: 1, economie: 2 }[qualityMode] ?? 0);
buildCarMesh();
buildLevel();
setScreen('home');
refreshHome();
requestAnimationFrame(frame);
// Outils de test : avance rapide de la course
window.__hk = { eco, get car() { return car; }, get layout() { return layout; }, get state() { return state; }, get camera() { return camera; }, get world() { return world; }, get carMesh() { return carMesh; }, simulate(sec) { for (let t = 0; t < sec && state === 'run'; t += 1 / 30) runStep(1 / 30); },
  // Outil de test : fige la course (la caméra continue de suivre la voiture)
  freeze: false };
