import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- helpers ----------
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const R = rng(42);

export function mat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0.0, flatShading: o.flat ?? true, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, envMapIntensity: o.env ?? 0.2, transparent: o.t ?? false, opacity: o.o ?? 1, map: o.map ?? null, side: o.side ?? THREE.FrontSide });
}
function shadowAll(o) { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; }

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------- terrain ----------
export function heightAt(x, z, opt = {}) {
  const slope = opt.slope ?? 0.14;
  let h = z * slope; // forward = -z, goes down
  // relief : amplitude des bosses (selon le monde) ; bank : hauteur des talus de chaque côté de la piste
  const rel = opt.relief ?? 1, bank = opt.bank ?? 1;
  h += (Math.sin(z * 0.045) * 2.2 + Math.sin(z * 0.11 + 1.3) * 0.9) * rel;
  h += Math.sin(x * 0.07 + z * 0.02) * 0.6 * rel;
  const ax = Math.abs(x);
  const half = opt.half ?? 16;
  if (ax > half) { const d = ax - half; h += (Math.min(d * 0.22, 9) + Math.max(0, d - 40) * 0.25 + Math.sin(d * 0.15 + z * 0.05) * Math.min(d * 0.06, 2.5)) * bank; }
  return h;
}

export function terrain(opt = {}) {
  const W = 260, L = 700, sx = 130, sz = 350;
  const g = new THREE.PlaneGeometry(W, L, sx, sz);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, -L / 2 + 60);
  const p = g.attributes.position;
  const cols = [];
  const c = new THREE.Color();
  const r = rng(7);
  const half = opt.half ?? 16;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const jx = (r() - 0.5) * 0.6, jz = (r() - 0.5) * 0.6;
    p.setX(i, x + jx); p.setZ(i, z + jz);
    p.setY(i, heightAt(x, z, opt) + (r() - 0.5) * 0.18);
    const ax = Math.abs(x);
    const n = r() * 0.06;
    const patch = Math.sin(x * 0.21 + z * 0.13) + Math.sin(x * 0.09 - z * 0.27 + 2) + Math.sin(z * 0.05 + x * 0.3);
    const track0 = opt.trackCol ?? [0.42, 0.70, 0.24];
    const stripe = (Math.floor((z + 1000) / 7) % 2) ? 0.05 : -0.02;
    const track = [track0[0] + stripe, track0[1] + stripe, track0[2] + stripe * 0.5];
    if (opt.tarmac && z < opt.tarmac[0] && z > opt.tarmac[1] && ax < 8.5 + Math.sin(z * 0.3) * 0.6) c.setRGB(0.26 + n, 0.27 + n, 0.31 + n, THREE.SRGBColorSpace);
    else if (ax < half - 0.5) { if (patch > 1.6) c.setRGB(0.88 + n, 0.77 + n, 0.55 + n * 0.5, THREE.SRGBColorSpace); else c.setRGB(track[0] + n + patch * 0.02, track[1] + n + patch * 0.015, track[2] + n * 0.5, THREE.SRGBColorSpace); }
    else if (ax < half + 2) c.setRGB(0.40 + n, 0.70 + n, 0.30, THREE.SRGBColorSpace);
    else c.setRGB(0.30 + n, 0.60 + n, 0.24 + n * 0.5, THREE.SRGBColorSpace);
    cols.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g.toNonIndexed(), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, envMapIntensity: 0 }));
  m.geometry.computeVertexNormals();
  m.receiveShadow = true;
  return m;
}

// ---------- props ----------
export function tree(s = 1, hue = 0) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 1.6 * s, 6), mat(0x7A5230));
  trunk.position.y = 0.8 * s; g.add(trunk);
  const greens = [0x3E8E37, 0x4FA548, 0x2F7A2E, 0x5DB04A];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry((1.1 - i * 0.18) * s, 0), mat(greens[(i + hue) % 4]));
    b.position.set((i - 1) * 0.45 * s, (1.9 + i * 0.55) * s, (i % 2 ? 0.3 : -0.2) * s);
    b.rotation.set(R() * 3, R() * 3, 0);
    g.add(b);
  }
  return shadowAll(g);
}
export function pine(s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1 * s, 6), mat(0x6B4A2B));
  trunk.position.y = 0.5 * s; g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry((1.3 - i * 0.32) * s, 1.5 * s, 7), mat(i % 2 ? 0x2F7A2E : 0x3A8A36));
    c.position.y = (1.4 + i * 0.75) * s; g.add(c);
  }
  return shadowAll(g);
}
// Pierre aux formes irrégulières : icosaèdre déformé de façon aléatoire (graine déterministe)
const ROCK_COLORS = [0x9AA0A8, 0x868C95, 0xA39A8C, 0x8F8578, 0xB0ACA4, 0x7C8088];
export function lumpGeo(seed, detail = 1, rough = 0.35) {
  const r = rng(seed * 7919 + 13);
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position, v = new THREE.Vector3();
  // quelques "plans de coupe" donnent des facettes franches, comme une roche cassée
  const cuts = []; for (let i = 0; i < 3; i++) cuts.push([new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), 0.55 + r() * 0.3]);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 - rough / 2 + r() * rough);
    for (const [n, d] of cuts) { const k = v.dot(n); if (k > d) v.addScaledVector(n, d - k); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
// Géométries et matériaux mis en cache : le décor en réutilise beaucoup
const lumpCache = new Map(), rockMats = new Map();
export function lump(seed, sx, sy, sz, color) {
  const r = rng(seed);
  if (!lumpCache.has(seed)) lumpCache.set(seed, lumpGeo(seed, r() < 0.5 ? 1 : 0, 0.3 + r() * 0.25)); else { r(); r(); }
  const c = color ?? ROCK_COLORS[Math.floor(r() * ROCK_COLORS.length)];
  if (!rockMats.has(c)) rockMats.set(c, mat(c, { r: 0.85 }));
  const m = new THREE.Mesh(lumpCache.get(seed), rockMats.get(c));
  m.scale.set(sx, sy, sz); return m;
}
export function rock(s = 1) {
  const seed = Math.floor(R() * 24), r = rng(seed + 500);
  const m = lump(seed, s * (0.8 + r() * 0.6), s * (0.5 + r() * 0.5), s * (0.8 + r() * 0.6));
  m.rotation.set(r() * 0.4, r() * 6, r() * 0.4);
  return shadowAll(m);
}
// Rocher obstacle de la piste, cinq familles de formes : rond, aiguille, dalle, amas, pierres empilées
export function rockShape(type, seed, color = null) {
  const g = new THREE.Group(), r = rng(seed + 1);
  const col0 = ROCK_COLORS[Math.floor(r() * ROCK_COLORS.length)], col = color ?? col0; // couleur imposée par le monde
  const add = (sx, sy, sz, x, y, z, c = col) => { const m = lump(100 + Math.floor(r() * 200), sx, sy, sz, c); m.position.set(x, y, z); m.rotation.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5); g.add(m); return m; };
  if (type === 'spire') {
    const m = add(0.75, 2.1, 0.7, 0, 1.8, 0); m.rotation.set((r() - 0.5) * 0.25, r() * 6, (r() - 0.5) * 0.25);
    add(0.6, 0.45, 0.55, 0.6, 0.25, 0.3); add(0.4, 0.3, 0.45, -0.5, 0.2, -0.4);
  } else if (type === 'slab') {
    add(1.8, 0.48, 1.3, 0, 0.32, 0); add(0.5, 0.3, 0.4, 1.4, 0.15, 0.6);
  } else if (type === 'cluster') {
    add(1.0, 0.85, 1.0, -0.6, 0.65, 0); add(0.8, 1.1, 0.75, 0.7, 0.85, -0.3); add(0.6, 0.5, 0.65, 0.3, 0.35, 0.9); if (r() < 0.6) add(0.45, 0.35, 0.5, -1.4, 0.25, 0.7);
  } else if (type === 'stack') {
    add(1.15, 0.7, 1.05, 0, 0.6, 0); add(0.85, 0.6, 0.8, 0.15, 1.75, 0.05); add(0.5, 0.45, 0.5, -0.1, 2.6, 0);
  } else {
    add(1.25, 1.0, 1.15, 0, 0.8, 0); add(0.55, 0.45, 0.5, 1.1, 0.3, 0.5); if (r() < 0.5) add(0.4, 0.35, 0.45, -1.0, 0.25, -0.4);
  }
  return shadowAll(g);
}
export function flowers(n, spread, y0, color) {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.12, 0);
  const mm = mat(color);
  for (let i = 0; i < n; i++) { const f = new THREE.Mesh(geo, mm); f.position.set((R() - 0.5) * spread, 0, (R() - 0.5) * spread); g.add(f); }
  return g;
}
export function hay(s = 1) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * s, 0.8 * s, 1.2 * s, 10), mat(0xE2B75A));
  m.rotation.z = Math.PI / 2; m.position.y = 0.8 * s; return shadowAll(m);
}
export function windmill(s = 1) {
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * s, 2 * s, 7 * s, 8), mat(0xF2EADB));
  tower.position.y = 3.5 * s; g.add(tower);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 2 * s, 8), mat(0xB8452F));
  roof.position.y = 8 * s; g.add(roof);
  const hub = new THREE.Group(); hub.position.set(0, 6.6 * s, 1.5 * s);
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 4.5 * s, 0.1 * s), mat(0xE8DCC2)); b.position.y = 2.3 * s; const a = new THREE.Group(); a.rotation.z = i * Math.PI / 2 + 0.4; a.add(b); hub.add(a); }
  g.add(hub);
  return shadowAll(g);
}

