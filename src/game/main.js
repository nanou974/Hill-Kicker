// Hill Kicker — boucle de jeu jouable. Chaque niveau a son monde (themes.js), et le jeu reboucle après le dernier.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as A from '../assets3d.js';
import { makeLayout, COIN_VALUE } from './layout.js';
import { updateBend } from './bend.js';
import { World } from './world.js';
import { themeFor, themeIndex } from './themes.js';
import { createCar, step, tuning, launchSpeed } from './physics.js';
import { multValue } from './economy-rules.js';
import { Economy, UPGRADES, VEHICLE_PRICES } from './economy.js';
import { Joystick } from './input.js';
import { Sound } from './audio.js';
import { Music } from './music.js';
import { decodeSave } from './transfer.js';
import { VERSION } from './version.js';

const $ = (id) => document.getElementById(id);
// Vitesse affichée : la vitesse réelle de la simulation (m/s × 3,6), comme dans Sled Surfers
const KMH = 3.6;
$('v-version').textContent = `v${VERSION}`;
const eco = new Economy();
const sfx = new Sound();
const music = new Music(sfx);
// La musique démarre au premier geste du joueur (après l'activation du son)
addEventListener('pointerdown', () => music.start()); addEventListener('keydown', () => music.start());
const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ /g, ' ');
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const ICONS = { pneus: 'i_pneus', susp: 'i_susp', lanceur: 'i_lanceur', mult: 'i_multi' };
// Accessoire qui apparaît ou grandit à chaque palier (toutes les 5 améliorations)
const TIER_NAMES = { pneus: 'ROUES', susp: 'SUSPENSION', lanceur: 'MOTEUR', mult: 'AILERON' };
// Gain de performance du palier qu'on vient d'atteindre (n = nombre d'améliorations après l'achat)
const pc = (x) => `${Math.round(Math.abs(x) * 100)} %`;
function tierGain(key, n) {
  const up = { ...eco.s.up }, before = { ...up, [key]: n - 1 };
  const a = tuning(before), b = tuning(up);
  if (key === 'lanceur') return `DÉPART +${pc(b.vmax / a.vmax - 1)}`;
  if (key === 'pneus') return `FROTTEMENT −${pc(1 - b.mu / a.mu)}`;
  if (key === 'susp') return `BOSSES −${pc(1 - b.bump / a.bump)}`;
  return `×${String(multValue(n)).replace('.', ',')} · GLISSE −8 %`;
}

