// Monde 3D d'un niveau : terrain généré par tronçons autour de la voiture, décors, pièces, rampes, plaques, arrivée.
// Les couleurs et le décor viennent du monde du niveau (themes.js).
import * as THREE from 'three';
import * as A from '../assets3d.js';
import { buildPassage } from './passages.js';
import { noCull } from './bend.js';
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
    this.coinMeshes = []; this.gemMeshes = []; this.propMeshes = []; this.flying = [];
    this.buildStatic();
    noCull(this.root);
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
    const zf = -L.length, yf = L.ground(0, zf, 1).h;
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
      if (i < -1 || this.chunks.has(i) || i * CHUNK >= this.L.length + CHUNK) continue;
      if (!this.pending.has(i)) { const g = new THREE.Group(); this.pending.set(i, { g, it: this.chunkSteps(i, g) }); }
      // Tronçon où se trouve la voiture (ou juste devant) : il doit exister tout de suite
      if (i <= ci + 1) this.finish(i, Infinity);
    }
    // Les tronçons plus lointains avancent un peu à chaque image, sans saccade
    const t0 = performance.now();
    for (const i of [...this.pending.keys()].sort((a, b) => a - b)) { if (!this.finish(i, t0 + BUDGET_MS)) break; }
    for (const [i, g] of this.chunks) if (i < ci - BEHIND || i > ci + AHEAD) { this.root.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.chunks.delete(i); }
    for (const i of [...this.pending.keys()]) if (i < ci - BEHIND || i > ci + AHEAD) this.pending.delete(i);
    // Animation des pièces et gemmes ; ce qui est loin derrière la caméra n'est plus dessiné
    const behind = carZ + 25;
    for (const m of this.coinMeshes) if (m.parent) { m.visible = m.position.z < behind; if (m.visible) m.rotation.y = time * 2.4 + m.userData.phase; }
    for (const m of this.propMeshes) if (m.parent) m.visible = m.position.z < behind;
    for (const m of this.gemMeshes) if (m.parent) { m.visible = m.position.z < behind; m.rotation.y = time * 1.6; m.position.y = m.userData.y + Math.sin(time * 2.5) * 0.15; if (m.children[0]) m.children[0].visible = m.position.z < carZ - 25; } // la colonne de lumière s'efface quand on arrive dessus
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
      if (p.it.next().done) { noCull(p.g); this.root.add(p.g); this.chunks.set(i, p.g); this.pending.delete(i); return true; }
    }
    return false;
  }
  buildChunk(i) { const g = new THREE.Group(); for (const _ of this.chunkSteps(i, g)); noCull(g); this.root.add(g); return g; }

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
      const zone = L.isTarmac(x, z) ? 'tarmac' : ax < L.opt.half - 0.5 ? (L.isSlow(x, z) ? 'slow' : 'track') : ax < L.opt.half + 2 ? 'shoulder' : 'field';
      // Sable mou, boue ou eau : couleur propre au monde (tracks.js), avec un peu de grain
      if (zone === 'slow') { const sc = L.profile.slow.color, w = Math.sin(x * 1.3 + z * 0.9) * 0.03; c.setRGB(sc[0] + n + w, sc[1] + n + w, sc[2] + n * 0.5 + w, THREE.SRGBColorSpace); }
      else T.ground(c, zone, x, z, n, stripe, patch);
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
    g.add(kerbs(L, z0, z1));
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
    for (let d = 250; d < L.length; d += 250) if (-d <= z0 && -d > z1) put(A.sign(`${d} m`, 1.3), (d / 250) % 2 ? L.opt.half + 2.5 : -(L.opt.half + 2.5), -d, 0, 0);
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
    for (const o of L.obstacles) if (inChunk(o.z) && !o.own) {
      const m = o.kind === 'log' ? logMesh(o, L, T) : o.kind === 'statue' ? T.statue() : A.rockShape(o.shape, o.seed, T.rocks);
      if (o.kind !== 'log') { m.position.set(o.x, L.ground(o.x, o.z, 1).h - 0.05, o.z); m.rotation.y = o.rot; }
      deco.add(m);
    }
    // Panneaux de virage : chevrons sur le bord extérieur, à l'entrée de chaque virage
    // (placés dans la première partie du virage : en arrivant, ils apparaissent droit devant, là où la piste tourne)
    for (const t of L.curve.turns) for (let q = 0; q < 5; q++) {
      const z = -(t.s0 + 10 + q * 24); if (!inChunk(z) || -z > t.s1) continue;
      const x = -t.dir * (L.opt.half + 2.2); put(chevron(t.dir), x, z, 0, 0);
    }
    yield;
    // Tout le décor immobile du tronçon devient quelques gros objets (un par matériau) : beaucoup moins d'ordres de dessin
    g.add(mergeStatic(deco));
    yield;
    for (const b of L.props) if (inChunk(b.z) && !b.hit) { const m = b.kind === 'crate' ? A.crate(1) : T.breakable(); m.position.set(b.x, L.ground(b.x, b.z, 1).h, b.z); m.rotation.y = b.rot; b.mesh = m; g.add(m); this.propMeshes.push(m); }
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