export function coin(kind = 'gold', s = 1) {
  const cols = { gold: [0xFFC21A, 0xC98400], silver: [0xD6DDE6, 0x8D97A5], bronze: [0xD28A45, 0x8A4E1C] }[kind];
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.5 * s, 0.12 * s, 16), [mat(cols[1], { m: 0.6, r: 0.3 }), mat(cols[0], { m: 0.6, r: 0.25, e: cols[0], ei: 0.25 }), mat(cols[0], { m: 0.6, r: 0.25, e: cols[0], ei: 0.25 })]);
  m.rotation.x = Math.PI / 2; g.add(m);
  const star = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.15 * s, 5), mat(cols[0], { m: 0.7, r: 0.2, e: cols[0], ei: 0.45 }));
  star.rotation.x = Math.PI / 2; g.add(star);
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
export function gem(s = 1) {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.55 * s, 0), mat(0xF04FA0, { r: 0.15, m: 0.1, e: 0xB0136A, ei: 0.35 }));
  m.scale.y = 1.25; m.castShadow = true; return m;
}
// Colonne de lumière rose au-dessus d'une gemme : visible de très loin, à travers le brouillard
let beamGeo = null, beamMat = null;
export function gemBeam() {
  if (!beamGeo) {
    beamGeo = new THREE.CylinderGeometry(0.35, 0.6, 22, 10, 1, true); beamGeo.translate(0, 11, 0);
    const t = canvasTex(4, 128, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,140,200,0)'); gr.addColorStop(1, 'rgba(255,140,200,1)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
    beamMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
  }
  const m = new THREE.Mesh(beamGeo, beamMat); m.scale.y = 1 / 1.25; m.castShadow = false; return m;
}
function boostTex() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#1E9BD7'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8CF7FF';
    for (let k = 0; k < 2; k++) { const y = 40 + k * 110; g.beginPath(); g.moveTo(40, y + 70); g.lineTo(128, y); g.lineTo(216, y + 70); g.lineTo(184, y + 70); g.lineTo(128, y + 30); g.lineTo(72, y + 70); g.closePath(); g.fill(); }
  });
}
export function boostPad(w = 6, l = 4) {
  const tex = boostTex();
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, l), [mat(0x0D5A80), mat(0x0D5A80), mat(0xffffff, { map: tex, e: 0x55E6FF, ei: 0.45, flat: true }), mat(0x0D5A80), mat(0x0D5A80), mat(0x0D5A80)]);
  m.receiveShadow = true; return m;
}
export function ramp(w = 6, l = 5, h = 1.8, boost = false) {
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(l, 0); shape.lineTo(l, h); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.translate(-l / 2, 0, -w / 2); geo.rotateY(Math.PI / 2);
  const wood = canvasTex(128, 128, (g, W, H) => { g.fillStyle = '#D89A52'; g.fillRect(0, 0, W, H); g.fillStyle = '#B87A3A'; for (let i = 0; i < 8; i++) g.fillRect(0, i * 16, W, 2); });
  const m = new THREE.Mesh(geo, mat(0xffffff, { map: wood }));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, 0.35), mat(0xFFC21A));
  stripe.position.set(0, h, -l / 2 + 0.15);
  const g = new THREE.Group(); g.add(m, stripe);
  if (boost) {
    // Bande d'accélération lumineuse posée sur la pente de la rampe
    const len = Math.hypot(l, h);
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, len * 0.86), mat(0xffffff, { map: boostTex(), e: 0x55E6FF, ei: 0.6 }));
    pad.rotation.x = -Math.atan2(l, h); pad.position.set(0, h / 2 + 0.03, 0.02);
    g.add(pad);
  }
  shadowAll(g); g.children.forEach(c => { if (c.geometry && c.geometry.type === 'PlaneGeometry') c.castShadow = false; });
  return g;
}

export function hazardTex() {
  return canvasTex(256, 64, (g, W, H) => { g.fillStyle = '#FFC21A'; g.fillRect(0, 0, W, H); g.fillStyle = '#1E2229'; for (let x = -64; x < W + 64; x += 32) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 16, H); g.lineTo(x + 48, 0); g.lineTo(x + 32, 0); g.closePath(); g.fill(); } });
}
// Lanceur : un palier toutes les 5 améliorations (0 à 5) — plus long, plus large, moteurs plus gros,
// puis cheminées à flammes, néons, turbines et enfin rails dorés
const LAUNCH_LIT = [0x3DDC84, 0x2F86F0, 0xA855F7, 0xFF8A3D, 0xE5383B, 0x34E0FF];
export function launcher(len = 5.5, wid = 3.6, lit = 0x3DDC84, tier = 0) {
  const g = new THREE.Group();
  len += 0.7 * tier; wid += 0.25 * tier; lit = LAUNCH_LIT[tier] ?? lit;
  const ms = 1 + 0.22 * tier; // taille des moteurs
  const base = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.8, 0.5, len), mat(0x5B6474, { m: 0.5, r: 0.4 }));
  base.position.y = 0.25; g.add(base);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.12, len - 0.4), mat(0x1C1F25, { r: 0.9 }));
  belt.position.y = 0.56; g.add(belt);
  const nR = 9 + tier * 2;
  for (let i = 0; i < nR; i++) { const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, wid, 8), mat(0x3A3F48, { m: 0.6, r: 0.3 })); rl.rotation.z = Math.PI / 2; rl.position.set(0, 0.63, -len / 2 + 0.5 + i * (len - 1) / (nR - 1)); g.add(rl); }
  const hz = hazardTex(); hz.wrapS = THREE.RepeatWrapping; hz.repeat.set(len / 2, 1);
  const railTop = tier >= 5 ? mat(0xFFD23F, { m: 0.9, r: 0.2 }) : mat(0xFFC21A);
  for (const sgn of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, len), [mat(0xffffff, { map: hz }), mat(0xffffff, { map: hz }), railTop, mat(0x1E2229), mat(0xffffff, { map: hz }), mat(0xffffff, { map: hz })]);
    rail.position.set(sgn * (wid / 2 + 0.2), 0.7, 0); g.add(rail);
    const mx = sgn * (wid / 2 + 0.55 + 0.45 * ms), mz = len / 2 - 0.4 * ms;
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.9 * ms, 1.3 * ms, 1.3 * ms), mat(tier >= 5 ? 0xC9A227 : 0x6E7889, { m: 0.5, r: 0.35 }));
    motor.position.set(mx, 0.65 * ms, mz); g.add(motor);
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.92 * ms, 0.5 * ms, 0.9 * ms), mat(0x2A2F38)); vent.position.set(mx, 0.9 * ms, mz); g.add(vent);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18 * ms, 10, 8), mat(lit, { e: lit, ei: 1.2 })); lamp.position.set(mx, 1.4 * ms, mz); g.add(lamp);
    // Palier 2 : cheminées d'échappement avec flammes
    if (tier >= 2) for (const dz of [-0.3, 0.3]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 10), mat(0xDDE3EA, { m: 0.9, r: 0.2 })); pipe.position.set(mx, 1.3 * ms + 0.4, mz + dz * ms); g.add(pipe);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 8), mat(0xFFB020, { e: 0xFF7A00, ei: 1.5 })); fl.position.set(mx, 1.3 * ms + 1.0, mz + dz * ms); g.add(fl);
    }
    // Palier 3 : néons le long des rails
    if (tier >= 3) { const neon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, len - 0.3), mat(lit, { e: lit, ei: 1.6 })); neon.position.set(sgn * (wid / 2 + 0.4), 0.55, 0); g.add(neon); }
    // Palier 4 : turbine à l'arrière de chaque moteur
    if (tier >= 4) {
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.5, 20, 1, true), mat(0x3A3F48, { m: 0.7, r: 0.3, flat: false })); tub.rotation.x = Math.PI / 2; tub.position.set(mx, 0.7 * ms, mz + 0.65 * ms + 0.25); g.add(tub);
      for (let k = 0; k < 8; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.04), mat(0xB8C0CC, { m: 0.8 })); bl.position.set(mx, 0.7 * ms, mz + 0.65 * ms + 0.3); bl.rotation.z = k / 8 * Math.PI; g.add(bl); }
    }
  }
  return shadowAll(g);
}
export function smoke(n, spread, size, seed = 3) {
  const r = rng(seed); const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xF4F6F8, transparent: true, opacity: 0.75, roughness: 1, flatShading: true });
  for (let i = 0; i < n; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (0.5 + r()), 1), m); s.position.set((r() - 0.5) * spread, r() * spread * 0.4, (r() - 0.5) * spread * 0.6); g.add(s); }
  return g;
}