// Révélation d'un palier : la voiture disparaît dans un nuage de fumée et en ressort avec son nouvel accessoire
let reveal = null;
function smokeReveal() {
  if (reveal) scene.remove(reveal.cloud);
  const cloud = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xF4F6F8, transparent: true, opacity: 0.95, roughness: 1, flatShading: true, depthWrite: false });
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + Math.random() * 0.55, 1), m);
    const a = Math.random() * Math.PI * 2, r = Math.random() * 1.6;
    p.position.set(Math.cos(a) * r * 0.8, 0.2 + Math.random() * 1.6, Math.sin(a) * r * 1.4);
    p.userData.v = new THREE.Vector3(Math.cos(a) * (1 + Math.random()), 0.6 + Math.random() * 1.2, Math.sin(a) * (1 + Math.random()));
    p.scale.setScalar(0.2); cloud.add(p);
  }
  cloud.position.copy(carMesh.position); scene.add(cloud);
  reveal = { t: 0, cloud, mat: m };
}
function updateReveal(dt) {
  if (!reveal) return;
  const r = reveal; r.t += dt;
  // 0 → 0,35 s : le nuage gonfle et cache la voiture ; puis il se dissipe pendant 1,4 s
  const grow = Math.min(1, r.t / 0.35);
  for (const p of r.cloud.children) { p.scale.setScalar(0.2 + 1.1 * Math.sqrt(grow) + Math.max(0, r.t - 0.35) * 0.5); if (r.t > 0.35) p.position.addScaledVector(p.userData.v, dt); }
  r.mat.opacity = r.t < 0.35 ? 0.95 : Math.max(0, 0.95 * (1 - (r.t - 0.35) / 1.4));
  // La voiture reste cachée sous le nuage, puis surgit avec un petit rebond
  const k = r.t < 0.3 ? 0.001 : 1 + 0.18 * Math.exp(-(r.t - 0.3) * 5) * Math.cos((r.t - 0.3) * 18);
  carMesh.scale.setScalar(k);
  if (r.t > 1.8) { scene.remove(r.cloud); r.cloud.children.forEach(c => c.geometry.dispose()); r.mat.dispose(); carMesh.scale.setScalar(1); reveal = null; }
}

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
const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
// Brouillard lointain : on voit venir les pièces et gemmes de loin (jusqu'à ~280 m)
scene.fog = new THREE.Fog(0xCFEAF7, 85, 270);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
A.carEnvironment(renderer); // ciel extérieur pour les reflets de la carrosserie
const hemi = new THREE.HemisphereLight(0xDDF1FF, 0x6A8A4A, 0.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xFFF4DE, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
// zone d'ombre resserrée autour de la voiture : même finesse avec une carte 4 fois plus petite
Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 120 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
// Ciel, brume et lumières du monde du niveau
function applyTheme(T) {
  const g = sky.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, T.sky[0]); gr.addColorStop(0.6, T.sky[1]); gr.addColorStop(1, T.sky[2]); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  skyTex.needsUpdate = true;
  scene.fog.color.set(T.fog); scene.fog.near = T.fogNear ?? 85; scene.fog.far = T.fogFar ?? 270;
  hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]);
  sun.color.set(T.sun[0]); sun.intensity = T.sun[1];
}
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
let camAim = 0;   // rotation de la caméra vers l'intérieur d'un virage de la piste (rad)
let crashShake = 0; // secousse de la caméra quand la voiture percute un obstacle
let fovKick = 0;  // effet de vitesse (élargissement du champ de vision) quand un boost propulse la voiture
let fovNow = 0;   // valeur réellement appliquée : elle suit fovKick en douceur (pas de saut d'image)
const joy = new Joystick($('app'), $('joy-base'), $('joy-knob'));

