// Mondes du jeu : chaque niveau a son paysage (ciel, couleurs du terrain, décor, objets sur la piste).
// Après le dernier monde, le jeu recommence au premier (niveau 21 = monde 1, etc.) : il n'y a pas de fin.
// Le relief, les virages et les obstacles typiques de chaque monde sont dans tracks.js (même ordre que THEMES).
import * as THREE from 'three';
import * as A from '../assets3d.js';
import { TRACKS } from './tracks.js';

// ---------- matériaux partagés (un seul matériau par couleur : le décor fusionné en profite) ----------
const mats = new Map();
const M = (c, o) => { const k = c + JSON.stringify(o || {}); if (!mats.has(k)) mats.set(k, A.mat(c, o)); return mats.get(k); };
const mesh = (geo, c, o) => new THREE.Mesh(geo, M(c, o));
const shadow = (g) => { g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; };
const set = (c, rgb, n = 0) => c.setRGB(rgb[0] + n, rgb[1] + n, rgb[2] + n * 0.5, THREE.SRGBColorSpace);
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------- décors communs à plusieurs mondes ----------
function leafyTree(s, cols, trunk = 0x7A5230, hue = 0) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 1.6 * s, 6), trunk); t.position.y = 0.8 * s; g.add(t);
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.IcosahedronGeometry((1.1 - i * 0.18) * s, 0), cols[(i + hue) % cols.length]);
    b.position.set((i - 1) * 0.45 * s, (1.9 + i * 0.55) * s, (i % 2 ? 0.3 : -0.2) * s); b.rotation.set(i * 1.3 + hue, i * 2.1, 0); g.add(b);
  }
  return shadow(g);
}
function blobBush(s, cols, hue = 0) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.IcosahedronGeometry((0.55 - i * 0.1) * s, 0), cols[(i + hue) % cols.length]); b.position.set((i - 1) * 0.45 * s, 0.4 * s, (i % 2 ? 0.2 : -0.15) * s); g.add(b); }
  return shadow(g);
}
// Mare ou lagon : disque plat orienté selon la pente du terrain
function pond(rad, water, rim) {
  const g = new THREE.Group();
  const r = mesh(new THREE.CircleGeometry(rad + 0.7, 9), rim); r.rotation.x = -Math.PI / 2; r.position.y = 0.06; g.add(r);
  const w = mesh(new THREE.CircleGeometry(rad, 9), water, { r: 0.15, m: 0.1, env: 0.8 }); w.rotation.x = -Math.PI / 2; w.position.y = 0.12; g.add(w);
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return g;
}

// ---------- Champs de lavande ----------
function cypress(s) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.8 * s, 5), 0x6B4A2B); t.position.y = 0.4 * s; g.add(t);
  const c = mesh(new THREE.IcosahedronGeometry(1, 0), 0x2E5A2E); c.scale.set(0.6 * s, 2.6 * s, 0.6 * s); c.position.y = 3 * s; g.add(c);
  return shadow(g);
}
function olive(s, hue) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.16 * s, 0.32 * s, 1.3 * s, 5), 0x6E5A44); t.position.y = 0.65 * s; t.rotation.z = 0.15; g.add(t);
  const cols = [0x8FA37A, 0x7F9668, 0x9DB08A];
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.IcosahedronGeometry((0.85 - i * 0.12) * s, 0), cols[(i + hue) % 3]); b.scale.y = 0.7; b.position.set((i - 1) * 0.6 * s, (1.6 + (i % 2) * 0.35) * s, (i % 2 ? 0.3 : -0.25) * s); g.add(b); }
  return shadow(g);
}
// Morceau de rangée de lavande : bande bombée violette de 3 m (les rangées sont posées morceau par morceau pour suivre le relief)
const LAV_GEO = new THREE.CylinderGeometry(0.5, 0.5, 3.1, 6, 1);
function lavender(hue) {
  const m = mesh(LAV_GEO, hue ? 0x9A7AD0 : 0x8A68C4); m.rotation.x = Math.PI / 2; m.scale.set(1, 1, 0.75); m.position.y = 0.3;
  const g = new THREE.Group(); g.add(m); return g;
}
function mas(s) {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(9 * s, 4.5 * s, 6 * s), 0xE8D8B8); body.position.y = 2.25 * s; g.add(body);
  const wing = mesh(new THREE.BoxGeometry(4 * s, 3.2 * s, 5 * s), 0xDCCBA8); wing.position.set(6.3 * s, 1.6 * s, 0.4 * s); g.add(wing);
  for (const [w, d, x, y] of [[9.6, 6.6, 0, 4.5], [4.5, 5.6, 6.3, 3.2]]) {
    const roof = mesh(new THREE.CylinderGeometry(0.01, 1, 1, 4, 1), 0xC8643C); roof.rotation.y = Math.PI / 4; roof.scale.set(w * 0.72 * s, 1.4 * s, d * 0.72 * s); roof.position.set(x * s, (y + 0.7) * s, 0); g.add(roof);
  }
  for (const x of [-2.8, 0, 2.8]) { const sh = mesh(new THREE.BoxGeometry(1.1 * s, 1.3 * s, 0.12), 0x6FA8C8); sh.position.set(x * s, 2.8 * s, 3.02 * s); g.add(sh); }
  const door = mesh(new THREE.BoxGeometry(1.3 * s, 2.2 * s, 0.12), 0x7A5230); door.position.set(-1.4 * s, 1.1 * s, 3.02 * s); g.add(door);
  const ch = mesh(new THREE.BoxGeometry(0.7 * s, 1.6 * s, 0.7 * s), 0xD6C4A0); ch.position.set(2.5 * s, 5.6 * s, -1 * s); g.add(ch);
  return shadow(g);
}
function beehives(n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const h = new THREE.Group();
    for (let k = 0; k < 2; k++) { const b = mesh(new THREE.BoxGeometry(0.8, 0.45, 0.65), k ? 0xF3E9D2 : 0xE8D9B4); b.position.y = 0.55 + k * 0.47; h.add(b); }
    const lid = mesh(new THREE.BoxGeometry(0.95, 0.12, 0.8), 0xE0A93A); lid.position.y = 1.32; h.add(lid);
    for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) { const l = mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), 0x7A5230); l.position.set(x, 0.17, z); h.add(l); }
    h.position.x = i * 1.4; g.add(h);
  }
  return shadow(g);
}
function stoneWall(len) {
  const g = new THREE.Group(), n = Math.round(len / 1.5);
  for (let i = 0; i < n; i++) { const b = mesh(new THREE.BoxGeometry(0.6, 0.55 + (i % 3) * 0.08, 1.45), i % 2 ? 0xCFC2A8 : 0xBFB197); b.position.set(0, 0.3, -i * 1.5 - 0.75); b.rotation.y = (i % 3 - 1) * 0.04; g.add(b); }
  return shadow(g);
}

// ---------- Forêt d'automne ----------
const AUTUMN = [0xE07B2A, 0xC94A2A, 0xF2B33D, 0xB8562A, 0xE89A35];
function birch(s, hue) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.13 * s, 0.17 * s, 3.2 * s, 6), 0xEDE8DC); t.position.y = 1.6 * s; g.add(t);
  for (const y of [0.7, 1.5, 2.3]) { const b = mesh(new THREE.BoxGeometry(0.36 * s, 0.08 * s, 0.36 * s), 0x2B2B2B); b.position.y = y * s; g.add(b); }
  const cols = [0xF2C94C, 0xE8B23A, 0xF7D86A];
  for (let i = 0; i < 2; i++) { const c = mesh(new THREE.IcosahedronGeometry((0.95 - i * 0.2) * s, 0), cols[(i + hue) % 3]); c.position.set((i - 0.5) * 0.4 * s, (3.4 + i * 0.6) * s, 0); c.scale.y = 1.25; g.add(c); }
  return shadow(g);
}
function autumnPine(s) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1 * s, 6), 0x5A3E24); t.position.y = 0.5 * s; g.add(t);
  for (let i = 0; i < 3; i++) { const c = mesh(new THREE.ConeGeometry((1.3 - i * 0.32) * s, 1.5 * s, 7), i % 2 ? 0x2A5E35 : 0x356B3C); c.position.y = (1.4 + i * 0.75) * s; g.add(c); }
  return shadow(g);
}
function log(len) {
  const g = new THREE.Group();
  const l = mesh(new THREE.CylinderGeometry(0.42, 0.48, len, 7), 0x6E4A2C); l.rotation.z = Math.PI / 2; l.position.y = 0.42; g.add(l);
  for (const s of [-1, 1]) { const e = mesh(new THREE.CircleGeometry(0.4, 7), 0xD9B27A); e.rotation.y = s * Math.PI / 2; e.position.set(s * (len / 2 + 0.01), 0.42, 0); g.add(e); }
  const moss = mesh(new THREE.BoxGeometry(len * 0.4, 0.1, 0.5), 0x5E8A3A); moss.position.set(len * 0.1, 0.86, 0); g.add(moss);
  return shadow(g);
}
// Champignon géant (décor ou obstacle sur la piste : chapeau rouge à pois blancs)
export function mushroom(s = 1) {
  const g = new THREE.Group();
  const st = mesh(new THREE.CylinderGeometry(0.45 * s, 0.6 * s, 2.6 * s, 8), 0xF2EADB, { flat: false }); st.position.y = 1.3 * s; g.add(st);
  const cap = mesh(new THREE.SphereGeometry(1.5 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xD8332F); cap.scale.y = 0.75; cap.position.y = 2.5 * s; g.add(cap);
  const under = mesh(new THREE.CircleGeometry(1.5 * s, 10), 0xEFD9C0); under.rotation.x = Math.PI / 2; under.position.y = 2.5 * s; g.add(under);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, el = i === 0 ? 1.2 : 0.55 + (i % 2) * 0.35, d = mesh(new THREE.IcosahedronGeometry(0.2 * s, 0), 0xFFFFFF);
    d.position.set(Math.cos(a) * Math.cos(el) * 1.5 * s, 2.5 * s + Math.sin(el) * 1.12 * s, Math.sin(a) * Math.cos(el) * 1.5 * s); d.scale.y = 0.5; g.add(d);
  }
  return shadow(g);
}
function leafPile(s, hue) {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const l = mesh(new THREE.IcosahedronGeometry(0.5 * s, 0), AUTUMN[(i + hue) % AUTUMN.length]); l.scale.y = 0.35; l.position.set((i - 1.5) * 0.45 * s, 0.12 * s, (i % 2 - 0.5) * 0.5 * s); g.add(l); }
  return g;
}
function pumpkin(s = 1) {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.62 * s, 9, 6), 0xF07A1F); b.scale.y = 0.72; b.position.y = 0.45 * s; g.add(b);
  const st = mesh(new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.3 * s, 5), 0x4F7A2A); st.position.y = 0.95 * s; g.add(st);
  return shadow(g);
}