// ---------- cars ----------
// Profiles in SVG units (x to the front, y down), ground at y=53. 1 world unit = 25 svg units.
const U = 25, GY = 53;
const P = (pts, cx) => pts.map(([x, y]) => new THREE.Vector2((x - cx) / U, (GY - y) / U));
function roundedShape(v, rad) {
  const shape = new THREE.Shape(); const n = v.length;
  for (let i = 0; i < n; i++) {
    const p0 = v[(i - 1 + n) % n], p1 = v[i], p2 = v[(i + 1) % n];
    const d1 = p0.clone().sub(p1), d2 = p2.clone().sub(p1);
    const r = Math.min(rad, d1.length() / 2.1, d2.length() / 2.1);
    const a = p1.clone().add(d1.normalize().multiplyScalar(r)), b = p1.clone().add(d2.normalize().multiplyScalar(r));
    if (i === 0) shape.moveTo(a.x, a.y); else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(p1.x, p1.y, b.x, b.y);
  }
  shape.closePath(); return shape;
}
function smoothGeo(geo) {
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  const m = mergeVertices(geo, 1e-4); m.computeVertexNormals(); return m;
}
function extrude(pts, cx, depth, material, bevel = 0.08, round = 3, taper = 0) {
  const shape = roundedShape(P(pts, cx), round / U);
  const d = Math.max(depth - 2 * bevel, 0.02);
  let geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.7, bevelSegments: 5, curveSegments: 8 });
  geo.translate(0, 0, -d / 2);
  if (taper) {
    const p = geo.attributes.position; let y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < p.count; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
    for (let i = 0; i < p.count; i++) { const t = (p.getY(i) - y0) / (y1 - y0); p.setZ(i, p.getZ(i) * (1 - taper * t * t)); }
  }
  geo = smoothGeo(geo);
  return new THREE.Mesh(geo, material);
}
// ---------- matériaux réalistes des véhicules ----------
// Les reflets viennent d'un ciel extérieur dédié (voir carEnvironment) : ligne d'horizon sur la carrosserie, comme une vraie voiture.
let CAR_ENV = null;
export function setCarEnv(tex) { CAR_ENV = tex; }
// Ciel extérieur pour les reflets : dégradé bleu, horizon clair, sol sombre et un soleil
export function carEnvironment(renderer) {
  const sc = new THREE.Scene();
  const tex = canvasTex(8, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3E7FC9'); gr.addColorStop(0.42, '#A9D4F2'); gr.addColorStop(0.5, '#F4FAFF'); gr.addColorStop(0.53, '#7E8C7A'); gr.addColorStop(1, '#2B3328'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
  sc.add(sky);
  const sunM = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); sunM.material.color.multiplyScalar(18); sunM.position.set(20, 30, 15); sc.add(sunM);
  // quelques "nuages" et bâtiments lointains pour casser l'uniformité des reflets
  for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(4 + i % 3 * 3, 3 + (i * 7) % 6, 3), new THREE.MeshBasicMaterial({ color: 0x55606a })); const a = i / 10 * Math.PI * 2; b.position.set(Math.cos(a) * 40, 0, Math.sin(a) * 40); b.lookAt(0, 0, 0); sc.add(b); }
  const t = new THREE.PMREMGenerator(renderer).fromScene(sc, 0.02).texture;
  CAR_ENV = t; return t;
}
const carMats = new Map();
function carMat(key, make) { if (!carMats.has(key)) carMats.set(key, make()); return carMats.get(key); }
function withEnv(m, i) { m.userData.envI = i; return m; }
// Peinture métallisée vernie
function paintMat(color) {
  const c = new THREE.Color(color), lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
  return withEnv(new THREE.MeshPhysicalMaterial({ color, metalness: lum > 0.8 ? 0.1 : 0.45, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }), 1.0);
}
const glassM = () => carMat('glass', () => withEnv(new THREE.MeshPhysicalMaterial({ color: 0x0B121B, metalness: 0.3, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 }), 1.6));
const trimM = () => carMat('trim', () => withEnv(new THREE.MeshStandardMaterial({ color: 0x15171B, roughness: 0.55, metalness: 0.1 }), 0.4));
const chromeM = () => carMat('chrome', () => withEnv(new THREE.MeshStandardMaterial({ color: 0xE6EBF0, roughness: 0.12, metalness: 1 }), 1.4));
const rubberM = () => carMat('rubber', () => withEnv(new THREE.MeshStandardMaterial({ color: 0x1C1D20, roughness: 0.92, metalness: 0 }), 0.15));
// Applique le ciel des reflets à toutes les pièces d'un véhicule
function applyCarEnv(g) {
  if (!CAR_ENV) return;
  g.traverse(o => { if (!o.isMesh) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.userData && m.userData.envI !== undefined && m.envMap !== CAR_ENV) { m.envMap = CAR_ENV; m.envMapIntensity = m.userData.envI; m.needsUpdate = true; } });
}

// Roue : pneu à flanc bombé, jante à 5 doubles branches, lèvre chromée, disque et étrier de frein
export function wheel(r, w, rimCol = 0xC9D1DC, style = 'std') {
  const g = new THREE.Group();
  const tr = Math.min(w / 2, r * (style === 'tread' ? 0.36 : 0.27)); // pneus taille basse pour les voitures de route
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r - tr, tr, 16, 40), rubberM());
  tire.scale.z = (w / 2) / tr; g.add(tire);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(r - tr, r - tr, w * 0.96, 32, 1, true), rubberM());
  inner.rotation.x = Math.PI / 2; g.add(inner);
  const rimM = carMat('rim' + rimCol, () => withEnv(new THREE.MeshStandardMaterial({ color: rimCol, metalness: 0.9, roughness: 0.22 }), 1.3));
  const rr = r - tr * 1.15, face = w * 0.42;
  // fond de jante sombre, disque de frein et étrier visibles entre les branches
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, w * 0.9, 32), carMat('barrel', () => withEnv(new THREE.MeshStandardMaterial({ color: 0x3A3E45, metalness: 0.7, roughness: 0.4 }), 0.7)));
  barrel.rotation.x = Math.PI / 2; g.add(barrel);
  for (const s of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.72, rr * 0.72, 0.03, 28), carMat('disc', () => withEnv(new THREE.MeshStandardMaterial({ color: 0x9AA0A8, metalness: 0.8, roughness: 0.35 }), 0.8)));
    disc.rotation.x = Math.PI / 2; disc.position.z = s * (face - 0.06); g.add(disc);
    const cal = new THREE.Mesh(new THREE.BoxGeometry(rr * 0.35, rr * 0.5, 0.07), carMat('caliper', () => new THREE.MeshStandardMaterial({ color: 0xD62828, roughness: 0.4 })));
    cal.position.set(rr * 0.5, rr * 0.35, s * (face - 0.04)); cal.rotation.z = 0.6; g.add(cal);
    // lèvre chromée
    const lip = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.96, rr * 0.09, 8, 40), rimM); lip.position.z = s * face; g.add(lip);
    // 5 doubles branches
    for (let i = 0; i < 5; i++) for (const d of [-0.13, 0.13]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(rr * 0.15, rr * 0.92, 0.05), rimM);
      const a = i / 5 * Math.PI * 2 + d; sp.position.set(Math.sin(a) * rr * 0.48, Math.cos(a) * rr * 0.48, s * face); sp.rotation.z = -a; g.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.22, rr * 0.25, 0.08, 20), rimM); hub.rotation.x = Math.PI / 2; hub.position.z = s * face; g.add(hub);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(rr * 0.1, rr * 0.1, 0.1, 16), trimM()); cap.rotation.x = Math.PI / 2; cap.position.z = s * face; g.add(cap);
  }
  if (style === 'tread') {
    for (let i = 0; i < 20; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.16, r * 0.12, w * 0.9), rubberM()); const a = i / 20 * Math.PI * 2; t.position.set(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97, 0); t.rotation.z = a; g.add(t); }
  }
  return g;
}

function textTex(text, bg, fg, w = 256, h = 64, font = 'bold 40px sans-serif') {
  return canvasTex(w, h, (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 2); });
}
// Plaque d'immatriculation européenne
function plateTex(text) {
  return canvasTex(256, 56, (g, W, H) => {
    g.fillStyle = '#F7F7F2'; g.fillRect(0, 0, W, H); g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
    g.fillStyle = '#1F4BB8'; g.fillRect(2, 2, 26, H - 4); g.fillStyle = '#FFD23F'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('F', 15, H - 12);
    g.fillStyle = '#111'; g.font = 'bold 34px sans-serif'; g.textBaseline = 'middle'; g.fillText(text, W / 2 + 12, H / 2 + 2);
  });
}

