// Capture de chacun des 20 mondes : la voiture est posée sur la piste vers 600 m, la course est figée.
// Usage : CHROME_PATH=... node tools/playtest-worlds.mjs [niveaux séparés par des virgules]   (captures dans tools/playtest-out/)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'tools', 'playtest-out'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(8778);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const levels = (process.argv[2] || Array.from({ length: 20 }, (_, i) => i + 1).join(',')).split(',').map(Number);
const errors = [];
for (const level of levels) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(`niveau ${level} : ${e.message}`));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const rel = route.request().url().split('three@0.186.1/')[1]; route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' }); });
  await page.addInitScript((lv) => { localStorage.setItem('hill-kicker-save-v1', JSON.stringify({ level: lv, lives: 25, up: { pneus: 0, susp: 0, lanceur: 0, mult: 0 } })); localStorage.setItem('hill-kicker-quality', 'haute'); }, level);
  await page.goto('http://localhost:8778/index.html');
  await page.waitForFunction(() => window.__hk, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, `monde-${String(level).padStart(2, '0')}-accueil.png`) });
  await page.click('#b-play', { force: true }); await page.waitForTimeout(300);
  const bb = await (await page.$('#b-hold')).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(4500); await page.mouse.up();
  await page.waitForTimeout(500);
  await page.evaluate(() => { const hk = window.__hk, L = hk.layout;
    // Un endroit dégagé : ni bifurcation ni passage étroit dans les 150 m devant
    let z = -500; for (let zz = -420; zz > -2600; zz -= 20) if (!L.forks.some(f => f.z0 > zz - 170 && f.z1 < zz + 30) && !L.passages.some(p => p.z0 > zz - 150 && p.z1 < zz + 30)) { z = zz; break; } Object.assign(hk.car, { x: 0, z, v: 0.01, air: false, vy: 0, trick: null, distance: -z, y: L.ground(0, z, 1).h }); hk.freeze = true; });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(out, `monde-${String(level).padStart(2, '0')}.png`) });
  console.log('niveau', level, await page.evaluate(() => window.__hk.layout.theme.name));
  await page.close();
}
console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
