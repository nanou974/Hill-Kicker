// Modèles 3D des passages étroits : portail de ferme, arche rocheuse, tunnel, grotte, gorge et ruines.
// Les dimensions viennent de layout.js (ouvertures, colonnes, stalagmites) pour que le visuel colle aux collisions.
import * as THREE from 'three';
import * as A from '../assets3d.js';

const X = 40;   // demi-largeur du massif : il s'enfonce dans les talus de chaque côté de la piste
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
function hash3(x, y, z) {
  let h = (Math.round(x * 10) * 374761393 + Math.round(y * 10) * 668265263 + Math.round(z * 10) * 1442695041) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function buildPassage(L, p) {
  const g = p.kind === 'gate' ? gate(L, p) : p.kind === 'ruins' ? ruins(L, p) : rockMass(L, p);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------- Massif rocheux extrudé le long de la piste (arche, tunnel, grotte, gorge) ----------
function rockMass(L, p) {
  const g = new THREE.Group(), r = A.rng(p.seed);
  const H = { arch: 11, tunnel: 15, cave: 13, canyon: 16 }[p.kind];
  const holeH = p.holeH;
  const o0 = p.openings[0];
  const ops = [...p.openings].sort((a, b) => a.c0 - b.c0);
  const center = (z) => o0.c0 + (o0.c1 - o0.c0) * smooth((p.z0 - z) / p.len);

  // Silhouette du sommet : crête dentelée
  const top = (x) => H * (0.8 + 0.2 * Math.cos(x / X * Math.PI * 0.5)) + (hash3(x, 1, p.seed % 97) - 0.5) * 2.4;
  const shapes = [];
  if (p.kind === 'canyon') {
    // Deux falaises séparées par le passage, sans toit
    const w = o0.w / 2;
    for (const side of [-1, 1]) {
      const s = new THREE.Shape(), edge = o0.c0 + side * w;
      const pts = [[side * X, -4], [side * X, top(side * X)]];
      for (let x = side * (X - 3); side * x > side * edge + 3; x -= side * 3) pts.push([x, top(x)]);
      // face de la falaise : en retrait irrégulier, jamais dans le passage
      for (let y = H - 1; y > -1; y -= 2.2) pts.push([edge + side * (0.05 + hash3(edge, y, side) * 0.35), y]);
      // base enterrée découpée tous les 2,5 m pour suivre le sol (les talus remontent sur les côtés)
      for (let x = edge + side * 0.2; side * x < side * X; x += side * 2.5) pts.push([x, -4]);
      s.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) s.lineTo(q[0], q[1]);
      shapes.push(s);
    }
  } else {
    // Bloc plein sur toute la largeur, percé d'une ou deux ouvertures voûtées
    const s = new THREE.Shape();
    // base enterrée découpée tous les 2,5 m pour suivre le sol (les talus remontent sur les côtés)
    s.moveTo(-X, -4); for (let x = -X + 2.5; x <= X; x += 2.5) s.lineTo(x, -4);
    for (let x = X; x >= -X; x -= 2.5) s.lineTo(x, top(x));
    s.lineTo(-X, -4);
    for (const o of ops) {
      const h = new THREE.Path(), hw = o.w / 2, rise = Math.min(hw, holeH * 0.5), spring = holeH - rise;
      h.moveTo(o.c0 - hw, -1); for (let k = 1; k <= 4; k++) h.lineTo(o.c0 - hw + o.w * k / 4, -1); h.lineTo(o.c0 + hw, spring);
      for (let k = 1; k < 16; k++) { const a = k / 16 * Math.PI; h.lineTo(o.c0 + hw * Math.cos(a), spring + rise * Math.sin(a)); }
      h.lineTo(o.c0 - hw, spring); h.lineTo(o.c0 - hw, -1);
      s.holes.push(h);
    }
    shapes.push(s);
  }

  // Couleurs : roche variée, intérieur sombre, herbe au sommet du tunnel, strates ocre dans la gorge
  const c = new THREE.Color();
  // Palette imposée par le monde (roche ocre, glace, sucre, roche lunaire…), sinon couleurs par défaut
  const hx = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  const pal = L.theme && L.theme.passage ? { body: hx(L.theme.passage.body), top: hx(L.theme.passage.top) } : null;
  const steps = Math.max(1, Math.ceil(p.len / 3));
  for (const s of shapes) {
    const geo = new THREE.ExtrudeGeometry(s, { depth: p.len, steps, bevelEnabled: false, curveSegments: 4 });
    const pos = geo.attributes.position, col = [];
    for (let i = 0; i < pos.count; i++) {
      const x0 = pos.getX(i), y0 = pos.getY(i), zl = pos.getZ(i), z = p.z1 + zl;
      // Dans l'ouverture (paroi intérieure) ?
      const inner = p.kind !== 'canyon' && ops.some(o => Math.abs(x0 - o.c0) < o.w / 2 + 0.05 && y0 < holeH + 0.05);
      let x = x0 + (center(z) - o0.c0), y = y0, zz = z;
      const n = hash3(x0, y0, zl) - 0.5, m = hash3(y0, zl, x0) - 0.5;
      if (inner) {
        // paroi intérieure : relief seulement vers l'extérieur (le passage reste dégagé), plus marqué dans la grotte
        const amp = p.kind === 'cave' ? 0.5 : 0.2, o = ops.find(o => Math.abs(x0 - o.c0) < o.w / 2 + 0.05);
        if (y0 > 0) { const dx = x0 - o.c0, d = Math.hypot(dx, Math.max(0, y0 - (holeH - Math.min(o.w / 2, holeH * 0.5)))) || 1; x += dx / d * (n + 0.5) * amp; y += Math.max(0, y0 - holeH * 0.5) / holeH * (m + 0.5) * amp; }
      } else if (y0 > -3) {
        // face des falaises de la gorge : pas de relief latéral, la paroi visible doit coller à la collision
        const face = p.kind === 'canyon' && Math.abs(Math.abs(x0 - o0.c0) - o0.w / 2) < 2;
        x += face ? 0 : n * 0.9; y += m * 0.9; if (zl > 0.1 && zl < p.len - 0.1) zz += (hash3(zl, x0, y0) - 0.5) * 0.8; }
      y += L.ground(x, zz, 1).h;
      pos.setXYZ(i, x, y, zz);
      const k = hash3(x0, zl, 7) * 0.08;
      if (inner) c.setRGB(0.24 + k, 0.21 + k, 0.2 + k, THREE.SRGBColorSpace);
      else if (pal) { const t = y0 > top(x0) - 2.2 ? pal.top : pal.body; c.setRGB(t[0] + k, t[1] + k, t[2] + k, THREE.SRGBColorSpace); } // couleurs du monde
      else if (p.kind === 'tunnel' && y0 > top(x0) - 2.2) c.setRGB(0.36 + k, 0.62 + k, 0.26, THREE.SRGBColorSpace);
      else if (p.kind === 'canyon') { const band = Math.floor((y0 + 4) / 2.6) % 3; const b = [[0.80, 0.52, 0.32], [0.72, 0.42, 0.26], [0.86, 0.66, 0.44]][band]; c.setRGB(b[0] + k, b[1] + k, b[2] + k, THREE.SRGBColorSpace); }
      else if (p.kind === 'arch') c.setRGB(0.74 + k, 0.6 + k, 0.46 + k, THREE.SRGBColorSpace);
      else c.setRGB(0.52 + k, 0.53 + k, 0.55 + k, THREE.SRGBColorSpace);
      col.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, envMapIntensity: 0.2, side: THREE.DoubleSide })));
  }

  const yAt = (x, z) => L.ground(x, z, 1).h;
  if (p.kind === 'tunnel') {
    // Encadrement en pierres taillées aux deux entrées, et lampes le long des parois
    const stone = A.mat(0x9C8F7E), lamp = A.mat(0xFFE08A, { e: 0xFFC94D, ei: 1.6 });
    for (const z of [p.z0 + 0.3, p.z1 - 0.3]) {
      const cx = center(z), hw = o0.w / 2, rise = Math.min(hw, holeH * 0.5), spring = holeH - rise;
      for (let k = 0; k <= 10; k++) {
        const a = k / 10 * Math.PI, b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.9), stone);
        b.position.set(cx + (hw + 0.45) * Math.cos(a), yAt(cx, z) + spring + (rise + 0.45) * Math.sin(a), z); b.rotation.z = a - Math.PI / 2; g.add(b);
      }
      for (const sd of [-1, 1]) for (let y = 0.5; y < spring; y += 1.15) { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1.1, 0.9), stone); b.position.set(cx + sd * (hw + 0.5), yAt(cx, z) + y, z); g.add(b); }
    }
    for (let z = p.z0 - 4; z > p.z1 + 2; z -= 7) for (const sd of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.9), lamp); m.position.set(center(z) + sd * (o0.w / 2 + 0.05), yAt(center(z), z) + 3.6, z); g.add(m);
    }
  }
  if (p.kind === 'cave') {
    // Stalactites au plafond, stalagmites (obstacles) au sol, cristaux lumineux sur les parois
    const st = A.mat(0x8A8178), cr = [A.mat(0x7FE3FF, { e: 0x3FC6FF, ei: 1.4 }), A.mat(0xF7A8E8, { e: 0xE85FD0, ei: 1.4 })];
    for (let z = p.z0 - 2; z > p.z1 + 1; z -= 2.6 + r() * 2) {
      const x = center(z) + (r() - 0.5) * (o0.w - 3), l = 0.6 + r() * 0.8; // courtes : la caméra passe dessous
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.25 + r() * 0.3, l, 6), st); m.rotation.x = Math.PI;
      m.position.set(x, yAt(x, z) + holeH - 0.6 - l / 2 + Math.max(0, 1 - Math.abs(x - center(z)) / (o0.w / 2)) * 0.6, z); g.add(m);
    }
    for (const o of L.obstacles) if (o.kind === 'stalagmite' && o.z <= p.z0 && o.z >= p.z1) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(o.r, o.h, 7), st); m.position.set(o.x, yAt(o.x, o.z) + o.h / 2 - 0.1, o.z); g.add(m);
      const top = new THREE.Mesh(new THREE.ConeGeometry(o.r * 0.7, holeH - o.h - 0.8, 7), st); top.rotation.x = Math.PI; top.position.set(o.x, yAt(o.x, o.z) + holeH - (holeH - o.h - 0.8) / 2 - 0.3, o.z); g.add(top);
    }
    for (let z = p.z0 - 3; z > p.z1 + 2; z -= 3 + r() * 3) {
      const sd = r() < 0.5 ? -1 : 1, x = center(z) + sd * (o0.w / 2 + 0.1);
      const cl = new THREE.Group(), mm = cr[Math.floor(r() * 2)];
      for (let k = 0; k < 3; k++) { const q = new THREE.Mesh(new THREE.OctahedronGeometry(0.2 + r() * 0.2, 0), mm); q.scale.y = 2; q.position.set(-sd * r() * 0.2, r() * 0.5, (r() - 0.5) * 0.6); q.rotation.z = -sd * (0.3 + r() * 0.5); cl.add(q); }
      cl.position.set(x, yAt(x, z) + 0.4 + r() * 2.5, z); g.add(cl);
    }
  }
  if (p.kind === 'canyon') {
    // Pont de corde en hauteur au milieu de la gorge, et quelques rochers au pied des falaises (hors passage)
    const zm = p.z0 - p.len * (0.4 + r() * 0.2), cx = center(zm), y = yAt(cx, zm) + H - 3.5, span = o0.w + 6;
    const wood = A.mat(0x8B5A2B), rope = A.mat(0xD9C089);
    for (let x = -span / 2; x <= span / 2; x += 0.7) { const sag = (1 - (2 * x / span) ** 2) * 1.2; const pl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 2.2), wood); pl.position.set(cx + x, y - sag, zm); g.add(pl); }
    for (const sd of [-1, 1]) {
      const pts = []; for (let k = 0; k <= 16; k++) { const x = -span / 2 + span * k / 16; pts.push(new THREE.Vector3(cx + x, y - (1 - (2 * x / span) ** 2) * 1.2 + 1, zm + sd * 1.1)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.05, 4), rope));
    }
  }
  if (p.kind === 'arch') {
    // Touffes d'herbe et petits rochers au sommet de l'arche
    for (let k = 0; k < 8; k++) { const x = (r() - 0.5) * 2 * (X - 6), z = p.z0 - r() * p.len; const m = A.rock(0.6 + r() * 0.8); m.position.set(x, yAt(x, z) + top(x) - 0.4, z); g.add(m); }
  }
  return g;
}