// ---------- géométrie 2D : décalage et découpe de polygones (coordonnées du profil, y vers le bas) ----------
function offsetPoly(pts, d) {
  const n = pts.length, cxp = pts.reduce((a, p) => a + p[0], 0) / n, cyp = pts.reduce((a, p) => a + p[1], 0) / n;
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    let nx = dy / len, ny = -dx / len;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if ((mx + nx - cxp) ** 2 + (my + ny - cyp) ** 2 < (mx - cxp) ** 2 + (my - cyp) ** 2) { nx = -nx; ny = -ny; }
    lines.push([a[0] + nx * d, a[1] + ny * d, dx, dy]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const [x1, y1, dx1, dy1] = lines[(i - 1 + n) % n], [x2, y2, dx2, dy2] = lines[i];
    const den = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(den) < 1e-6) { out.push([x2, y2]); continue; }
    const t = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / den; out.push([x1 + dx1 * t, y1 + dy1 * t]);
  }
  return out;
}
// Garde la partie du polygone où keep(y) est vrai, coupée à la ligne horizontale y = yc
function clipY(pts, yc, below) {
  const inside = (p) => below ? p[1] >= yc : p[1] <= yc, out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) { const t = (yc - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, yc]); }
  }
  return out;
}
// Extrusion avec rétrécissement vers le haut calculé sur une plage de hauteur donnée (pour que vitres et montants suivent la cabine)
function extrudeT(pts, cx, depth, material, bevel, round, taper, yr) {
  const m = extrude(pts, cx, depth, material, bevel, round, 0);
  if (taper && yr) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = Math.min(1, Math.max(0, (p.getY(i) - yr[0]) / (yr[1] - yr[0]))); p.setZ(i, p.getZ(i) * (1 - taper * t * t)); }
    m.geometry.computeVertexNormals();
  }
  return m;
}
// Découpe des passages de roue dans le bas de caisse
function archNotches(lower, wheels, ws = 1, suspPx = 0) {
  const bottom = Math.max(...lower.map(p => p[1]));
  const n = lower.length; let iLast = -1;
  for (let i = 0; i < n; i++) { const a = lower[i], b = lower[(i + 1) % n]; if (a[1] === bottom && b[1] === bottom && a[0] > b[0]) iLast = i; }
  if (iLast < 0) return lower;
  const notch = [];
  for (const [x, r] of [...wheels].sort((a, b) => b[0] - a[0])) {
    const cy = 53 - r * 1.08 + suspPx, R = r * 1.08 * ws + 1.5;
    for (let k = 0; k <= 14; k++) { const a = k / 14 * Math.PI, px = x + R * Math.cos(a), py = cy - R * Math.sin(a); notch.push([px, Math.min(py, bottom)]); }
  }
  const out = lower.slice(0, iLast + 1).concat(notch, lower.slice(iLast + 1));
  return out.filter((p, i, arr) => { const q = arr[(i + 1) % arr.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.05; });
}

const PLATE_N = {};
// spec: { color, W, lower:[], cabin:[], roofT, wheels:[[x,r]], extras(g, cx, W) }
function buildCar(spec) {
  const g = new THREE.Group();
  const xs = spec.lower.map(p => p[0]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const W = spec.W ?? 1.75;
  const paint = paintMat(spec.color);
  g.userData.paint = paint;
  const minX = Math.min(...xs), maxX = Math.max(...xs), bottom = Math.max(...spec.lower.map(p => p[1]));
  const X = (px) => (px - cx) / U, Y = (py) => (GY - py) / U;
  const outside = !!spec.track || spec.arches === false; // roues hors de la caisse (buggy, monster, F1…)
  // Caisse avec passages de roue découpés
  // Paliers d'amélioration : roues plus grandes (ws) et caisse surélevée (suspensions)
  const ws = spec.wscale ?? 1, suspLift = spec.suspLift ?? 0, suspPx = suspLift * U;
  const lower = outside ? spec.lower : archNotches(spec.lower, spec.wheels, ws, suspPx);
  g.add(extrude(lower, cx, W - 0.06, paint, 0.1, spec.round ?? 3.2));
  if (!outside) {
    // Intérieur noir des passages de roue
    for (const [x, r] of spec.wheels) {
      const well = new THREE.Mesh(new THREE.CylinderGeometry((r * 1.08 * ws + 1.4) / U, (r * 1.08 * ws + 1.4) / U, W - 0.12, 24, 1, true, -Math.PI / 2, Math.PI), carMat('well', () => new THREE.MeshStandardMaterial({ color: 0x0C0D10, roughness: 0.95, side: THREE.DoubleSide })));
      well.rotation.x = Math.PI / 2; well.position.set(X(x), Y(53 - r * 1.08) - suspLift, 0); g.add(well);
    }
    // Bas de caisse noir entre les roues et sous la voiture
    const sk = new THREE.Mesh(new THREE.BoxGeometry((maxX - minX) / U * 0.82, 0.07, W + 0.01), trimM()); sk.position.set(X((minX + maxX) / 2), Y(bottom) + 0.05, 0); g.add(sk);
    const under = new THREE.Mesh(new THREE.BoxGeometry((maxX - minX) / U * 0.9, 0.1, W - 0.3), trimM()); under.position.set(X((minX + maxX) / 2), Y(bottom) + 0.02, 0); g.add(under);
  }
  if (spec.cabin) {
    const c = spec.cabin, cw = W * (spec.cabinW ?? 0.86), tp = spec.taper ?? 0.16;
    const top = Math.min(...c.map(p => p[1])), base = Math.max(...c.map(p => p[1]));
    const yr = [Y(base), Y(top)], rT = spec.roofT ?? 2.6, cr = spec.cabRound ?? 3.5;
    // Cabine peinte (toit et montants), vitres posées dessus
    g.add(extrudeT(c, cx, cw - 0.04, paint, 0.06, cr, tp, yr));
    if (spec.roof !== false || true) {
      // Pare-brise et lunette arrière : plus étroits que la cabine pour laisser les montants peints
      const fr = clipY(offsetPoly(c, 1.7), top + rT * 0.9, true);
      if (fr.length >= 3) g.add(extrudeT(fr, cx, cw * 0.8, glassM(), 0.015, cr * 0.8, tp, yr));
      // Vitres latérales : en retrait du contour, entre la ceinture de caisse et le toit
      let sd = clipY(offsetPoly(c, -1.5), top + rT * 0.95, true); sd = clipY(sd, base - 1.2, false);
      if (sd.length >= 3) g.add(extrudeT(sd, cx, cw + 0.025, glassM(), 0.01, 1.5, tp, yr));
    }
    // Montant central (et arrière pour les longues cabines), joints de portes
    if (spec.pillar !== false) {
      const px = spec.pillarX ?? (Math.min(...c.filter(p => Math.abs(p[1] - top) < 0.6).map(p => p[0])) + Math.max(...c.filter(p => Math.abs(p[1] - top) < 0.6).map(p => p[0]))) / 2 + 2;
      g.add(extrudeT([[px - 1.1, base], [px - 1.1, top], [px + 1.1, top], [px + 1.1, base]], cx, cw + 0.04, paint, 0.01, 0.4, tp, yr));
      for (const sx of [px, Math.max(...c.map(p => p[0])) - 1]) {
        // joint de porte, raccourci au-dessus d'un passage de roue
        const wq = spec.wheels.find(([wx, wr]) => Math.abs(sx - wx) < wr + 2);
        const yb = wq ? Math.min(bottom, 53 - 2 * wq[1] - 2.2) : bottom;
        if (yb - base < 3) continue;
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.012, (yb - base) / U - 0.1, W + 0.004), trimM()); seam.position.set(X(sx), (Y(yb) + Y(base)) / 2 + 0.01, 0); g.add(seam);
      }
      // poignées chromées
      for (const hx of [px + 3, px - 9]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, W + 0.03), chromeM()); h.position.set(X(hx), Y(base) - 0.12, 0); g.add(h); }
    }
    // Rétroviseurs
    const front = c.reduce((a, p) => p[1] === base && p[0] > a[0] ? p : a, [-1e9, 0]);
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.14), trimM()); arm.position.set(X(front[0]) - 0.16, Y(base) + 0.05, s * (W / 2 - 0.02)); g.add(arm);
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.17), paint); mir.position.set(X(front[0]) - 0.18, Y(base) + 0.04, s * (W / 2 + 0.06)); g.add(mir);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.1), chromeM()); gl.rotation.y = -Math.PI / 2; gl.position.set(X(front[0]) - 0.235, Y(base) + 0.04, s * (W / 2 + 0.06)); g.add(gl);
    }
  }
  const ly = spec.lightY ?? 34, ty = spec.tailY ?? ly;
  const fx = X(maxX), rx = X(minX);
  if (spec.bumpers !== false) {
    const by = Y(spec.bumperY ?? 44);
    // Lèvres noires des boucliers, calandre, plaques et échappement
    for (const [x0, dx] of [[rx, -0.03], [fx, 0.03]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, W - 0.2), trimM()); b.position.set(x0 + dx, Y(bottom) + 0.06, 0); g.add(b); }
    const grilleTex = carMat('grilleTex', () => { const t = canvasTex(128, 32, (c2, Wd, H) => { c2.fillStyle = '#0D0E11'; c2.fillRect(0, 0, Wd, H); c2.strokeStyle = '#3A3E46'; c2.lineWidth = 2; for (let i = -H; i < Wd; i += 8) { c2.beginPath(); c2.moveTo(i, 0); c2.lineTo(i + H, H); c2.stroke(); c2.beginPath(); c2.moveTo(i + H, 0); c2.lineTo(i, H); c2.stroke(); } }); return t; });
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, W * 0.42), [trimM(), trimM(), trimM(), trimM(), trimM(), trimM()]);
    grille.material = [new THREE.MeshStandardMaterial({ map: grilleTex, roughness: 0.6 }), trimM(), trimM(), trimM(), trimM(), trimM()];
    grille.position.set(fx + 0.01, Y(ly) - 0.04, 0); g.add(grille);
    const n = PLATE_N[spec.name] ??= 100 + Object.keys(PLATE_N).length * 37 % 900;
    const pt = plateTex(`HK-${n}`), pm = new THREE.MeshStandardMaterial({ map: pt, roughness: 0.4 });
    const rp = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), pm); rp.rotation.y = -Math.PI / 2; rp.position.set(rx - 0.075, by + 0.14, 0); g.add(rp);
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), pm); fp.rotation.y = Math.PI / 2; fp.position.set(fx + 0.07, by + 0.06, 0); g.add(fp);
    for (const s of spec.sport ? [-1, 1] : [1]) {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 16, 1, true), chromeM()); ex.rotation.z = Math.PI / 2; ex.position.set(rx - 0.02, Y(bottom) + 0.07, s * (W / 2 - 0.35)); g.add(ex);
      const exi = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), trimM()); exi.rotation.y = -Math.PI / 2; exi.position.set(rx - 0.1, Y(bottom) + 0.07, s * (W / 2 - 0.35)); g.add(exi);
    }
  }
  // Phares : boîtier chromé, verre clair, projecteur ; feux arrière : verre rouge et anneaux lumineux
  const hlM = carMat('hl', () => new THREE.MeshStandardMaterial({ color: 0xFFFBEA, emissive: 0xFFF1C4, emissiveIntensity: 0.9, roughness: 0.1 }));
  const lensM = carMat('lens', () => withEnv(new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.35, roughness: 0.02, clearcoat: 1 }), 1.5));
  const tlBase = carMat('tlb', () => withEnv(new THREE.MeshPhysicalMaterial({ color: 0x5A0A0E, roughness: 0.1, clearcoat: 1 }), 1.2));
  const tlGlow = carMat('tlg', () => new THREE.MeshStandardMaterial({ color: 0xFF2A2A, emissive: 0xE0141E, emissiveIntensity: 1.1, roughness: 0.3 }));
  for (const s of [-1, 1]) {
    const hz = s * (W / 2 - 0.3);
    const hous = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.34), chromeM()); hous.position.set(fx + 0.01, Y(ly), hz); g.add(hous);
    const proj = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), hlM); proj.scale.x = 0.5; proj.position.set(fx + 0.04, Y(ly), hz + s * 0.07); g.add(proj);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.28), hlM); drl.position.set(fx + 0.045, Y(ly) - 0.05, hz); g.add(drl);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.36), lensM); lens.position.set(fx + 0.055, Y(ly), hz); g.add(lens);
    const tz = s * (W / 2 - 0.32);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.4), tlBase); tb.position.set(rx - 0.02, Y(ty), tz); g.add(tb);
    for (const dz of spec.sport ? [-0.1, 0.1] : [0]) {
      const ring = new THREE.Mesh(spec.sport ? new THREE.TorusGeometry(0.045, 0.014, 8, 20) : new THREE.BoxGeometry(0.02, 0.07, 0.34), tlGlow);
      if (spec.sport) ring.rotation.y = Math.PI / 2;
      ring.position.set(rx - 0.05, Y(ty) + (spec.sport ? 0 : 0.015), tz + dz); g.add(ring);
    }
  }
  const ww = spec.ww ?? 0.4;
  // La caisse monte avec la taille des roues (pour qu'elles ne la traversent pas) et avec les suspensions
  let bodyLift = suspLift;
  const wheelsG = [];
  for (const [x, r, rimCol, style] of spec.wheels) for (const s of [-1, 1]) {
    const R0 = r / U * ((style ?? spec.wstyle) === 'tread' || outside ? 1 : 1.08), R = R0 * ws;
    bodyLift = Math.max(bodyLift, (R - R0) + suspLift);
    const wh = wheel(R, ww * (spec.wwMul ?? 1), spec.rimTier ?? rimCol ?? spec.rim ?? 0xC9D1DC, spec.wstyleTier ?? style ?? spec.wstyle);
    const wz = s * (W / 2 - ww / 2 + 0.04 + (spec.track ?? 0));
    wh.position.set(X(x), R + (spec.lift ?? 0), wz); wh.userData.wheel = true; wheelsG.push([wh, x, R, wz]);
  }
  // Ombre douce de contact sous la voiture
  const blob = new THREE.Mesh(new THREE.PlaneGeometry((maxX - minX) / U + 0.5, W + 0.6 + (spec.track ?? 0) * 2), carMat('blob', () => new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (c2, Wd, H) => { const gr = c2.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, Wd, H); }), transparent: true, depthWrite: false })));
  blob.rotation.x = -Math.PI / 2; blob.position.set(X((minX + maxX) / 2), 0.015, 0); blob.renderOrder = -1; g.add(blob);
  if (spec.extras) spec.extras(g, cx, W, paint);
  // Caisse surélevée (paliers roues / suspensions) : tout monte sauf les roues et l'ombre au sol
  if (bodyLift > 0) for (const o of g.children) if (o !== blob) o.position.y += bodyLift;
  for (const [wh] of wheelsG) g.add(wh);
  // Suspensions apparentes à partir du 1er palier : ressorts hélicoïdaux colorés entre la roue et la caisse
  if (spec.suspTier > 0) {
    const col = [0xFFC21A, 0xE5383B, 0x2F86F0, 0x16A34A, 0xA855F7][Math.min(4, spec.suspTier - 1)];
    const springM = carMat('spring' + col, () => withEnv(new THREE.MeshStandardMaterial({ color: col, metalness: 0.6, roughness: 0.3 }), 1));
    const shockM = chromeM();
    for (const [, x, R, wz] of wheelsG) {
      const yb = Y(bottom) + bodyLift + 0.05, y0 = R, h = Math.max(0.15, yb - y0);
      const zz = wz - Math.sign(wz) * ((spec.ww ?? 0.4) * (spec.wwMul ?? 1) / 2 + 0.12);
      const pts = []; const turns = 5 + spec.suspTier;
      for (let k = 0; k <= turns * 12; k++) { const a = k / 12 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 0.075, k / (turns * 12) * h, Math.sin(a) * 0.075)); }
      const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.018, 5), springM);
      coil.position.set(X(x), y0, zz); g.add(coil);
      const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 8), shockM); shock.position.set(X(x), y0 + h / 2, zz); g.add(shock);
    }
  }
  shadowAll(g); blob.castShadow = false; blob.receiveShadow = false;
  applyCarEnv(g);
  return g;
}
const at = (cx, x, y) => [(x - cx) / U, (GY - y) / U];

