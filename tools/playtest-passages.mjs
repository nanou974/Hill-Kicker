// Captures de chaque type de passage étroit et des rochers : la voiture est posée devant l'entrée.
// Usage : CHROME_PATH=... node tools/playtest-passages.mjs   (captures dans tools/playtest-out/)
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
}).listen(8769);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
// Niveaux choisis pour couvrir les 6 types (voir makeLayout)
const wanted = JSON.parse(process.argv[2] || '[]');
for (const [level, kind, back] of wanted) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const rel = route.request().url().split('three@0.186.1/')[1]; route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' }); });
  await page.addInitScript((lv) => { localStorage.setItem('hill-kicker-save-v1', JSON.stringify({ level: lv, lives: 25, up: { pneus: 0, susp: 0, lanceur: 0, mult: 0 } })); }, level);
  await page.goto('http://localhost:8769/index.html');
  await page.waitForFunction(() => window.__hk, null, { timeout: 60000 });
  await page.click('#b-play', { force: true }); await page.waitForTimeout(300);
  const bb = await (await page.$('#b-hold')).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2600); await page.mouse.up();
  await page.waitForTimeout(800);
  const info = await page.evaluate(([kind, back]) => {
    const hk = window.__hk;
    if (kind.startsWith('rock:')) {
      // Rocher d'une forme donnée : la voiture est posée devant, légèrement décalée
      const o = hk.layout.obstacles.find(o => o.shape === kind.slice(5));
      if (!o) return null;
      Object.assign(hk.car, { x: o.x - 2.5, z: o.z + back, v: 0.01, air: false, vy: 0, trick: null, distance: -(o.z + back) });
      hk.freeze = true; return { shape: o.shape, x: o.x };
    }
    const p = hk.layout.passages.find(p => p.kind === kind);
    if (!p) return null;
    const x = p.openings ? hk.layout.openX(p.openings[0], p, p.z0) : hk.layout.passageTarget(0, p.z0 + 10);
    Object.assign(hk.car, { x, z: p.z0 + back, v: 0.01, air: false, vy: 0, trick: null, distance: -(p.z0 + back) });
    hk.freeze = true; return { z0: p.z0, x };
  }, [kind, back]);
  if (!info) { console.log(level, kind, 'absent'); await page.close(); continue; }
  // Fige la voiture le temps que la caméra arrive
  await page.evaluate(() => { const hk = window.__hk; hk.car.y = hk.layout.ground(hk.car.x, hk.car.z, 1).h; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, `passage-${kind.replace(':', '-')}.png`) });
  console.log(level, kind, JSON.stringify(info));
  await page.close();
}
console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
