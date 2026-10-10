// Exporte la musique de fond en fichier audio (rendu hors-ligne dans Chromium headless).
// Usage : CHROME_PATH=... node tools/music-preview.mjs sortie.wav
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outFile = process.argv[2] || path.join(root, 'tools', 'playtest-out', 'musique.wav');
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); res.end(d); });
}).listen(8770);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage();
await page.goto('http://localhost:8770/tools/render/index.html?s=none');
const b64 = await page.evaluate(async () => {
  const { Music } = await import('/src/game/music.js');
  const STEP = 60 / 132 / 4, steps = 16 * 16 + 4, sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil((steps * STEP + 1.5) * sr), sr);
  const m = new Music({ ctx, master: ctx.destination });
  m.out = ctx.createGain(); m.out.gain.value = 0.9; m.out.connect(ctx.destination);
  m.noiseBuf = ctx.createBuffer(1, Math.floor(sr * 0.3), sr); const d = m.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  m.lead = true;
  for (let i = 0; i < 16 * 16; i++) m.playStep(i, 0.05 + i * STEP);
  m.kick(0.05 + 256 * STEP);
  const buf = await ctx.startRendering();
  // Encodage WAV 16 bits stéréo
  const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1), ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = 0.89 / Math.max(peak, 1e-6);
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * k)) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * k)) * 32767, true); }
  let s = ''; const u8 = new Uint8Array(ab); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
});
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
console.log('écrit', outFile);
await browser.close(); server.close();