export const CARS = {
  citadine: { name: 'Citadine', color: 0xE0281C, W: 1.7,
    lower: [[12, 46], [12, 32], [18, 27], [38, 25], [84, 25], [91, 29], [92, 35], [92, 46]],
    cabin: [[34, 26], [44, 11], [70, 11], [82, 26]], wheels: [[28, 7.5], [76, 7.5]], lightY: 31 },
  pickup: { name: 'Pick-up', color: 0x3E8E41, W: 1.85,
    lower: [[6, 46], [6, 26], [52, 26], [52, 27], [82, 27], [92, 29], [94, 34], [94, 46]],
    cabin: [[52, 27], [54, 10], [72, 10], [81, 27]], wheels: [[24, 8], [78, 8]], lightY: 32,
    extras: (g, cx, W, paint) => {
      // Benne : plancher sombre en retrait et ridelles peintes
      const [x] = at(cx, 29, 0), y0 = (53 - 26) / 25;
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.04, W - 0.3), mat(0x22262B, { r: 0.8 })); b.position.set(x, y0 + 0.1, 0); g.add(b);
      for (const s of [-1, 1]) { const rl = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.18, 0.08), paint); rl.position.set(x, y0 + 0.16, s * (W / 2 - 0.06)); g.add(rl); }
      const tg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, W - 0.06), paint); const [tx] = at(cx, 7.5, 0); tg.position.set(tx, y0 + 0.16, 0); g.add(tg);
    } },
  break: { name: 'Break', color: 0x5B7DB1, W: 1.75,
    lower: [[6, 46], [6, 27], [80, 26], [92, 29], [95, 35], [95, 46]],
    cabin: [[6, 27], [9, 12], [64, 12], [78, 26]], wheels: [[22, 7.5], [78, 7.5]], pillarX: 42, lightY: 33,
    extras: (g, cx, W) => { for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.05), mat(0x2A2F38)); const [x, y] = at(cx, 34, 10.2); r.position.set(x, y, s * 0.62); g.add(r); } } },
  camionnette: { name: 'Camionnette', color: 0xF4F6FA, W: 1.95,
    lower: [[6, 46], [6, 8], [70, 8], [70, 28], [93, 30], [94, 46]],
    cabin: [[70, 29], [70, 18], [81, 18], [92, 30]], roof: true, pillar: false, wheels: [[22, 8], [80, 8]], lightY: 36,
    extras: (g, cx, W) => { const s = new THREE.Mesh(new THREE.BoxGeometry(64 / 25, 0.2, W + 0.02), mat(0xFF8A3D)); const [x, y] = at(cx, 38, 30); s.position.set(x, y, 0); g.add(s); } },
  taxi: { name: 'Taxi', color: 0xF5C518, W: 1.8,
    lower: [[6, 46], [6, 32], [16, 26], [32, 25], [82, 25], [92, 27], [94, 34], [94, 46]],
    cabin: [[32, 25], [42, 12], [68, 12], [80, 25]], wheels: [[24, 7.5], [76, 7.5]], lightY: 31,
    extras: (g, cx, W) => {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.28, 0.42), [mat(0x14213D), mat(0x14213D), mat(0xFFF2B0, { e: 0xFFE27A, ei: 0.4 }), mat(0x14213D), mat(0xffffff, { map: textTex('TAXI', '#14213D', '#FFD23F', 256, 96, 'bold 64px sans-serif') }), mat(0xffffff, { map: textTex('TAXI', '#14213D', '#FFD23F', 256, 96, 'bold 64px sans-serif') })]);
      sign.rotation.y = Math.PI / 2; const [x, y] = at(cx, 55, 9.6); sign.position.set(x, y, 0); g.add(sign);
      const ck = canvasTex(256, 32, (c, Wd, H) => { c.fillStyle = '#F5C518'; c.fillRect(0, 0, Wd, H); c.fillStyle = '#14213D'; for (let i = 0; i < 16; i++) { c.fillRect(i * 16, (i % 2) * 16, 16, 16); } });
      for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.2), mat(0xffffff, { map: ck })); const [bx, by] = at(cx, 50, 35); b.position.set(bx, by, s * (W / 2 + 0.012)); if (s < 0) b.rotation.y = Math.PI; g.add(b); }
    } },
  buggy: { name: 'Buggy', color: 0xFF8A3D, W: 1.6, track: 0.15, ww: 0.5, wstyle: 'tread',
    lower: [[8, 44], [16, 33], [84, 33], [94, 42], [90, 44]],
    wheels: [[20, 10], [80, 10]], lightY: 37,
    extras: (g, cx, W) => {
      const tube = mat(0x1E2229, { m: 0.5, r: 0.4 });
      const pts = [[30, 33], [38, 12], [64, 12], [72, 33]];
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const a = new THREE.Vector3(...at(cx, ...pts[i]), s * 0.6), b = new THREE.Vector3(...at(cx, ...pts[i + 1]), s * 0.6);
        const len = a.distanceTo(b); const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), tube);
        cyl.position.copy(a).add(b).multiplyScalar(0.5); cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(cyl);
      }
      for (const px of [38, 64]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), tube); c.rotation.x = Math.PI / 2; const [x, y] = at(cx, px, 12); c.position.set(x, y, 0); g.add(c); }
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.9), mat(0x14213D)); const [sx, sy] = at(cx, 48, 27); seat.position.set(sx, sy, 0); g.add(seat);
    } },
  retro: { name: 'Rétro 60', color: 0x2BB3A3, W: 1.65, rim: 0xF4F6FA,
    lower: [[8, 46], [8, 33], [14, 28], [88, 28], [94, 34], [94, 46]],
    cabin: [[22, 29], [28, 17], [40, 10], [60, 9], [72, 14], [82, 29]], roofT: 3, wheels: [[26, 7.5], [76, 7.5]], lightY: 32 },
  campingcar: { name: 'Camping-car', color: 0xF4F6FA, W: 2.1,
    lower: [[4, 46], [4, 6], [93, 6], [93, 16], [80, 16], [80, 31], [95, 31], [95, 46]],
    cabin: [[80, 31], [80, 16], [86, 16], [95, 31]], roof: false, pillar: false, wheels: [[22, 8], [82, 8]], lightY: 37,
    extras: (g, cx, W) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(58 / 25, 0.16, W + 0.02), mat(0x2F80ED)); const [x, y] = at(cx, 33, 32); s.position.set(x, y, 0); g.add(s);
      for (const [wx, ww] of [[19, 14], [45, 22]]) { const w = new THREE.Mesh(new THREE.BoxGeometry(ww / 25, 0.4, W + 0.03), glassM()); const [x2, y2] = at(cx, wx, 19); w.position.set(x2, y2, 0); g.add(w); }
    } },
  q4x4: { name: '4x4', color: 0x6B8E23, W: 1.95, ww: 0.46, wstyle: 'tread',
    lower: [[8, 44], [8, 26], [66, 25], [74, 25], [92, 27], [92, 44]],
    cabin: [[10, 26], [12, 13], [64, 13], [72, 25]], pillarX: 36, wheels: [[26, 9], [78, 9]], lightY: 31,
    extras: (g, cx, W) => {
      const sp = wheel(7 / 25, 0.3, 0x6B8E23); sp.rotation.y = Math.PI / 2; const [x, y] = at(cx, 4, 30); sp.position.set(x, y, 0); g.add(sp);
      const rack = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, W - 0.5, 4, 8), mat(0x1E2229, { flat: false })); rack.rotation.x = Math.PI / 2; for (const dx of [-0.7, 0, 0.7]) { const rr = rack.clone(); const [qx, qy] = at(cx, 38, 11.1); rr.position.set(qx + dx, qy, 0); g.add(rr); } 
    } },
  police: { name: 'Police', color: 0xF4F6FA, W: 1.8,
    lower: [[6, 46], [6, 32], [16, 26], [32, 25], [82, 25], [92, 27], [94, 34], [94, 46]],
    cabin: [[32, 25], [42, 12], [68, 12], [80, 25]], wheels: [[24, 7.5], [76, 7.5]], lightY: 31,
    extras: (g, cx, W) => {
      const tx = textTex('POLICE', '#1E3A8A', '#FFFFFF', 512, 64, 'bold 46px sans-serif');
      for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.36), mat(0xffffff, { map: tx })); const [bx, by] = at(cx, 50, 34); b.position.set(bx, by, s * (W / 2 + 0.012)); if (s < 0) b.rotation.y = Math.PI; g.add(b); }
      const [x, y] = at(cx, 55, 9.8);
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.5), mat(0xFF2D2D, { e: 0xFF2D2D, ei: 1 })); r.position.set(x, y, -0.27); g.add(r);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.5), mat(0x2D7BFF, { e: 0x2D7BFF, ei: 1 })); b.position.set(x, y, 0.27); g.add(b);
    } },
  ambulance: { name: 'Ambulance', color: 0xF4F6FA, W: 2.0,
    lower: [[6, 46], [6, 10], [68, 10], [68, 30], [92, 31], [93, 46]],
    cabin: [[68, 30], [68, 20], [80, 20], [91, 31]], pillar: false, wheels: [[22, 8], [80, 8]], lightY: 37,
    extras: (g, cx, W) => {
      const s = new THREE.Mesh(new THREE.BoxGeometry(87 / 25, 0.22, W + 0.02), mat(0xE5383B)); const [x, y] = at(cx, 49.5, 33.5); s.position.set(x, y, 0); g.add(s);
      const tx = textTex('AMBULANCE', '#F4F6FA', '#E5383B', 512, 64, 'bold 44px sans-serif');
      for (const sg of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.3), mat(0xffffff, { map: tx })); const [bx, by] = at(cx, 37, 22); b.position.set(bx, by, sg * (W / 2 + 0.012)); if (sg < 0) b.rotation.y = Math.PI; g.add(b); }
      const [lx, ly] = at(cx, 72, 9.2); const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 1.0), mat(0x2D7BFF, { e: 0x2D7BFF, ei: 1 })); l.position.set(lx, ly, 0); g.add(l);
    } },
  muscle: { sport: true, name: 'Muscle car', color: 0x6A2C91, W: 1.85, ww: 0.44,
    lower: [[4, 44], [4, 31], [14, 28], [40, 27], [78, 27], [94, 29], [97, 34], [97, 44]],
    cabin: [[40, 27], [49, 16], [63, 16], [76, 27]], wheels: [[22, 8.5], [80, 7.5]], lightY: 32, pillar: false,
    extras: (g, cx, W, paint) => {
      const sc = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.45), mat(0x2B1238)); const [sx, sy] = at(cx, 85, 26); sc.position.set(sx, sy, 0); g.add(sc);
    } },
  rallye: { sport: true, name: 'Rallye', color: 0x1E6FD9, W: 1.75, rim: 0xFFD23F, ww: 0.42,
    lower: [[8, 46], [8, 26], [32, 24], [84, 25], [91, 28], [93, 34], [93, 46]],
    cabin: [[32, 24], [43, 11], [70, 11], [80, 25]], wheels: [[24, 7.5], [76, 7.5]], lightY: 31,
    extras: (g, cx, W) => {
      // Aileron posé sur le coffre : deux montants relient la lame à la carrosserie
      const [x] = at(cx, 12, 0), yTrunk = (53 - 25.6) / 25 + 0.04, y = yTrunk + 0.3;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, W), mat(0x14213D)); wing.position.set(x, y, 0); g.add(wing);
      for (const s of [-0.5, 0.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, y - yTrunk + 0.06, 0.06), mat(0x14213D)); p.position.set(x + 0.04, (y + yTrunk) / 2 - 0.02, s); g.add(p); }
      for (const s of [-1, 1]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.03), mat(0x14213D)); ep.position.set(x, y + 0.02, s * (W / 2 + 0.015)); g.add(ep); }
      const sc = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.3), mat(0x14213D)); const [sx, sy] = at(cx, 57, 9.8); sc.position.set(sx, sy, 0); g.add(sc);
      const num = canvasTex(256, 64, (c, Wd, H) => { c.fillStyle = '#FFD23F'; c.fillRect(0, 0, Wd, H); c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 32, 28, 0, 7); c.fill(); c.fillStyle = '#14213D'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', 128, 34); });
      for (const sg of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.36), mat(0xffffff, { map: num })); const [bx, by] = at(cx, 50, 33); b.position.set(bx, by, sg * (W / 2 + 0.012)); if (sg < 0) b.rotation.y = Math.PI; g.add(b); }
    } },
  monster: { name: 'Monster truck', color: 0xD62828, W: 1.9, lift: 0, bumperY: 31, ww: 0.75, track: 0.35, wstyle: 'tread',
    lower: [[10, 32], [10, 18], [44, 18], [44, 19], [76, 19], [88, 21], [90, 26], [90, 32]],
    cabin: [[44, 19], [46, 5], [64, 5], [72, 19]], wheels: [[24, 14], [76, 14]], lightY: 24,
    extras: (g, cx, W) => {
      for (const px of [24, 76]) for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), mat(0xFFC21A, { m: 0.4 })); const [x, y] = at(cx, px, 26); sh.position.set(x, y, s * 0.55); g.add(sh); }
      const ax = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.2), mat(0x2A2F38)); const [x, y] = at(cx, 50, 30); ax.position.set(x, y + 0.2, 0); g.add(ax);
    } },
  hotrod: { name: 'Hot rod', color: 0x1E2229, W: 1.6,
    lower: [[6, 44], [6, 26], [22, 24], [48, 24], [54, 27], [92, 30], [95, 36], [95, 44]],
    cabin: [[22, 24], [27, 12], [44, 12], [48, 24]], pillar: false, wheels: [[20, 10], [86, 6]], lightY: 36, tailY: 32,
    extras: (g, cx, W) => {
      const eng = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.8), mat(0xB8C0CC, { m: 0.9, r: 0.2 })); const [x, y] = at(cx, 68, 22); eng.position.set(x, y, 0); g.add(eng);
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), mat(0xDDE3EA, { m: 0.9, r: 0.15 })); p.position.set(x - 0.3 + i * 0.2, y + 0.35, s * 0.28); g.add(p); }
      const fl = canvasTex(512, 64, (c, Wd, H) => { c.fillStyle = '#1E2229'; c.fillRect(0, 0, Wd, H); for (let i = 0; i < 8; i++) { const x0 = 512 - i * 40; c.fillStyle = '#FF8A3D'; c.beginPath(); c.moveTo(x0, 64); c.quadraticCurveTo(x0 - 60, 30, x0 - 120 - i * 6, 20 + (i % 3) * 10); c.quadraticCurveTo(x0 - 40, 40, x0 - 20, 64); c.fill(); c.fillStyle = '#FFD23F'; c.beginPath(); c.moveTo(x0 - 6, 64); c.quadraticCurveTo(x0 - 40, 44, x0 - 80, 38); c.quadraticCurveTo(x0 - 30, 52, x0 - 18, 64); c.fill(); } });
      for (const sg of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.36), mat(0xffffff, { map: fl })); const [bx, by] = at(cx, 75, 37); b.position.set(bx, by, sg * (W / 2 + 0.012)); if (sg < 0) b.rotation.y = Math.PI; g.add(b); }
    } },
  limo: { name: 'Limousine', color: 0x16181E, W: 1.85, rim: 0xDDE3EA,
    lower: [[2, 44], [2, 32], [12, 28], [30, 27], [84, 27], [96, 29], [98, 34], [98, 44]],
    cabin: [[28, 27], [33, 19], [76, 19], [82, 27]], pillarX: 47, wheels: [[16, 7], [86, 7]], lightY: 32,
    extras: (g, cx, W, paint) => { const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, W * 0.85), paint); const [x, y] = at(cx, 62, 23); p2.position.set(x, y, 0); g.add(p2); } },
  supercar: { sport: true, name: 'Supercar', color: 0x16A34A, W: 1.9, rim: 0xFFD23F, ww: 0.44,
    lower: [[4, 44], [4, 32], [30, 29], [70, 29], [92, 32], [96, 37], [96, 44]],
    cabin: [[38, 30], [50, 20], [64, 20], [82, 31]], roofT: 1.8, pillar: false, wheels: [[24, 7.5], [80, 7.5]], lightY: 35,
    extras: (g, cx, W) => {
      // Aileron posé sur le capot arrière : montants jusqu'à la carrosserie
      const [x] = at(cx, 11, 0), yTrunk = (53 - 31.2) / 25 + 0.04, y = yTrunk + 0.32;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, W), mat(0x0B3B1C)); wing.position.set(x, y, 0); g.add(wing);
      for (const s of [-0.55, 0.55]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, y - yTrunk + 0.06, 0.06), mat(0x0B3B1C)); p.position.set(x + 0.04, (y + yTrunk) / 2 - 0.02, s); g.add(p); }
      for (const s of [-1, 1]) { const ep = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.03), mat(0x0B3B1C)); ep.position.set(x, y + 0.02, s * (W / 2 + 0.015)); g.add(ep); }
      for (const sg of [-1, 1]) { const intake = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.06), mat(0x0B3B1C)); const [ix, iy] = at(cx, 36, 36); intake.position.set(ix, iy, sg * (W / 2 + 0.01)); g.add(intake); }
    } },
  f1: { name: 'Formule 1', color: 0xE10600, W: 1.0, bumpers: false, ww: 0.6, track: 0.45,
    lower: [[10, 40], [14, 30], [50, 28], [58, 26], [66, 29], [98, 35], [98, 38], [60, 40]],
    wheels: [[22, 10], [80, 9]], lightY: 37,
    extras: (g, cx, W) => {
      const fw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 2.1), mat(0x14213D)); const [x, y] = at(cx, 95, 44); fw.position.set(x, y, 0); g.add(fw);
      const rw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 1.6), mat(0xE10600)); const [rx, ry] = at(cx, 8, 16); rw.position.set(rx, ry, 0); g.add(rw);
      const rp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), mat(0x14213D)); rp.position.set(rx + 0.1, ry - 0.3, 0); g.add(rp);
      const sp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.5), mat(0xE10600)); const [sx, sy] = at(cx, 40, 34); sp.position.set(sx, sy, 0); g.add(sp);
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat(0xFFD23F, { r: 0.2 })); const [hx, hy] = at(cx, 58, 24); helm.position.set(hx, hy, 0); g.add(helm);
    } },
  retrofutur: { sport: true, name: 'Rétro-futur', color: 0xC0C7D1, W: 1.8, rim: 0xE5383B,
    lower: [[4, 46], [4, 31], [30, 28], [70, 28], [92, 32], [96, 38], [96, 46]],
    wheels: [[24, 6.5], [76, 6.5]], lightY: 36,
    extras: (g, cx, W) => {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7FE0F5, { r: 0.05, m: 0.2, t: true, o: 0.85 })); const [x, y] = at(cx, 54, 28); dome.position.set(x, y - 0.05, 0); dome.scale.set(1.4, 0.9, 1); g.add(dome);
      for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.9, 0); sh.lineTo(0.1, 0.9); sh.closePath(); const f = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), mat(0xE5383B)); const [fx, fy] = at(cx, 4, 30); f.position.set(fx, fy - 0.04, s * 0.7 - 0.04); g.add(f); }
      for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.06, 0.02), mat(0xE5383B)); const [sx, sy] = at(cx, 50, 36); st.position.set(sx, sy, s * (W / 2 + 0.03)); g.add(st); }
    } },
  fusee: { name: 'Fusée', color: 0xF4F6FA, W: 1.2, bumpers: false, wheels: [[30, 6], [66, 6]], track: 0.25,
    lower: [[12, 44], [12, 40], [60, 40], [60, 44]], lightY: 42,
    extras: (g, cx, W) => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.6, 16), mat(0xF4F6FA, { r: 0.3 })); body.rotation.z = Math.PI / 2; const [x, y] = at(cx, 44, 34); body.position.set(x, y, 0); g.add(body);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 16), mat(0xE5383B, { r: 0.3 })); nose.rotation.z = -Math.PI / 2; nose.position.set(x + 1.85, y, 0); g.add(nose);
      for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.55), mat(0xE5383B)); const a = i * Math.PI / 2 + Math.PI / 4; f.position.set(x - 1.05, y + Math.sin(a) * 0.55, Math.cos(a) * 0.55); f.rotation.x = a; g.add(f); }
      const win = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat(0x7FE0F5, { r: 0.05 })); win.position.set(x + 0.6, y + 0.32, 0); g.add(win);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.0, 10), mat(0xFFB020, { e: 0xFF8A00, ei: 1.4 })); fl.rotation.z = Math.PI / 2; fl.position.set(x - 1.8, y, 0); g.add(fl);
      const fl2 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.6, 10), mat(0xFFF2B0, { e: 0xFFE14D, ei: 1.5 })); fl2.rotation.z = Math.PI / 2; fl2.position.set(x - 1.6, y, 0); g.add(fl2);
    } },
};
export const ORDER = ['citadine', 'pickup', 'break', 'camionnette', 'taxi', 'buggy', 'retro', 'campingcar', 'q4x4', 'police', 'ambulance', 'muscle', 'rallye', 'monster', 'hotrod', 'limo', 'supercar', 'f1', 'retrofutur', 'fusee'];