// ---------- Portail de ferme : clôture haute avec deux portes grandes ouvertes ----------
function gate(L, p) {
  const g = new THREE.Group(), zc = (p.z0 + p.z1) / 2, H = 2.4, yAt = (x) => L.ground(x, zc, 1).h;
  const tex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#A8693A'; x.fillRect(0, 0, 256, 128); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#9A5E32' : '#B37444'; x.fillRect(i * 32 + 2, 0, 28, 128); } x.fillStyle = '#6E3F1E'; x.fillRect(0, 22, 256, 10); x.fillRect(0, 96, 256, 10); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; })();
  const ops = [...p.openings].sort((a, b) => a.c0 - b.c0);
  // Parties pleines : de -X à la 1re porte, entre les portes, de la dernière porte à +X
  const solids = []; let x = -30; for (const o of ops) { solids.push([x, o.c0 - o.w / 2]); x = o.c0 + o.w / 2; } solids.push([x, 30]);
  for (const [a, b] of solids) for (let s = a; s < b - 0.01; s += 3) {
    const e = Math.min(b, s + 3), w = e - s, t = tex.clone(); t.repeat.set(w / 2.5, 1); t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, H + 0.6, 0.35), A.mat(0xffffff, { map: t }));
    m.position.set((s + e) / 2, Math.min(yAt(s), yAt(e)) + (H + 0.6) / 2 - 0.6, zc); g.add(m);
  }
  const post = A.mat(0xF2F2F2), red = A.mat(0xE5383B), beam = A.mat(0x7A4A24), leaf = A.mat(0xC98B4A);
  for (const o of ops) {
    for (const sd of [-1, 1]) {
      const px = o.c0 + sd * (o.w / 2 + 0.25);
      // poteaux rayés rouge et blanc
      for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 10), k % 2 ? red : post); m.position.set(px, yAt(px) + 0.3 + k * 0.6, zc); g.add(m); }
      // battant de la porte, ouvert à 90° le long du passage
      const lf = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, o.w / 2 - 0.3), leaf); lf.position.set(px + sd * 0.1, yAt(px) + 1.1, zc - (o.w / 4)); g.add(lf);
      for (const yy of [0.5, 1.7]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, o.w / 2 - 0.3), beam); bar.position.set(px + sd * 0.1, yAt(px) + yy, zc - o.w / 4); g.add(bar); }
    }
    // traverse au-dessus de la porte avec une flèche
    const tb = new THREE.Mesh(new THREE.BoxGeometry(o.w + 1, 0.4, 0.4), beam); tb.position.set(o.c0, yAt(o.c0) + 3.7, zc); g.add(tb);
    const ar = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 3), A.mat(0xFFC21A, { e: 0x664400, ei: 0.4 })); ar.rotation.x = Math.PI; ar.position.set(o.c0, yAt(o.c0) + 3.0, zc + 0.1); g.add(ar);
  }
  return g;
}

