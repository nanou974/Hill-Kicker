import * as THREE from 'three';
import * as L from '../../src/assets3d.js';

const q = new URLSearchParams(location.search);
const name = q.get('s');
const W = +q.get('w') || 780, H = +q.get('h') || 1688;

function tyre(x) { return x; }

function launchScene(mode) {
  const opt = { half: 22 };
  const { renderer, scene, camera, sun } = L.setup(W, H, { fov: 55 });
  scene.add(L.terrain(opt));
  L.scatterScenery(scene, opt);
  const wm = L.windmill(1.4); L.place(wm, -40, -120, opt, -0.5); wm.rotation.y = 0.6; scene.add(wm);
  const wm2 = L.windmill(1.1); L.place(wm2, 46, -170, opt, -0.5); wm2.rotation.y = -0.5; scene.add(wm2);
  const z0 = 8, y0 = L.heightAt(0, z0, opt);
  const plat = new THREE.Mesh(new THREE.BoxGeometry(9, 3, 9), L.mat(0x8A7A62)); plat.position.set(0, y0 - 1.2, z0); plat.receiveShadow = true; scene.add(plat);
  const lit = mode === 'faux' ? 0xE5383B : mode === 'max' ? 0xFFE14D : 0x3DDC84;
  const la = L.launcher(5.6, 3.4, lit); la.position.set(0, y0 + 0.3, z0); scene.add(la);
  const c = L.car('citadine'); c.position.set(0, y0 + 0.92, z0 - 0.2);
  if (mode === 'faux') { c.rotation.y = 0.32; c.position.x = 0.25; }
  scene.add(c);
  for (const sx of [-1, 1]) { const sm = L.smoke(mode === 'faux' ? 16 : mode === 'max' ? 12 : 6, mode === 'faux' ? 2.6 : 1.8, mode === 'faux' ? 0.42 : mode === 'max' ? 0.34 : 0.26, 5 + sx); sm.position.set(sx * 1.3, y0 + 0.8, z0 + 2.6); scene.add(sm); }
  if (mode === 'faux') { const s2 = L.smoke(14, 3, 0.4, 9); s2.position.set(-2.2, y0 + 1, z0 + 0.5); scene.add(s2); }
  const rp = L.ramp(6, 5, 1.6); L.place(rp, 0, -22, opt, -0.05); rp.rotation.x = L.slopeRot(0, -22, opt); scene.add(rp);
  const r = L.rng(4);
  for (let i = 0; i < 6; i++) { const cn = L.coin('gold', 1); L.place(cn, 0, -30 - i * 3, opt, 1); scene.add(cn); }
  for (let i = 0; i < 5; i++) { const cn = L.coin('silver', 1); L.place(cn, -7, -40 - i * 3, opt, 1); scene.add(cn); }
  const bp = L.boostPad(5, 4); L.place(bp, 6, -48, opt, 0.05); bp.rotation.x = L.slopeRot(6, -48, opt); scene.add(bp);
  camera.position.set(0, y0 + 6.2, z0 + 13.5);
  camera.lookAt(0, y0 - 3.5, z0 - 18);
  if (mode === 'max') { camera.rotation.z += 0.025; camera.position.x -= 0.15; }
  sun.position.set(18, y0 + 30, z0 + 14); sun.target.position.set(0, y0, z0 - 6);
  renderer.render(scene, camera);
}

