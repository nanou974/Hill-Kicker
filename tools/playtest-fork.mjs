// Test visuel d'une bifurcation : la voiture est placée juste avant la colline.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright-core';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'tools', 'playtest-out'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(8768);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => route.fulfill({ path: path.join(root, 'node_modules/three', route.request().url().split('three@0.186.1/')[1]), contentType: 'text/javascript' }));
await page.route('https://fonts.googleapis.com/**', r => r.abort());
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('http://localhost:8768/index.html');
await page.waitForFunction(() => window.__hk);
await page.click('#b-play', { force: true }); await page.waitForTimeout(300);
const bb = await (await page.$('#b-hold')).boundingBox();
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up();
await page.waitForTimeout(500);
const f = await page.evaluate(() => { const hk = window.__hk, f = hk.layout.forks[0]; hk.car.x = f.cx; hk.car.z = f.z0 + 25; hk.car.v = 28; hk.car.distance = -hk.car.z; return f; });
console.log('bifurcation', JSON.stringify(f));
await page.evaluate(() => window.__hk.simulate(1.0)); await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, 'f1-entree.png') });
await page.evaluate(() => window.__hk.simulate(1.0)); await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, 'f2-crash.png') });
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(out, 'f3-bilan.png') });
// Statue / rocher : la voiture est placée face au premier obstacle
await page.click('#b-continue'); await page.waitForTimeout(400);
await page.click('#b-play', { force: true }); await page.waitForTimeout(300);
await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up(); await page.waitForTimeout(400);
console.log('obstacle', JSON.stringify(await page.evaluate(() => { const hk = window.__hk, o = hk.layout.obstacles[0]; hk.car.x = o.x; hk.car.z = o.z + 22; hk.car.v = 22; hk.car.distance = -hk.car.z; return o; })));
await page.evaluate(() => window.__hk.simulate(0.6)); await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, 'f4-avant-obstacle.png') });
await page.evaluate(() => window.__hk.simulate(1.0)); await page.waitForTimeout(300);
await page.screenshot({ path: path.join(out, 'f5-crash-obstacle.png') });
console.log('fin', JSON.stringify(await page.evaluate(() => ({ state: window.__hk.state, reason: window.__hk.car.endReason }))));

console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
