// Test automatisé du jeu dans Chromium headless : accueil, lancer, course, résultats.
// Usage : CHROME_PATH=... node tools/playtest.mjs   (captures dans tools/playtest-out/)
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
}).listen(8766);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: false });
// Three.js servi depuis node_modules au lieu du CDN
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => {
  const rel = route.request().url().split('three@0.186.1/')[1];
  route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' });
});
await page.route('https://fonts.googleapis.com/**', r => r.abort());
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

const shot = (n) => page.screenshot({ path: path.join(out, n) });
await page.goto('http://localhost:8766/index.html');
await page.waitForFunction(() => window.__hk, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await shot('1-accueil.png');

await page.click('#b-play', { force: true });
await page.waitForTimeout(400);
const hold = await page.$('#b-hold'); const bb = await hold.boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
await page.mouse.down();
await page.waitForTimeout(900);
await shot('2-lanceur-charge.png');
await page.waitForTimeout(1600);
await shot('3-lanceur-100.png');
await page.mouse.up();
await page.waitForTimeout(4000);
await shot('4-course.png');
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(2500);
await shot('5-course-virage.png');
await page.keyboard.up('ArrowRight');
// Téléporte la voiture juste avant la première gemme pour vérifier le ramassage
await page.evaluate(() => { const hk = window.__hk; const g = hk.layout.gems[0]; hk.car.x = g.x; hk.car.z = g.z + 3; hk.car.v = 20; hk.car.distance = -hk.car.z; });
await page.evaluate(() => window.__hk.simulate(1));
await page.waitForTimeout(300);
await shot('5b-gemme.png');
console.log('gemmes après ramassage :', JSON.stringify(await page.evaluate(() => ({ taken: window.__hk.eco.s.gemsTaken, gems: window.__hk.eco.s.gems, markers: document.querySelectorAll('.progress .gm:not(.got)').length }))));
await page.evaluate(() => window.__hk.simulate(240));
await page.waitForTimeout(800);
await page.waitForTimeout(500);
await shot('6-resultats.png');
// Nouveau lancer : la gemme ramassée ne doit plus être sur la piste ni sur la barre
await page.click('#b-continue'); await page.waitForTimeout(500);
await page.click('#b-play', { force: true }); await page.waitForTimeout(300);
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up();
await page.waitForTimeout(1500);
await shot('7-lancer-suivant.png');
console.log('lancer suivant :', JSON.stringify(await page.evaluate(() => ({ markers: document.querySelectorAll('.progress .gm').length, gem0taken: window.__hk.layout.gems[0].taken }))));
const info = await page.evaluate(() => ({ state: window.__hk.state, dist: window.__hk.car.distance, save: window.__hk.eco.s }));
console.log(JSON.stringify(info));
console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
