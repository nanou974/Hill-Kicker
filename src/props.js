// Décors low-poly des 20 mondes de Hill Kicker. Chaque fonction renvoie un objet posé à l'origine (pied au sol),
// à l'échelle s. r : générateur aléatoire déterministe (variations de couleur et de forme).
import * as THREE from 'three';
import { mat, lump } from './assets3d.js';

const M = (c, o) => mat(c, o);
const box = (w, h, d, c, o) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? M(c, o) : c);
const cyl = (rt, rb, h, seg, c, o) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === 'number' ? M(c, o) : c);
const ico = (rad, c, d = 0, o) => new THREE.Mesh(new THREE.IcosahedronGeometry(rad, d), typeof c === 'number' ? M(c, o) : c);
const cone = (rad, h, seg, c, o) => new THREE.Mesh(new THREE.ConeGeometry(rad, h, seg), typeof c === 'number' ? M(c, o) : c);
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const roty = (m, a) => { m.rotation.y = a; return m; };
function group(...items) { const g = new THREE.Group(); for (const i of items) g.add(i); g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// ---------- végétation ----------
export function roundTree(s, r, greens, trunk = 0x7A5230) {
  const g = [at(cyl(0.18 * s, 0.28 * s, 1.6 * s, 6, trunk), 0, 0.8 * s, 0)];
  for (let i = 0; i < 3; i++) g.push(at(ico((1.1 - i * 0.18) * s, pick(r, greens)), (i - 1) * 0.45 * s, (1.9 + i * 0.55) * s, (i % 2 ? 0.3 : -0.2) * s));
  return group(...g);
}
export function coneTree(s, r, greens, trunk = 0x6B4A2B, snow = false) {
  const g = [at(cyl(0.15 * s, 0.22 * s, 1 * s, 6, trunk), 0, 0.5 * s, 0)];
  for (let i = 0; i < 3; i++) {
    g.push(at(cone((1.3 - i * 0.32) * s, 1.5 * s, 7, pick(r, greens)), 0, (1.4 + i * 0.75) * s, 0));
    if (snow) g.push(at(cone((0.75 - i * 0.2) * s, 0.6 * s, 7, 0xF4F8FF), 0, (1.85 + i * 0.75) * s, 0));
  }
  return group(...g);
}
export function cypress(s, r) { return group(at(cyl(0.12 * s, 0.18 * s, 0.8 * s, 6, 0x5A4030), 0, 0.4 * s, 0), at(new THREE.Mesh(new THREE.CapsuleGeometry(0.55 * s, 3.4 * s, 3, 7), M(0x2E5A2A)), 0, 2.7 * s, 0)); }
export function palm(s, r) {
  const g = []; let x = 0, y = 0; const lean = (r() - 0.5) * 0.5;
  for (let i = 0; i < 6; i++) { const seg = cyl(0.17 * s, 0.22 * s, 0.9 * s, 6, i % 2 ? 0x9C7A4D : 0x8A6A40); seg.position.set(x, y + 0.45 * s, 0); seg.rotation.z = -lean; g.push(seg); x += Math.sin(lean) * 0.9 * s; y += Math.cos(lean) * 0.85 * s; }
  for (let k = 0; k < 7; k++) {
    const leaf = box(2.4 * s, 0.06 * s, 0.6 * s, k % 2 ? 0x3E9A3A : 0x2F7F33); leaf.geometry.translate(1.2 * s, 0, 0);
    leaf.position.set(x, y, 0); leaf.rotation.set(0, k / 7 * Math.PI * 2, -0.45); g.push(leaf);
  }
  g.push(at(ico(0.22 * s, 0x6B4A2B), x + 0.2 * s, y - 0.2 * s, 0.1 * s));
  return group(...g);
}
export function cactus(s, r) {
  const c = 0x3E8E4A, g = [at(new THREE.Mesh(new THREE.CapsuleGeometry(0.35 * s, 2.6 * s, 3, 8), M(c)), 0, 1.6 * s, 0)];
  for (const sd of [-1, 1]) if (r() < 0.8) {
    const h = (0.8 + r() * 0.8) * s;
    g.push(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * s, 0.6 * s, 3, 6), M(c)), sd * 0.6 * s, h, 0));
    g.push(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.2 * s, 0.9 * s, 3, 6), M(c)), sd * 0.82 * s, h + 0.55 * s, 0));
  }
  return group(...g);
}
export function acacia(s, r) {
  const g = [at(cyl(0.16 * s, 0.24 * s, 2.6 * s, 6, 0x6B4A2B), 0, 1.3 * s, 0)];
  for (const sd of [-1, 1]) { const br = cyl(0.08 * s, 0.12 * s, 1.4 * s, 5, 0x6B4A2B); br.position.set(sd * 0.45 * s, 2.8 * s, 0); br.rotation.z = -sd * 0.7; g.push(br); }
  const top = cyl(2.4 * s, 2.0 * s, 0.6 * s, 8, 0x6E8F2E); top.position.y = 3.5 * s; g.push(top);
  return group(...g);
}
export function baobab(s, r) { return group(at(cyl(0.7 * s, 1.1 * s, 4 * s, 8, 0x9C8468), 0, 2 * s, 0), at(ico(1.4 * s, 0x6E8F2E), 0, 4.4 * s, 0), at(ico(1.0 * s, 0x7FA03A), 1.1 * s, 4.1 * s, 0.3 * s)); }
export function jungleTree(s, r) {
  const g = [at(cyl(0.22 * s, 0.4 * s, 6 * s, 7, 0x5C4632), 0, 3 * s, 0)];
  for (let k = 0; k < 6; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(1.4 * s, 6, 4), M(pick(r, [0x1F6B2A, 0x2A8034, 0x17592A]))); lf.scale.set(1.3, 0.4, 0.8); lf.position.set(Math.cos(k) * 1.3 * s, 6 * s + (k % 2) * 0.5 * s, Math.sin(k) * 1.3 * s); lf.rotation.y = k; g.push(lf); }
  for (let k = 0; k < 3; k++) g.push(at(cyl(0.03 * s, 0.03 * s, 3 * s, 4, 0x3E7A2E), (r() - 0.5) * 2 * s, 4.5 * s, (r() - 0.5) * 2 * s)); // lianes
  return group(...g);
}
export function fern(s, r) { const g = []; for (let k = 0; k < 6; k++) { const f = cone(0.25 * s, 1.6 * s, 4, pick(r, [0x2A8034, 0x3E9A3A])); f.position.set(0, 0.6 * s, 0); f.rotation.set(Math.cos(k) * 0.9, 0, Math.sin(k) * 0.9); g.push(f); } return group(...g); }
export function cypressMoss(s, r) {
  const g = [at(cyl(0.3 * s, 0.9 * s, 1.2 * s, 7, 0x5C4A38), 0, 0.6 * s, 0), at(cyl(0.22 * s, 0.32 * s, 5 * s, 6, 0x5C4A38), 0, 3.4 * s, 0)];
  for (let k = 0; k < 4; k++) g.push(at(ico(1.1 * s, pick(r, [0x4E6B3A, 0x5E7A44])), Math.cos(k * 1.7) * 0.9 * s, (5 + k * 0.4) * s, Math.sin(k * 1.7) * 0.9 * s));
  for (let k = 0; k < 6; k++) g.push(at(cone(0.15 * s, 1.6 * s, 4, 0x8E9A78), Math.cos(k) * 1.2 * s, 4.2 * s, Math.sin(k) * 1.2 * s)); // mousse espagnole
  g.forEach(m => { if (m.geometry.type === 'ConeGeometry') m.rotation.x = Math.PI; });
  return group(...g);
}
export function reeds(s, r) { const g = []; for (let k = 0; k < 7; k++) { const h = (1 + r()) * s; g.push(at(cyl(0.03 * s, 0.03 * s, h, 4, 0x6E7F3A), (r() - 0.5) * 0.8 * s, h / 2, (r() - 0.5) * 0.8 * s)); if (k % 2) g.push(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.06 * s, 0.25 * s, 2, 5), M(0x6B4A2B)), g[g.length - 1].position.x, h, g[g.length - 1].position.z)); } return group(...g); }
export function cherryTree(s, r) { return roundTree(s, r, [0xF7B6C8, 0xF49AB6, 0xFAD0DC], 0x5C3F33); }
export function autumnTree(s, r) { return roundTree(s, r, [0xE07B26, 0xC9471F, 0xEAB02A, 0xB8661F]); }
export function bamboo(s, r) { const g = []; for (let k = 0; k < 5; k++) { const h = (4 + r() * 2) * s, x = (r() - 0.5) * 1.2 * s, z = (r() - 0.5) * 1.2 * s; g.push(at(cyl(0.07 * s, 0.08 * s, h, 6, 0x7FB04A), x, h / 2, z)); g.push(at(ico(0.4 * s, 0x5E9A3A), x, h, z)); } return group(...g); }
export function mushroom(s, r) { const g = [at(cyl(0.35 * s, 0.45 * s, 2 * s, 8, 0xF2E6D0), 0, 1 * s, 0)]; const cap = new THREE.Mesh(new THREE.SphereGeometry(1.4 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(pick(r, [0xD62828, 0xE07B26]))); cap.position.y = 1.9 * s; g.push(cap); for (let k = 0; k < 6; k++) g.push(at(ico(0.18 * s, 0xFFFFFF), Math.cos(k) * 0.9 * s, 2.6 * s + (k % 2) * 0.2 * s, Math.sin(k) * 0.9 * s)); return group(...g); }
export function lavenderRow(s, r) { const g = []; for (let k = 0; k < 8; k++) g.push(at(ico(0.45 * s, pick(r, [0x9B7FD4, 0x8A6CC8, 0xA98BDD])), 0, 0.35 * s, -k * 0.9 * s)); return group(...g); }
export function olive(s, r) { return roundTree(s * 0.8, r, [0x8A9A6B, 0x7D8E60, 0x9AAA7B], 0x6B5A48); }
export function seaweed(s, r) { const g = []; for (let k = 0; k < 4; k++) { const h = (2 + r() * 3) * s; const w = new THREE.Mesh(new THREE.CapsuleGeometry(0.12 * s, h, 2, 5), M(pick(r, [0x2E8B57, 0x3CA36A, 0x56B87A]))); w.position.set((r() - 0.5) * s, h / 2, (r() - 0.5) * s); w.rotation.z = (r() - 0.5) * 0.4; g.push(w); } return group(...g); }
export function coral(s, r) { const c = pick(r, [0xFF6F91, 0xFF9E40, 0xB388FF, 0xFFD54F]), g = []; for (let k = 0; k < 6; k++) { const b = cyl(0.12 * s, 0.18 * s, (1 + r() * 1.5) * s, 6, c); b.position.set((r() - 0.5) * 0.6 * s, 0.7 * s, (r() - 0.5) * 0.6 * s); b.rotation.set((r() - 0.5) * 1.2, 0, (r() - 0.5) * 1.2); g.push(b); } return group(...g); }

// ---------- bâtiments et objets ----------
export function stoneHouse(s, r) { return group(at(box(6 * s, 3.5 * s, 5 * s, 0xE6D3B0), 0, 1.75 * s, 0), at(roty(cone(4.6 * s, 1.8 * s, 4, 0xC9683A), Math.PI / 4), 0, 4.4 * s, 0), at(box(1 * s, 1.6 * s, 0.1, 0x5A7FA0), 0, 1.2 * s, 2.52 * s)); }
export function beehive(s, r) { const g = []; for (let k = 0; k < 3; k++) g.push(at(box(0.9 * s, 0.45 * s, 0.7 * s, k % 2 ? 0xF2C14E : 0xEAD7A8), 0, (0.25 + k * 0.45) * s, 0)); g.push(at(box(1.05 * s, 0.12 * s, 0.85 * s, 0x7A5230), 0, 1.45 * s, 0)); return group(...g); }
export function beachHut(s, r) { const c = pick(r, [0x4FC3F7, 0xFF8A65, 0xFFF176]); return group(at(box(2.4 * s, 2.2 * s, 2.4 * s, c), 0, 1.6 * s, 0), at(roty(cone(2.1 * s, 1.2 * s, 4, 0xF4F6FA), Math.PI / 4), 0, 3.3 * s, 0), ...[-1, 1].flatMap(a => [-1, 1].map(b => at(cyl(0.08 * s, 0.08 * s, 0.6 * s, 5, 0x8A6A40), a * 1 * s, 0.3 * s, b * 1 * s)))); }
export function parasol(s, r) { const c = pick(r, [0xE5383B, 0x2F86F0, 0xFFC21A]); return group(at(cyl(0.05 * s, 0.05 * s, 2.4 * s, 5, 0xF4F6FA), 0, 1.2 * s, 0), at(cone(1.4 * s, 0.6 * s, 8, c), 0, 2.4 * s, 0)); }
export function termiteMound(s, r) { return group(at(cone(0.9 * s, 3.2 * s, 7, 0xB5703F), 0, 1.6 * s, 0), at(cone(0.5 * s, 1.8 * s, 6, 0xA5603A), 0.6 * s, 0.9 * s, 0.2 * s)); }
export function mesa(s, r) { const c = pick(r, [0xB8573A, 0xC9683A, 0xA8492F]); return group(at(cyl(4 * s, 5 * s, 9 * s, 7, c), 0, 4.5 * s, 0), at(cyl(4.2 * s, 4 * s, 0.6 * s, 7, 0xD08A5A), 0, 9.2 * s, 0)); }
export function saloon(s, r) {
  const sh = sharedTex('saloon', 256, 64, (c, W, H) => { c.fillStyle = '#7A4A24'; c.fillRect(0, 0, W, H); c.fillStyle = '#F2D59A'; c.font = 'bold 40px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SALOON', W / 2, H / 2 + 2); });
  sh.m ??= M(0xffffff, { map: sh.t });
  const signM = [M(0x7A4A24), M(0x7A4A24), M(0x7A4A24), M(0x7A4A24), sh.m, sh.m];
  return group(at(box(7 * s, 4.5 * s, 6 * s, 0xA8743E), 0, 2.25 * s, 0), at(box(7 * s, 2.2 * s, 0.3 * s, 0x8E5E30), 0, 5.4 * s, 2.9 * s), at(new THREE.Mesh(new THREE.BoxGeometry(4 * s, 1 * s, 0.1), signM), 0, 5.4 * s, 3.1 * s), at(box(7.4 * s, 0.2 * s, 2 * s, 0x6B4A2B), 0, 3 * s, 3.9 * s), ...[-3, -1, 1, 3].map(x => at(cyl(0.1 * s, 0.1 * s, 3 * s, 5, 0x6B4A2B), x * s, 1.5 * s, 4.7 * s)));
}
export function waterTower(s, r) { return group(at(cyl(1.6 * s, 1.6 * s, 2.4 * s, 10, 0x8E5E30), 0, 6 * s, 0), at(cone(1.8 * s, 0.9 * s, 10, 0x6B4A2B), 0, 7.6 * s, 0), ...[-1, 1].flatMap(a => [-1, 1].map(b => at(cyl(0.1 * s, 0.12 * s, 4.8 * s, 5, 0x6B4A2B), a * 1.1 * s, 2.4 * s, b * 1.1 * s)))); }
export function tumbleweed(s, r) { return group(at(ico(0.6 * s, 0xB59A6A, 1, { flat: true }), 0, 0.6 * s, 0)); }
export function stepPyramid(s, r) { const g = []; for (let k = 0; k < 5; k++) g.push(at(box((9 - k * 1.7) * s, 1.4 * s, (9 - k * 1.7) * s, k % 2 ? 0x9C9A84 : 0xAAA88F), 0, (0.7 + k * 1.4) * s, 0)); g.push(at(box(1.6 * s, 1.6 * s, 1.6 * s, 0x7E7C68), 0, 7.8 * s, 0)); g.push(at(box(1.8 * s, 7 * s, 0.6 * s, 0x8E8C76), 0, 3.5 * s, 4.2 * s)); return group(...g); }
export function stoneHead(s, r) { return group(at(box(1.6 * s, 2.4 * s, 1.4 * s, 0x8E8C76), 0, 1.2 * s, 0), at(box(1.7 * s, 0.4 * s, 1.5 * s, 0x7E7C68), 0, 2.5 * s, 0), at(box(0.4 * s, 0.25 * s, 0.1, 0x3A3A30), -0.35 * s, 1.6 * s, 0.72 * s), at(box(0.4 * s, 0.25 * s, 0.1, 0x3A3A30), 0.35 * s, 1.6 * s, 0.72 * s), at(box(0.8 * s, 0.15 * s, 0.1, 0x3A3A30), 0, 0.9 * s, 0.72 * s)); }
export function stiltCabin(s, r) { return group(at(box(4 * s, 2.6 * s, 3.5 * s, 0x6B5A48), 0, 2.8 * s, 0), at(roty(cone(3.2 * s, 1.4 * s, 4, 0x4A3F33), Math.PI / 4), 0, 4.8 * s, 0), ...[-1, 1].flatMap(a => [-1, 1].map(b => at(cyl(0.12 * s, 0.12 * s, 1.6 * s, 5, 0x4A3F33), a * 1.7 * s, 0.8 * s, b * 1.5 * s)))); }
export function torii(s, r) { const red = 0xD63A2F; return group(at(cyl(0.25 * s, 0.3 * s, 5 * s, 8, red), -2.2 * s, 2.5 * s, 0), at(cyl(0.25 * s, 0.3 * s, 5 * s, 8, red), 2.2 * s, 2.5 * s, 0), at(box(6.4 * s, 0.45 * s, 0.6 * s, 0x2A2A2A), 0, 5.2 * s, 0), at(box(5.6 * s, 0.35 * s, 0.4 * s, red), 0, 4.3 * s, 0)); }
export function pagoda(s, r) { const g = []; for (let k = 0; k < 4; k++) { const w = (5 - k * 0.9) * s; g.push(at(box(w * 0.7, 1.5 * s, w * 0.7, 0xE8DCC2), 0, (0.75 + k * 2) * s, 0)); g.push(at(roty(cone(w * 0.75, 0.8 * s, 4, 0x3A3F48), Math.PI / 4), 0, (1.8 + k * 2) * s, 0)); } g.push(at(cyl(0.06 * s, 0.06 * s, 1.6 * s, 5, 0xC9A227), 0, 9 * s, 0)); return group(...g); }
export function stoneLantern(s, r) { return group(at(box(0.8 * s, 0.3 * s, 0.8 * s, 0x9A9A92), 0, 0.15 * s, 0), at(cyl(0.18 * s, 0.22 * s, 1.1 * s, 6, 0x9A9A92), 0, 0.85 * s, 0), at(box(0.7 * s, 0.6 * s, 0.7 * s, 0xA8A8A0), 0, 1.7 * s, 0), at(cone(0.7 * s, 0.5 * s, 4, 0x8A8A82), 0, 2.25 * s, 0)); }
// Textures partagées (une par variante) : les décors identiques fusionnent en un seul objet à dessiner
const texShared = new Map();
function sharedTex(key, w, h, draw, wrap = false) {
  if (!texShared.has(key)) { const t = canvasTex(w, h, draw); if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; texShared.set(key, { t, m: null }); }
  return texShared.get(key);
}
export function skyscraper(s, r) {
  const h = (14 + r() * 26) * s, w = (5 + r() * 4) * s, hue = pick(r, ['#FFE08A', '#8AE8FF', '#FF9AE0']);
  let k = 3; const sh = sharedTex('sky' + hue, 64, 128, (c, W, H) => { c.fillStyle = '#141826'; c.fillRect(0, 0, W, H); for (let y = 4; y < H; y += 10) for (let x = 4; x < W; x += 10) { k = (k * 16807) % 2147483647; c.fillStyle = k / 2147483647 < 0.55 ? hue : '#232A3D'; c.fillRect(x, y, 6, 6); } }, true);
  sh.m ??= new THREE.MeshStandardMaterial({ map: sh.t, emissiveMap: sh.t, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.6 });
  // la répétition des fenêtres se fait par les coordonnées de texture de la géométrie (matériau partagé)
  const geo = new THREE.BoxGeometry(w, h, w), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 6, uv.getY(i) * h / 10);
  return group(at(new THREE.Mesh(geo, sh.m), 0, h / 2, 0), at(box(w * 0.6, 1.2 * s, w * 0.6, 0x2A3042), 0, h + 0.6 * s, 0));
}
export function neonSign(s, r) { const c = pick(r, [0xFF2E88, 0x2EE6FF, 0xFFE24A, 0x7CFF4A]); return group(at(cyl(0.12 * s, 0.12 * s, 5 * s, 6, 0x2A2F38), 0, 2.5 * s, 0), at(box(3.2 * s, 1.6 * s, 0.3 * s, 0x1B2030), 0, 5.6 * s, 0), at(box(2.8 * s, 0.2 * s, 0.1 * s, c, { e: c, ei: 2 }), 0, 6.1 * s, 0.2 * s), at(box(2.2 * s, 0.2 * s, 0.1 * s, c, { e: c, ei: 2 }), 0, 5.4 * s, 0.2 * s)); }
export function streetLamp(s, r) { return group(at(cyl(0.08 * s, 0.1 * s, 5 * s, 6, 0x3A3F48), 0, 2.5 * s, 0), at(box(1.2 * s, 0.1 * s, 0.15 * s, 0x3A3F48), -0.5 * s, 5 * s, 0), at(box(0.5 * s, 0.15 * s, 0.3 * s, 0xFFF1C4, { e: 0xFFE08A, ei: 2 }), -1 * s, 4.9 * s, 0)); }
export function crane(s, r) { const y = 0xF2B90F; return group(at(box(0.8 * s, 16 * s, 0.8 * s, y), 0, 8 * s, 0), at(box(12 * s, 0.6 * s, 0.6 * s, y), 3 * s, 16 * s, 0), at(box(2 * s, 1.4 * s, 1.2 * s, 0x3A3F48), -2.5 * s, 15.5 * s, 0), at(cyl(0.03 * s, 0.03 * s, 6 * s, 4, 0x222222), 7 * s, 13 * s, 0), at(box(1.2 * s, 0.6 * s, 1.2 * s, 0x3A3F48), 7 * s, 10 * s, 0)); }
export function girders(s, r) { const g = []; for (let k = 0; k < 4; k++) g.push(at(box(0.5 * s, 0.5 * s, 6 * s, 0xC0392B), (k % 2) * 0.55 * s, (0.25 + Math.floor(k / 2) * 0.5) * s, 0)); return group(...g); }
export function pipes(s, r) { const g = []; for (let k = 0; k < 3; k++) { const p = cyl(0.5 * s, 0.5 * s, 5 * s, 10, 0x8E959E, { m: 0.5 }); p.rotation.x = Math.PI / 2; p.position.set((k - 1) * 1.05 * s, 0.5 * s, 0); g.push(p); } const top = cyl(0.5 * s, 0.5 * s, 5 * s, 10, 0x8E959E, { m: 0.5 }); top.rotation.x = Math.PI / 2; top.position.set(-0.5 * s, 1.4 * s, 0); g.push(top); return group(...g); }
export function trafficCone(s, r) { return group(at(box(0.5 * s, 0.06 * s, 0.5 * s, 0x222222), 0, 0.03 * s, 0), at(cone(0.22 * s, 0.75 * s, 10, 0xFF6A1A), 0, 0.42 * s, 0), at(cyl(0.13 * s, 0.16 * s, 0.12 * s, 10, 0xFFFFFF), 0, 0.45 * s, 0)); }
export function container(s, r) { return group(at(box(2.4 * s, 2.6 * s, 6 * s, pick(r, [0x2F86F0, 0xE5383B, 0x16A34A, 0xF2B90F])), 0, 1.3 * s, 0)); }
export function iceberg(s, r) { const m = lump(Math.floor(r() * 50) + 600, 2.4 * s, 3 * s, 2.2 * s, pick(r, [0xEAF6FF, 0xCFEAFB, 0xBFE3F7])); m.position.y = 1.4 * s; return group(m); }
export function igloo(s, r) { const d = new THREE.Mesh(new THREE.SphereGeometry(2 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0xF4F8FF)); const door = new THREE.Mesh(new THREE.CylinderGeometry(0.7 * s, 0.7 * s, 1.4 * s, 8, 1, false, 0, Math.PI), M(0xE2EEF8)); door.rotation.set(Math.PI / 2, 0, 0); door.position.set(0, 0, 2 * s); return group(d, door); }
export function penguin(s, r) { return group(at(new THREE.Mesh(new THREE.CapsuleGeometry(0.3 * s, 0.5 * s, 3, 8), M(0x1E2229)), 0, 0.6 * s, 0), at(new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 8, 6), M(0xFFFFFF)), 0, 0.6 * s, 0.14 * s), at(cone(0.08 * s, 0.2 * s, 5, 0xFFA726), 0, 1 * s, 0.25 * s)); }
export function volcano(s, r) { return group(at(cone(10 * s, 9 * s, 9, 0x2A2626), 0, 4.5 * s, 0), at(cyl(2.2 * s, 2.6 * s, 0.6 * s, 9, 0xFF5A1F, { e: 0xFF3D00, ei: 1.6 }), 0, 8.8 * s, 0)); }
export function lavaRock(s, r) { const m = lump(Math.floor(r() * 50) + 700, 1.3 * s, 0.9 * s, 1.2 * s, 0x2B2727); m.position.y = 0.6 * s; return group(m, at(box(1.6 * s, 0.06 * s, 0.12 * s, 0xFF6A1F, { e: 0xFF4500, ei: 2 }), 0, 0.05 * s, 0)); }
export function geyser(s, r) { return group(at(cyl(0.9 * s, 1.2 * s, 0.6 * s, 8, 0x5A5450), 0, 0.3 * s, 0), at(cone(0.6 * s, 5 * s, 8, 0xF4F6FA, { t: true, o: 0.55 }), 0, 3 * s, 0)); }
export function deadTree(s, r) { const g = [at(cyl(0.12 * s, 0.22 * s, 3 * s, 5, 0x3A3330), 0, 1.5 * s, 0)]; for (let k = 0; k < 3; k++) { const b = cyl(0.05 * s, 0.09 * s, 1.4 * s, 4, 0x3A3330); b.position.set(Math.cos(k * 2) * 0.4 * s, (2 + k * 0.4) * s, Math.sin(k * 2) * 0.4 * s); b.rotation.set(Math.sin(k * 2) * 0.8, 0, -Math.cos(k * 2) * 0.8); g.push(b); } return group(...g); }
export function shipwreck(s, r) { const hull = new THREE.Mesh(new THREE.CylinderGeometry(2 * s, 2 * s, 10 * s, 8, 1, true, 0, Math.PI), M(0x6B4A2B, { side: THREE.DoubleSide })); hull.rotation.set(0, 0, Math.PI); hull.rotation.x = Math.PI / 2; hull.position.y = 1.4 * s; const mast = cyl(0.15 * s, 0.18 * s, 7 * s, 6, 0x5C4632); mast.position.set(0, 4 * s, 0); mast.rotation.z = 0.5; return group(hull, mast); }
export function clam(s, r) { const a = new THREE.Mesh(new THREE.SphereGeometry(1 * s, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), M(0xE8B4C8)); a.scale.y = 0.5; const b = a.clone(); b.rotation.x = -1; b.position.set(0, 0.1 * s, -0.5 * s); return group(a, b, at(new THREE.Mesh(new THREE.SphereGeometry(0.25 * s, 10, 8), M(0xFFFFFF, { r: 0.1, m: 0.3 })), 0, 0.35 * s, 0)); }
export function toyBlock(s, r) {
  const c = pick(r, ['#E5383B', '#2F86F0', '#FFC21A', '#16A34A']), L = pick(r, ['A', 'B', 'C', 'H', 'K']);
  const sh = sharedTex('toy' + c + L, 64, 64, (g, W, H) => { g.fillStyle = c; g.fillRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(4, 4, W - 8, H - 8); g.fillStyle = '#fff'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L, W / 2, H / 2 + 2); });
  sh.m ??= M(0xffffff, { map: sh.t });
  return group(at(new THREE.Mesh(new THREE.BoxGeometry(2 * s, 2 * s, 2 * s), sh.m), 0, 1 * s, 0));
}
export function bookStack(s, r) { const g = []; for (let k = 0; k < 4; k++) { const b = box((4 + r()) * s, 0.7 * s, (3 + r() * 0.5) * s, pick(r, [0xC0392B, 0x2F5AA8, 0x16A34A, 0x8E44AD, 0xF2B90F])); b.position.y = (0.35 + k * 0.7) * s; b.rotation.y = (r() - 0.5) * 0.4; g.push(b); } return group(...g); }
export function pencil(s, r) { const p = cyl(0.35 * s, 0.35 * s, 7 * s, 6, pick(r, [0xF2B90F, 0x2F86F0, 0xE5383B])); p.rotation.z = Math.PI / 2; p.position.y = 0.35 * s; const tip = cone(0.35 * s, 1 * s, 6, 0xE8C9A0); tip.rotation.z = -Math.PI / 2; tip.position.set(4 * s, 0.35 * s, 0); return group(p, tip); }
export function plushBear(s, r) { const c = pick(r, [0xB07A4A, 0xE8B4C8, 0xF2D59A]); return group(at(ico(1.1 * s, c, 1, { flat: false }), 0, 1.1 * s, 0), at(ico(0.8 * s, c, 1, { flat: false }), 0, 2.5 * s, 0), at(ico(0.3 * s, c, 1), -0.6 * s, 3.1 * s, 0), at(ico(0.3 * s, c, 1), 0.6 * s, 3.1 * s, 0), at(ico(0.1 * s, 0x1E2229), -0.25 * s, 2.6 * s, 0.72 * s), at(ico(0.1 * s, 0x1E2229), 0.25 * s, 2.6 * s, 0.72 * s)); }
export function toyBall(s, r) { return group(at(new THREE.Mesh(new THREE.SphereGeometry(1 * s, 14, 10), M(pick(r, [0xE5383B, 0x2F86F0, 0xFFC21A]), { flat: false })), 0, 1 * s, 0)); }
export function lollipop(s, r) { const c = pick(r, [0xFF6FB5, 0x6FE3FF, 0xFFD84D, 0xA6FF6F]); const d = cyl(1.1 * s, 1.1 * s, 0.3 * s, 16, c); d.rotation.x = Math.PI / 2; d.position.y = 3.2 * s; const sw = new THREE.Mesh(new THREE.TorusGeometry(0.6 * s, 0.1 * s, 6, 16), M(0xFFFFFF)); sw.position.set(0, 3.2 * s, 0.16 * s); return group(at(cyl(0.08 * s, 0.08 * s, 3 * s, 6, 0xFFFFFF), 0, 1.5 * s, 0), d, sw); }
export function candyCane(s, r) { const g = []; for (let k = 0; k < 8; k++) g.push(at(cyl(0.2 * s, 0.2 * s, 0.45 * s, 8, k % 2 ? 0xE5383B : 0xFFFFFF), 0, (0.22 + k * 0.45) * s, 0)); const hook = new THREE.Mesh(new THREE.TorusGeometry(0.5 * s, 0.2 * s, 6, 10, Math.PI), M(0xE5383B)); hook.position.set(0.5 * s, 3.6 * s, 0); g.push(hook); return group(...g); }
export function gumdrop(s, r) { const g = new THREE.Mesh(new THREE.SphereGeometry(1 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(pick(r, [0xFF6FB5, 0x6FE3FF, 0xFFD84D, 0xA6FF6F, 0xC77DFF]), { flat: false })); g.scale.y = 1.3; return group(g); }
export function marshmallow(s, r) { return group(at(cyl(0.8 * s, 0.8 * s, 1.2 * s, 12, pick(r, [0xFFF0F5, 0xFFD6E8]), { flat: false }), 0, 0.6 * s, 0)); }
export function donut(s, r) { const d = new THREE.Mesh(new THREE.TorusGeometry(1 * s, 0.45 * s, 8, 16), M(0xD9A066, { flat: false })); d.rotation.x = -Math.PI / 2; d.position.y = 0.45 * s; const ic = new THREE.Mesh(new THREE.TorusGeometry(1 * s, 0.42 * s, 8, 16, Math.PI * 2), M(pick(r, [0xFF6FB5, 0x7B4A2A, 0xFFFFFF]), { flat: false })); ic.rotation.x = -Math.PI / 2; ic.position.y = 0.6 * s; ic.scale.z = 0.5; return group(d, ic); }
export function craterRim(s, r) { const g = []; for (let k = 0; k < 9; k++) { const m = lump(800 + k, 1.2 * s, 0.6 * s, 1 * s, 0x8A8A8E); const a = k / 9 * Math.PI * 2; m.position.set(Math.cos(a) * 3 * s, 0.2 * s, Math.sin(a) * 3 * s); g.push(m); } return group(...g); }
export function lunarModule(s, r) { const g = [at(box(2 * s, 1.4 * s, 2 * s, 0xC9A227, { m: 0.7, r: 0.3 }), 0, 2 * s, 0), at(cyl(0.9 * s, 1.1 * s, 1.2 * s, 8, 0xD9D9DE), 0, 3.3 * s, 0)]; for (const a of [0, 1, 2, 3]) { const l = cyl(0.06 * s, 0.06 * s, 2 * s, 4, 0xB0B0B8); l.position.set(Math.cos(a * Math.PI / 2 + 0.78) * 1.4 * s, 0.9 * s, Math.sin(a * Math.PI / 2 + 0.78) * 1.4 * s); l.rotation.set(Math.sin(a * Math.PI / 2 + 0.78) * 0.4, 0, -Math.cos(a * Math.PI / 2 + 0.78) * 0.4); g.push(l); } return group(...g); }
export function dish(s, r) { const d = new THREE.Mesh(new THREE.SphereGeometry(1.6 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3), M(0xE8E8EE, { side: THREE.DoubleSide })); d.rotation.x = Math.PI * 0.75; d.position.y = 2.6 * s; return group(at(cyl(0.12 * s, 0.12 * s, 2.2 * s, 6, 0xB0B0B8), 0, 1.1 * s, 0), d); }
export function floatingIsland(s, r) { const g = [at(cone(3 * s, 4 * s, 7, 0x8A6A4A), 0, -2 * s, 0), at(cyl(3.1 * s, 3 * s, 0.6 * s, 7, 0x8FD46A), 0, 0.3 * s, 0)]; g[0].rotation.x = Math.PI; g.push(at(ico(1 * s, 0x5DB04A), 0.8 * s, 1.4 * s, 0)); const grp = group(...g); grp.position.y = 0; grp.userData.float = 8 + r() * 10; return grp; }
export function cloud(s, r) { const g = []; for (let k = 0; k < 5; k++) g.push(at(ico((1 + r() * 0.8) * s, 0xFFFFFF, 1, { flat: true }), (k - 2) * 1.2 * s, (r() * 0.6) * s, (r() - 0.5) * s)); return group(...g); }
export function rainbow(s, r) { const cols = [0xE5383B, 0xFF8A3D, 0xFFD23F, 0x16A34A, 0x2F86F0, 0x8E44AD], g = []; cols.forEach((c, k) => { const t = new THREE.Mesh(new THREE.TorusGeometry((9 - k * 0.6) * s, 0.3 * s, 6, 30, Math.PI), M(c, { e: c, ei: 0.3 })); g.push(t); }); return group(...g); }
export function crystal(s, r) { const c = pick(r, [0xB388FF, 0x80DEEA, 0xF8BBD0]), g = []; for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.6 * s, 0), M(c, { e: c, ei: 0.5 })); m.scale.y = 2.5 + r() * 2; m.position.set((r() - 0.5) * 1.4 * s, 1.5 * s, (r() - 0.5) * 1.4 * s); m.rotation.z = (r() - 0.5) * 0.5; g.push(m); } return group(...g); }

