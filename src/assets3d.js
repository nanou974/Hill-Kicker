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
  return new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.6, metalness: o.m ?? 0.0, flatShading: o.flat ?? true, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, envMapIntensity: o.env ?? 0.2, transparent: o.t ?? false, opacity: o.o ?? 1, map: o.map ?? null });
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
  h += Math.sin(z * 0.045) * 2.2 + Math.sin(z * 0.11 + 1.3) * 0.9;
  h += Math.sin(x * 0.07 + z * 0.02) * 0.6;
  const ax = Math.abs(x);
  const half = opt.half ?? 16;
  if (ax > half) { const d = ax - half; h += Math.min(d * 0.22, 9) + Math.max(0, d - 40) * 0.25 + Math.sin(d * 0.15 + z * 0.05) * Math.min(d * 0.06, 2.5); }
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
export function rockShape(type, seed) {
  const g = new THREE.Group(), r = rng(seed + 1);
  const col = ROCK_COLORS[Math.floor(r() * ROCK_COLORS.length)];
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
export function launcher(len = 5.5, wid = 3.6, lit = 0x3DDC84) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.8, 0.5, len), mat(0x5B6474, { m: 0.5, r: 0.4 }));
  base.position.y = 0.25; g.add(base);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.12, len - 0.4), mat(0x1C1F25, { r: 0.9 }));
  belt.position.y = 0.56; g.add(belt);
  for (let i = 0; i < 9; i++) { const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, wid, 8), mat(0x3A3F48, { m: 0.6, r: 0.3 })); rl.rotation.z = Math.PI / 2; rl.position.set(0, 0.63, -len / 2 + 0.5 + i * (len - 1) / 8); g.add(rl); }
  const hz = hazardTex(); hz.wrapS = THREE.RepeatWrapping; hz.repeat.set(len / 2, 1);
  for (const sgn of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, len), [mat(0xffffff, { map: hz }), mat(0xffffff, { map: hz }), mat(0xFFC21A), mat(0x1E2229), mat(0xffffff, { map: hz }), mat(0xffffff, { map: hz })]);
    rail.position.set(sgn * (wid / 2 + 0.2), 0.7, 0); g.add(rail);
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 1.3), mat(0x6E7889, { m: 0.5, r: 0.35 }));
    motor.position.set(sgn * (wid / 2 + 0.9), 0.65, len / 2 - 0.4); g.add(motor);
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.5, 0.9), mat(0x2A2F38)); vent.position.set(sgn * (wid / 2 + 0.9), 0.9, len / 2 - 0.4); g.add(vent);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(lit, { e: lit, ei: 1.2 })); lamp.position.set(sgn * (wid / 2 + 0.9), 1.4, len / 2 - 0.4); g.add(lamp);
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
export function wheel(r, w, rimCol = 0xC9D1DC, style = 'std') {
  const g = new THREE.Group();
  const tr = Math.min(w / 2, r * 0.42);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r - tr, tr, 14, 32), mat(0x24272D, { r: 0.85, flat: false }));
  tire.scale.z = (w / 2) / tr; g.add(tire);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(r - tr, r - tr, w * 0.9, 28), mat(0x1B1D22, { r: 0.9, flat: false }));
  inner.rotation.x = Math.PI / 2; g.add(inner);
  const rimM = mat(rimCol, { m: 0.85, r: 0.22, flat: false, env: 1.2 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.56, r * 0.6, w * 0.92 + 0.02, 28), rimM);
  rim.rotation.x = Math.PI / 2; g.add(rim);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.44, r * 0.44, w * 0.92 + 0.05, 28), mat(0x5A616D, { m: 0.6, r: 0.35, flat: false }));
  dish.rotation.x = Math.PI / 2; g.add(dish);
  for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, r * 0.84, w * 0.92 + 0.07), rimM); sp.rotation.z = i / 5 * Math.PI * 2; g.add(sp); }
  for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 16, 10), rimM); cap.scale.z = 0.5; cap.position.z = s * (w * 0.46 + 0.03); g.add(cap); }
  if (style === 'tread') {
    const tm = mat(0x1B1D22, { r: 0.9, flat: false });
    for (let i = 0; i < 18; i++) { const t = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.07, w * 0.75, 4, 8), tm); t.rotation.x = Math.PI / 2; const a = i / 18 * Math.PI * 2; t.position.set(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, 0); g.add(t); }
  }
  return g;
}

