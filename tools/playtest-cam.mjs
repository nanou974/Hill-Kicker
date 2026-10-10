// Vérifie que la caméra garde la voiture au centre sur les bords de la piste, et la ligne d'arrivée.
// Usage : CHROME_PATH=... node tools/playtest-cam.mjs   (captures dans tools/playtest-out/)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'tools', 'playtest-out'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(8768);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => {
  const rel = route.request().url().split('three@0.186.1/')[1];
  route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' });
});
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8768/index.html');
await page.waitForFunction(() => window.__hk, null, { timeout: 60000 });
await page.click('#b-play', { force: true }); await page.waitForTimeout(300);
const bb = await (await page.$('#b-hold')).boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up();
await page.waitForTimeout(2500);
// Bord droit de la piste en tournant
await page.evaluate(() => { window.__hk.car.x = 17; });
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, 'cam-bord-droit.png') });
console.log('voiture x =', await page.evaluate(() => window.__hk.car.x.toFixed(1)));
await page.keyboard.up('ArrowRight');
await page.evaluate(() => { window.__hk.car.x = -17; });
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, 'cam-bord-gauche.png') });
console.log('voiture x =', await page.evaluate(() => window.__hk.car.x.toFixed(1)));
await page.keyboard.up('ArrowLeft');
// Juste avant l'arrivée
await page.evaluate(() => { const hk = window.__hk; hk.car.x = 0; hk.car.z = -2975; hk.car.v = 4; hk.car.distance = 2975; hk.car.air = false; hk.car.vy = 0; hk.car.trick = null; });
await page.waitForTimeout(5000);
await page.screenshot({ path: path.join(out, 'arrivee.png') });
console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