// ---------- Plage tropicale ----------
function palm(s, lean) {
  const g = new THREE.Group();
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < 6; i++) {
    const seg = mesh(new THREE.CylinderGeometry((0.2 - i * 0.015) * s, (0.24 - i * 0.015) * s, 1.1 * s, 6), i % 2 ? 0x9C7A52 : 0x8A6A45);
    seg.position.set(x, y + 0.55 * s, 0); seg.rotation.z = -a; g.add(seg);
    x += Math.sin(a) * 1.05 * s; y += Math.cos(a) * 1.05 * s; a += lean;
  }
  const top = new THREE.Group(); top.position.set(x, y, 0); g.add(top);
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Group(); f.rotation.y = i / 7 * Math.PI * 2;
    const leaf = mesh(new THREE.BoxGeometry(2.6 * s, 0.06 * s, 0.7 * s), i % 2 ? 0x3E9A3A : 0x4FB247); leaf.position.x = 1.2 * s; leaf.rotation.z = -0.45; f.add(leaf);
    top.add(f);
  }
  for (let i = 0; i < 3; i++) { const c = mesh(new THREE.IcosahedronGeometry(0.17 * s, 0), 0x5A3E24); c.position.set(Math.cos(i * 2.1) * 0.25 * s, -0.2 * s, Math.sin(i * 2.1) * 0.25 * s); top.add(c); }
  return shadow(g);
}
function umbrella(col) {
  const g = new THREE.Group();
  const p = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 5), 0xF2F2F2); p.position.y = 1.2; p.rotation.z = 0.12; g.add(p);
  const c = mesh(new THREE.ConeGeometry(1.5, 0.55, 8), col); c.position.set(-0.14, 2.45, 0); g.add(c);
  const t = mesh(new THREE.BoxGeometry(0.9, 0.04, 1.8), col === 0xE5383B ? 0x2F86F0 : 0xFFC21A); t.position.set(1.1, 0.05, 0.3); g.add(t);
  return shadow(g);
}
function hut(s) {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) { const p = mesh(new THREE.CylinderGeometry(0.12 * s, 0.14 * s, 2.4 * s, 5), 0x8A6A45); p.position.set(x * s, 1.2 * s, z * s); g.add(p); }
  const roof = mesh(new THREE.ConeGeometry(2.9 * s, 1.8 * s, 4), 0xD9B36A); roof.rotation.y = Math.PI / 4; roof.position.y = 3.2 * s; g.add(roof);
  const bar = mesh(new THREE.BoxGeometry(3 * s, 1 * s, 0.6 * s), 0xA87C4F); bar.position.set(0, 0.5 * s, 1.3 * s); g.add(bar);
  return shadow(g);
}
function surfboard(col) {
  const g = new THREE.Group();
  const b = mesh(new THREE.CapsuleGeometry(0.28, 1.6, 3, 8), col); b.scale.z = 0.25; b.position.y = 1.0; b.rotation.z = 0.15; g.add(b);
  return shadow(g);
}
function shell(col) {
  const m = mesh(new THREE.ConeGeometry(0.25, 0.2, 5), col); m.position.y = 0.1; return m;
}
// Totem en bois (obstacle sur la piste de la plage)
export function tiki(s = 1) {
  const g = new THREE.Group();
  const cols = [0x8A5A30, 0x7A4E28, 0x9C6838];
  for (let i = 0; i < 3; i++) {
    const b = mesh(new THREE.BoxGeometry(1.25 * s, 1.15 * s, 1.15 * s), cols[i]); b.position.y = (0.6 + i * 1.2) * s; g.add(b);
    for (const x of [-0.28, 0.28]) { const e = mesh(new THREE.BoxGeometry(0.28 * s, 0.22 * s, 0.08), 0xF4EADB); e.position.set(x * s, (0.85 + i * 1.2) * s, 0.6 * s); g.add(e); }
    const mo = mesh(new THREE.BoxGeometry(0.7 * s, 0.18 * s, 0.08), 0x2B1A0E); mo.position.set(0, (0.4 + i * 1.2) * s, 0.6 * s); g.add(mo);
  }
  const top = mesh(new THREE.ConeGeometry(0.9 * s, 0.6 * s, 4), 0x4FB247); top.rotation.y = Math.PI / 4; top.position.y = 3.9 * s; g.add(top);
  return shadow(g);
}
function beachBall(s = 1) {
  const g = new THREE.Group();
  const cols = [0xE5383B, 0xFFFFFF, 0x2F86F0, 0xFFC21A];
  for (let i = 0; i < 4; i++) { const p = mesh(new THREE.SphereGeometry(0.55 * s, 8, 6, i * Math.PI / 2, Math.PI / 2), cols[i], { flat: false }); p.position.y = 0.55 * s; g.add(p); }
  return shadow(g);
}

// ---------- Savane ----------
function acacia(s) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.14 * s, 0.24 * s, 2.6 * s, 5), 0x6B4A2B); t.position.y = 1.3 * s; g.add(t);
  for (const sd of [-1, 1]) { const b = mesh(new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 1.8 * s, 5), 0x6B4A2B); b.position.set(sd * 0.55 * s, 3 * s, 0); b.rotation.z = -sd * 0.7; g.add(b); }
  const c = mesh(new THREE.CylinderGeometry(2.6 * s, 2.1 * s, 0.6 * s, 7), 0x6E8B3D); c.position.y = 3.7 * s; g.add(c);
  const c2 = mesh(new THREE.CylinderGeometry(1.6 * s, 1.5 * s, 0.4 * s, 7), 0x7D9A45); c2.position.set(0.5 * s, 4.1 * s, 0.3 * s); g.add(c2);
  return shadow(g);
}
function baobab(s) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.9 * s, 1.4 * s, 4.2 * s, 7), 0x9C8670); t.position.y = 2.1 * s; g.add(t);
  for (let i = 0; i < 5; i++) { const a = i * 1.26, b = mesh(new THREE.CylinderGeometry(0.1 * s, 0.25 * s, 1.6 * s, 5), 0x8A7560); b.position.set(Math.cos(a) * 0.8 * s, 4.6 * s, Math.sin(a) * 0.8 * s); b.rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); g.add(b); }
  for (let i = 0; i < 3; i++) { const l = mesh(new THREE.IcosahedronGeometry(0.8 * s, 0), 0x7D9A45); l.scale.y = 0.6; l.position.set(Math.cos(i * 2.1) * 1.4 * s, 5.4 * s, Math.sin(i * 2.1) * 1.4 * s); g.add(l); }
  return shadow(g);
}
// Termitière (décor, ou obstacle sur la piste de la savane)
export function termite(s = 1) {
  const g = new THREE.Group();
  const a = mesh(new THREE.ConeGeometry(1.15 * s, 3.9 * s, 7), 0xB5603A); a.position.y = 1.95 * s; g.add(a);
  const b = mesh(new THREE.ConeGeometry(0.5 * s, 1.8 * s, 6), 0xA65434); b.position.set(0.7 * s, 0.9 * s, 0.3 * s); g.add(b);
  const c = mesh(new THREE.ConeGeometry(0.4 * s, 1.3 * s, 6), 0xC2704A); c.position.set(-0.6 * s, 0.65 * s, -0.4 * s); g.add(c);
  return shadow(g);
}
function giraffe(s) {
  const g = new THREE.Group(), y = 0xE3B04B, sp = 0x9C5A2A;
  const body = mesh(new THREE.BoxGeometry(1.8 * s, 1 * s, 0.8 * s), y); body.position.y = 2.1 * s; g.add(body);
  const neck = mesh(new THREE.BoxGeometry(0.4 * s, 2.4 * s, 0.4 * s), y); neck.position.set(0.85 * s, 3.4 * s, 0); neck.rotation.z = -0.35; g.add(neck);
  const head = mesh(new THREE.BoxGeometry(0.8 * s, 0.4 * s, 0.4 * s), y); head.position.set(1.4 * s, 4.6 * s, 0); g.add(head);
  for (const [x, z] of [[-0.7, -0.3], [-0.7, 0.3], [0.7, -0.3], [0.7, 0.3]]) { const l = mesh(new THREE.BoxGeometry(0.2 * s, 1.7 * s, 0.2 * s), y); l.position.set(x * s, 0.85 * s, z * s); g.add(l); }
  for (const [x, yy, z] of [[-0.5, 2.3, 0.41], [0.2, 2.0, 0.41], [0.5, 2.35, -0.41], [-0.2, 2.1, -0.41]]) { const d = mesh(new THREE.BoxGeometry(0.35 * s, 0.3 * s, 0.04), sp); d.position.set(x * s, yy * s, z * s); g.add(d); }
  return shadow(g);
}
function tallGrass(n, col) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const c = mesh(new THREE.ConeGeometry(0.12, 0.9 + (i % 3) * 0.25, 4), col); c.position.set((i % 4 - 1.5) * 0.25, 0.45, (Math.floor(i / 4) - 0.5) * 0.3); c.rotation.z = (i % 3 - 1) * 0.15; g.add(c); }
  return g;
}

// ---------- Décors partagés : tonneau ----------
function barrel(s = 1, col = 0x8A5A30) {
  const g = new THREE.Group();
  const b = mesh(new THREE.CylinderGeometry(0.45 * s, 0.45 * s, 1.1 * s, 9), col); b.position.y = 0.55 * s; g.add(b);
  for (const y of [0.22, 0.88]) { const r = mesh(new THREE.CylinderGeometry(0.47 * s, 0.47 * s, 0.08 * s, 9), 0x3A3A3E); r.position.y = y * s; g.add(r); }
  return shadow(g);
}