function textTex(text, bg, fg, w = 256, h = 64, font = 'bold 40px sans-serif') {
  return canvasTex(w, h, (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 2); });
}

const glassM = () => mat(0x355E92, { r: 0.05, m: 0.45, flat: false, env: 1.8 });

// spec: { color, W, lower:[], cabin:[], roofT, wheels:[[x,r]], extras(g, cx, W) }
function buildCar(spec) {
  const g = new THREE.Group();
  const xs = spec.lower.map(p => p[0]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const W = spec.W ?? 1.75;
  const paint = mat(spec.color, { r: 0.32, m: 0.05, env: 0.45, flat: false });
  g.userData.paint = paint;
  g.add(extrude(spec.lower, cx, W - 0.06, paint, 0.14, spec.round ?? 4.5));
  if (spec.cabin) {
    const cw = W * (spec.cabinW ?? 0.86);
    const tp = spec.taper ?? 0.16;
    g.add(extrude(spec.cabin, cx, cw - 0.04, glassM(), 0.06, spec.cabRound ?? 3.5, tp));
    const c = spec.cabin; const top = Math.min(...c.map(p => p[1]));
    const t = spec.roofT ?? 2.6;
    const tops = c.filter(p => Math.abs(p[1] - top) < 0.6);
    const xa = Math.min(...tops.map(p => p[0])), xb = Math.max(...tops.map(p => p[0]));
    if (spec.roof !== false) {
      const roof = extrude([[xa - 1.2, top + t], [xa, top - 0.4], [xb, top - 0.4], [xb + 1.4, top + t]], cx, cw * (1 - tp * 0.9) + 0.03, paint, 0.06, 2.5);
      g.add(roof);
    }
    if (spec.pillar !== false) {
      const px = spec.pillarX ?? (xa + xb) / 2 + 2;
      const yb = Math.max(...c.map(p => p[1]));
      const ph = (yb - top) / U;
      const pil = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, ph - 0.1, 4, 8), paint);
      pil.scale.z = (cw * (1 - tp * 0.5) + 0.05) / 0.1; pil.position.set((px - cx) / U, (GY - (yb + top) / 2) / U, 0); g.add(pil);
    }
  }
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const ly = spec.lightY ?? 34;
  if (spec.bumpers !== false) {
    const by = (GY - (spec.bumperY ?? 44)) / U;
    const bm = mat(0x2A2D35, { r: 0.6, flat: false });
    for (const [x0, dx] of [[minX, -0.07], [maxX, 0.07]]) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, W - 0.4, 6, 12), bm); b.rotation.x = Math.PI / 2; b.position.set((x0 - cx) / U + dx, by, 0); g.add(b); }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.5), mat(0xF7F5EE)); plate.position.set((minX - cx) / U - 0.13, by + 0.22, 0); g.add(plate);
    const grille = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, W * 0.32, 4, 10), mat(0x2A2F38, { flat: false })); grille.rotation.x = Math.PI / 2; grille.position.set((maxX - cx) / U + 0.06, (GY - ly) / U - 0.02, 0); g.add(grille);
  }
  const hl = mat(0xFFF6CC, { e: 0xFFE27A, ei: 0.9, flat: false }), tl = mat(0xE01B24, { e: 0xC1121F, ei: 0.8, flat: false });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), hl); h.scale.set(0.45, 1, 1.2); h.position.set((maxX - cx) / U + 0.06, (GY - ly) / U, s * (W / 2 - 0.32)); g.add(h);
    const tt = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 4, 10), tl); tt.rotation.x = Math.PI / 2; tt.position.set((minX - cx) / U - 0.07, (GY - (spec.tailY ?? ly)) / U, s * (W / 2 - 0.34)); g.add(tt);
  }
  const ww = spec.ww ?? 0.4;
  for (const [x, r, rimCol, style] of spec.wheels) for (const s of [-1, 1]) {
    const R = r / U;
    const wh = wheel(R, ww * (spec.wwMul ?? 1), rimCol ?? spec.rim, style ?? spec.wstyle);
    const wz = s * (W / 2 - ww / 2 + 0.06 + (spec.track ?? 0));
    wh.position.set((x - cx) / U, (GY - 53 + r) / U + (spec.lift ?? 0), wz); g.add(wh);
    if (spec.arches !== false && !spec.track) {
      const ar = new THREE.Mesh(new THREE.TorusGeometry(R * 1.12, 0.06, 10, 24, Math.PI), paint);
      ar.position.set((x - cx) / U, (GY - 53 + r) / U, s * (W / 2 - 0.02)); ar.scale.z = 2.2; g.add(ar);
    }
  }
  if (spec.extras) spec.extras(g, cx, W, paint);
  return shadowAll(g);
}
const at = (cx, x, y) => [(x - cx) / U, (GY - y) / U];