function courseScene() {
  const opt = { half: 22, tarmac: [-131, -168] };
  const { renderer, scene, camera, sun } = L.setup(W, H, { fov: 56 });
  scene.add(L.terrain(opt));
  L.scatterScenery(scene, opt);
  const wm = L.windmill(1.5); L.place(wm, -36, -260, opt, -0.5); wm.rotation.y = 0.5; scene.add(wm);
  const cz = -118, cx = 1.2, cy = L.heightAt(cx, cz, opt);
  const c = L.car(q.get('car') || 'citadine'); c.position.set(cx, cy, cz); c.rotation.x = L.slopeRot(cx, cz, opt); c.rotation.z = -0.03; scene.add(c);
  const dust = L.smoke(8, 2.4, 0.16, 21); dust.children.forEach(m => { m.material = m.material.clone(); m.material.color.set(0xE8CFA0); m.material.opacity = 0.6; }); dust.position.set(cx, cy + 0.2, cz + 2.4); scene.add(dust);
  for (let i = 0; i < 7; i++) { const z = cz - 9 - i * 2.6; const cn = L.coin('gold', 1); L.place(cn, cx - 3.2 - i * 0.35, z, opt, 0.95); scene.add(cn); }
  L.tufts(scene, opt, cz + 16, cz - 60, 160, 8); L.tracks(scene, opt, cx, cz + 1.2, 6);
  for (let i = 0; i < 6; i++) { const z = cz - 16 - i * 2.6; const cn = L.coin('silver', 1); L.place(cn, -8 + i * 0.3, z, opt, 0.95); scene.add(cn); }
  for (let i = 0; i < 6; i++) { const z = cz - 22 - i * 2.6; const cn = L.coin('bronze', 0.85); L.place(cn, 9, z, opt, 0.85); scene.add(cn); }
  const gm = L.gem(1); L.place(gm, 4.5, cz - 30, opt, 1.4); gm.rotation.y = 0.6; scene.add(gm);
  const bp = L.boostPad(5.5, 4.5); L.place(bp, -1.5, -176, opt, 0.06); bp.rotation.x = L.slopeRot(-1.5, -176, opt); scene.add(bp);
  const bp2 = L.boostPad(5.5, 4.5); L.place(bp2, 8, -215, opt, 0.06); bp2.rotation.x = L.slopeRot(8, -215, opt); scene.add(bp2);
  const rp = L.ramp(6, 5, 1.7); L.place(rp, -6, -200, opt, -0.05); rp.rotation.x = L.slopeRot(-6, -200, opt); scene.add(rp);
  camera.position.set(cx * 0.4, cy + 5.4, cz + 12.5);
  camera.lookAt(cx * 0.7, cy - 6.2, cz - 24);
  sun.position.set(cx + 18, cy + 30, cz + 12); sun.target.position.set(cx, cy, cz - 8);
  renderer.render(scene, camera);
}

function cascadeScene() {
  const opt = { half: 22 };
  const { renderer, scene, camera, sun } = L.setup(W, H, { fov: 58 });
  scene.add(L.terrain(opt));
  L.scatterScenery(scene, opt);
  L.tufts(scene, opt, -220, -300, 160, 12);
  const rz = -236, ry = L.heightAt(0, rz, opt);
  const rp = L.ramp(6, 5, 1.7); L.place(rp, 0, rz, opt, -0.05); rp.rotation.x = L.slopeRot(0, rz, opt); scene.add(rp);
  const cz = rz - 11, cyy = L.heightAt(0, rz - 11, opt) + 4.2;
  const c = L.car('citadine', { upgraded: true }); c.position.set(0.3, cyy, cz); c.rotation.z = -1.05; c.rotation.x = -0.1; scene.add(c);
  for (let i = 0; i < 6; i++) { const cn = L.coin('gold', 1); cn.position.set(0.3, cyy - 0.6 - i * 0.55, cz - 7 - i * 2.4); scene.add(cn); }
  const bp = L.boostPad(5.5, 4.5); L.place(bp, -5, rz - 30, opt, 0.06); bp.rotation.x = L.slopeRot(-5, rz - 30, opt); scene.add(bp);
  camera.position.set(-0.5, cyy + 1.2, cz + 8.5);
  camera.lookAt(0.2, cyy - 2.6, cz - 10);
  sun.position.set(14, cyy + 30, cz + 10); sun.target.position.set(0, ry, cz);
  renderer.render(scene, camera);
}

function resultsScene() {
  const opt = { half: 22 };
  const { renderer, scene, camera, sun } = L.setup(W, H, { fov: 52 });
  scene.add(L.terrain(opt));
  L.scatterScenery(scene, opt);
  const cz = -70, cy = L.heightAt(0, cz, opt);
  const c = L.car('citadine'); c.position.set(0, cy, cz); c.rotation.x = L.slopeRot(0, cz, opt); scene.add(c);
  const r = L.rng(17);
  for (let i = 0; i < 55; i++) {
    const t = r(); const cn = L.coin(t < 0.7 ? 'gold' : t < 0.9 ? 'silver' : 'bronze', 0.9);
    const hgt = 1.8 + Math.pow(r(), 0.7) * 7; const spread = 0.6 + (hgt - 1.8) * 0.25;
    cn.position.set((r() - 0.5) * spread * 2, cy + hgt, cz - 0.6 + (r() - 0.5) * spread);
    cn.rotation.set(r() * 6, r() * 6, r() * 6); scene.add(cn);
  }
  for (let i = 0; i < 30; i++) { const cn = L.coin('gold', 0.9); cn.position.set((r() - 0.5) * 4.2, cy + 0.25, cz - 0.3 + (r() - 0.5) * 3.4); cn.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.6, r() * 6, 0); scene.add(cn); }
  for (let i = 0; i < 3; i++) { const g = L.gem(0.8); g.position.set((r() - 0.5) * 3, cy + 3 + r() * 4, cz - 0.5); g.rotation.set(r(), r() * 6, r()); scene.add(g); }
  camera.position.set(0, cy + 4.6, cz + 9.5);
  camera.lookAt(0, cy + 2.0, cz - 4);
  sun.position.set(14, cy + 30, cz + 12); sun.target.position.set(0, cy, cz);
  renderer.render(scene, camera);
}