// ---------- Canyons du désert ----------
// Saguaro (décor, ou obstacle sur la piste du désert)
export function saguaro(s = 1) {
  const g = new THREE.Group(), c = 0x4F8A3A;
  const t = mesh(new THREE.CylinderGeometry(0.42 * s, 0.5 * s, 3.9 * s, 8), c); t.position.y = 1.95 * s; g.add(t);
  const top = mesh(new THREE.SphereGeometry(0.42 * s, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), c); top.position.y = 3.9 * s; g.add(top);
  for (const [sd, y, h] of [[-1, 1.6, 1.3], [1, 2.2, 1.0]]) {
    const a = mesh(new THREE.CylinderGeometry(0.26 * s, 0.26 * s, 0.8 * s, 7), c); a.rotation.z = Math.PI / 2; a.position.set(sd * 0.75 * s, y * s, 0); g.add(a);
    const u = mesh(new THREE.CylinderGeometry(0.26 * s, 0.26 * s, h * s, 7), c); u.position.set(sd * 1.1 * s, (y + h / 2) * s, 0); g.add(u);
    const cap = mesh(new THREE.SphereGeometry(0.26 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), c); cap.position.set(sd * 1.1 * s, (y + h) * s, 0); g.add(cap);
  }
  return shadow(g);
}
function barrelCactus(s) {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.45 * s, 8, 6), 0x5E9A44); b.scale.y = 0.9; b.position.y = 0.38 * s; g.add(b);
  const f = mesh(new THREE.IcosahedronGeometry(0.14 * s, 0), 0xF06A8A); f.position.y = 0.8 * s; g.add(f);
  return shadow(g);
}
// Butte rocheuse aux strates rouges, très haute, visible de loin
function mesa(s, seed) {
  const g = new THREE.Group(), r = A.rng(seed);
  const cols = [0xC2643A, 0xB0552F, 0xD47A4A, 0xA84E2C];
  let w = (7 + r() * 4) * s, d = (6 + r() * 4) * s, y = 0;
  for (let k = 0; k < 4; k++) {
    const h = (2.5 + r() * 2.5) * s, m = mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.56, h, 7), cols[k % 4]);
    m.scale.z = d / w; m.position.y = y + h / 2; m.rotation.y = r() * 0.5; g.add(m); y += h; w *= 0.88 + r() * 0.08; d *= 0.88 + r() * 0.08;
  }
  const cap = mesh(new THREE.CylinderGeometry(w * 0.52, w * 0.5, 0.6 * s, 7), 0xE29A62); cap.scale.z = d / w; cap.position.y = y + 0.3 * s; g.add(cap);
  return shadow(g);
}
function rockArch(s) {
  const g = new THREE.Group();
  const a = mesh(new THREE.TorusGeometry(3.4 * s, 0.9 * s, 5, 10, Math.PI), 0xC2643A); a.scale.z = 1.4; g.add(a);
  for (const sd of [-1, 1]) { const f = mesh(new THREE.CylinderGeometry(1 * s, 1.3 * s, 1.2 * s, 6), 0xB0552F); f.position.set(sd * 3.4 * s, 0.2 * s, 0); g.add(f); }
  return shadow(g);
}
function dryBush(s, col) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) { const b = mesh(new THREE.CylinderGeometry(0.02 * s, 0.05 * s, 0.9 * s, 3), col); b.position.y = 0.4 * s; b.rotation.set((i % 2 - 0.5) * 0.9, i * 1.3, (i % 3 - 1) * 0.6); g.add(b); }
  return g;
}

// ---------- Ville fantôme du Far West ----------
function westHouse(s, seed) {
  const g = new THREE.Group(), r = A.rng(seed);
  const cols = [0xA87C55, 0x8E6A48, 0xB89270, 0x7A5A3C, 0xC0A07A];
  const c = cols[Math.floor(r() * cols.length)], c2 = cols[Math.floor(r() * cols.length)];
  const w = (6 + r() * 3) * s, h = (4 + r() * 1.5) * s, d = 7 * s;
  const body = mesh(new THREE.BoxGeometry(w, h, d), c); body.position.y = h / 2; g.add(body);
  // Fausse façade plus haute que la maison, typique des villes de l'Ouest
  const front = mesh(new THREE.BoxGeometry(w, h + 1.8 * s, 0.3 * s), c2); front.position.set(0, (h + 1.8 * s) / 2, d / 2 + 0.15 * s); g.add(front);
  const roof = mesh(new THREE.BoxGeometry(w + 0.3 * s, 0.25 * s, d), 0x5A4030); roof.position.y = h + 0.1 * s; roof.rotation.x = 0.08; g.add(roof);
  const sign = mesh(new THREE.BoxGeometry(w * 0.7, 0.9 * s, 0.12 * s), 0xE8D9B4); sign.position.set(0, h + 0.6 * s, d / 2 + 0.35 * s); g.add(sign);
  const letters = mesh(new THREE.BoxGeometry(w * 0.55, 0.3 * s, 0.05 * s), 0x3A2A1E); letters.position.set(0, h + 0.6 * s, d / 2 + 0.43 * s); g.add(letters);
  const porch = mesh(new THREE.BoxGeometry(w, 0.15 * s, 2.2 * s), 0x6E5038); porch.position.set(0, 3 * s, d / 2 + 1.3 * s); g.add(porch);
  for (const x of [-w / 2 + 0.3 * s, 0, w / 2 - 0.3 * s]) { const p = mesh(new THREE.BoxGeometry(0.18 * s, 3 * s, 0.18 * s), 0x5A4030); p.position.set(x, 1.5 * s, d / 2 + 2.25 * s); g.add(p); }
  const door = mesh(new THREE.BoxGeometry(1.4 * s, 2.2 * s, 0.1), 0x3A2A1E); door.position.set(0, 1.1 * s, d / 2 + 0.31 * s); g.add(door);
  for (const x of [-w / 3, w / 3]) { const wi = mesh(new THREE.BoxGeometry(1 * s, 1 * s, 0.1), 0x2A3038); wi.position.set(x, 1.8 * s, d / 2 + 0.31 * s); g.add(wi); }
  return shadow(g);
}
function waterTower(s) {
  const g = new THREE.Group();
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) { const l = mesh(new THREE.BoxGeometry(0.25 * s, 6 * s, 0.25 * s), 0x5A4030); l.position.set(x * s, 3 * s, z * s); g.add(l); }
  const t = mesh(new THREE.CylinderGeometry(1.8 * s, 1.8 * s, 2.8 * s, 10), 0x8E6A48); t.position.y = 7.4 * s; g.add(t);
  const roof = mesh(new THREE.ConeGeometry(2 * s, 1.2 * s, 10), 0x5A4030); roof.position.y = 9.4 * s; g.add(roof);
  return shadow(g);
}
// Rails abandonnés le long de la piste (traverses + deux rails)
function rails(len) {
  const g = new THREE.Group();
  for (let zz = 0; zz < len; zz += 1.4) { const t = mesh(new THREE.BoxGeometry(2.4, 0.15, 0.4), 0x5A4030); t.position.set(0, 0.08, -zz); g.add(t); }
  for (const x of [-0.75, 0.75]) { const r = mesh(new THREE.BoxGeometry(0.12, 0.14, len), 0x7A6A60, { m: 0.4, r: 0.5 }); r.position.set(x, 0.22, -len / 2); g.add(r); }
  return g;
}
function wagonWheel(s) {
  const g = new THREE.Group();
  const rim = mesh(new THREE.TorusGeometry(0.8 * s, 0.07 * s, 4, 12), 0x5A4030); g.add(rim);
  for (let i = 0; i < 6; i++) { const sp = mesh(new THREE.BoxGeometry(0.06 * s, 1.6 * s, 0.06 * s), 0x6E5038); sp.rotation.z = i * Math.PI / 6; g.add(sp); }
  g.rotation.set(-1.3, 0, 0); g.position.y = 0.15; return shadow(g);
}
// Virevoltant : boule de broussailles (objet cassable)
function tumbleweed(s = 1) {
  const g = new THREE.Group();
  const b = mesh(new THREE.IcosahedronGeometry(0.6 * s, 1), 0xB8945A, { t: true, o: 0.9 }); b.position.y = 0.6 * s; g.add(b);
  const c = mesh(new THREE.IcosahedronGeometry(0.45 * s, 0), 0x9A7840); c.position.y = 0.6 * s; c.rotation.set(0.5, 0.3, 0.2); g.add(c);
  return shadow(g);
}
function barrelStack(s = 1) {
  const g = new THREE.Group();
  for (const [x, y] of [[-0.48, 0], [0.48, 0], [0, 1.12], [0, 2.24]]) { const b = barrel(s * 1.05, 0x8A5A30); b.position.set(x * s, y * s, 0); g.add(b); }
  return g;
}
function grave(s) {
  const g = new THREE.Group();
  const v = mesh(new THREE.BoxGeometry(0.15 * s, 1.2 * s, 0.12 * s), 0x8E7A60); v.position.y = 0.6 * s; g.add(v);
  const h = mesh(new THREE.BoxGeometry(0.7 * s, 0.14 * s, 0.12 * s), 0x8E7A60); h.position.y = 0.9 * s; g.add(h);
  const m = mesh(new THREE.BoxGeometry(0.8 * s, 0.25 * s, 1.6 * s), 0x9C7E5A); m.position.set(0, 0.1, 0.9 * s); g.add(m);
  return shadow(g);
}

