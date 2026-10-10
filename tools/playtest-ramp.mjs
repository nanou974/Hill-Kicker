// Test visuel d'une rampe : saut, cascade automatique, atterrissage.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright-core';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'tools', 'playtest-out'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(8769);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => route.fulfill({ path: path.join(root, 'node_modules/three', route.request().url().split('three@0.186.1/')[1]), contentType: 'text/javascript' }));
await page.route('https://fonts.googleapis.com/**', r => r.abort());
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8769/index.html');
await page.waitForFunction(() => window.__hk);
await page.click('#b-play', { force: true }); await page.waitForTimeout(300);
const bb = await (await page.$('#b-hold')).boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up();
await page.waitForTimeout(500);
const r = await page.evaluate(() => { const hk = window.__hk, r = hk.layout.ramps[0]; hk.car.x = r.x; hk.car.z = r.z + 30; hk.car.v = 18; hk.car.distance = -hk.car.z; return r; });
await page.evaluate(() => window.__hk.simulate(1.2)); await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, 'r1-montee.png') });
for (let i = 2; i <= 4; i++) { await page.evaluate(() => window.__hk.simulate(0.45)); await page.waitForTimeout(200); await page.screenshot({ path: path.join(out, `r${i}-vol.png`) }); }
await page.evaluate(() => window.__hk.simulate(1.5)); await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, 'r5-atterrissage.png') });
console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
