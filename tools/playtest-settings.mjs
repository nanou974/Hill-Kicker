// Test du menu Paramètres : volumes, code de transfert (export puis import sur une partie vierge), effacement en deux appuis.
// Usage : CHROME_PATH=... node tools/playtest-settings.mjs   (captures dans tools/playtest-out/)
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
}).listen(8771);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
await page.route('https://cdn.jsdelivr.net/npm/three@0.186.1/**', (route) => { const rel = route.request().url().split('three@0.186.1/')[1]; route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'text/javascript' }); });
const errors = []; page.on('pageerror', e => errors.push(e.message));
// Partie avancée de départ
await page.addInitScript(() => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', '1'); localStorage.setItem('hill-kicker-save-v1', JSON.stringify({ level: 7, yellow: 4321, blue: 15000, gems: 12, lives: 18, up: { pneus: 5, susp: 4, lanceur: 3, mult: 6 }, booster: 2, cars: ['citadine', 'taxi', 'rallye'], car: 'rallye', best: 1234, gemsTaken: [1, 3], chestCount: 9 })); } });
await page.goto('http://localhost:8771/index.html');
await page.waitForFunction(() => window.__hk, null, { timeout: 60000 });
await page.click('#b-menu', { force: true }); await page.waitForTimeout(300);
await page.fill('#r-music', '40'); await page.dispatchEvent('#r-music', 'input');
await page.screenshot({ path: path.join(out, 'param-1-menu.png') });
await page.click('#b-transfer'); await page.waitForTimeout(300);
const code = await page.textContent('#v-code');
await page.click('#b-copycode'); await page.waitForTimeout(200);
await page.screenshot({ path: path.join(out, 'param-2-code.png') });
console.log('code :', code, '| message :', await page.textContent('#v-codemsg'));
// Partie effacée (deux appuis), puis récupération par le code
await page.click('#b-transferclose');
await page.click('#b-reset'); console.log('après 1 appui, niveau =', await page.evaluate(() => window.__hk.eco.s.level), '| bouton :', await page.textContent('#b-reset'));
await page.click('#b-reset'); console.log('après 2 appuis, niveau =', await page.evaluate(() => window.__hk.eco.s.level));
await page.click('#b-menu', { force: true }); await page.click('#b-transfer');
await page.fill('#i-code', code.toLowerCase().replace(/-/g, ' ')); await page.click('#b-importcode');
console.log('1er appui :', await page.textContent('#v-codemsg'));
await page.click('#b-importcode'); await page.waitForTimeout(300);
console.log('2e appui :', await page.textContent('#v-codemsg'));
const s = await page.evaluate(() => window.__hk.eco.s);
console.log('partie récupérée :', JSON.stringify({ level: s.level, yellow: s.yellow, blue: s.blue, gems: s.gems, lives: s.lives, up: s.up, booster: s.booster, cars: s.cars, car: s.car, best: s.best, gemsTaken: s.gemsTaken, chestCount: s.chestCount }));
await page.fill('#i-code', 'HK1-ABCD-EFGH'); await page.click('#b-importcode');
console.log('code faux :', await page.textContent('#v-codemsg'));
await page.screenshot({ path: path.join(out, 'param-3-import.png') });
console.log('volumes enregistrés :', await page.evaluate(() => localStorage.getItem('hill-kicker-volumes')));
console.log('erreurs:', errors.length ? errors.join('\n') : 'aucune');
await browser.close(); server.close();
