// Exporte la musique de fond (les deux morceaux enchaînés) en fichier audio (rendu hors-ligne dans Chromium headless).
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
page.on('console', m => console.log(m.text()));
const b64 = await page.evaluate(async () => {
  const { Music } = await import('/src/game/music.js');
  // Même pré-calcul que dans le jeu : morceau 1 puis morceau 2, piste principale + arpège (comme en course)
  const m = new Music({ ctx: null, master: null, volumes: { music: 1 } }, true);
  const parts = [];
  for (let i = 0; i < 2; i++) { const a = await m.renderPart(i, 'main'), b = await m.renderPart(i, 'arp'); parts.push({ a: a.buf, b: b.buf, loop: a.loop }); }
  const sr = parts[0].a.sampleRate, total = parts.reduce((t, p) => t + p.loop, 0) + 1.5;
  const n0 = Math.ceil(total * sr), mixL = new Float32Array(n0);
  let off = 0;
  for (const p of parts) { const A = p.a.getChannelData(0), B = p.b.getChannelData(0), o = Math.round(off * sr); for (let i = 0; i < A.length && o + i < n0; i++) mixL[o + i] += A[i] + B[i]; off += p.loop; }
  const buf = { length: n0, getChannelData: () => mixL }; 
  // Encodage WAV 16 bits stéréo
  const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(0), ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  let rms = 0; for (let i = 0; i < n; i++) rms += L[i] * L[i]; rms = Math.sqrt(rms / n);
  console.log('niveau brut : crête', peak.toFixed(2), 'RMS', rms.toFixed(3));
  const k = 0.89 / Math.max(peak, 1e-6);
  for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * k)) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * k)) * 32767, true); }
  let s = ''; const u8 = new Uint8Array(ab); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
});
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, Buffer.from(b64, 'base64'));
console.log('écrit', outFile);
await browser.close(); server.close();