function buildLevel() {
  if (world) world.dispose();
  layout = makeLayout(eco.s.level, eco.s.gemsTaken);
  applyTheme(themeFor(eco.s.level));
  world = new World(scene, layout);
  world.setLauncherTier(A.tierOf(eco.s.up.lanceur));
  placeCarOnLauncher();
}
function buildCarMesh() {
  if (carMesh) scene.remove(carMesh);
  const key = eco.s.car;
  const up = eco.s.up;
  carMesh = A.car(key, { tiers: { pneus: up.pneus, susp: up.susp, moteur: up.lanceur, aileron: up.mult } }); // paliers visuels toutes les 5 améliorations : la voiture démarre nue
  if (world) world.setLauncherTier(A.tierOf(up.lanceur));
  carMesh.rotation.order = 'YXZ';
  carHeight = new THREE.Box3().setFromObject(carMesh).getSize(new THREE.Vector3()).y;
  scene.add(carMesh);
}
function placeCarOnLauncher() {
  car = createCar(); car.z = 5.8; car.y = world.launcherTop; car.x = 0; camAim = 0;
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
function refreshHome(light = false) {
  const s = eco.s;
  refreshTop();
  $('v-level').textContent = `NIVEAU ${s.level}`;
  $('v-world').textContent = themeFor(s.level).name;
  $('v-carthumb').src = `assets/renders/vehicules/t_${s.car}.png`;
  const ci = eco.chestIn(); $('v-chest').textContent = ci > 0 ? mmss(ci) : 'OUVRIR !';
  document.querySelector('#b-chest .tile-img').classList.toggle('ready', ci <= 0);
  const bt = eco.boosterTime();
  $('v-boostlvl').textContent = s.booster;
  $('v-boosttxt').textContent = s.booster === 0 ? 'BOOSTER' : `BOOSTER ${String(bt).replace('.', ',')} s`;
  $('b-booster').disabled = s.gems < eco.boosterCost();
  // Rafraîchissement périodique : seulement les compteurs, sans reconstruire les cartes (le message de palier resterait effacé)
  if (light) return;
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
      const tierUp = s.up[u.key] % A.TIER_STEP === 0 && A.tierOf(s.up[u.key]) <= 5 && s.up[u.key] <= 5 * A.TIER_STEP;
      tierUp ? (sfx.poof(), setTimeout(() => sfx.win(), 320)) : sfx.buy();
      buildCarMesh(); placeCarOnLauncher(); refreshHome();
      if (tierUp) smokeReveal();
      if (tierUp) { const c = $('cards').children[UPGRADES.indexOf(u)]; if (c) { c.classList.add('tierup'); c.insertAdjacentHTML('beforeend', `<span class="tiertag">${TIER_NAMES[u.key]} ${A.tierOf(s.up[u.key])} !<small>${tierGain(u.key, s.up[u.key])}</small></span>`); } }
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
  const r = eco.endRace({ distance: Math.min(car.distance, layout.length), coins: runCoins, gems: runGems, finished });
  $('v-r-calc').textContent = `${fmt(r.distance)} m × multiplicateur ×${String(r.mult).replace('.', ',')}`;
  $('v-r-dist').textContent = fmt(r.fromDistance); $('v-r-coins').textContent = `+${fmt(r.coins)}`;
  $('v-r-blue').textContent = fmt(r.blue); $('v-r-gems').textContent = r.gems;
  $('v-r-record').hidden = !r.record || finished;
  refreshTop();
  // Monde suivant (le jeu reboucle sur le premier après le dernier)
  if (finished) { const nx = themeFor(eco.s.level).name; $('v-nextworld').textContent = themeIndex(eco.s.level) === 0 ? `Tous les mondes sont terminés ! Nouveau tour : ${nx}` : `Prochain monde : ${nx}`; }
  show(finished ? 'p-level' : 'p-results', true);
}
$('b-continue').addEventListener('click', () => { show('p-results', false); backHome(); });
$('b-nextlevel').addEventListener('click', () => { show('p-level', false); buildCarMesh(); backHome(); });
function backHome() { buildLevel(); setScreen('home'); refreshHome(); }

// Pas de simulation fixe : la trajectoire est identique quel que soit le téléphone
const FIXED = 1 / 60;
let physAcc = 0;
function runStep(h) {
  const worldPhys = { ground: (x, z) => layout.ground(x, z, tune.mu), rampAt: layout.rampAt, rampTouch: layout.rampTouch, barrier: layout.barrier, obstacleAt: layout.obstacleAt, curveAt: layout.curveAt };
  const events = [];
  const onLauncher = car.z > 3;
  if (onLauncher) { car.z -= car.v * h; car.y = world.launcherTop; car.distance = 0; }
  else step(car, worldPhys, tune, { steer: Math.sign(joy.steer) * Math.abs(joy.steer) ** 1.8 }, h, events); // réponse douce au petit braquage, pleine à fond
  if (!car.air && !onLauncher) {
    const p = layout.plateTouch(car.x, car.z); // le moindre contact avec la plaque déclenche le boost
    if (p && car._plate !== p) { car.v += 5; car._plate = p; showTrick('BOOST !'); sfx.boost(); fovKick = Math.max(fovKick, 6); }
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
  // Zone lente (sable mou, boue) : un message à l'entrée
  const inSlow = !car.air && layout.isSlow(car.x, car.z);
  if (inSlow && !car._slow) showTrick(`${layout.profile.slow.name.toUpperCase()} !`);
  car._slow = inSlow;
  for (const e of events) {
    if (e.type === 'rampboost') { sfx.boost(); showTrick('RAMPE BOOST !'); fovKick = Math.max(fovKick, 8); }
    if (e.type === 'takeoff') sfx.takeoff();
    if (e.type === 'land') {
      sfx.land();
      // Temps en l'air récompensé : pièces bonus au-delà de 0,5 s de vol
      if (e.airTime > 0.5) { const bonus = Math.round((e.airTime - 0.5) * 12) * 5; if (bonus > 0) { runCoins += bonus; popValue(`+${bonus}`, 'coin'); showTrick(`AIR ${e.airTime.toFixed(1)} s`); } }
    }
    if (e.type === 'crash') { sfx.smash(); sfx.fail(); showTrick('CRASH !'); crashShake = 0.5; }
    if (e.type === 'trick') {
      const parts = []; if (e.flips) parts.push(e.flips > 1 ? `${e.flips} FRONT FLIPS` : 'FRONT FLIP'); if (e.rolls) parts.push(e.rolls > 1 ? `${e.rolls} TONNEAUX` : 'TONNEAU');
      showTrick(`${parts.join(' + ')} !<small>+${Math.round((e.flips + e.rolls) * 2.2 * KMH)} km/h</small>`); sfx.trick();
    }
  }
  if (car.distance >= layout.length) { finishRace(true); return; }
  // Après un crash, on laisse une seconde pour voir l'impact avant le bilan
  if (car.ended) { if (!car.crashed) finishRace(false); else if (crashShake <= -0.6) finishRace(false); }
}

// Gemmes restantes du niveau, placées sur la barre de progression à leur distance
function buildGemMarkers() {
  const track = document.querySelector('.progress .track');
  track.querySelectorAll('.gm').forEach(e => e.remove());
  for (const g of layout.gems) if (!g.taken) {
    const el = document.createElement('div'); el.className = 'gm'; el.dataset.id = g.id;
    el.style.bottom = `${Math.min(100, -g.z / layout.length * 100)}%`;
    el.innerHTML = '<svg width="24" height="26" aria-hidden="true"><use href="#i-gem"/></svg>';
    track.appendChild(el);
  }
}
function removeGemMarker(id) {
  const el = document.querySelector(`.progress .gm[data-id="${id}"]`);
  if (el) { el.classList.add('got'); setTimeout(() => el.remove(), 500); }
}

function updateRunHud() {
  const d = Math.min(car.distance, layout.length);
  $('v-dist').textContent = `${fmt(d)}m`;
  $('v-runcoins').textContent = `+${runCoins}`; $('v-rungems').textContent = `+${runGems}`;
  // Gain en direct : exactement ce que rapportera la course si on s'arrête ici (distance × multiplicateur + pièces)
  $('v-livegain').textContent = `${fmt(Math.round(d * eco.mult()) + runCoins)} · ×${String(eco.mult()).replace('.', ',')}`;
  const p = d / layout.length * 100;
  $('prog-fill').style.height = `${p}%`; $('prog-dot').style.bottom = `${p}%`; $('v-prog').textContent = `${Math.floor(p)}%`;
  $('prog-best').style.bottom = `${Math.min(100, eco.s.best / layout.length * 100)}%`; $('prog-best').hidden = eco.s.best <= 0;
  const kmh = Math.max(0, car.v * KMH);
  $('v-kmh').textContent = Math.round(kmh);
  $('speed-arc').setAttribute('stroke-dasharray', `${Math.min(100, kmh / 120 * 100)} 100`);
  // Traits de vitesse : apparaissent à partir de 70 km/h et s'intensifient jusqu'à 100 km/h
  const streak = Math.max(0, Math.min(1, (kmh - 70) / 30));
  $('speedfx').style.opacity = streak.toFixed(2);
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
  if (state === 'launch' && holding && !maxed) {
    const before = pct; pct = Math.min(100, pct + raw * 62);
    // Retour de tension : une légère vibration au seuil de lancement, une plus marquée à pleine charge
    if (before < 50 && pct >= 50) navigator.vibrate?.(12);
    if (pct >= 100) { maxed = true; navigator.vibrate?.([25, 40, 25]); }
    updateGauge();
  }
  if (state === 'launch' && holding && maxed) $('app').classList.add('shake');
  if (state === 'run' && !window.__hk.freeze) {
    physAcc = Math.min(physAcc + dt, 0.1);
    while (physAcc >= FIXED && state === 'run') { runStep(FIXED); physAcc -= FIXED; }
    updateRunHud(); sfx.engineSet(Math.min(1, Math.max(0, car.v) / 40), !car.ended);
  }
  if (state === 'launch') sfx.engineSet(holding ? 0.15 + pct / 100 * 0.85 : 0.05);
  if (trickTimer > 0) { trickTimer -= dt; if (trickTimer <= 0) $('trick').hidden = true; }
  world.update(car.z, clock, dt);
  world.start.visible = state !== 'run' || car.z > -1;

  // Voiture
  carMesh.position.set(car.x, car.y, car.z);
  // la voiture s'oriente quand on dirige, et braque vers l'intérieur d'un virage de la piste
  const yaw = car.air ? 0 : Math.max(-0.14, Math.min(0.14, -car.vx * 0.018 - (state === 'home' ? 0 : camAim * 0.3)));
  carMesh.rotation.set(car.pitch, yaw, car.roll);
  if (state === 'launch' && holding) carMesh.position.x += Math.sin(clock * 60) * 0.02 * (pct / 100);
  updateReveal(dt);

  // Caméra
  const y0 = world.launcherTop;
  if (state === 'home') { camPos.set(-7.8, y0 + 3.4, car.z - 11.2); camLook.set(0.3, y0 + 0.7, car.z + 0.4); camera.position.copy(camPos); camera.lookAt(camLook); }
  else {
    // Vue de trois quarts : quand la voiture tourne, la caméra glisse du côté opposé et voit son flanc
    // (léger, pour que l'écran ne traîne pas derrière la voiture quand on traverse la piste)
    const sideTarget = state === 'run' && !car.air ? Math.max(-1.5, Math.min(1.5, car.vx * 0.1)) : 0;
    camSide += (sideTarget - camSide) * Math.min(1, dt * 4);
    // Le regard part en avance du côté où l'on tourne : on voit où l'on va
    const lead = state === 'run' ? Math.max(-7, Math.min(7, car.vx * 0.45)) : 0;
    // La caméra suit la voiture sur toute la largeur : elle reste toujours au centre de l'écran
    // Vue surélevée qui regarde loin devant : la voiture occupe le bas de l'écran, la piste se lit jusqu'à l'horizon.
    // Plus le véhicule est haut, plus la caméra monte, pour voir ce qui arrive juste devant lui.
    const lift = Math.max(0, carHeight - 1.5) * 1.6;
    // Dans un virage, la caméra tourne autour de la voiture pour regarder vers la sortie du virage
    const sNow = Math.max(0, -car.z), aim = Math.max(-0.35, Math.min(0.35, 2 * layout.curve.offsetFrom(sNow, sNow + 80) / 80));
    camAim += (aim - camAim) * Math.min(1, dt * 2);
    const ca = Math.sin(camAim);
    // Caméra plus basse et plus proche qu'avant : la pente se lit dans la trajectoire et la voiture reste grande à l'écran
    const tp = new THREE.Vector3(car.x - camSide - (9 + lift * 0.4) * ca, car.y + 5.4 + lift, car.z + 9 + lift * 0.4);
    const tl = new THREE.Vector3(car.x + lead + 28 * ca, car.y - 2.6 + lift * 0.3, car.z - 28);
    // Sous une voûte, la caméra descend pour rester dans le passage
    const ceil = layout.ceilingAt(tp.z);
    if (ceil < Infinity) { const gy = layout.ground(tp.x, tp.z, 1).h; tp.y = Math.min(tp.y, gy + ceil); tl.y = Math.min(tl.y, gy + ceil - 3); }
    if (state === 'launch') { camPos.copy(tp); camLook.copy(tl); }
    const snap = window.__hk && window.__hk.freeze, kx = snap ? 1 : Math.min(1, dt * 14), k = snap ? 1 : Math.min(1, dt * 5);
    const ky = !snap && tp.y < camPos.y - 0.5 && ceil < Infinity ? Math.min(1, dt * 12) : k;
    // en profondeur, la caméra reste collée à la voiture : un coup d'accélérateur ne la fait pas décrocher (pas d'effet de recul)
    camPos.set(camPos.x + (tp.x - camPos.x) * kx, camPos.y + (tp.y - camPos.y) * ky, state === 'run' ? tp.z : camPos.z + (tp.z - camPos.z) * k);
    camLook.set(camLook.x + (tl.x - camLook.x) * kx, camLook.y + (tl.y - camLook.y) * k, state === 'run' ? tl.z : camLook.z + (tl.z - camLook.z) * k);
    camera.position.copy(camPos); camera.lookAt(camLook);
  }
  if (car.boostLeft > 0) fovKick = Math.max(fovKick, 7);
  if (state === 'run' && car.ended && crashShake > -0.6) crashShake -= dt;
  if (crashShake > 0) { crashShake -= dt; camera.position.x += (Math.random() - 0.5) * crashShake; camera.position.y += (Math.random() - 0.5) * crashShake; }
  fovKick *= Math.pow(0.35, dt); fovNow += (fovKick - fovNow) * Math.min(1, dt * 4); // Plus on va vite, plus l'angle s'élargit : c'est ce qui donne l'impression de vitesse
  const speedFov = state === 'run' ? Math.max(0, Math.min(10, (car.v * KMH - 55) / 4)) : 0;
  camera.fov = 60 + fovNow + speedFov; camera.updateProjectionMatrix();
  sun.position.set(car.x + 16, car.y + 30, car.z + 12); sun.target.position.set(car.x, car.y, car.z - 8);
  // Virages : la piste se courbe à l'écran devant la voiture
  updateBend(layout, -car.z);

  uiTimer -= dt; if (uiTimer <= 0) { uiTimer = 0.5; eco.tick(); if (state === 'home') refreshHome(true); else refreshTop(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- garage ----------
let gSel = null;
function openGarage() { gSel = eco.s.car; $('g-grid').scrollTop = 0; renderGarage(); show('s-garage', true); }
function renderGarage() {
  const s = eco.s; $('v-gblue').textContent = fmt(s.blue);
  $('v-gname').textContent = A.CARS[gSel].name; $('v-ghero').src = `assets/renders/vehicules/t_${gSel}.png`;
  const owned = s.cars.includes(gSel), act = $('b-gact');
  if (s.car === gSel) { act.textContent = 'SÉLECTIONNÉ'; act.disabled = true; }
  else if (owned) { act.textContent = 'CHOISIR'; act.disabled = false; }
  else { act.innerHTML = `ACHETER <svg class="ico s"><use href="#i-blue"/></svg>${fmt(VEHICLE_PRICES[gSel])}`; act.disabled = s.blue < VEHICLE_PRICES[gSel]; }
  const grid = $('g-grid'), keep = grid.scrollTop; grid.innerHTML = '';
  for (const k of A.ORDER) {
    const own = s.cars.includes(k);
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'g-card' + (own ? '' : ' locked') + (k === gSel ? ' sel' : '');
    b.innerHTML = `<img src="assets/renders/vehicules/t_${k}.png" alt=""><span class="n">${A.CARS[k].name}</span>` +
      (own ? `<span class="p">${s.car === k ? 'ÉQUIPÉ' : 'À TOI'}</span>` : `<span class="p"><svg class="ico"><use href="#i-blue"/></svg>${fmt(VEHICLE_PRICES[k])}</span>`);
    b.addEventListener('click', () => { gSel = k; renderGarage(); });
    grid.appendChild(b);
  }
  grid.scrollTop = keep; // garde la position dans la liste quand on touche un véhicule
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
window.__hk = { eco, get car() { return car; }, get layout() { return layout; }, get state() { return state; }, get camera() { return camera; }, get world() { return world; }, themeIndex, get carMesh() { return carMesh; }, music, sfx, simulate(sec) { for (let t = 0; t < sec && state === 'run'; t += FIXED) runStep(FIXED); },
  // Outil de test : affiche directement un niveau (et son monde)
  goLevel(n) { eco.s.level = n; eco.s.gemsTaken = []; buildLevel(); refreshHome(); },
  // Outil de test : fige la course (la caméra continue de suivre la voiture)
  freeze: false };