// Paliers visuels des améliorations : un palier toutes les 5 améliorations (max 5 paliers)
export const TIER_STEP = 5;
export const tierOf = (n) => Math.min(5, Math.floor((n || 0) / TIER_STEP));
const RIM_TIERS = [null, 0x2B2F36, 0xFFD23F, 0xE5383B, 0x34E0FF, 0xF4F6FA];
export function car(key, opts = {}) {
  const base = CARS[key], tp = tierOf(opts.tiers?.pneus), ts = tierOf(opts.tiers?.susp);
  const spec = { ...base };
  if (tp > 0) {
    // Pneus : roues plus grandes et plus larges, jantes d'une nouvelle couleur, crampons tout-terrain au palier 4
    spec.wscale = 1 + 0.07 * tp; spec.ww = (base.ww ?? 0.4) * (1 + 0.1 * tp); spec.rimTier = RIM_TIERS[tp];
    if (tp >= 4) spec.wstyleTier = 'tread';
  }
  if (ts > 0) { spec.suspLift = 0.07 * ts; spec.suspTier = ts; } // Suspensions : caisse relevée, ressorts visibles
  const g = buildCar(spec);
  applyCarEnv(g);
  // car faces +x; rotate so it faces -z (forward)
  const wrap = new THREE.Group(); g.rotation.y = Math.PI / 2; wrap.add(g); wrap.userData = { name: spec.name };
  return wrap;
}