export const CARS = {
  citadine: { name: 'Citadine', color: 0xE0281C, W: 1.7,
    lower: [[12, 46], [12, 32], [18, 27], [38, 25], [84, 25], [91, 29], [92, 35], [92, 46]],
    cabin: [[34, 26], [44, 11], [70, 11], [82, 26]], wheels: [[28, 7.5], [76, 7.5]], lightY: 31 },
  pickup: { name: 'Pick-up', color: 0x3E8E41, W: 1.85,
    lower: [[6, 46], [6, 26], [52, 26], [52, 27], [82, 27], [92, 29], [94, 34], [94, 46]],
    cabin: [[52, 27], [54, 10], [72, 10], [81, 27]], wheels: [[24, 8], [78, 8]], lightY: 32,
    extras: (g, cx, W) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, W - 0.4), mat(0x1F3A20)); const [x] = at(cx, 29, 0); b.position.set(x, (53 - 25) / 25 - 0.02, 0); g.add(b); } },
  break: { name: 'Break', color: 0x5B7DB1, W: 1.75,
    lower: [[6, 46], [6, 27], [80, 26], [92, 29], [95, 35], [95, 46]],
    cabin: [[6, 27], [9, 12], [64, 12], [78, 26]], wheels: [[22, 7.5], [78, 7.5]], pillarX: 42, lightY: 33,
    extras: (g, cx, W) => { for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.06), mat(0x2A2F38)); const [x, y] = at(cx, 34, 8.4); r.position.set(x, y, s * 0.62); g.add(r); } } },
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
      const rack = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, W - 0.5, 4, 8), mat(0x1E2229, { flat: false })); rack.rotation.x = Math.PI / 2; for (const dx of [-0.7, 0, 0.7]) { const rr = rack.clone(); const [qx, qy] = at(cx, 38, 9.5); rr.position.set(qx + dx, qy, 0); g.add(rr); } 
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
  muscle: { name: 'Muscle car', color: 0x6A2C91, W: 1.85, ww: 0.44,
    lower: [[4, 44], [4, 31], [14, 28], [40, 27], [78, 27], [94, 29], [97, 34], [97, 44]],
    cabin: [[40, 27], [49, 16], [63, 16], [76, 27]], wheels: [[22, 8.5], [80, 7.5]], lightY: 32, pillar: false,
    extras: (g, cx, W, paint) => {
      for (const s of [-0.18, 0.18]) { const st = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.03, 0.16), mat(0xFFFFFF)); const [x, y] = at(cx, 50, 15.6); st.position.set(x, y, s); g.add(st);
        const st2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.03, 0.16), mat(0xFFFFFF)); const [x2, y2] = at(cx, 87, 28.3); st2.position.set(x2, y2, s); g.add(st2); }
      const sc = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.45), mat(0x2B1238)); const [sx, sy] = at(cx, 85, 26); sc.position.set(sx, sy, 0); g.add(sc);
    } },
  rallye: { name: 'Rallye', color: 0x1E6FD9, W: 1.75, rim: 0xFFD23F, ww: 0.42,
    lower: [[8, 46], [8, 26], [32, 24], [84, 25], [91, 28], [93, 34], [93, 46]],
    cabin: [[32, 24], [43, 11], [70, 11], [80, 25]], wheels: [[24, 7.5], [76, 7.5]], lightY: 31,
    extras: (g, cx, W) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, W), mat(0x14213D)); const [x, y] = at(cx, 9, 9); wing.position.set(x, y, 0); g.add(wing);
      for (const s of [-0.5, 0.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.06), mat(0x14213D)); p.position.set(x + 0.05, y - 0.2, s); g.add(p); }
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
  supercar: { name: 'Supercar', color: 0x16A34A, W: 1.9, rim: 0xFFD23F, ww: 0.44,
    lower: [[4, 44], [4, 32], [30, 29], [70, 29], [92, 32], [96, 37], [96, 44]],
    cabin: [[38, 30], [50, 20], [64, 20], [82, 31]], roofT: 1.8, pillar: false, wheels: [[24, 7.5], [80, 7.5]], lightY: 35,
    extras: (g, cx, W) => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, W), mat(0x0B3B1C)); const [x, y] = at(cx, 8, 23); wing.position.set(x, y, 0); g.add(wing);
      for (const s of [-0.55, 0.55]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.06), mat(0x0B3B1C)); p.position.set(x + 0.05, y - 0.12, s); g.add(p); }
      for (const sg of [-1, 1]) { const intake = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.06), mat(0x0B3B1C)); const [ix, iy] = at(cx, 36, 36); intake.position.set(ix, iy, sg * (W / 2 + 0.01)); g.add(intake); }
    } },
  f1: { name: 'Formule 1', color: 0xE10600, W: 1.0, ww: 0.6, track: 0.45,
    lower: [[10, 40], [14, 30], [50, 28], [58, 26], [66, 29], [98, 35], [98, 38], [60, 40]],
    wheels: [[22, 10], [80, 9]], lightY: 37,
    extras: (g, cx, W) => {
      const fw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 2.1), mat(0x14213D)); const [x, y] = at(cx, 95, 44); fw.position.set(x, y, 0); g.add(fw);
      const rw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 1.6), mat(0xE10600)); const [rx, ry] = at(cx, 8, 16); rw.position.set(rx, ry, 0); g.add(rw);
      const rp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.1), mat(0x14213D)); rp.position.set(rx + 0.1, ry - 0.3, 0); g.add(rp);
      const sp = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 1.5), mat(0xE10600)); const [sx, sy] = at(cx, 40, 34); sp.position.set(sx, sy, 0); g.add(sp);
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat(0xFFD23F, { r: 0.2 })); const [hx, hy] = at(cx, 58, 24); helm.position.set(hx, hy, 0); g.add(helm);
    } },
  retrofutur: { name: 'Rétro-futur', color: 0xC0C7D1, W: 1.8, rim: 0xE5383B,
    lower: [[4, 46], [4, 31], [30, 28], [70, 28], [92, 32], [96, 38], [96, 46]],
    wheels: [[24, 6.5], [76, 6.5]], lightY: 36,
    extras: (g, cx, W) => {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x7FE0F5, { r: 0.05, m: 0.2, t: true, o: 0.85 })); const [x, y] = at(cx, 54, 28); dome.position.set(x, y - 0.05, 0); dome.scale.set(1.4, 0.9, 1); g.add(dome);
      for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.9, 0); sh.lineTo(0.1, 0.9); sh.closePath(); const f = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), mat(0xE5383B)); const [fx, fy] = at(cx, 4, 30); f.position.set(fx, fy - 0.04, s * 0.7 - 0.04); g.add(f); }
      for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.06, 0.02), mat(0xE5383B)); const [sx, sy] = at(cx, 50, 36); st.position.set(sx, sy, s * (W / 2 + 0.03)); g.add(st); }
    } },
  fusee: { name: 'Fusée', color: 0xF4F6FA, W: 1.2, wheels: [[30, 6], [66, 6]], track: 0.25,
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

export function car(key, opts = {}) {
  const spec = { ...CARS[key], ...(opts.upgraded ? { ww: 0.5, rim: 0xFFD23F, lift: 0.12 } : {}) };
  const g = buildCar(spec);
  if (opts.upgraded) {
    // visible shocks
    for (const px of [28, 76]) for (const s of [-1, 1]) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), mat(0xFFC21A, { m: 0.5 })); sh.position.set((px - 52) / 25, 0.55, s * 0.62); g.add(sh); }
  }
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
