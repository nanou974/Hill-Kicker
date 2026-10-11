// Mondes du jeu : chaque niveau a son paysage (ciel, couleurs du terrain, décor, objets sur la piste).
// Après le dernier monde, le jeu recommence au premier (niveau 21 = monde 1, etc.) : il n'y a pas de fin.
// Seule l'apparence change : le relief, la physique et l'économie restent ceux du niveau.
import * as THREE from 'three';
import * as A from '../assets3d.js';

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

// ---------- Définition des mondes ----------
// sky : dégradé du ciel (haut, milieu, horizon) · fog : brume lointaine · hemi / sun : lumières
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
];

// Monde d'un niveau : après le dernier, on recommence au premier
export const themeIndex = (level) => (Math.max(1, level) - 1) % THEMES.length;
export const themeFor = (level) => THEMES[themeIndex(level)];
export { pond, mix };