function homeScene() {
  const opt = { half: 16, slope: 0.02 };
  const { renderer, scene, camera, sun } = L.setup(W, H, { fov: 34, fogNear: 30, fogFar: 160 });
  scene.add(L.terrain(opt));
  const r = L.rng(3);
  for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 80 + 8, z = 22 + r() * 60; const t = r() > 0.4 ? L.tree(1.3 + r() * 1.2, i % 4) : L.pine(1.4 + r()); L.place(t, x, z, opt, -0.1); scene.add(t); }
  const wm = L.windmill(1.6); L.place(wm, 26, 40, opt, -0.4); wm.rotation.y = 2.4; scene.add(wm);
  for (let i = 0; i < 8; i++) { const h = L.hay(1); L.place(h, 8 + r() * 10, 8 + r() * 8, opt); h.rotation.y = r() * 3; scene.add(h); }
  L.tufts(scene, opt, 6, -10, 60, 4);
  const y0 = L.heightAt(0, 0, opt);
  const la = L.launcher(5.6, 3.4); la.position.set(0, y0 + 0.05, 0); la.rotation.y = 0; scene.add(la);
  const ck = q.get('car') || 'citadine'; const c = L.car(ck, { upgraded: ck === 'citadine' }); c.position.set(0, y0 + 0.67, -0.1); scene.add(c);
  camera.position.set(-10.2, y0 + 5.0, -14.6);
  camera.lookAt(0.6, y0 + 1.6, 0.5);
  sun.position.set(-8, y0 + 26, -16); sun.target.position.set(0, y0, 0);
  renderer.render(scene, camera);
}

function carShot(key, big) {
  const { renderer, scene, camera, sun } = L.setup(W, H, { alpha: true, fov: big ? 30 : 26, hemi: 1.4, sun: 2.2, exposure: 1.1 });
  const c = L.car(key); scene.add(c);
  if (big) { const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.25, 40), L.mat(0xFFFFFF, { r: 0.4, flat: false })); disc.position.y = -0.13; disc.receiveShadow = true; scene.add(disc); }
  else { const sh = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.ShadowMaterial({ opacity: 0.25 })); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; scene.add(sh); }
  const box = new THREE.Box3().setFromObject(c); const ctr = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
  const dist = Math.max(size.z, size.y * 2.2) * (big ? 1.2 : 0.95) / Math.tan((camera.fov * Math.PI / 180) / 2) * 0.62;
  const dir = new THREE.Vector3(-0.78, 0.42, -0.6).normalize();
  camera.position.copy(ctr).addScaledVector(dir, dist);
  camera.lookAt(ctr.x, ctr.y - size.y * 0.05, ctr.z);
  sun.position.set(-6, 14, -4); sun.target.position.copy(ctr);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6; sun.shadow.camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