// ---------- Jungle ----------
function jungleTree(s, hue) {
  const g = new THREE.Group(), greens = [0x1F6B2E, 0x2A7D36, 0x175A28, 0x2F8A3C];
  const t = mesh(new THREE.CylinderGeometry(0.3 * s, 0.55 * s, 7 * s, 6), 0x6A5038); t.position.y = 3.5 * s; g.add(t);
  for (let i = 0; i < 4; i++) { const r = mesh(new THREE.ConeGeometry(0.25 * s, 1.4 * s, 4), 0x6A5038); r.position.set(Math.cos(i * 1.6) * 0.6 * s, 0.4 * s, Math.sin(i * 1.6) * 0.6 * s); r.rotation.set(Math.sin(i * 1.6) * 0.6, 0, -Math.cos(i * 1.6) * 0.6); g.add(r); }
  for (let i = 0; i < 4; i++) { const c = mesh(new THREE.IcosahedronGeometry((1.9 - i * 0.25) * s, 0), greens[(i + hue) % 4]); c.scale.y = 0.45; c.position.set(Math.cos(i * 2.3) * 1.1 * s, (6.6 + i * 0.5) * s, Math.sin(i * 2.3) * 1.1 * s); g.add(c); }
  // Lianes qui pendent
  for (let i = 0; i < 3; i++) { const v = mesh(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 3.5 * s, 3), 0x3E7A2A); v.position.set(Math.cos(i * 2.1 + 0.5) * 1.6 * s, 4.8 * s, Math.sin(i * 2.1 + 0.5) * 1.6 * s); g.add(v); }
  return shadow(g);
}
function fern(s, col) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const f = new THREE.Group(); f.rotation.y = i / 6 * Math.PI * 2; const l = mesh(new THREE.BoxGeometry(1.4 * s, 0.05 * s, 0.4 * s), col); l.position.set(0.6 * s, 0.35 * s, 0); l.rotation.z = 0.5; f.add(l); g.add(f); }
  return g;
}
function bamboo(n, s) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const h = (4 + (i % 3) * 1.5) * s, x = (i % 3 - 1) * 0.35 * s, z = (Math.floor(i / 3) - 0.5) * 0.35 * s;
    const c = mesh(new THREE.CylinderGeometry(0.09 * s, 0.1 * s, h, 5), i % 2 ? 0x7FAF3A : 0x6E9E30); c.position.set(x, h / 2, z); c.rotation.z = (i % 3 - 1) * 0.05; g.add(c);
    const l = mesh(new THREE.ConeGeometry(0.3 * s, 0.9 * s, 3), 0x4F9A3A); l.position.set(x, h, z); g.add(l);
  }
  return shadow(g);
}
// Cascade : falaise moussue, chute d'eau et bassin
function waterfall(s) {
  const g = new THREE.Group();
  const cliff = mesh(new THREE.BoxGeometry(10 * s, 9 * s, 4 * s), 0x5E6A5A); cliff.position.y = 4.5 * s; g.add(cliff);
  const moss = mesh(new THREE.BoxGeometry(10.4 * s, 0.8 * s, 4.4 * s), 0x2F7A2E); moss.position.y = 9.1 * s; g.add(moss);
  const fall = mesh(new THREE.BoxGeometry(2.6 * s, 8.6 * s, 0.3 * s), 0x8FD8F0, { e: 0x4FB8E0, ei: 0.25, r: 0.2 }); fall.position.set(0, 4.6 * s, 2.15 * s); g.add(fall);
  const basin = mesh(new THREE.CylinderGeometry(3 * s, 3 * s, 0.3 * s, 10), 0x3FAFD0, { r: 0.15, env: 0.8 }); basin.position.set(0, 0.15, 3.6 * s); g.add(basin);
  const foam = mesh(new THREE.CylinderGeometry(1.6 * s, 1.6 * s, 0.35 * s, 8), 0xF2FAFF); foam.position.set(0, 0.2, 2.8 * s); g.add(foam);
  return shadow(g);
}
function bigFlower(col) {
  const g = new THREE.Group();
  const st = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 4), 0x3E7A2A); st.position.y = 0.45; g.add(st);
  for (let i = 0; i < 5; i++) { const p = mesh(new THREE.IcosahedronGeometry(0.22, 0), col); p.scale.y = 0.4; p.position.set(Math.cos(i * 1.26) * 0.22, 0.95, Math.sin(i * 1.26) * 0.22); g.add(p); }
  const c = mesh(new THREE.IcosahedronGeometry(0.12, 0), 0xFFD23F); c.position.y = 1; g.add(c);
  return g;
}
// Grosse souche couverte de mousse (obstacle sur la piste de la jungle et du bayou)
export function stump(s = 1, moss = 0x3E8A2E) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.85 * s, 1.1 * s, 3.4 * s, 8), 0x6A5038); t.position.y = 1.7 * s; g.add(t);
  const top = mesh(new THREE.CylinderGeometry(0.8 * s, 0.8 * s, 0.1 * s, 8), 0xC9A070); top.position.y = 3.42 * s; g.add(top);
  const m = mesh(new THREE.IcosahedronGeometry(0.7 * s, 0), moss); m.scale.y = 0.5; m.position.set(0.5 * s, 3.3 * s, 0.2 * s); g.add(m);
  for (let i = 0; i < 4; i++) { const r = mesh(new THREE.ConeGeometry(0.3 * s, 1.2 * s, 4), 0x5A4030); r.position.set(Math.cos(i * 1.57) * 1 * s, 0.35 * s, Math.sin(i * 1.57) * 1 * s); r.rotation.set(Math.sin(i * 1.57) * 0.9, 0, -Math.cos(i * 1.57) * 0.9); g.add(r); }
  return shadow(g);
}

// ---------- Temples aztèques ----------
function pyramid(s, seed) {
  const g = new THREE.Group(), r = A.rng(seed), steps = 5 + Math.floor(r() * 3);
  let w = (16 + r() * 6) * s, y = 0;
  const cols = [0xB8AC8E, 0xA89C80, 0xC4B89A];
  for (let k = 0; k < steps; k++) { const h = 1.8 * s, m = mesh(new THREE.BoxGeometry(w, h, w), cols[k % 3]); m.position.y = y + h / 2; g.add(m); y += h; w -= 2.2 * s; }
  // Escalier central et petit temple au sommet
  const stair = mesh(new THREE.BoxGeometry(3 * s, y * 1.05, 2 * s), 0x9C9078); stair.position.set(0, y / 2, (16 * s) / 2 - 1.5 * s); stair.rotation.x = -0.62; g.add(stair);
  const temple = mesh(new THREE.BoxGeometry(w * 0.9, 3 * s, w * 0.9), 0xC4B89A); temple.position.y = y + 1.5 * s; g.add(temple);
  const door = mesh(new THREE.BoxGeometry(1.4 * s, 2 * s, 0.1), 0x2A2420); door.position.set(0, y + 1 * s, w * 0.45 + 0.05); g.add(door);
  const roof = mesh(new THREE.BoxGeometry(w, 0.6 * s, w), 0x8A3A2A); roof.position.y = y + 3.3 * s; g.add(roof);
  for (let k = 0; k < 3; k++) { const v = mesh(new THREE.IcosahedronGeometry(1.2 * s, 0), 0x2F7A2E); v.scale.y = 0.5; v.position.set((r() - 0.5) * 10 * s, (1 + r() * 4) * s, (r() - 0.5) * 10 * s); g.add(v); } // végétation qui envahit
  return shadow(g);
}
// Idole sculptée (obstacle sur la piste des temples)
export function idol(s = 1) {
  const g = new THREE.Group(), st = 0xA89C80, dk = 0x6E6450;
  const base = mesh(new THREE.BoxGeometry(1.7 * s, 0.6 * s, 1.7 * s), dk); base.position.y = 0.3 * s; g.add(base);
  const body = mesh(new THREE.BoxGeometry(1.3 * s, 2.2 * s, 1.1 * s), st); body.position.y = 1.7 * s; g.add(body);
  const head = mesh(new THREE.BoxGeometry(1.6 * s, 1.2 * s, 1.3 * s), st); head.position.y = 3.4 * s; g.add(head);
  for (const x of [-0.38, 0.38]) { const e = mesh(new THREE.BoxGeometry(0.36 * s, 0.24 * s, 0.1), 0x2FB8A0, { e: 0x1F8A78, ei: 0.5 }); e.position.set(x * s, 3.55 * s, 0.68 * s); g.add(e); }
  const mo = mesh(new THREE.BoxGeometry(0.9 * s, 0.2 * s, 0.1), dk); mo.position.set(0, 3.05 * s, 0.68 * s); g.add(mo);
  const crown = mesh(new THREE.BoxGeometry(1.9 * s, 0.35 * s, 1.5 * s), 0x8A3A2A); crown.position.y = 4.15 * s; g.add(crown);
  for (let k = 0; k < 3; k++) { const p = mesh(new THREE.BoxGeometry(0.4 * s, 0.6 * s, 0.4 * s), 0x2FB8A0); p.position.set((k - 1) * 0.6 * s, 4.6 * s, 0); g.add(p); }
  return shadow(g);
}
function stoneHead(s) {
  const g = new THREE.Group();
  const h = mesh(new THREE.SphereGeometry(1.5 * s, 7, 5), 0x8E8470); h.scale.set(1, 1.1, 0.95); h.position.y = 1.5 * s; g.add(h);
  for (const x of [-0.5, 0.5]) { const e = mesh(new THREE.BoxGeometry(0.45 * s, 0.18 * s, 0.2), 0x5E5648); e.position.set(x * s, 1.9 * s, 1.35 * s); g.add(e); }
  const n = mesh(new THREE.BoxGeometry(0.4 * s, 0.5 * s, 0.4 * s), 0x7E7462); n.position.set(0, 1.45 * s, 1.4 * s); g.add(n);
  const m = mesh(new THREE.BoxGeometry(0.8 * s, 0.2 * s, 0.2), 0x5E5648); m.position.set(0, 0.95 * s, 1.35 * s); g.add(m);
  const helm = mesh(new THREE.SphereGeometry(1.55 * s, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2.4), 0x7E7462); helm.position.y = 1.85 * s; g.add(helm);
  return shadow(g);
}
function stela(s) {
  const g = new THREE.Group();
  const p = mesh(new THREE.BoxGeometry(1 * s, 3.2 * s, 0.5 * s), 0xA89C80); p.position.y = 1.6 * s; g.add(p);
  for (let k = 0; k < 4; k++) { const c = mesh(new THREE.BoxGeometry(0.7 * s, 0.12 * s, 0.05), 0x6E6450); c.position.set(0, (0.7 + k * 0.6) * s, 0.27 * s); g.add(c); }
  return shadow(g);
}
// Jarre en terre cuite (objet cassable)
function jar(s = 1) {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.55 * s, 8, 6), 0xC2703A); b.scale.y = 1.1; b.position.y = 0.6 * s; g.add(b);
  const n = mesh(new THREE.CylinderGeometry(0.28 * s, 0.22 * s, 0.4 * s, 8), 0xB0602F); n.position.y = 1.25 * s; g.add(n);
  const band = mesh(new THREE.CylinderGeometry(0.58 * s, 0.58 * s, 0.12 * s, 8), 0x2FB8A0); band.position.y = 0.7 * s; g.add(band);
  return shadow(g);
}