// Bordures rouges et blanches le long des deux bords de la piste : on lit le tracé (et les virages) de loin
const KERB_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const KERB_SEG = 1.5, KERB_RED = new THREE.Color().setRGB(0.86, 0.16, 0.16, THREE.SRGBColorSpace), KERB_WHITE = new THREE.Color().setRGB(0.96, 0.96, 0.94, THREE.SRGBColorSpace);
function kerbs(L, z0, z1) {
  const pos = [], col = [];
  for (const side of [-1, 1]) {
    const xi = side * (L.opt.half - 0.3), xo = side * (L.opt.half + 1.1);
    for (let z = z0; z > z1 + 0.01; z -= KERB_SEG) {
      const za = z, zb = Math.max(z1, z - KERB_SEG), c = Math.floor(-za / (KERB_SEG * 2)) % 2 ? KERB_RED : KERB_WHITE;
      const y = (x, zz) => L.ground(x, zz, 1).h + 0.07;
      const q = [[xi, za], [xo, za], [xi, zb], [xo, zb]].map(([x, zz]) => [x, y(x, zz), zz]);
      const tri = side > 0 ? [q[0], q[1], q[2], q[1], q[3], q[2]] : [q[0], q[2], q[1], q[1], q[2], q[3]]; // faces tournées vers le ciel
      for (const v of tri) { pos.push(...v); col.push(c.r, c.g, c.b); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, KERB_MAT); m.receiveShadow = true;
  return m;
}

// Tronc couché en travers de la piste : posé sur le relief, avec ses deux sections claires et quelques branches cassées
const LOG_COL = [0x6B4A2E, 0x5A3E26, 0x7A5634];
function logMesh(o, L, T) {
  const g = new THREE.Group(), r = A.rng(o.seed), len = o.w * 2;
  const col = LOG_COL[o.seed % 3], bark = A.mat(col), ring = A.mat(0xD8B98A), moss = A.mat(T.tufts ? T.tufts[0] : 0x4F7A32);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, len, 9), bark); trunk.rotation.z = Math.PI / 2; g.add(trunk);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.52, 9), ring); c.position.x = s * (len / 2 + 0.01); c.rotation.y = s * Math.PI / 2; g.add(c); }
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1 + r() * 0.6, 5), bark); b.position.set((r() - 0.5) * len * 0.8, 0.5, (r() - 0.5) * 0.4); b.rotation.set((r() - 0.5) * 1.2, 0, (r() - 0.5) * 1.4); g.add(b); }
  for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28 + r() * 0.2, 6, 4), moss); m.scale.y = 0.45; m.position.set((r() - 0.5) * len * 0.9, 0.52, (r() - 0.5) * 0.5); g.add(m); }
  // Le tronc suit la pente sous lui (hauteur aux deux bouts)
  const ya = L.ground(o.x - o.w * Math.cos(o.rot), o.z + o.w * Math.sin(o.rot), 1).h, yb = L.ground(o.x + o.w * Math.cos(o.rot), o.z - o.w * Math.sin(o.rot), 1).h;
  g.position.set(o.x, (ya + yb) / 2 + 0.42, o.z); g.rotation.set(0, o.rot, Math.atan2(yb - ya, len));
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// Panneau de virage : chevrons blancs sur fond rouge, pointés vers l'intérieur du virage
const chevronTex = {};
function chevron(dir) {
  if (!chevronTex[dir]) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#E5383B'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#FFFFFF';
    for (let i = 0; i < 3; i++) { const x0 = 40 + i * 64; g.beginPath(); if (dir > 0) { g.moveTo(x0, 16); g.lineTo(x0 + 22, 16); g.lineTo(x0 + 56, 64); g.lineTo(x0 + 22, 112); g.lineTo(x0, 112); g.lineTo(x0 + 34, 64); } else { g.moveTo(x0 + 56, 16); g.lineTo(x0 + 34, 16); g.lineTo(x0, 64); g.lineTo(x0 + 34, 112); g.lineTo(x0 + 56, 112); g.lineTo(x0 + 22, 64); } g.closePath(); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; chevronTex[dir] = A.mat(0xffffff, { map: t });
  }
  const grp = new THREE.Group(), post = A.mat(0x2A2F38), side = A.mat(0xE5383B);
  for (const s of [-0.8, 0.8]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), post); p.position.set(s, 0.8, 0); grp.add(p); }
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.08), [side, side, side, side, chevronTex[dir], side]); board.position.y = 1.9; grp.add(board);
  grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}

function slope(L, x, z) { const e = 0.5; return Math.atan2(L.ground(x, z - e, 1).h - L.ground(x, z + e, 1).h, 2 * e); }