// ---------- scene setup ----------
export function setup(w, h, opt = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!opt.alpha, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opt.exposure ?? 0.98;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  carEnvironment(renderer);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = opt.envI ?? 0.55;
  if (!opt.alpha) {
    scene.background = canvasTex(4, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, opt.skyTop ?? '#6DB8EC'); gr.addColorStop(0.6, opt.skyMid ?? '#B4E0F7'); gr.addColorStop(1, opt.skyBot ?? '#E4F5FF'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
    scene.fog = new THREE.Fog(opt.fog ?? 0xCFEAF7, opt.fogNear ?? 45, opt.fogFar ?? 230);
  }
  scene.add(new THREE.HemisphereLight(0xDDF1FF, 0x6A8A4A, opt.hemi ?? 0.75));
  const sun = new THREE.DirectionalLight(0xFFF4DE, opt.sun ?? 2.6);
  sun.position.set(14, 26, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -25; sc.right = 25; sc.top = 25; sc.bottom = -25; sc.near = 1; sc.far = 120; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const camera = new THREE.PerspectiveCamera(opt.fov ?? 52, w / h, 0.1, 600);
  return { renderer, scene, camera, sun, THREE };
}

export function scatterScenery(scene, opt = {}) {
  const r = rng(opt.seed ?? 11);
  const half = opt.half ?? 16;
  for (let i = 0; i < (opt.n ?? 320); i++) {
    const side = r() > 0.5 ? 1 : -1;
    const x = side * (half + 2.5 + Math.pow(r(), 1.8) * 60), z = 20 - r() * 520;
    const y = heightAt(x, z, opt);
    const k = r(); let o;
    if (k < 0.45) o = tree(1.2 + r() * 1.4, i % 4); else if (k < 0.7) o = pine(1.3 + r() * 1.2); else if (k < 0.85) o = rock(0.6 + r() * 1.4); else o = hay(1);
    o.position.set(x, y - 0.1, z); o.rotation.y = r() * 6; scene.add(o);
  }
  for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 2 * (half + 30), z = 10 - r() * 300; if (Math.abs(x) < half - 1) continue; const f = flowers(8, 3, 0, [0xF48FB1, 0xFFE27A, 0xFFFFFF, 0xB794F4][i % 4]); f.position.set(x, heightAt(x, z, opt) + 0.1, z); scene.add(f); }
}

export function place(obj, x, z, opt = {}, dy = 0) { obj.position.set(x, heightAt(x, z, opt) + dy, z); return obj; }
export function slopeRot(x, z, opt = {}) { const e = 0.5; return Math.atan2(heightAt(x, z - e, opt) - heightAt(x, z + e, opt), 2 * e); }

export function tufts(scene, opt, z0, z1, n, seed = 5) {
  const r = rng(seed); const half = opt.half ?? 16;
  const gm = [mat(0x3F8F2E), mat(0x56A63A), mat(0x2F7A2E)];
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * 2 * (half - 1), z = z0 - r() * (z0 - z1);
    const t = new THREE.Group();
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45 + r() * 0.3, 4), gm[(i + k) % 3]); c.position.set((r() - 0.5) * 0.3, 0.2, (r() - 0.5) * 0.3); c.rotation.z = (r() - 0.5) * 0.6; t.add(c); }
    place(t, x, z, opt, 0); scene.add(t);
  }
  for (let i = 0; i < n / 2; i++) { const x = (r() - 0.5) * 2 * (half - 1), z = z0 - r() * (z0 - z1); const f = flowers(5, 1.2, 0, [0xF48FB1, 0xFFE27A, 0xFFFFFF, 0xB794F4][i % 4]); place(f, x, z, opt, 0.1); scene.add(f); }
}
export function tracks(scene, opt, x, z0, len) {
  const m = new THREE.MeshStandardMaterial({ color: 0x3B7F2A, transparent: true, opacity: 0.22, roughness: 1, envMapIntensity: 0 });
  for (const s of [-0.62, 0.62]) for (let i = 0; i < len; i++) { const z = z0 + i * 0.5; const q = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.55), m); q.rotation.x = -Math.PI / 2 + slopeRot(x + s, z, opt); place(q, x + s, z, opt, 0.06); scene.add(q); }
}

