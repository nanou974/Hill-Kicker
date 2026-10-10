// Sons de Hill Kicker, synthétisés avec la Web Audio API (aucun fichier audio à charger).
// Le contexte audio ne démarre qu'après un premier geste du joueur (règle des navigateurs mobiles).

const KEY = 'hill-kicker-muted';

export class Sound {
  constructor() {
    this.ctx = null; this.master = null; this.engine = null;
    try { this.muted = localStorage.getItem(KEY) === '1'; } catch (e) { this.muted = false; }
    const unlock = () => { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); };
    addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
  }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
  }
  setMuted(m) {
    this.muted = m; try { localStorage.setItem(KEY, m ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  // Bip court avec enveloppe
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.2, freq = 800, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const len = Math.floor(this.ctx.sampleRate * dur), buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f).connect(g).connect(this.master); s.start(t);
  }

  // Pièces : plus aiguë et plus brillante quand elle rapporte plus
  coin(kind) {
    if (kind === 'gold') { this.tone(1320, 0.09, 'square', 0.07); this.tone(1980, 0.18, 'square', 0.07, 0.07); this.tone(2640, 0.22, 'sine', 0.05, 0.14); }
    else if (kind === 'silver') { this.tone(1175, 0.08, 'square', 0.06); this.tone(1568, 0.16, 'square', 0.06, 0.06); }
    else { this.tone(880, 0.07, 'square', 0.05); this.tone(1046, 0.12, 'square', 0.05, 0.05); }
  }
  gem() { [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.09, i * 0.06)); }
  boost() { this.noise(0.5, 0.25, 1400); this.tone(220, 0.5, 'sawtooth', 0.06, 0, 880); }
  takeoff() { this.tone(300, 0.25, 'triangle', 0.08, 0, 700); }
  land() { this.noise(0.18, 0.35, 220); this.tone(90, 0.15, 'sine', 0.2, 0, 50); }
  trick() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.14, 'square', 0.06, i * 0.07)); }
  fail() { this.tone(330, 0.25, 'sawtooth', 0.07, 0, 160); this.noise(0.4, 0.12, 500); }
  launch() { this.noise(0.35, 0.25, 900); this.tone(180, 0.4, 'sawtooth', 0.08, 0, 520); }
  click() { this.tone(660, 0.05, 'square', 0.04); }
  buy() { this.tone(880, 0.07, 'square', 0.05); this.tone(1320, 0.12, 'square', 0.05, 0.06); }
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.25, 'square', 0.06, i * 0.1)); }

  // Moteur : léger ronronnement continu, dont la hauteur suit la vitesse (ou la jauge au lanceur)
  engineStart() {
    if (!this.ctx || this.engine) return;
    const o1 = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = -1200;
    f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 2;
    g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g).connect(this.master);
    o1.start(); o2.start();
    this.engine = { o1, o2, f, g };
  }
  engineSet(level, on = true) {
    if (!this.engine) return;
    const t = this.ctx.currentTime, e = this.engine;
    const freq = 55 + level * 150;                 // level : 0 = ralenti, 1 = plein régime
    e.o1.frequency.setTargetAtTime(freq, t, 0.08); e.o2.frequency.setTargetAtTime(freq, t, 0.08);
    e.f.frequency.setTargetAtTime(300 + level * 900, t, 0.1);
    e.g.gain.setTargetAtTime(on ? 0.035 + level * 0.03 : 0, t, 0.12);
  }
}
