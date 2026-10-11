// Monde 3D d'un niveau : terrain généré par tronçons autour de la voiture, décors, pièces, rampes, plaques, arrivée.
// Les couleurs et le décor viennent du monde du niveau (themes.js).
import * as THREE from 'three';
import * as A from '../assets3d.js';
import { LEVEL_LENGTH } from './layout.js';
import { buildPassage } from './passages.js';
import { themeFor, pond } from './themes.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CHUNK = 150, AHEAD = 2, BEHIND = 1; // 2 tronçons devant : le terrain chargé va toujours au moins 300 m plus loin, au-delà du brouillard
const BUDGET_MS = 5; // temps de construction de décor autorisé par image : les tronçons lointains se fabriquent par petits morceaux
const WIDTH = 240, STEP = 2.5;

function hash(ix, iz) { let h = (ix * 374761393 + iz * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

export class World {
  constructor(scene, layout) {
    this.scene = scene; this.L = layout; this.T = themeFor(layout.level); this.chunks = new Map();
    this.root = new THREE.Group(); scene.add(this.root);
    this.coinMeshes = []; this.gemMeshes = []; this.flying = [];
    this.buildStatic();
  }
  dispose() { this.scene.remove(this.root); this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }

  buildStatic() {
    const L = this.L;
    for (const f of L.forks) this.root.add(mergeStatic(this.buildRidge(f)));
    // Passages étroits (portails, arches, tunnels, grottes, gorges, ruines)
    for (const p of L.passages) this.root.add(mergeStatic(buildPassage(L, p, this.T)));
    // Lanceur au départ, sur une petite plateforme
    const y0 = L.ground(0, 6, 1).h;
    this.start = new THREE.Group(); this.root.add(this.start);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 9), A.mat(0x8A7A62)); plat.position.set(0, y0 - 1.75, 6); plat.receiveShadow = true; this.start.add(plat);
    this.launcherY = y0; this.setLauncherTier(0);
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

  // Lanceur à l'image du palier d'amélioration (0 à 5)
  setLauncherTier(t) {
    if (this.launcher && this.launcherTierNow === t) return;
    if (this.launcher) { this.start.remove(this.launcher); this.launcher.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    this.launcher = A.launcher(5.6, 3.4, undefined, t); this.launcher.position.set(0, this.launcherY + 0.3, 6); this.start.add(this.launcher); this.launcherTierNow = t;
  }

  // Colline rocheuse qui sépare les deux chemins d'une bifurcation
  buildRidge(f) {
    const L = this.L, T = this.T, g = new THREE.Group();
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
      const rc = k > 0.78 ? T.ridge.top : k > 0.3 ? T.ridge.rock : T.ridge.base;           // sommet clair, roche, base
      c.setRGB(rc[0] + n, rc[1] + n, rc[2] + n * (k > 0.3 ? 1 : 0.5), THREE.SRGBColorSpace);
      col.push(c.r, c.g, c.b);
    }
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) { const a = iz * (nx + 1) + ix, b = a + 1, d = a + nx + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo = geo.toNonIndexed(); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, envMapIntensity: 0, side: THREE.DoubleSide }));
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    // Quelques arbres et rochers du monde sur les flancs, et un panneau à l'entrée
    const r = A.rng(900 + Math.round(-f.z0));
    for (let k = 0; k < 14; k++) {
      const t = 0.12 + r() * 0.76, z = f.z0 - t * len, side = r() > 0.5 ? 1 : -1, hw = L.ridgeHalf(f, z);
      const x = f.cx + side * hw * (0.55 + r() * 0.25), u = (x - f.cx) / (hw + 0.6);
      const y = L.ground(x, z, 1).h - 0.4 + f.h * Math.pow(Math.sin(Math.PI * t), 0.55) * Math.pow(Math.max(0, 1 - u * u), 0.7) * 0.85;
      const o = T.ridgeProp(r); o.position.set(x, y - 0.2, z); g.add(o);
    }
    const sg = A.sign('<   >', 1.6); sg.position.set(f.cx, L.ground(f.cx, f.z0 + 9, 1).h, f.z0 + 9); g.add(sg);
    return g;
  }

  // Charge les tronçons proches de la voiture, décharge les autres
  update(carZ, time, dt = 0) {
    const ci = Math.floor(-carZ / CHUNK);
    this.pending ??= new Map();
    for (let i = ci - BEHIND; i <= ci + AHEAD; i++) {
      if (i < -1 || this.chunks.has(i) || i * CHUNK >= LEVEL_LENGTH + CHUNK) continue;
      if (!this.pending.has(i)) { const g = new THREE.Group(); this.pending.set(i, { g, it: this.chunkSteps(i, g) }); }
      // Tronçon où se trouve la voiture (ou juste devant) : il doit exister tout de suite
      if (i <= ci + 1) this.finish(i, Infinity);
    }
    // Les tronçons plus lointains avancent un peu à chaque image, sans saccade
    const t0 = performance.now();
    for (const i of [...this.pending.keys()].sort((a, b) => a - b)) { if (!this.finish(i, t0 + BUDGET_MS)) break; }
    for (const [i, g] of this.chunks) if (i < ci - BEHIND || i > ci + AHEAD) { this.root.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.chunks.delete(i); }
    for (const i of [...this.pending.keys()]) if (i < ci - BEHIND || i > ci + AHEAD) this.pending.delete(i);
    // Animation des pièces et gemmes
    for (const m of this.coinMeshes) if (m.parent) { m.rotation.y = time * 2.4 + m.userData.phase; }
    for (const m of this.gemMeshes) if (m.parent) { m.rotation.y = time * 1.6; m.position.y = m.userData.y + Math.sin(time * 2.5) * 0.15; if (m.children[0]) m.children[0].visible = m.position.z < carZ - 25; } // la colonne de lumière s'efface quand on arrive dessus
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

  // Fait avancer la construction d'un tronçon jusqu'à l'heure limite ; renvoie vrai s'il est terminé
  finish(i, deadline) {
    const p = this.pending.get(i); if (!p) return true;
    while (performance.now() < deadline) {
      if (p.it.next().done) { this.root.add(p.g); this.chunks.set(i, p.g); this.pending.delete(i); return true; }
    }
    return false;
  }
  buildChunk(i) { const g = new THREE.Group(); for (const _ of this.chunkSteps(i, g)); this.root.add(g); return g; }

  // Construction d'un tronçon en plusieurs étapes (générateur) : terrain, décor, fusion du décor, objets de la piste
  *chunkSteps(i, g) {
    const L = this.L, T = this.T;
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
      const zone = L.isTarmac(x, z) ? 'tarmac' : ax < L.opt.half - 0.5 ? 'track' : ax < L.opt.half + 2 ? 'shoulder' : 'field';
      T.ground(c, zone, x, z, n, stripe, patch);
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
    yield;

    // Décors sur les bas-côtés : construits dans un groupe à part, puis fusionnés en quelques gros objets
    const deco = new THREE.Group();
    const r = A.rng(5000 + L.level * 131 + i);
    const ground = (x, z) => L.ground(x, z, 1).h;
    const put = (o, x, z, dy = 0, rot = r() * 6) => { o.position.set(x, ground(x, z) + dy, z); o.rotation.y = rot; deco.add(o); return o; };
    // Mare ou lagon posé à plat sur la pente du terrain
    const up = new THREE.Vector3(0, 1, 0);
    const placePond = (rad, water, rim, x, z) => {
      const e = 1, nrm = new THREE.Vector3(ground(x - e, z) - ground(x + e, z), 2 * e, ground(x, z - e) - ground(x, z + e)).normalize();
      const o = pond(rad, water, rim); o.quaternion.setFromUnitVectors(up, nrm); o.position.set(x, ground(x, z) - 0.05, z); deco.add(o);
    };
    // Décor propre au monde du niveau (arbres, bâtiments, animaux…)
    yield* T.decor({ put, r, L, z0, z1, i, deco, ground, pond: placePond });
    yield;
    // Panneaux de distance tous les 250 m
    for (let d = 250; d < LEVEL_LENGTH; d += 250) if (-d <= z0 && -d > z1) put(A.sign(`${d} m`, 1.3), (d / 250) % 2 ? L.opt.half + 2.5 : -(L.opt.half + 2.5), -d, 0, 0);
    // Arches au-dessus de la piste
    for (const a of L.arches) if (a.z <= z0 && a.z > z1) { const m = A.arch(2 * L.opt.half + 4, a.color); put(m, 0, a.z, -0.2, 0); }
    for (let k = 0; k < 40; k++) {
      const x = (r() - 0.5) * 2 * (L.opt.half - 1), z = z0 - r() * CHUNK;
      const tf = new THREE.Group();
      for (let q = 0; q < 3; q++) { const cn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45 + r() * 0.3, 4), A.mat(T.tufts[(k + q) % 3])); cn.position.set((r() - 0.5) * 0.3, 0.2, (r() - 0.5) * 0.3); tf.add(cn); }
      tf.position.set(x, L.ground(x, z, 1).h, z); deco.add(tf); // touffes d'herbe : pas d'ombre (trop petites)
    }

    const inChunk = (z) => z <= z0 && z > z1;
    for (const p of L.ramps) if (inChunk(p.z)) { const m = A.ramp(p.w, p.l, p.h, p.boost); m.position.set(p.x, L.ground(p.x, p.z, 1).h - 0.05, p.z); m.rotation.x = slope(L, p.x, p.z); deco.add(m); }
    for (const p of L.plates) if (inChunk(p.z)) { const m = A.boostPad(p.w, p.l); m.position.set(p.x, L.ground(p.x, p.z, 1).h + 0.06, p.z); m.rotation.x = slope(L, p.x, p.z); deco.add(m); }
    for (const cn of L.coins) if (inChunk(cn.z) && !cn.taken) { const m = A.coin(cn.kind, cn.kind === 'gold' ? 1.1 : cn.kind === 'silver' ? 1 : 0.9); m.position.set(cn.x, L.ground(cn.x, cn.z, 1).h + 0.95, cn.z); m.userData.phase = cn.z * 0.3; m.userData.ref = cn; cn.mesh = m; g.add(m); this.coinMeshes.push(m); }
    for (const o of L.obstacles) if (inChunk(o.z) && !o.own) { const m = o.kind === 'statue' ? T.statue() : A.rockShape(o.shape, o.seed, T.rocks); m.position.set(o.x, L.ground(o.x, o.z, 1).h - 0.05, o.z); m.rotation.y = o.rot; deco.add(m); }
    yield;
    // Tout le décor immobile du tronçon devient quelques gros objets (un par matériau) : beaucoup moins d'ordres de dessin
    g.add(mergeStatic(deco));
    yield;
    for (const b of L.props) if (inChunk(b.z) && !b.hit) { const m = b.kind === 'crate' ? A.crate(1) : T.breakable(); m.position.set(b.x, L.ground(b.x, b.z, 1).h, b.z); m.rotation.y = b.rot; b.mesh = m; g.add(m); }
    for (const gm of L.gems) if (inChunk(gm.z) && !gm.taken) { const m = A.gem(1); const y = L.ground(gm.x, gm.z, 1).h + 1.4; m.position.set(gm.x, y, gm.z); m.userData.y = y; m.add(A.gemBeam()); gm.mesh = m; g.add(m); this.gemMeshes.push(m); }
  }

  take(item) { if (item.mesh && item.mesh.parent) item.mesh.parent.remove(item.mesh); item.taken = true; }
}