// ---------- Bayou brumeux ----------
// Cyprès chauve : tronc évasé à la base, mousse espagnole qui pend des branches
function baldCypress(s, hue) {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.4 * s, 1.3 * s, 2 * s, 7), 0x6E6250); base.position.y = 1 * s; g.add(base);
  const t = mesh(new THREE.CylinderGeometry(0.25 * s, 0.4 * s, 5 * s, 6), 0x6E6250); t.position.y = 4.5 * s; g.add(t);
  const greens = [0x4F6A3A, 0x5E7A44, 0x445E34];
  for (let i = 0; i < 3; i++) { const c = mesh(new THREE.IcosahedronGeometry((1.6 - i * 0.2) * s, 0), greens[(i + hue) % 3]); c.scale.y = 0.5; c.position.set((i - 1) * 0.9 * s, (6.4 + (i % 2) * 0.6) * s, (i % 2 ? 0.5 : -0.4) * s); g.add(c); }
  for (let i = 0; i < 5; i++) { const m = mesh(new THREE.ConeGeometry(0.22 * s, 1.8 * s, 4), 0x9AA88A); m.rotation.x = Math.PI; m.position.set(Math.cos(i * 1.3) * 1.2 * s, 5.4 * s, Math.sin(i * 1.3) * 1.1 * s); g.add(m); }
  return shadow(g);
}
function cypressKnees(n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const k = mesh(new THREE.ConeGeometry(0.18, 0.5 + (i % 3) * 0.2, 5), 0x7A6A54); k.position.set((i % 3 - 1) * 0.6, 0.25, (Math.floor(i / 3) - 0.5) * 0.6); g.add(k); }
  return g;
}
function shack(s) {
  const g = new THREE.Group();
  for (const [x, z] of [[-2, -1.6], [2, -1.6], [-2, 1.6], [2, 1.6]]) { const p = mesh(new THREE.BoxGeometry(0.25 * s, 2 * s, 0.25 * s), 0x4A4038); p.position.set(x * s, 1 * s, z * s); g.add(p); }
  const fl = mesh(new THREE.BoxGeometry(5 * s, 0.2 * s, 4.2 * s), 0x6E6250); fl.position.y = 2 * s; g.add(fl);
  const b = mesh(new THREE.BoxGeometry(4.2 * s, 2.6 * s, 3.4 * s), 0x7A6E5A); b.position.y = 3.4 * s; g.add(b);
  const roof = mesh(new THREE.BoxGeometry(5 * s, 0.2 * s, 4.4 * s), 0x5A6670, { m: 0.3, r: 0.6 }); roof.position.y = 4.8 * s; roof.rotation.x = 0.12; g.add(roof);
  const w = mesh(new THREE.BoxGeometry(0.8 * s, 0.7 * s, 0.1), 0xFFC94D, { e: 0xFFB020, ei: 0.8 }); w.position.set(1 * s, 3.6 * s, 1.72 * s); g.add(w);
  return shadow(g);
}
function rowboat(s) {
  const g = new THREE.Group();
  const h = mesh(new THREE.CylinderGeometry(0.7 * s, 0.4 * s, 3.2 * s, 6, 1, false, 0, Math.PI), 0x8A5A3A); h.rotation.set(Math.PI / 2, 0, Math.PI / 2); h.scale.set(1, 1, 0.6); h.position.y = 0.35 * s; g.add(h);
  const seat = mesh(new THREE.BoxGeometry(1.1 * s, 0.08 * s, 0.4 * s), 0x6E4A2E); seat.position.y = 0.35 * s; g.add(seat);
  return shadow(g);
}
function reeds(n) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const r = mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.6 + (i % 3) * 0.3, 3), 0x7A8A4A); r.position.set((i % 4 - 1.5) * 0.25, 0.8, (Math.floor(i / 4) - 0.5) * 0.25); r.rotation.z = (i % 3 - 1) * 0.12; g.add(r); if (i % 3 === 0) { const t = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 5), 0x6A4A2A); t.position.set(r.position.x, 1.7, r.position.z); g.add(t); } }
  return g;
}
function lilyPond(rad) {
  const g = pond(rad, 0x4F6A54, 0x5A5A40);
  for (let i = 0; i < 6; i++) { const l = mesh(new THREE.CircleGeometry(0.35, 7), 0x5E9A44); l.rotation.x = -Math.PI / 2; l.position.set(Math.cos(i * 1.9) * rad * 0.6, 0.15, Math.sin(i * 1.9) * rad * 0.55); g.add(l); }
  return g;
}

