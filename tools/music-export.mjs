// Exporte les morceaux pré-calculés en fichiers audio OGG (assets/music/), lus directement par le jeu.
// Le jeu n'a ainsi plus rien à calculer pour la musique (zéro à-coup). À relancer après toute modification de music.js.
// Usage : CHROME_PATH=... node tools/music-export.mjs   (nécessite ffmpeg avec libvorbis)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.join(root, 'assets', 'music'); fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'hk-music-'));
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); });
}).listen(8777);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage();
await page.goto('http://localhost:8777/tools/render/index.html?s=none');
const parts = await page.evaluate(async () => {
  const { Music, SONG_COUNT } = await import('/src/game/music.js');
  const m = new Music({ ctx: null, master: null, volumes: { music: 1 } }, true);
  const out = [];
  for (let i = 0; i < SONG_COUNT; i++) for (const only of ['main', 'arp']) {
    const { buf, loop } = await m.renderPart(i, only);
    const d = buf.getChannelData(0), n = d.length, sr = buf.sampleRate, ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    const w = (o, s) => { for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    let peak = 0; for (let k = 0; k < n; k++) peak = Math.max(peak, Math.abs(d[k]));
    for (let k = 0; k < n; k++) v.setInt16(44 + k * 2, Math.max(-1, Math.min(1, d[k] / 2)) * 32767, true); // /2 : marge, le jeu remonte le volume ×2
    let s = ''; const u8 = new Uint8Array(ab); for (let k = 0; k < u8.length; k += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
    out.push({ name: `song${i}-${only}`, b64: btoa(s), loop, peak });
  }
  return out;
});
for (const p of parts) {
  const wav = path.join(tmp, p.name + '.wav'); fs.writeFileSync(wav, Buffer.from(p.b64, 'base64'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', path.join(outDir, p.name + '.ogg')]);
  console.log(p.name, 'boucle', p.loop.toFixed(3), 's, crête', (p.peak).toFixed(2), '→', (fs.statSync(path.join(outDir, p.name + '.ogg')).size / 1024).toFixed(0), 'Ko');
}
fs.rmSync(tmp, { recursive: true, force: true });
await browser.close(); server.close();