// ---------- Ruines : colonnade en travers de la piste ----------
function ruins(L, p) {
  const g = new THREE.Group(), r = A.rng(p.seed), stone = A.mat(0xE6DCC6), dk = A.mat(0xC9BDA3);
  const yAt = (x, z) => L.ground(x, z, 1).h;
  const cols = L.obstacles.filter(o => o.kind === 'column' && o.z <= p.z0 + 1 && o.z >= p.z1 - 1).sort((a, b) => a.x - b.x);
  for (const c of cols) {
    const y = yAt(c.x, c.z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 2.5), dk); base.position.set(c.x, y + 0.2, c.z); g.add(base);
    const h = c.broken ? c.h : c.h - 0.9;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.92, c.r, h, 12), stone); shaft.position.set(c.x, y + 0.45 + h / 2, c.z); g.add(shaft);
    if (c.broken) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.4, c.r * 0.9, 0.6, 7), stone); cap.position.set(c.x + 0.1, y + 0.45 + h + 0.2, c.z); cap.rotation.z = 0.3; g.add(cap); }
    else { const cap = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 2.3), dk); cap.position.set(c.x, y + c.h - 0.2, c.z); g.add(cap); }
  }
  // Linteaux entre deux colonnes intactes voisines (bien au-dessus de la voiture)
  for (let i = 0; i < cols.length - 1; i++) {
    const a = cols[i], b = cols[i + 1];
    if (a.broken || b.broken || b.x - a.x > 8) continue;
    const y = Math.max(yAt(a.x, a.z), yAt(b.x, b.z)) + a.h + 0.3;
    const l = new THREE.Mesh(new THREE.BoxGeometry(b.x - a.x + 2.2, 0.8, 2), stone); l.position.set((a.x + b.x) / 2, y, a.z); g.add(l);
  }
  // Morceaux de colonnes tombées sur les talus, hors de la piste
  for (let k = 0; k < 4; k++) {
    const sd = r() < 0.5 ? -1 : 1, x = sd * (24 + r() * 8), z = p.z0 - 6 + (r() - 0.5) * 20;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 2 + r() * 2, 12), stone); m.rotation.set(0, r() * 3, Math.PI / 2); m.position.set(x, yAt(x, z) + 0.7, z); g.add(m);
  }
  return g;
}