// ---------- bordures de piste (segment de 24 m le long de z) ----------
export function border(kind, len = 24) {
  const g = [], n = Math.max(2, Math.round(len / 3) + 1), zs = (i) => -i * (len / (n - 1));
  if (kind === 'stonewall') { for (let i = 0; i < n - 1; i++) g.push(at(box(0.6, 0.7, len / (n - 1) - 0.1, i % 2 ? 0xC9B896 : 0xBFAE8C), 0, 0.35, zs(i) - len / (n - 1) / 2)); }
  else if (kind === 'rope') { for (let i = 0; i < n; i++) g.push(at(cyl(0.08, 0.08, 1, 5, 0x9C7A4D), 0, 0.5, zs(i))); g.push(at(box(0.05, 0.05, len, 0xE8D9B0), 0, 0.85, -len / 2)); }
  else if (kind === 'guardrail') { for (let i = 0; i < n; i++) g.push(at(box(0.12, 0.8, 0.12, 0x8E959E), 0, 0.4, zs(i))); g.push(at(box(0.08, 0.3, len, 0xC9D1DC, { m: 0.6 }), 0, 0.65, -len / 2)); }
  else if (kind === 'barrier') { for (let i = 0; i < n - 1; i++) g.push(at(box(0.5, 0.8, len / (n - 1) - 0.3, i % 2 ? 0xE5383B : 0xF4F6FA), 0, 0.4, zs(i) - len / (n - 1) / 2)); }
  else if (kind === 'snowbank') { for (let i = 0; i < n; i++) g.push(at(ico(0.9, 0xF4F8FF, 0), 0, 0.2, zs(i))); }
  else if (kind === 'candy') { for (let i = 0; i < n; i++) g.push(at(cyl(0.12, 0.12, 1.2, 6, i % 2 ? 0xE5383B : 0xFFFFFF), 0, 0.6, zs(i))); g.push(at(box(0.08, 0.1, len, 0xFF6FB5), 0, 1.05, -len / 2)); }
  else if (kind === 'lamps') { for (let i = 0; i < n; i += 2) { g.push(at(cyl(0.07, 0.08, 3, 6, 0x3A3F48), 0, 1.5, zs(i))); g.push(at(box(0.3, 0.2, 0.3, 0xFFF1C4, { e: 0xFFE08A, ei: 2 }), 0, 3.05, zs(i))); } g.push(at(box(0.08, 0.3, len, 0x8E959E), 0, 0.5, -len / 2)); }
  else if (kind === 'bamboo') { for (let i = 0; i < n; i++) g.push(at(cyl(0.07, 0.07, 1.1, 5, 0x9AB85A), 0, 0.55, zs(i))); for (const y of [0.4, 0.85]) g.push(at(box(0.06, 0.06, len, 0x7FA048), 0, y, -len / 2)); }
  else if (kind === 'rocks') { for (let i = 0; i < n; i++) { const m = lump(900 + i, 0.7, 0.5, 0.7, 0x6E6A66); m.position.set(0, 0.2, zs(i)); g.push(m); } }
  else { // clôture de ferme en bois
    for (let i = 0; i < n; i++) g.push(at(box(0.18, 1.1, 0.18, 0x8A6236), 0, 0.55, zs(i)));
    for (const y of [0.45, 0.85]) g.push(at(box(0.1, 0.12, len, 0xB98A55), 0, y, -len / 2));
  }
  return group(...g);
}

