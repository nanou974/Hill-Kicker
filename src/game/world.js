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
    this.coinMeshes = []; this.gemMeshes = []; this.flying = [];
    this.buildStatic();
  }
  dispose() { this.scene.remove(this.root); this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }

  buildStatic() {
    const L = this.L;
    for (const f of L.forks) this.root.add(this.buildRidge(f));
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
    // Poteaux de chaque côté de la piste, hors de la zone roulable
    const half = 22, px = half + 1.5;
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 9, 12), pm); p.position.set(s * px, L.ground(s * px, zf, 1).h - yf + 4.5, 0); gate.add(p); }
    const ck = new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#14213D' : '#FFFFFF'; g.fillRect(i * 16, j * 16, 16, 16); } return c; })());
    ck.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.BoxGeometry(2 * px + 1, 2.4, 0.4), A.mat(0xffffff, { map: ck })); banner.position.y = 8.6; gate.add(banner);
    // Ligne au sol : bande découpée en segments qui épouse le relief sur toute la largeur de la piste
    const lineGeo = new THREE.PlaneGeometry(2 * px, 2.5, 48, 2); lineGeo.rotateX(-Math.PI / 2);
    const lp = lineGeo.attributes.position;
    for (let i = 0; i < lp.count; i++) lp.setY(i, L.ground(lp.getX(i), zf + lp.getZ(i), 1).h - yf + 0.08);
    lineGeo.computeVertexNormals();
    const line = new THREE.Mesh(lineGeo, new THREE.MeshStandardMaterial({ map: ck, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 })); line.receiveShadow = true; gate.add(line);
    gate.position.set(0, yf, zf); gate.traverse(o => { if (o.isMesh) o.castShadow = true; }); this.root.add(gate);
  }

  // Colline rocheuse qui sépare les deux chemins d'une bifurcation
  buildRidge(f) {
    const L = this.L, g = new THREE.Group();
    const nx = 16, len = f.z0 - f.z1, nz = Math.ceil(len / 2.5);
    const pos = [], col = [], idx = [], c = new THREE.Color();
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      const t = iz / nz, z = f.z0 - t * len;
      const hw = L.ridgeHalf(f, z) + 0.6, u = ix / nx * 2 - 1;
      const x = f.cx + u * (hw + 0.3) + (hash(ix, iz + 91) - 0.5) * 0.5;
      const prof = Math.max(0, 1 - u * u);
      const hgt = f.h * Math.pow(Math.sin(Math.PI * t), 0.55) * Math.pow(prof, 0.7) * (0.85 + hash(ix * 5, iz * 7) * 0.3);
      const y = L.ground(x, z, 1).h - 0.4 + hgt;
      pos.push(x, y, z);
      const k = hgt / f.h, n = hash(ix * 3, iz * 11) * 0.06;
      if (k > 0.78) c.setRGB(0.95 + n, 0.96 + n, 0.98, THREE.SRGBColorSpace);           // sommet clair
      else if (k > 0.3) c.setRGB(0.55 + n, 0.57 + n, 0.60 + n, THREE.SRGBColorSpace);    // roche
      else c.setRGB(0.36 + n, 0.64 + n, 0.27 + n * 0.5, THREE.SRGBColorSpace);           // herbe
      col.push(c.r, c.g, c.b);
    }
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) { const a = iz * (nx + 1) + ix, b = a + 1, d = a + nx + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo = geo.toNonIndexed(); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, envMapIntensity: 0, side: THREE.DoubleSide }));
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    // Quelques sapins et rochers sur les flancs, et un panneau à l'entrée
    const r = A.rng(900 + Math.round(-f.z0));
    for (let k = 0; k < 14; k++) {
      const t = 0.12 + r() * 0.76, z = f.z0 - t * len, side = r() > 0.5 ? 1 : -1, hw = L.ridgeHalf(f, z);
      const x = f.cx + side * hw * (0.55 + r() * 0.25), u = (x - f.cx) / (hw + 0.6);
      const y = L.ground(x, z, 1).h - 0.4 + f.h * Math.pow(Math.sin(Math.PI * t), 0.55) * Math.pow(Math.max(0, 1 - u * u), 0.7) * 0.85;
      const o = k % 3 ? A.pine(1.2 + r() * 0.8) : A.rock(0.6 + r() * 0.7); o.position.set(x, y - 0.2, z); g.add(o);
    }
    const sg = A.sign('<   >', 1.6); sg.position.set(f.cx, L.ground(f.cx, f.z0 + 9, 1).h, f.z0 + 9); g.add(sg);
    return g;
  }

  // Charge les tronçons proches de la voiture, décharge les autres
  update(carZ, time, dt = 0) {
    const ci = Math.floor(-carZ / CHUNK);
    for (let i = ci - BEHIND; i <= ci + AHEAD; i++) if (i >= -1 && !this.chunks.has(i) && i * CHUNK < LEVEL_LENGTH + CHUNK) this.chunks.set(i, this.buildChunk(i));
    for (const [i, g] of this.chunks) if (i < ci - BEHIND || i > ci + AHEAD) { this.root.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.chunks.delete(i); }
    // Animation des pièces et gemmes
    for (const m of this.coinMeshes) if (m.parent) { m.rotation.y = time * 2.4 + m.userData.phase; }
    for (const m of this.gemMeshes) if (m.parent) { m.rotation.y = time * 1.6; m.position.y = m.userData.y + Math.sin(time * 2.5) * 0.15; }
    // Objets percutés : ils s'envolent en tournoyant puis disparaissent
    for (const f of this.flying) {
      f.t += dt; f.vy -= 9.81 * dt;
      f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
      f.m.rotation.x += f.sx * dt; f.m.rotation.z += f.sz * dt;
      const s = Math.max(0.01, 1 - Math.max(0, f.t - 1.1) * 2); f.m.scale.setScalar(s);
      if (f.t > 1.6 && f.m.parent) f.m.parent.remove(f.m);
    }
    this.flying = this.flying.filter(f => f.t <= 1.6);
  }

  fling(prop, vx, vy, vz) {
    if (!prop.mesh) return;
    this.flying.push({ m: prop.mesh, vx, vy, vz, sx: (Math.random() - 0.5) * 14, sz: (Math.random() - 0.5) * 14, t: 0 });
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
    const ground = (x, z) => L.ground(x, z, 1).h;
    const put = (o, x, z, dy = 0, rot = r() * 6) => { o.position.set(x, ground(x, z) + dy, z); o.rotation.y = rot; g.add(o); return o; };
    // Arbres, sapins, rochers et bottes de foin, plus denses près de la piste
    for (let k = 0; k < 90; k++) {
      const side = r() > 0.5 ? 1 : -1, x = side * (L.opt.half + 3 + Math.pow(r(), 2.2) * 65), z = z0 - r() * CHUNK;
      const t = r(); let o;
      if (t < 0.42) o = A.tree(1.2 + r() * 1.4, k % 4); else if (t < 0.66) o = A.pine(1.3 + r() * 1.2); else if (t < 0.82) o = A.rock(0.6 + r() * 1.4); else o = A.hay(1);
      put(o, x, z, -0.1);
    }
    // Buissons en bordure de piste
    for (let k = 0; k < 36; k++) { const side = r() > 0.5 ? 1 : -1; put(A.bush(0.8 + r() * 0.8, k % 4), side * (L.opt.half + 0.8 + r() * 3), z0 - r() * CHUNK); }
    // Clôtures le long de la piste, par tronçons
    for (let zz = z0 - 4; zz > z1 + 30; zz -= 34) for (const side of [-1, 1]) if (r() < 0.65) put(A.fence(24), side * (L.opt.half + 1.6), zz, 0, 0);
    // Rochers et fleurs dans les champs, quelques vaches, une grange de temps en temps
    for (let k = 0; k < 4; k++) { const side = r() > 0.5 ? 1 : -1; const x0 = side * (L.opt.half + 10 + r() * 18), zc = z0 - r() * CHUNK; for (let q = 0; q < 2 + Math.floor(r() * 3); q++) put(A.cow(1), x0 + (r() - 0.5) * 8, zc + (r() - 0.5) * 8); }
    if (i % 2 === 0) { const side = r() > 0.5 ? 1 : -1; put(A.barn(1), side * (L.opt.half + 22 + r() * 14), z0 - r() * CHUNK, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
    for (let k = 0; k < 10; k++) { const side = r() > 0.5 ? 1 : -1; const f = A.flowers(10, 4, 0, [0xF48FB1, 0xFFE27A, 0xFFFFFF, 0xB794F4][k % 4]); put(f, side * (L.opt.half + 3 + r() * 20), z0 - r() * CHUNK, 0.1); }
    // Panneaux de distance tous les 250 m
    for (let d = 250; d < LEVEL_LENGTH; d += 250) if (-d <= z0 && -d > z1) put(A.sign(`${d} m`, 1.3), (d / 250) % 2 ? L.opt.half + 2.5 : -(L.opt.half + 2.5), -d, 0, 0);
    // Arches au-dessus de la piste
    for (const a of L.arches) if (a.z <= z0 && a.z > z1) { const m = A.arch(2 * L.opt.half + 4, a.color); put(m, 0, a.z, -0.2, 0); }
    if (i % 3 === 1) { const wm = A.windmill(1.4); const x = (r() > 0.5 ? 1 : -1) * (L.opt.half + 26 + r() * 20), z = z0 - r() * CHUNK; wm.position.set(x, L.ground(x, z, 1).h - 0.4, z); wm.rotation.y = r() * 6; g.add(wm); }
    for (let k = 0; k < 40; k++) {
      const x = (r() - 0.5) * 2 * (L.opt.half - 1), z = z0 - r() * CHUNK;
      const tf = new THREE.Group();
      for (let q = 0; q < 3; q++) { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45 + r() * 0.3, 4), A.mat([0x3F8F2E, 0x56A63A, 0x2F7A2E][(k + q) % 3])); cn.position.set((r() - 0.5) * 0.3, 0.2, (r() - 0.5) * 0.3); tf.add(cn); }
      tf.position.set(x, L.ground(x, z, 1).h, z); g.add(tf);
    }

    const inChunk = (z) => z <= z0 && z > z1;
    for (const p of L.ramps) if (inChunk(p.z)) { const m = A.ramp(p.w, p.l, p.h, p.boost); m.position.set(p.x, L.ground(p.x, p.z, 1).h - 0.05, p.z); m.rotation.x = slope(L, p.x, p.z); g.add(m); }
    for (const p of L.plates) if (inChunk(p.z)) { const m = A.boostPad(p.w, p.l); m.position.set(p.x, L.ground(p.x, p.z, 1).h + 0.06, p.z); m.rotation.x = slope(L, p.x, p.z); g.add(m); }
    for (const cn of L.coins) if (inChunk(cn.z) && !cn.taken) { const m = A.coin(cn.kind, cn.kind === 'gold' ? 1.1 : cn.kind === 'silver' ? 1 : 0.9); m.position.set(cn.x, L.ground(cn.x, cn.z, 1).h + 0.95, cn.z); m.userData.phase = cn.z * 0.3; m.userData.ref = cn; cn.mesh = m; g.add(m); this.coinMeshes.push(m); }
    for (const o of L.obstacles) if (inChunk(o.z)) { const m = o.kind === 'statue' ? A.statue(1) : A.boulder(1.15); m.position.set(o.x, L.ground(o.x, o.z, 1).h - 0.05, o.z); m.rotation.y = o.rot; g.add(m); }
    for (const b of L.props) if (inChunk(b.z) && !b.hit) { const m = b.kind === 'crate' ? A.crate(1) : A.hayBlock(1); m.position.set(b.x, L.ground(b.x, b.z, 1).h, b.z); m.rotation.y = b.rot; b.mesh = m; g.add(m); }
    for (const gm of L.gems) if (inChunk(gm.z) && !gm.taken) { const m = A.gem(1); const y = L.ground(gm.x, gm.z, 1).h + 1.4; m.position.set(gm.x, y, gm.z); m.userData.y = y; gm.mesh = m; g.add(m); this.gemMeshes.push(m); }
    this.root.add(g);
    return g;
  }

  take(item) { if (item.mesh && item.mesh.parent) item.mesh.parent.remove(item.mesh); item.taken = true; }
}

function slope(L, x, z) { const e = 0.5; return Math.atan2(L.ground(x, z - e, 1).h - L.ground(x, z + e, 1).h, 2 * e); }