// ---------- décors supplémentaires ----------
export function bush(s = 1, hue = 0) {
  const g = new THREE.Group(); const cols = [0x3E8E37, 0x4FA548, 0x5DB04A, 0x2F7A2E];
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry((0.55 - i * 0.1) * s, 0), mat(cols[(i + hue) % 4])); b.position.set((i - 1) * 0.45 * s, 0.4 * s, (i % 2 ? 0.2 : -0.15) * s); g.add(b); }
  return shadowAll(g);
}
// Clôture en bois : poteaux tous les 3 m et deux lisses, le long de l'axe z
export function fence(len = 12) {
  const g = new THREE.Group(); const wood = mat(0xB98A55), dark = mat(0x8A6236);
  const n = Math.max(2, Math.round(len / 3) + 1);
  for (let i = 0; i < n; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.18), dark); p.position.set(0, 0.55, -i * (len / (n - 1))); g.add(p); }
  for (const y of [0.45, 0.85]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, len), wood); r.position.set(0, y, -len / 2); g.add(r); }
  return shadowAll(g);
}
// Arche de passage au-dessus de la piste
export function arch(span = 46, color = 0xE5383B) {
  const g = new THREE.Group(); const stone = mat(0xB8BEC8), dark = mat(0x8C939E);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9, 2.2), stone); p.position.set(s * span / 2, 4.5, 0); g.add(p);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.6, 2.8), dark); cap.position.set(s * span / 2, 9.2, 0); g.add(cap);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(span + 3, 1.6, 1.8), mat(color)); beam.position.y = 9.6; g.add(beam);
  for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 4), mat(i % 2 ? 0xFFD23F : 0x2F86F0)); f.rotation.x = Math.PI; f.position.set(-span / 2 + 3 + i * (span - 6) / 8, 8.3, 0); g.add(f); }
  return shadowAll(g);
}
export function barn(s = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(8 * s, 5 * s, 10 * s), mat(0xB8452F)); body.position.y = 2.5 * s; g.add(body);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6 * s, 3.2 * s, 4, 1), mat(0x5A3A2A)); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 1.45); roof.position.y = 6.6 * s; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(3.4 * s, 3.4 * s, 0.1), mat(0xF4EADB)); door.position.set(0, 1.7 * s, 5.02 * s); g.add(door);
  const x1 = new THREE.Mesh(new THREE.BoxGeometry(4.6 * s, 0.25 * s, 0.12), mat(0xB8452F)); x1.rotation.z = 0.78; x1.position.set(0, 1.7 * s, 5.08 * s); g.add(x1);
  const x2 = x1.clone(); x2.rotation.z = -0.78; g.add(x2);
  return shadowAll(g);
}
export function cow(s = 1) {
  const g = new THREE.Group(); const w = mat(0xF4F4F0, { flat: false }), b = mat(0x24262B, { flat: false }), p = mat(0xF2A5B0, { flat: false });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55 * s, 1.1 * s, 4, 10), w); body.rotation.z = Math.PI / 2; body.position.y = 1.1 * s; g.add(body);
  for (const [x, z] of [[-0.2, 0.3], [0.4, -0.25]]) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 10, 8), b); sp.scale.set(1, 0.7, 0.4); sp.position.set(x * s, 1.25 * s, z > 0 ? 0.48 * s : -0.48 * s); g.add(sp); }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55 * s, 0.55 * s, 0.5 * s), w); head.position.set(1.15 * s, 1.35 * s, 0); g.add(head);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 0.32 * s, 0.46 * s), p); muzzle.position.set(1.48 * s, 1.25 * s, 0); g.add(muzzle);
  for (const [x, z] of [[-0.55, -0.3], [-0.55, 0.3], [0.55, -0.3], [0.55, 0.3]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.1 * s, 0.7 * s, 6), w); l.position.set(x * s, 0.35 * s, z * s); g.add(l); }
  for (const z of [-0.2, 0.2]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.25 * s, 5), mat(0xE8DCC2)); h.position.set(1.1 * s, 1.72 * s, z * s); g.add(h); }
  return shadowAll(g);
}
export function sign(text = '→', s = 1) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 2.2 * s, 6), mat(0x8A6236)); post.position.y = 1.1 * s; g.add(post);
  const t = canvasTex(256, 128, (c, W, H) => { c.fillStyle = '#FFC21A'; c.fillRect(0, 0, W, H); c.strokeStyle = '#1B2340'; c.lineWidth = 10; c.strokeRect(5, 5, W - 10, H - 10); c.fillStyle = '#1B2340'; c.font = 'bold 72px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, W / 2, H / 2 + 4); });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.6 * s, 0.8 * s, 0.08), [mat(0xFFC21A), mat(0xFFC21A), mat(0xFFC21A), mat(0xFFC21A), mat(0xffffff, { map: t }), mat(0xffffff, { map: t })]);
  board.position.y = 2.1 * s; g.add(board);
  return shadowAll(g);
}
// Statue de pierre posée sur la piste (obstacle : la percuter arrête la voiture)
export function statue(s = 1) {
  const g = new THREE.Group(); const st = mat(0xB9BEC6, { flat: true }), dk = mat(0x8E949E);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8 * s, 0.9 * s, 1.8 * s), dk); base.position.y = 0.45 * s; g.add(base);
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.3 * s, 0.9 * s, 1.3 * s), st); ped.position.y = 1.35 * s; g.add(ped);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * s, 0.5 * s, 1.5 * s, 7), st); body.position.y = 2.55 * s; g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36 * s, 0), st); head.position.y = 3.6 * s; g.add(head);
  for (const sd of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.12 * s, 1.1 * s, 6), st); arm.position.set(sd * 0.55 * s, 2.7 * s, 0); arm.rotation.z = sd * 0.5; g.add(arm); }
  return shadowAll(g);
}
// Gros rocher en plusieurs blocs (obstacle)
export function boulder(s = 1) {
  const g = new THREE.Group();
  const a = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 * s, 0), mat(0x8E949E)); a.scale.set(1.1, 0.85, 1); a.position.y = 0.7 * s; a.rotation.set(0.3, 0.8, 0.1); g.add(a);
  const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 * s, 0), mat(0xA4AAB3)); b.position.set(0.8 * s, 0.4 * s, 0.4 * s); b.rotation.set(0.5, 0.2, 0.7); g.add(b);
  const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 * s, 0), mat(0x7D838D)); c.position.set(-0.75 * s, 0.3 * s, -0.3 * s); g.add(c);
  return shadowAll(g);
}
// Objets cassables posés sur la piste : ils ne ralentissent pas, ils volent en éclats
export function crate(s = 1) {
  const t = canvasTex(128, 128, (c, W, H) => { c.fillStyle = '#C98B4A'; c.fillRect(0, 0, W, H); c.strokeStyle = '#7A4A1E'; c.lineWidth = 12; c.strokeRect(6, 6, W - 12, H - 12); c.beginPath(); c.moveTo(10, 10); c.lineTo(W - 10, H - 10); c.moveTo(W - 10, 10); c.lineTo(10, H - 10); c.stroke(); });
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.1 * s, 1.1 * s, 1.1 * s), mat(0xffffff, { map: t })); m.position.y = 0.55 * s;
  const g = new THREE.Group(); g.add(m); return shadowAll(g);
}
export function hayBlock(s = 1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.6 * s, 0.9 * s, 1 * s), mat(0xE2B75A)); m.position.y = 0.45 * s;
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.62 * s, 0.92 * s, 0.08), mat(0xA8792E)); band.position.y = 0.45 * s;
  const g = new THREE.Group(); g.add(m, band); return shadowAll(g);
}
