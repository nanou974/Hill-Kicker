// Rendu headless des scènes et vignettes de Hill Kicker (Three.js + Chromium).
// Usage : node tools/render/render.mjs '[{"s":"course","file":"scenes/course.jpg"}]'
// Scènes : launch, launch100, faux, course, cascade, results, home, hero, thumb, icon, appicon
// Paramètre "car" : clé du véhicule (voir ORDER dans src/assets3d.js).
// Variable CHROME_PATH : chemin de Chromium si playwright-core ne le trouve pas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(8765);

const jobs = JSON.parse(process.argv[2] || '[]');
const out = path.join(root, 'assets', 'renders');
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
for (const j of jobs) {
  const w = j.w || 780, h = j.h || 1688;
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => console.log('pageerror', j.file, e.message));
  await page.goto(`http://localhost:8765/tools/render/index.html?s=${j.s}&w=${w}&h=${h}${j.car ? '&car=' + j.car : ''}`);
  await page.waitForFunction(() => window.__done, null, { timeout: 180000 });
  const st = await page.evaluate(() => window.__done);
  if (st !== 'ok') { console.log(j.file, st); await page.close(); continue; }
  const file = path.join(out, j.file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const el = await page.$('canvas');
  await el.screenshot(file.endsWith('.png') ? { path: file, omitBackground: true } : { path: file, type: 'jpeg', quality: 88 });
  console.log('ok', j.file);
  await page.close();
}
await browser.close(); server.close();
