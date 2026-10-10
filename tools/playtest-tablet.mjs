// Captures sur un écran de tablette (800 × 1280) et de téléphone : accueil, paramètres, course.
// Usage : CHROME_PATH=... node tools/playtest-tablet.mjs   (captures dans tools/playtest-out/)
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
}).listen(8773);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
for (const [name, w, h] of [['tablette', 800, 1280]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const rel = route.request().url().split('three@0.186.1/')[1]; route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' }); });
  await page.addInitScript(() => localStorage.setItem('hill-kicker-fps', '1'));
  await page.goto('http://localhost:8773/index.html');
  await page.waitForFunction(() => window.__hk, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, `${name}-1-accueil.png`) });
  await page.click('#b-menu', { force: true }); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(out, `${name}-2-parametres.png`) });
  await page.click('#b-menuclose');
  await page.click('#b-play', { force: true }); await page.waitForTimeout(300);
  const bb = await (await page.$('#b-hold')).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(4500); await page.mouse.up();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(out, `${name}-3-course.png`) });
  console.log(name, 'objets dessinés par image :', await page.evaluate(() => { let n = 0; window.__hk.world.root.traverse(o => { if (o.isMesh && o.visible) n++; }); return n; }));
  await page.close();
}
console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