// Mondes 6 à 10
const THEMES_B = [
  {
    name: 'Canyons du désert',
    sky: ['#3F8FD8', '#F4C68A', '#FFE2B8'], fog: 0xF2CFA0, hemi: [0xFFF0DC, 0xA05A30], sun: [0xFFE0B0, 2.9],
    ground(c, zone, x, z, n, stripe, patch) {
      if (zone === 'tarmac') set(c, [0.24, 0.23, 0.25], n);
      else if (zone === 'track') set(c, patch > 1.5 ? [0.92, 0.66, 0.44] : [0.86 + stripe * 0.5, 0.58 + stripe * 0.5, 0.38 + stripe * 0.3], n);
      else if (zone === 'shoulder') set(c, [0.80, 0.52, 0.34], n);
      else set(c, patch > 1.1 ? [0.74, 0.40, 0.24] : [0.84, 0.56, 0.36], n);
    },
    ridge: { top: [0.90, 0.62, 0.40], rock: [0.74, 0.40, 0.24], base: [0.84, 0.56, 0.36] },
    grass: [0.82, 0.52, 0.32], rock: [0.76, 0.44, 0.28],
    tufts: [0xB89060, 0x9A7A4A, 0x7A8A44],
    rocks: [0xC2643A, 0xB0552F, 0xD47A4A],
    ridgeProp: (r) => r() < 0.5 ? saguaro(0.5 + r() * 0.3) : A.rock(0.6 + r() * 0.7, [0xC2643A, 0xB0552F]),
    statue: () => saguaro(1), breakable: () => barrel(1.2),
    *decor({ put, r, L, z0, i }) {
      // Grandes buttes rocheuses au loin
      for (let k = 0; k < 2; k++) { const side = r() > 0.5 ? 1 : -1; put(mesa(1 + r() * 0.8, i * 7 + k), side * (L.opt.half + 45 + r() * 25), z0 - r() * 150, -1); }
      if (i % 2 === 0) { const side = r() > 0.5 ? 1 : -1; put(rockArch(1 + r() * 0.4), side * (L.opt.half + 18 + r() * 16), z0 - r() * 150, -0.4); }
      yield;
      for (let k = 0; k < 55; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 3 + Math.pow(r(), 1.6) * 55), z = z0 - r() * 150, t = r();
        put(t < 0.4 ? saguaro(0.6 + r() * 0.5) : t < 0.65 ? barrelCactus(0.8 + r() * 0.6) : t < 0.85 ? A.rock(0.7 + r() * 1.6, [0xC2643A, 0xB0552F, 0xD47A4A]) : A.rockShape('spire', Math.floor(r() * 1e6), [0xC2643A, 0xB0552F]), x, z, -0.1);
        if (k % 25 === 24) yield;
      }
      for (let k = 0; k < 30; k++) { const side = r() > 0.5 ? 1 : -1; put(dryBush(0.9 + r() * 0.6, k % 2 ? 0x9A7A4A : 0x7A6A3A), side * (L.opt.half + 0.8 + r() * 12), z0 - r() * 150); }
    },
  },
  {
    name: 'Ville fantôme du Far West',
    sky: ['#6FA0C8', '#E8C99A', '#F5DDB8'], fog: 0xE8D2AE, hemi: [0xFFF0DC, 0x8A6A44], sun: [0xFFDDA8, 2.7],
    ground(c, zone, x, z, n, stripe, patch) {
      // Zones rapides : trottoirs en planches de bois
      if (zone === 'tarmac') set(c, Math.floor(z / 1.1) % 2 ? [0.50, 0.38, 0.26] : [0.44, 0.33, 0.22], n);
      else if (zone === 'track') set(c, patch > 1.5 ? [0.62, 0.48, 0.32] : [0.76 + stripe * 0.5, 0.64 + stripe * 0.5, 0.46 + stripe * 0.3], n);
      else if (zone === 'shoulder') set(c, [0.70, 0.58, 0.40], n);
      else set(c, patch > 1.3 ? [0.62, 0.56, 0.34] : [0.74, 0.62, 0.44], n);
    },
    ridge: { top: [0.84, 0.72, 0.54], rock: [0.62, 0.50, 0.38], base: [0.74, 0.62, 0.44] },
    grass: [0.66, 0.58, 0.36], rock: [0.62, 0.52, 0.42],
    tufts: [0xA8905A, 0x8A7A4A, 0x9A8A5A],
    rocks: [0xA08A70, 0x8E7A60, 0xB49C80],
    ridgeProp: (r) => r() < 0.5 ? dryBush(1.2 + r() * 0.5, 0x8A6A3A) : A.rock(0.6 + r() * 0.7, [0xA08A70, 0x8E7A60]),
    statue: () => barrelStack(1), breakable: () => tumbleweed(1.2),
    *decor({ put, r, L, z0, z1, i }) {
      // Rue principale : façades alignées de chaque côté, face à la piste
      for (const side of [-1, 1]) for (let zz = z0 - 8 - r() * 10; zz > z1 + 8; zz -= 14 + r() * 22) if (r() < 0.7) put(westHouse(1, Math.floor(r() * 1e6)), side * (L.opt.half + 9 + r() * 4), zz, -0.2, side > 0 ? -Math.PI / 2 : Math.PI / 2);
      yield;
      if (i % 2 === 1) { const side = r() > 0.5 ? 1 : -1; put(waterTower(1), side * (L.opt.half + 22 + r() * 10), z0 - r() * 150); }
      // Voie ferrée abandonnée, parallèle à la piste
      const rs = i % 2 ? 1 : -1; for (let zz = z0; zz > z1; zz -= 30) put(rails(30), rs * (L.opt.half + 30), zz, 0, 0);
      yield;
      for (let k = 0; k < 30; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 3 + Math.pow(r(), 1.4) * 55), z = z0 - r() * 150, t = r();
        put(t < 0.3 ? saguaro(0.5 + r() * 0.4) : t < 0.55 ? dryBush(1 + r() * 0.6, 0x8A6A3A) : t < 0.75 ? A.rock(0.6 + r() * 1.2, [0xA08A70, 0x8E7A60, 0xB49C80]) : t < 0.88 ? barrel(1) : grave(1), x, z, -0.05);
      }
      for (let k = 0; k < 8; k++) { const side = r() > 0.5 ? 1 : -1; put(tumbleweed(0.6 + r() * 0.5), side * (L.opt.half + 1 + r() * 10), z0 - r() * 150); }
      for (let k = 0; k < 3; k++) { const side = r() > 0.5 ? 1 : -1; put(wagonWheel(1), side * (L.opt.half + 2 + r() * 6), z0 - r() * 150, 0, r() * 6); }
      for (let zz = z0 - 4; zz > z1 + 30; zz -= 34) for (const side of [-1, 1]) if (r() < 0.45) put(A.fence(24), side * (L.opt.half + 1.6), zz, 0, 0);
    },
  },
  {
    name: 'Jungle',
    sky: ['#5FA8C8', '#BFE0C8', '#E6F4E0'], fog: 0xBFD8C0, hemi: [0xE0FFE8, 0x2F5A2A], sun: [0xFFF4D0, 2.4],
    ground(c, zone, x, z, n, stripe, patch) {
      // Zones rapides : ponts en planches
      if (zone === 'tarmac') set(c, Math.floor(z / 0.9) % 2 ? [0.52, 0.38, 0.24] : [0.45, 0.32, 0.20], n);
      else if (zone === 'track') set(c, patch > 1.4 ? [0.46, 0.34, 0.20] : [0.34 + stripe, 0.54 + stripe, 0.22 + stripe * 0.5], n);
      else if (zone === 'shoulder') set(c, [0.24, 0.46, 0.18], n);
      else set(c, patch > 1 ? [0.18, 0.40, 0.16] : [0.24, 0.48, 0.18], n);
    },
    ridge: { top: [0.24, 0.50, 0.20], rock: [0.40, 0.44, 0.38], base: [0.22, 0.46, 0.18] },
    grass: [0.22, 0.50, 0.18], rock: [0.40, 0.44, 0.40],
    tufts: [0x2F7A2E, 0x3E8E37, 0x1F6B2E],
    rocks: [0x6E7A6A, 0x5E6A5A, 0x7E8A70],
    ridgeProp: (r) => r() < 0.6 ? jungleTree(0.6 + r() * 0.3, Math.floor(r() * 4)) : fern(1.2, 0x2F8A3C),
    statue: () => stump(1), breakable: () => A.crate(1.1),
    *decor({ put, r, L, z0, i }) {
      for (let k = 0; k < 70; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 3 + Math.pow(r(), 1.5) * 60), z = z0 - r() * 150, t = r();
        put(t < 0.45 ? jungleTree(1 + r() * 0.6, k % 4) : t < 0.7 ? palm(1 + r() * 0.4, 0.04 + r() * 0.08) : t < 0.85 ? bamboo(6 + Math.floor(r() * 4), 1 + r() * 0.3) : A.rock(0.7 + r() * 1.4, [0x6E7A6A, 0x5E6A5A]), x, z, -0.1);
        if (k % 25 === 24) yield;
      }
      for (let k = 0; k < 40; k++) { const side = r() > 0.5 ? 1 : -1; put(fern(0.8 + r() * 0.8, [0x2F8A3C, 0x3E9A3A, 0x1F6B2E][k % 3]), side * (L.opt.half + 0.8 + Math.pow(r(), 1.5) * 25), z0 - r() * 150); }
      for (let k = 0; k < 12; k++) { const side = r() > 0.5 ? 1 : -1; put(bigFlower([0xE5383B, 0xFF6BB0, 0xFF8A3D][k % 3]), side * (L.opt.half + 1 + r() * 12), z0 - r() * 150); }
      if (i % 2 === 0) { const side = r() > 0.5 ? 1 : -1; put(waterfall(1 + r() * 0.3), side * (L.opt.half + 26 + r() * 12), z0 - r() * 150, -0.5, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
    },
  },
  {
    name: 'Temples aztèques',
    sky: ['#4FA0D8', '#C8E4C0', '#F0F4D8'], fog: 0xD0E4C8, hemi: [0xF0FFE8, 0x5A6A3A], sun: [0xFFF0C8, 2.7],
    ground(c, zone, x, z, n, stripe, patch) {
      // Zones rapides : dallage de pierre
      if (zone === 'tarmac') set(c, (Math.floor(x / 1.6) + Math.floor(z / 1.6)) % 2 ? [0.66, 0.62, 0.54] : [0.58, 0.54, 0.46], n);
      else if (zone === 'track') set(c, patch > 1.5 ? [0.72, 0.64, 0.46] : [0.42 + stripe, 0.60 + stripe, 0.28 + stripe * 0.5], n);
      else if (zone === 'shoulder') set(c, [0.36, 0.56, 0.26], n);
      else set(c, patch > 1.4 ? [0.62, 0.58, 0.48] : [0.32, 0.54, 0.24], n);
    },
    ridge: { top: [0.70, 0.66, 0.56], rock: [0.56, 0.54, 0.46], base: [0.32, 0.54, 0.24] },
    grass: [0.32, 0.56, 0.24], rock: [0.62, 0.58, 0.48],
    tufts: [0x3E8E37, 0x2F7A2E, 0x6E9E30],
    rocks: [0xA89C80, 0x8E8470, 0x9C9078],
    ridgeProp: (r) => r() < 0.4 ? stela(0.8) : r() < 0.7 ? palm(0.8, 0.06) : A.rock(0.6 + r() * 0.7, [0xA89C80, 0x8E8470]),
    statue: () => idol(1), breakable: () => jar(1.1),
    *decor({ put, r, L, z0, i }) {
      // Pyramides à degrés, une par tronçon, en alternant les côtés
      { const side = i % 2 ? 1 : -1; put(pyramid(1 + r() * 0.4, i * 13 + 5), side * (L.opt.half + 34 + r() * 18), z0 - 30 - r() * 90, -0.6, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
      yield;
      for (let k = 0; k < 4; k++) { const side = r() > 0.5 ? 1 : -1; put(stoneHead(0.8 + r() * 0.5), side * (L.opt.half + 6 + r() * 18), z0 - r() * 150, -0.2, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
      // Allée de stèles le long de la piste
      for (let zz = z0 - 10; zz > z0 - 150; zz -= 20 + r() * 15) if (r() < 0.6) for (const side of [-1, 1]) put(stela(0.9), side * (L.opt.half + 2.5), zz, 0, 0);
      yield;
      for (let k = 0; k < 55; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 4 + Math.pow(r(), 1.5) * 60), z = z0 - r() * 150, t = r();
        put(t < 0.4 ? jungleTree(0.8 + r() * 0.5, k % 4) : t < 0.65 ? palm(1 + r() * 0.4, 0.05 + r() * 0.08) : t < 0.8 ? jar(0.7 + r() * 0.4) : A.rock(0.6 + r() * 1.3, [0xA89C80, 0x8E8470, 0x9C9078]), x, z, -0.1);
        if (k % 25 === 24) yield;
      }
      for (let k = 0; k < 25; k++) { const side = r() > 0.5 ? 1 : -1; put(fern(0.7 + r() * 0.6, [0x2F8A3C, 0x3E9A3A][k % 2]), side * (L.opt.half + 0.8 + r() * 10), z0 - r() * 150); }
    },
  },
  {
    name: 'Bayou brumeux',
    sky: ['#7F9A9A', '#B8C4B0', '#D8DCCC'], fog: 0xC4CCBC, fogNear: 55, fogFar: 230, hemi: [0xE0E8D8, 0x3A4A30], sun: [0xF0EAD0, 2.0],
    ground(c, zone, x, z, n, stripe, patch) {
      // Zones rapides : pontons en bois lisse
      if (zone === 'tarmac') set(c, Math.floor(z / 0.9) % 2 ? [0.50, 0.44, 0.36] : [0.44, 0.38, 0.30], n);
      else if (zone === 'track') set(c, patch > 1.4 ? [0.36, 0.32, 0.22] : [0.40 + stripe * 0.8, 0.44 + stripe * 0.8, 0.26 + stripe * 0.4], n);
      else if (zone === 'shoulder') set(c, [0.34, 0.38, 0.22], n);
      else set(c, patch > 1.1 ? [0.26, 0.36, 0.32] : [0.32, 0.38, 0.22], n); // flaques d'eau sombre
    },
    ridge: { top: [0.38, 0.44, 0.28], rock: [0.40, 0.40, 0.36], base: [0.32, 0.38, 0.22] },
    grass: [0.32, 0.40, 0.22], rock: [0.42, 0.42, 0.38],
    tufts: [0x5E7A44, 0x4F6A3A, 0x7A8A4A],
    rocks: [0x6E6A5A, 0x5E5A4A, 0x7A7666],
    ridgeProp: (r) => r() < 0.6 ? baldCypress(0.6 + r() * 0.3, Math.floor(r() * 3)) : reeds(10),
    statue: () => stump(1, 0x7A8A5A), breakable: () => barrel(1.2, 0x6E5038),
    *decor({ put, r, L, z0, i, pond: placePond }) {
      for (let k = 0; k < 60; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 3 + Math.pow(r(), 1.5) * 60), z = z0 - r() * 150, t = r();
        put(t < 0.6 ? baldCypress(1 + r() * 0.5, k % 3) : t < 0.8 ? cypressKnees(5 + Math.floor(r() * 4)) : A.rock(0.6 + r() * 1.1, [0x6E6A5A, 0x5E5A4A]), x, z, -0.1);
        if (k % 25 === 24) yield;
      }
      for (let k = 0; k < 30; k++) { const side = r() > 0.5 ? 1 : -1; put(reeds(8 + Math.floor(r() * 6)), side * (L.opt.half + 0.8 + r() * 14), z0 - r() * 150); }
      yield;
      for (let k = 0; k < 3; k++) { const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 8 + r() * 22), z = z0 - r() * 150; placePond(3 + r() * 3, 0x4F6A54, 0x5A5A40, x, z); }
      for (let k = 0; k < 2; k++) { const side = r() > 0.5 ? 1 : -1; put(lilyPond(2.2 + r()), side * (L.opt.half + 6 + r() * 16), z0 - r() * 150, 0.05); }
      if (i % 2 === 1) { const side = r() > 0.5 ? 1 : -1; put(shack(1), side * (L.opt.half + 18 + r() * 14), z0 - r() * 150, -0.3, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
      for (let k = 0; k < 2; k++) { const side = r() > 0.5 ? 1 : -1; put(rowboat(1), side * (L.opt.half + 4 + r() * 10), z0 - r() * 150, 0, r() * 6); }
    },
  },
];

// ---------- Définition des mondes ----------
// Mondes 1 à 5 ci-dessous ; les mondes 6 à 10 sont dans THEMES_B (plus haut)
// sky : dégradé du ciel (haut, milieu, horizon) · fog : brume lointaine (fogNear / fogFar : distances, facultatif) · hemi / sun : lumières
// ground(c, zone, x, z, n, stripe, patch) : couleur du terrain par zone ('tarmac', 'track', 'shoulder', 'field')
// ridge : couleurs des collines des bifurcations · grass / rock : sommet herbeux et roche des passages
// decor(ctx) : décor des bas-côtés d'un tronçon (générateur, rend la main régulièrement)
// statue() : obstacle « statue » propre au monde · breakable() : objet cassable (en plus des caisses)
export const THEMES = [
  {
    name: 'Prairie fleurie',
    sky: ['#6DB8EC', '#B4E0F7', '#E4F5FF'], fog: 0xCFEAF7, hemi: [0xDDF1FF, 0x6A8A4A], sun: [0xFFF4DE, 2.6],
    ground(c, zone, x, z, n, stripe, patch) {
      if (zone === 'tarmac') set(c, [0.26, 0.27, 0.31], n);
      else if (zone === 'track') set(c, patch > 1.6 ? [0.88, 0.77, 0.55] : [0.42 + stripe, 0.70 + stripe, 0.24 + stripe * 0.5], n);
      else if (zone === 'shoulder') set(c, [0.40, 0.70, 0.30], n);
      else set(c, [0.30, 0.60, 0.24], n);
    },
    ridge: { top: [0.95, 0.96, 0.98], rock: [0.55, 0.57, 0.60], base: [0.36, 0.64, 0.27] },
    grass: [0.36, 0.62, 0.26], rock: [0.52, 0.53, 0.55],
    tufts: [0x3F8F2E, 0x56A63A, 0x2F7A2E],
    ridgeProp: (r) => r() < 0.67 ? A.pine(1.2 + r() * 0.8) : A.rock(0.6 + r() * 0.7),
    statue: () => A.statue(1), breakable: () => A.hayBlock(1),
    *decor({ put, r, L, z0, z1, i, deco }) {
      for (let k = 0; k < 90; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 3 + Math.pow(r(), 2.2) * 65), z = z0 - r() * 150;
        const t = r(); let o;
        if (t < 0.42) o = A.tree(1.2 + r() * 1.4, k % 4); else if (t < 0.66) o = A.pine(1.3 + r() * 1.2); else if (t < 0.82) o = A.rock(0.6 + r() * 1.4); else o = A.hay(1);
        put(o, x, z, -0.1);
        if (k % 30 === 29) yield;
      }
      for (let k = 0; k < 36; k++) { const side = r() > 0.5 ? 1 : -1; put(A.bush(0.8 + r() * 0.8, k % 4), side * (L.opt.half + 0.8 + r() * 3), z0 - r() * 150); }
      for (let zz = z0 - 4; zz > z1 + 30; zz -= 34) for (const side of [-1, 1]) if (r() < 0.65) put(A.fence(24), side * (L.opt.half + 1.6), zz, 0, 0);
      for (let k = 0; k < 4; k++) { const side = r() > 0.5 ? 1 : -1; const x0 = side * (L.opt.half + 10 + r() * 18), zc = z0 - r() * 150; for (let q = 0; q < 2 + Math.floor(r() * 3); q++) put(A.cow(1), x0 + (r() - 0.5) * 8, zc + (r() - 0.5) * 8); }
      if (i % 2 === 0) { const side = r() > 0.5 ? 1 : -1; put(A.barn(1), side * (L.opt.half + 22 + r() * 14), z0 - r() * 150, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
      for (let k = 0; k < 10; k++) { const side = r() > 0.5 ? 1 : -1; const f = A.flowers(10, 4, 0, [0xF48FB1, 0xFFE27A, 0xFFFFFF, 0xB794F4][k % 4]); f.traverse(o => { o.castShadow = false; }); put(f, side * (L.opt.half + 3 + r() * 20), z0 - r() * 150, 0.1); }
      if (i % 3 === 1) { const wm = A.windmill(1.4); const x = (r() > 0.5 ? 1 : -1) * (L.opt.half + 26 + r() * 20), z = z0 - r() * 150; wm.position.set(x, L.ground(x, z, 1).h - 0.4, z); wm.rotation.y = r() * 6; deco.add(wm); }
    },
  },
  {
    name: 'Champs de lavande',
    sky: ['#7FA8E8', '#D9C8F0', '#FCE6D6'], fog: 0xEADCEF, hemi: [0xF2E6FF, 0x7A6A8A], sun: [0xFFE6C4, 2.6],
    ground(c, zone, x, z, n, stripe, patch) {
      if (zone === 'tarmac') set(c, [0.34, 0.31, 0.31], n);
      else if (zone === 'track') set(c, patch > 1.5 ? [0.86, 0.78, 0.60] : [0.52 + stripe, 0.66 + stripe, 0.30 + stripe * 0.5], n);
      else if (zone === 'shoulder') set(c, [0.56, 0.62, 0.34], n);
      else set(c, Math.floor(Math.abs(x) / 2.2) % 2 ? [0.55, 0.44, 0.76] : [0.46, 0.54, 0.30], n); // rangées violettes et vertes
    },
    ridge: { top: [0.93, 0.90, 0.84], rock: [0.66, 0.62, 0.56], base: [0.50, 0.60, 0.30] },
    grass: [0.50, 0.60, 0.30], rock: [0.70, 0.66, 0.58],
    tufts: [0x6F8F3A, 0x8A6AC0, 0x7A9A44],
    ridgeProp: (r) => r() < 0.6 ? cypress(0.8 + r() * 0.4) : A.rock(0.6 + r() * 0.7),
    statue: () => A.statue(1), breakable: () => A.hayBlock(1),
    *decor({ put, r, L, z0, z1, i }) {
      // Champs de lavande en rangées, de chaque côté
      for (let k = 0; k < 4; k++) {
        const side = k % 2 ? 1 : -1, x0 = side * (L.opt.half + 5 + r() * 28), zs = z0 - r() * 110, rows = 4 + Math.floor(r() * 4), segs = 7 + Math.floor(r() * 6);
        for (let a = 0; a < rows; a++) for (let b = 0; b < segs; b++) put(lavender((a + b) % 3 === 1), x0 + side * a * 2.2, zs - b * 3, -0.05, 0);
      }
      yield;
      for (let k = 0; k < 60; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 4 + Math.pow(r(), 1.8) * 65), z = z0 - r() * 150, t = r();
        put(t < 0.45 ? cypress(0.9 + r() * 0.6) : t < 0.85 ? olive(1 + r() * 0.5, k % 3) : A.rock(0.6 + r() * 1.2), x, z, -0.1);
        if (k % 30 === 29) yield;
      }
      for (let k = 0; k < 30; k++) { const side = r() > 0.5 ? 1 : -1; put(blobBush(0.7 + r() * 0.6, [0x8A68C4, 0x9A7AD0, 0x6F8F3A]), side * (L.opt.half + 0.8 + r() * 3), z0 - r() * 150); }
      for (let zz = z0 - 4; zz > z1 + 30; zz -= 34) for (const side of [-1, 1]) if (r() < 0.55) put(stoneWall(21), side * (L.opt.half + 1.6), zz, 0, 0);
      if (i % 2 === 0) { const side = r() > 0.5 ? 1 : -1; put(mas(1), side * (L.opt.half + 24 + r() * 14), z0 - r() * 150, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
      for (let k = 0; k < 3; k++) { const side = r() > 0.5 ? 1 : -1; put(beehives(2 + Math.floor(r() * 3)), side * (L.opt.half + 6 + r() * 14), z0 - r() * 150); }
      for (let k = 0; k < 8; k++) { const side = r() > 0.5 ? 1 : -1; const f = A.flowers(10, 4, 0, [0xFFE27A, 0xFFFFFF, 0xB794F4][k % 3]); f.traverse(o => { o.castShadow = false; }); put(f, side * (L.opt.half + 3 + r() * 20), z0 - r() * 150, 0.1); }
    },
  },
  {
    name: "Forêt d'automne",
    sky: ['#7AA9D6', '#E8D3A8', '#FBE9C9'], fog: 0xEBD9B8, hemi: [0xFFEBD0, 0x7A5A2A], sun: [0xFFD9A0, 2.5],
    ground(c, zone, x, z, n, stripe, patch) {
      if (zone === 'tarmac') set(c, [0.25, 0.24, 0.27], n);
      else if (zone === 'track') set(c, patch > 1.4 ? [0.86, 0.50, 0.20] : [0.56 + stripe, 0.42 + stripe, 0.20 + stripe * 0.4], n);
      else if (zone === 'shoulder') set(c, [0.62, 0.40, 0.18], n);
      else set(c, patch > 0.8 ? [0.74, 0.40, 0.16] : patch < -1 ? [0.40, 0.46, 0.20] : [0.52, 0.36, 0.17], n);
    },
    ridge: { top: [0.70, 0.40, 0.17], rock: [0.50, 0.47, 0.44], base: [0.58, 0.40, 0.18] },
    grass: [0.66, 0.40, 0.17], rock: [0.50, 0.48, 0.46],
    tufts: [0xC9772A, 0x8A6A2A, 0xE0A040],
    ridgeProp: (r) => r() < 0.5 ? leafyTree(1 + r() * 0.5, AUTUMN, 0x6B4A2B, Math.floor(r() * 5)) : autumnPine(1.1 + r() * 0.6),
    statue: () => mushroom(1), breakable: () => pumpkin(1.3),
    *decor({ put, r, L, z0, z1 }) {
      // Forêt dense : beaucoup d'arbres, de plus en plus serrés en s'éloignant de la piste
      for (let k = 0; k < 120; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 3 + Math.pow(r(), 1.6) * 65), z = z0 - r() * 150, t = r();
        put(t < 0.5 ? leafyTree(1.3 + r() * 1.4, AUTUMN, 0x6B4A2B, k % 5) : t < 0.72 ? birch(1 + r() * 0.5, k % 3) : t < 0.92 ? autumnPine(1.3 + r() * 1.2) : A.rock(0.6 + r() * 1.2), x, z, -0.1);
        if (k % 30 === 29) yield;
      }
      for (let k = 0; k < 8; k++) { const side = r() > 0.5 ? 1 : -1; put(log(3 + r() * 3), side * (L.opt.half + 4 + r() * 22), z0 - r() * 150, 0, r() * 6); }
      for (let k = 0; k < 6; k++) { const side = r() > 0.5 ? 1 : -1; put(mushroom(0.6 + r() * 0.9), side * (L.opt.half + 5 + r() * 25), z0 - r() * 150); }
      for (let k = 0; k < 30; k++) { const side = r() > 0.5 ? 1 : -1; put(blobBush(0.7 + r() * 0.7, AUTUMN, k % 5), side * (L.opt.half + 0.8 + r() * 3), z0 - r() * 150); }
      for (let k = 0; k < 16; k++) { const side = r() > 0.5 ? 1 : -1; put(leafPile(1 + r() * 0.6, k % 5), side * (L.opt.half + 1 + r() * 25), z0 - r() * 150, 0.05); }
      for (let k = 0; k < 4; k++) { const side = r() > 0.5 ? 1 : -1; put(pumpkin(0.8 + r() * 0.5), side * (L.opt.half + 3 + r() * 10), z0 - r() * 150); }
      for (let zz = z0 - 4; zz > z1 + 30; zz -= 34) for (const side of [-1, 1]) if (r() < 0.4) put(A.fence(24), side * (L.opt.half + 1.6), zz, 0, 0);
    },
  },
  {
    name: 'Plage tropicale',
    sky: ['#2E9BE6', '#7FD3F5', '#D8F6FF'], fog: 0xBFEAF7, hemi: [0xE0F6FF, 0xC8B080], sun: [0xFFF8E8, 2.7],
    ground(c, zone, x, z, n, stripe, patch) {
      // Zones rapides : pontons en planches lisses
      if (zone === 'tarmac') set(c, Math.floor(z / 0.9) % 2 ? [0.62, 0.43, 0.25] : [0.54, 0.36, 0.20], n);
      else if (zone === 'track') set(c, patch > 1.5 ? [0.84, 0.74, 0.54] : [0.94 + stripe * 0.5, 0.85 + stripe * 0.5, 0.63 + stripe * 0.3], n);
      else if (zone === 'shoulder') set(c, [0.90, 0.80, 0.58], n);
      else set(c, patch > 1.3 ? [0.50, 0.70, 0.34] : [0.91, 0.81, 0.58], n);
    },
    ridge: { top: [0.95, 0.88, 0.70], rock: [0.70, 0.60, 0.46], base: [0.90, 0.80, 0.58] },
    grass: [0.46, 0.70, 0.32], rock: [0.72, 0.62, 0.48],
    tufts: [0x5FA83A, 0x7FBF4A, 0xC9B074],
    rocks: [0xC8B496, 0xB09A7A, 0xD6C6A8],
    ridgeProp: (r) => r() < 0.7 ? palm(0.8 + r() * 0.3, 0.06 + r() * 0.06) : A.rock(0.6 + r() * 0.7, [0xC8B496, 0xB09A7A]),
    statue: () => tiki(1), breakable: () => beachBall(1.3),
    *decor({ put, r, L, z0, z1, i, pond: placePond }) {
      for (let k = 0; k < 55; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 3 + Math.pow(r(), 1.7) * 60), z = z0 - r() * 150, t = r();
        put(t < 0.75 ? palm(1 + r() * 0.5, 0.05 + r() * 0.1) : A.rock(0.6 + r() * 1.2, [0xC8B496, 0xB09A7A, 0xD6C6A8]), x, z, -0.1);
        if (k % 30 === 29) yield;
      }
      const UMB = [0xE5383B, 0x2F86F0, 0xFFC21A, 0x16A34A];
      for (let k = 0; k < 10; k++) { const side = r() > 0.5 ? 1 : -1; put(umbrella(UMB[k % 4]), side * (L.opt.half + 3 + r() * 14), z0 - r() * 150); }
      for (let k = 0; k < 4; k++) { const side = r() > 0.5 ? 1 : -1; put(surfboard([0xFF6B6F, 0x34E0FF, 0xFFD23F][k % 3]), side * (L.opt.half + 2.5 + r() * 6), z0 - r() * 150); }
      for (let k = 0; k < 24; k++) { const side = r() > 0.5 ? 1 : -1; put(shell([0xF4C2C2, 0xFFFFFF, 0xF2A65A][k % 3]), side * (L.opt.half + 0.6 + r() * 8), z0 - r() * 150); }
      for (let k = 0; k < 20; k++) { const side = r() > 0.5 ? 1 : -1; put(blobBush(0.6 + r() * 0.5, [0x4FB247, 0x3E9A3A, 0x7FBF4A], k % 3), side * (L.opt.half + 1.5 + r() * 4), z0 - r() * 150); }
      if (i % 2 === 0) { const side = r() > 0.5 ? 1 : -1; put(hut(1), side * (L.opt.half + 14 + r() * 12), z0 - r() * 150); }
      yield;
      for (let k = 0; k < 3; k++) { const side = r() > 0.5 ? 1 : -1; placePond(2.5 + r() * 2.5, 0x3FC6E0, 0xE8DAB0, side * (L.opt.half + 10 + r() * 20), z0 - r() * 150); }
      for (let zz = z0 - 4; zz > z1 + 30; zz -= 34) for (const side of [-1, 1]) if (r() < 0.35) put(A.fence(24), side * (L.opt.half + 1.6), zz, 0, 0);
    },
  },
  {
    name: 'Savane',
    sky: ['#4F9BD9', '#F2D49A', '#FFE9C2'], fog: 0xF1DDB2, hemi: [0xFFF0D8, 0x9A7A40], sun: [0xFFE2B0, 2.8],
    ground(c, zone, x, z, n, stripe, patch) {
      // Zones rapides : piste en terre battue rouge
      if (zone === 'tarmac') set(c, [0.56, 0.30, 0.18], n);
      else if (zone === 'track') set(c, patch > 1.5 ? [0.74, 0.42, 0.24] : [0.80 + stripe * 0.6, 0.68 + stripe * 0.6, 0.36 + stripe * 0.3], n);
      else if (zone === 'shoulder') set(c, [0.74, 0.62, 0.32], n);
      else set(c, patch > 1.2 ? [0.70, 0.44, 0.25] : patch < -1.2 ? [0.56, 0.60, 0.30] : [0.80, 0.68, 0.36], n);
    },
    ridge: { top: [0.86, 0.66, 0.42], rock: [0.66, 0.42, 0.28], base: [0.78, 0.66, 0.34] },
    grass: [0.76, 0.64, 0.32], rock: [0.70, 0.48, 0.34],
    tufts: [0xC9A55A, 0xB8944A, 0x9AA048],
    rocks: [0xB07A55, 0x9C6A48, 0xC28E66],
    ridgeProp: (r) => r() < 0.5 ? acacia(0.7 + r() * 0.3) : A.rock(0.6 + r() * 0.7, [0xB07A55, 0x9C6A48]),
    statue: () => termite(1), breakable: () => A.hayBlock(1),
    *decor({ put, r, L, z0, z1, i, pond: placePond }) {
      for (let k = 0; k < 40; k++) {
        const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 4 + Math.pow(r(), 1.5) * 65), z = z0 - r() * 150, t = r();
        put(t < 0.55 ? acacia(0.9 + r() * 0.6) : t < 0.7 ? baobab(0.9 + r() * 0.4) : t < 0.85 ? termite(0.4 + r() * 0.5) : A.rock(0.6 + r() * 1.2, [0xB07A55, 0x9C6A48, 0xC28E66]), x, z, -0.1);
        if (k % 20 === 19) yield;
      }
      for (let k = 0; k < 50; k++) { const side = r() > 0.5 ? 1 : -1; put(tallGrass(8, [0xD9B860, 0xC9A55A, 0xB8944A][k % 3]), side * (L.opt.half + 0.8 + Math.pow(r(), 1.5) * 30), z0 - r() * 150); }
      if (i % 2 === 1) { const side = r() > 0.5 ? 1 : -1, x0 = side * (L.opt.half + 14 + r() * 16), zc = z0 - r() * 150; for (let q = 0; q < 1 + Math.floor(r() * 3); q++) put(giraffe(0.9 + r() * 0.25), x0 + (r() - 0.5) * 10, zc + (r() - 0.5) * 10); }
      yield;
      if (i % 2 === 0) { const side = r() > 0.5 ? 1 : -1; placePond(3 + r() * 2.5, 0x4FA3C7, 0x8A6A44, side * (L.opt.half + 12 + r() * 18), z0 - r() * 150); }
      for (let zz = z0 - 4; zz > z1 + 30; zz -= 34) for (const side of [-1, 1]) if (r() < 0.3) put(A.fence(24), side * (L.opt.half + 1.6), zz, 0, 0);
    },
  },
  ...THEMES_B,
];

// Chaque monde a son profil de piste dans tracks.js : les deux listes doivent avoir la même longueur
if (THEMES.length !== TRACKS.length) console.warn(`themes.js : ${THEMES.length} mondes mais ${TRACKS.length} profils de piste dans tracks.js`);

// Monde d'un niveau : après le dernier, on recommence au premier
export const themeIndex = (level) => (Math.max(1, level) - 1) % THEMES.length;
export const themeFor = (level) => THEMES[themeIndex(level)];
export { pond, mix };