// ---------- Fusion du décor immobile ----------
// Regroupe les objets qui partagent le même aspect (couleur, texture…) en un seul objet 3D.
function matKey(m) {
  return [m.type, m.color && m.color.getHexString(), m.emissive && m.emissive.getHexString(), m.emissiveIntensity, m.roughness, m.metalness, m.flatShading, m.map && m.map.uuid,
    m.transparent, m.opacity, m.vertexColors, m.side, m.envMapIntensity, m.depthWrite].join('|');
}
function mergeStatic(src) {
  src.updateMatrixWorld(true);
  const out = new THREE.Group(), buckets = new Map(), alone = [];
  src.traverse(o => {
    if (!o.isMesh) return;
    if (Array.isArray(o.material) || o.isInstancedMesh) { alone.push(o); return; }
    const key = matKey(o.material) + '|' + (o.castShadow ? 1 : 0);
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, list: [] });
    buckets.get(key).list.push(o);
  });
  for (const b of buckets.values()) {
    const needUv = !!b.mat.map, needCol = !!b.mat.vertexColors;
    const geos = [];
    for (const o of b.list) {
      let g2 = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const name of Object.keys(g2.attributes)) if (!(name === 'position' || name === 'normal' || (needUv && name === 'uv') || (needCol && name === 'color'))) g2.deleteAttribute(name);
      if (!g2.attributes.normal) g2.computeVertexNormals();
      if (needUv && !g2.attributes.uv) g2.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g2.attributes.position.count * 2), 2));
      for (const k of Object.keys(g2.morphAttributes)) delete g2.morphAttributes[k];
      g2.clearGroups(); g2.applyMatrix4(o.matrixWorld); geos.push(g2);
    }
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) { for (const o of b.list) alone.push(o); continue; }
    const m = new THREE.Mesh(merged, b.mat); m.castShadow = b.cast; m.receiveShadow = true; out.add(m);
  }
  // Objets à plusieurs matériaux : gardés tels quels, à leur place
  for (const o of alone) { o.matrixAutoUpdate = false; o.matrix.copy(o.matrixWorld); out.add(o); }
  return out;
}

function slope(L, x, z) { const e = 0.5; return Math.atan2(L.ground(x, z - e, 1).h - L.ground(x, z + e, 1).h, 2 * e); }