// ---------- Décors repris de la version « cinq mondes » (citrouille, tiki, ballon de plage, girafe) ----------
export function pumpkin(s, r) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.62 * s, 9, 6), M(0xF07A1F)); b.scale.y = 0.72; b.position.y = 0.45 * s; return group(b, at(cyl(0.06 * s, 0.09 * s, 0.3 * s, 5, 0x4F7A2A), 0, 0.95 * s, 0)); }
export function tiki(s, r) {
  const g = [], cols = [0x8A5A30, 0x7A4E28, 0x9C6838];
  for (let i = 0; i < 3; i++) {
    g.push(at(box(1.25 * s, 1.15 * s, 1.15 * s, cols[i]), 0, (0.6 + i * 1.2) * s, 0));
    for (const x of [-0.28, 0.28]) g.push(at(box(0.28 * s, 0.22 * s, 0.08, 0xF4EADB), x * s, (0.85 + i * 1.2) * s, 0.6 * s));
    g.push(at(box(0.7 * s, 0.18 * s, 0.08, 0x2B1A0E), 0, (0.4 + i * 1.2) * s, 0.6 * s));
  }
  g.push(at(roty(cone(0.9 * s, 0.6 * s, 4, 0x4FB247), Math.PI / 4), 0, 3.9 * s, 0));
  return group(...g);
}
export function beachBall(s, r) { const g = [], cols = [0xE5383B, 0xFFFFFF, 0x2F86F0, 0xFFC21A]; for (let i = 0; i < 4; i++) g.push(at(new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 8, 6, i * Math.PI / 2, Math.PI / 2), M(cols[i], { flat: false })), 0, 0.55 * s, 0)); return group(...g); }
export function giraffe(s, r) {
  const y = 0xE3B04B, sp = 0x9C5A2A, g = [at(box(1.8 * s, 1 * s, 0.8 * s, y), 0, 2.1 * s, 0)];
  const neck = at(box(0.4 * s, 2.4 * s, 0.4 * s, y), 0.85 * s, 3.4 * s, 0); neck.rotation.z = -0.35; g.push(neck);
  g.push(at(box(0.8 * s, 0.4 * s, 0.4 * s, y), 1.4 * s, 4.6 * s, 0));
  for (const [x, z] of [[-0.7, -0.3], [-0.7, 0.3], [0.7, -0.3], [0.7, 0.3]]) g.push(at(box(0.2 * s, 1.7 * s, 0.2 * s, y), x * s, 0.85 * s, z * s));
  for (const [x, yy, z] of [[-0.5, 2.3, 0.41], [0.2, 2.0, 0.41], [0.5, 2.35, -0.41], [-0.2, 2.1, -0.41]]) g.push(at(box(0.35 * s, 0.3 * s, 0.04, sp), x * s, yy * s, z * s));
  return group(...g);
}
export function snowman(s, r) { return group(at(ico(0.6 * s, 0xFFFFFF, 1), 0, 0.55 * s, 0), at(ico(0.42 * s, 0xFFFFFF, 1), 0, 1.3 * s, 0), at(cone(0.08 * s, 0.35 * s, 5, 0xFF8A3D), 0, 1.35 * s, 0.45 * s)); }