function iconShot(kind) {
  const { renderer, scene, camera, sun } = L.setup(W, H, { alpha: true, fov: 30, hemi: 1.3, sun: 2.4, exposure: 1.1 });
  const g = new THREE.Group();
  if (kind === 'pneus') { const w = L.wheel(1.1, 0.9, 0xFFD23F, 'tread'); w.rotation.y = 0.7; w.rotation.x = 0.15; g.add(w); }
  if (kind === 'susp') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 12), L.mat(0xC9D1DC, { m: 0.8, r: 0.2 })); g.add(rod);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 14), L.mat(0x2A2F38, { m: 0.4 })); body.position.y = -0.6; g.add(body);
    for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 20), L.mat(0xFFC21A, { m: 0.4, r: 0.3 })); t.rotation.x = Math.PI / 2 + 0.25; t.position.y = -0.9 + i * 0.3; g.add(t); }
    for (const y of [-1.25, 1.25]) { const e = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.1, 8, 16), L.mat(0x8C95A3, { m: 0.7 })); e.position.y = y; g.add(e); }
    g.rotation.z = 0.35;
  }
  if (kind === 'lanceur') { const la = L.launcher(3.2, 2.2); la.scale.setScalar(0.62); la.rotation.y = 0.75; la.position.y = -0.5; g.add(la); }
  if (kind === 'multi') {
    for (let i = 0; i < 6; i++) { const c = L.coin('gold', 1.25); c.rotation.x = Math.PI / 2; c.position.set(-0.55, -1.0 + i * 0.16, 0.1); g.add(c); }
    for (let i = 0; i < 4; i++) { const c = L.coin('gold', 1.25); c.rotation.x = Math.PI / 2; c.position.set(0.6, -1.0 + i * 0.16, -0.2); g.add(c); }
    const c = L.coin('gold', 1.6); c.position.set(0.05, 0.35, 0.6); c.rotation.y = 0.35; g.add(c);
  }
  scene.add(g);
  camera.position.set(0, 2.0, 7.4); camera.lookAt(0, 0, 0);
  sun.position.set(4, 8, 6); sun.target.position.set(0, 0, 0);
  renderer.render(scene, camera);
}

function appIcon() {
  const opt = { half: 16, slope: 0.02 };
  const { renderer, scene, camera, sun } = L.setup(W, H, { fov: 34, fogNear: 40, fogFar: 160, skyTop: '#5DB4F0', skyMid: '#A8DDF8' });
  scene.add(L.terrain(opt));
  const r = L.rng(9);
  for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 70, z = 10 + r() * 50; const t = r() > 0.5 ? L.tree(1.3 + r(), i % 4) : L.pine(1.4 + r()); L.place(t, x, z, opt, -0.1); scene.add(t); }
  for (let i = 0; i < 6; i++) { const k = L.rock(0.3 + r() * 0.3); L.place(k, (r() - 0.5) * 16, -4 + r() * 10, opt, 0); scene.add(k); }
  L.tufts(scene, opt, 6, -8, 40, 2);
  const y0 = L.heightAt(0, 0, opt);
  const la = L.launcher(5.6, 3.4, 0xFFC21A); la.position.set(0, y0 + 0.05, 0); scene.add(la);
  const c = L.car('citadine', { upgraded: true }); c.position.set(0, y0 + 0.67, -0.2); c.rotation.x = 0.05; scene.add(c);
  const sm = new THREE.MeshBasicMaterial({ color: 0xFF7A00, toneMapped: false });
  const sm2 = new THREE.MeshBasicMaterial({ color: 0xFFD23F, toneMapped: false });
  for (const sx of [-1, 1]) for (let i = 0; i < 26; i++) {
    const sp = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), i % 3 ? sm : sm2); sp.scale.set(0.6, 0.6, 3 + r() * 3);
    const a = (r() - 0.5) * 1.6; sp.position.set(sx * (0.95 + r() * 0.8), y0 + 0.75 + r() * 0.9, 1.0 + r() * 2.4); sp.rotation.set(-0.3 - r() * 0.5, a, 0); scene.add(sp);
  }
  const streak = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.55 });
  for (let i = 0; i < 7; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 4 + r() * 4), streak); st.position.set((r() - 0.5) * 2.4, y0 + 1.2 + r() * 1.4, 4 + r() * 3); scene.add(st); }
  camera.position.set(5.6, y0 + 3.8, -6.4);
  camera.lookAt(0, y0 + 0.9, 0.3);
  sun.position.set(10, y0 + 26, -12); sun.target.position.set(0, y0, 0);
  renderer.render(scene, camera);
}

try {
  if (name === 'launch') launchScene('charge');
  else if (name === 'launch100') launchScene('max');
  else if (name === 'faux') launchScene('faux');
  else if (name === 'course') courseScene();
  else if (name === 'cascade') cascadeScene();
  else if (name === 'results') resultsScene();
  else if (name === 'home') homeScene();
  else if (name === 'hero') carShot(q.get('car') || 'citadine', true);
  else if (name === 'thumb') carShot(q.get('car'), false);
  else if (name === 'icon') iconShot(q.get('car'));
  else if (name === 'appicon') appIcon();
  window.__done = 'ok';
} catch (e) { window.__done = 'ERR ' + e.stack; }
