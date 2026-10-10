// Monde 3D d'un niveau : terrain généré par tronçons autour de la voiture, décors, pièces, rampes, plaques, arrivée.
import * as THREE from 'three';
import * as A from '../assets3d.js';
import { LEVEL_LENGTH } from './layout.js';

const CHUNK = 150, AHEAD = 2, BEHIND = 1;
const WIDTH = 240, STEP = 2.5;

function hash(ix, iz) { let h = (ix * 374761393 + iz * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

export class World {
  constructor(scene, layout) {
    this.scene = scene; this.L = layout; this.chunks = new Map();
    this.root = new THREE.Group(); scene.add(this.root);
    this.coinMeshes = []; this.gemMeshes = [];
    this.buildStatic();
  }
  dispose() { this.scene.remove(this.root); this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }

  buildStatic() {
    const L = this.L;
    // Lanceur au départ, sur une petite plateforme
    const y0 = L.ground(0, 6, 1).h;
    this.start = new THREE.Group(); this.root.add(this.start);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 9), A.mat(0x8A7A62)); plat.position.set(0, y0 - 1.75, 6); plat.receiveShadow = true; this.start.add(plat);
    this.launcher = A.launcher(5.6, 3.4); this.launcher.position.set(0, y0 + 0.3, 6); this.start.add(this.launcher);
    this.launcherTop = y0 + 0.92;
    // Arche d'arrivée
    const zf = -LEVEL_LENGTH, yf = L.ground(0, zf, 1).h;
    const gate = new THREE.Group();
    const pm = A.mat(0xFFFFFF, { flat: false });
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 9, 12), pm); p.position.set(s * 14, 4.5, 0); gate.add(p); }
    const ck = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#14213D' : '#FFFFFF'; g.fillRect(i * 16, j * 16, 16, 16); } return c; })());
    ck.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.BoxGeometry(29, 2.4, 0.4), A.mat(0xffffff, { map: ck })); banner.position.y = 8.6; gate.add(banner);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(2 * 22, 2.5), new THREE.MeshStandardMaterial({ map: ck, roughness: 0.9 })); line.rotation.x = -Math.PI / 2; line.position.y = 0.06; gate.add(line);
    gate.position.set(0, yf, zf); gate.traverse(o => { if (o.isMesh) o.castShadow = true; }); this.root.add(gate);
  }

  // Charge les tronçons proches de la voiture, décharge les autres
  update(carZ, time) {
    const ci = Math.floor(-carZ / CHUNK);
    for (let i = ci - BEHIND; i <= ci + AHEAD; i++) if (i >= -1 && !this.chunks.has(i) && i * CHUNK < LEVEL_LENGTH + CHUNK) this.chunks.set(i, this.buildChunk(i));
    for (const [i, g] of this.chunks) if (i < ci - BEHIND || i > ci + AHEAD) { this.root.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.chunks.delete(i); }
    // Animation des pièces et gemmes
    for (const m of this.coinMeshes) if (m.parent) { m.rotation.y = time * 2.4 + m.userData.phase; }
    for (const m of this.gemMeshes) if (m.parent) { m.rotation.y = time * 1.6; m.position.y = m.userData.y + Math.sin(time * 2.5) * 0.15; }
  }

  buildChunk(i) {
    const L = this.L, g = new THREE.Group();
    const zTop = -i * CHUNK + (i === -1 ? 0 : 0), z0 = -i * CHUNK, z1 = -(i + 1) * CHUNK;
    // Terrain : grille alignée sur une trame globale pour que les tronçons se raccordent
    const nx = Math.round(WIDTH / STEP), nz = Math.round(CHUNK / STEP);
    const pos = [], col = [], idx = [];
    const c = new THREE.Color();
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      const gx = ix - nx / 2, gz = Math.round(-z0 / STEP) + iz;
      const x = gx * STEP + (hash(gx, gz) - 0.5) * 0.9 * (Math.abs(gx * STEP) > 2 ? 1 : 0);
      const z = -gz * STEP + (hash(gz, gx) - 0.5) * 0.9 * (iz > 0 && iz < nz ? 1 : 0);
      const y = L.ground(x, z, 1).h + (hash(gx * 7, gz * 3) - 0.5) * 0.12;
      pos.push(x, y, z);
      const n = hash(gx * 3, gz * 5) * 0.06, ax = Math.abs(x);
      const stripe = (Math.floor((gz * STEP) / 7) % 2) ? 0.05 : -0.02;
      const patch = Math.sin(x * 0.21 + z * 0.13) + Math.sin(x * 0.09 - z * 0.27 + 2) + Math.sin(z * 0.05 + x * 0.3);
      if (L.isTarmac(x, z)) c.setRGB(0.26 + n, 0.27 + n, 0.31 + n, THREE.SRGBColorSpace);
      else if (ax < L.opt.half - 0.5) { if (patch > 1.6) c.setRGB(0.88 + n, 0.77 + n, 0.55 + n * 0.5, THREE.SRGBColorSpace); else c.setRGB(0.42 + stripe + n, 0.70 + stripe + n, 0.24 + stripe * 0.5 + n * 0.5, THREE.SRGBColorSpace); }
      else if (ax < L.opt.half + 2) c.setRGB(0.40 + n, 0.70 + n, 0.30, THREE.SRGBColorSpace);
      else c.setRGB(0.30 + n, 0.60 + n, 0.24 + n * 0.5, THREE.SRGBColorSpace);
      col.push(c.r, c.g, c.b);
    }
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const a = iz * (nx + 1) + ix, b = a + 1, d = a + nx + 1, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo = geo.toNonIndexed(); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, envMapIntensity: 0 }));
    mesh.receiveShadow = true; g.add(mesh);

    // Décors sur les bas-côtés
    const r = A.rng(5000 + L.level * 131 + i);
    for (let k = 0; k < 46; k++) {
      const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 2.5 + Math.pow(r(), 1.8) * 60), z = z0 - r() * CHUNK;
      const t = r(); let o;
      if (t < 0.45) o = A.tree(1.2 + r() * 1.4, k % 4); else if (t < 0.7) o = A.pine(1.3 + r() * 1.2); else if (t < 0.85) o = A.rock(0.6 + r() * 1.4); else o = A.hay(1);
      o.position.set(x, L.ground(x, z, 1).h - 0.1, z); o.rotation.y = r() * 6; g.add(o);
    }
    if (i % 3 === 1) { const wm = A.windmill(1.4); const x = (r() > 0.5 ? 1 : -1) * (L.opt.half + 26 + r() * 20), z = z0 - r() * CHUNK; wm.position.set(x, L.ground(x, z, 1).h - 0.4, z); wm.rotation.y = r() * 6; g.add(wm); }
    for (let k = 0; k < 40; k++) {
      const x = (r() - 0.5) * 2 * (L.opt.half - 1), z = z0 - r() * CHUNK;
      const tf = new THREE.Group();
      for (let q = 0; q < 3; q++) { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45 + r() * 0.3, 4), A.mat([0x3F8F2E, 0x56A63A, 0x2F7A2E][(k + q) % 3])); cn.position.set((r() - 0.5) * 0.3, 0.2, (r() - 0.5) * 0.3); tf.add(cn); }
      tf.position.set(x, L.ground(x, z, 1).h, z); g.add(tf);
    }

    const inChunk = (z) => z <= z0 && z > z1;
    for (const p of L.ramps) if (inChunk(p.z)) { const m = A.ramp(p.w, p.l, p.h); m.position.set(p.x, L.ground(p.x, p.z, 1).h - 0.05, p.z); m.rotation.x = slope(L, p.x, p.z); g.add(m); }
    for (const p of L.plates) if (inChunk(p.z)) { const m = A.boostPad(p.w, p.l); m.position.set(p.x, L.ground(p.x, p.z, 1).h + 0.06, p.z); m.rotation.x = slope(L, p.x, p.z); g.add(m); }
    for (const cn of L.coins) if (inChunk(cn.z) && !cn.taken) { const m = A.coin(cn.kind, cn.kind === 'gold' ? 1.1 : cn.kind === 'silver' ? 1 : 0.9); m.position.set(cn.x, L.ground(cn.x, cn.z, 1).h + 0.95, cn.z); m.userData.phase = cn.z * 0.3; m.userData.ref = cn; cn.mesh = m; g.add(m); this.coinMeshes.push(m); }
    for (const gm of L.gems) if (inChunk(gm.z) && !gm.taken) { const m = A.gem(1); const y = L.ground(gm.x, gm.z, 1).h + 1.4; m.position.set(gm.x, y, gm.z); m.userData.y = y; gm.mesh = m; g.add(m); this.gemMeshes.push(m); }
    this.root.add(g);
    return g;
  }

  take(item) { if (item.mesh && item.mesh.parent) item.mesh.parent.remove(item.mesh); item.taken = true; }
}

function slope(L, x, z) { const e = 0.5; return Math.atan2(L.ground(x, z - e, 1).h - L.ground(x, z + e, 1).h, 2 * e); }
