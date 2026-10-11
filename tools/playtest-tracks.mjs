// Captures des pistes de chaque monde : entrée de virage, milieu de virage, tronc, zone lente.
// Usage : CHROME_PATH=... node tools/playtest-tracks.mjs [niveaux…]   (captures dans tools/playtest-out/pistes/)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'tools', 'playtest-out', 'pistes'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(8771);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => {
  const rel = route.request().url().split('three@0.186.1/')[1];
  route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' });
});
await page.route('https://fonts.googleapis.com/**', r => r.abort());
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://localhost:8771/index.html');
await page.waitForFunction(() => window.__hk, null, { timeout: 60000 });
await page.evaluate(() => { localStorage.setItem('hill-kicker-quality', 'haute'); });

// Place la voiture à la distance s (m), la course figée, et prend une capture une fois le terrain chargé
async function at(name, s, x = 0) {
  await page.evaluate(([s, x]) => {
    const hk = window.__hk; hk.freeze = true;
    Object.assign(hk.car, { x, z: -s, v: 22, distance: s, air: false, vy: 0, trick: null, ended: false, pitch: 0, roll: 0, vx: 0 });
    // Pas dans la colline d'une bifurcation : on se décale sur un des deux chemins
    const b = hk.layout.barrier(x, -s); if (b) hk.car.x = b.cx + b.hw + 4;
    hk.car.y = hk.layout.ground(hk.car.x, -s, 1).h;
  }, [s, x]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, name) });
}

const levels = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
for (const lv of levels) {
  await page.evaluate((n) => window.__hk.goLevel(n), lv);
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => { const L = window.__hk.layout; return { turns: L.curve.turns, logs: L.obstacles.filter(o => o.kind === 'log').map(o => [-o.z, o.x]), slow: L.slow.map(t => [-t.z0, t.x]), len: L.length }; });
  // Écran du lanceur (la caméra suit la voiture), interface masquée pour voir la piste
  await page.click('#b-play', { force: true }); await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('s-launch').hidden = true; });
  const t = info.turns[0];
  if (t) { await at(`n${lv}-a-avant-virage.png`, t.s0 - 60); await at(`n${lv}-b-dans-virage.png`, t.s0 + 60); }
  if (info.logs.length) await at(`n${lv}-c-tronc.png`, info.logs[0][0] - 28, info.logs[0][1] * 0.7);
  if (info.slow.length) await at(`n${lv}-d-zone-lente.png`, info.slow[0][0] - 35, info.slow[0][1]);
  console.log(`niveau ${lv} (${info.len} m) : ${info.turns.length} virages, ${info.logs.length} troncs, ${info.slow.length} zones lentes`);
  // Retour à l'accueil
  await page.evaluate(() => { window.__hk.freeze = false; document.getElementById('b-launchback').click(); });
  await page.waitForTimeout(300);
}
console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
