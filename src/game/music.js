// Musique de fond de Hill Kicker : boucle électro énergique originale, synthétisée en direct avec la Web Audio API.
// 128 BPM, tonalité de La mineur. Partie A (Lam – Fa – Rém – Mi) puis partie B (Lam – Sol – Fa – Mi), jouées A A B B.
// Grosse caisse à chaque temps avec des relances, caisse claire et clap sur 2 et 4 avec des notes fantômes et des roulements,
// basse lourde (sub + basse saturée) en doubles croches, compressée au rythme de la grosse caisse.
// Pendant la course, un arpège sombre s'ajoute par-dessus.

const KEY = 'hill-kicker-music-off';
const BPM = 128;
const STEP = 60 / BPM / 4;              // durée d'une double croche
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Accords (notes MIDI de l'arpège) et fondamentale de basse, une mesure chacun
const CHORDS = {
  Am: { arp: [57, 60, 64, 69], bass: 33 },
  F:  { arp: [53, 57, 60, 65], bass: 29 },
  Dm: { arp: [50, 53, 57, 62], bass: 26 },
  E:  { arp: [52, 56, 59, 64], bass: 28 },
  G:  { arp: [55, 59, 62, 67], bass: 31 },
};
const PART_A = ['Am', 'F', 'Dm', 'E'], PART_B = ['Am', 'G', 'F', 'E'];
const SONG = [...PART_A, ...PART_A, ...PART_B, ...PART_B];

// Rythme de basse sur 16 pas : 0 = silence, 1 = fondamentale, 2 = octave, 3 = quinte
const BASS = [1, 0, 1, 2, 1, 0, 1, 3, 1, 0, 1, 2, 1, 1, 2, 3];
// Relances de grosse caisse en plus des 4 temps (partie B plus chargée)
const KICK_A = new Set([0, 4, 8, 12, 14]);
const KICK_B = new Set([0, 4, 7, 8, 10, 12, 14]);

export class Music {
  constructor(sound) {
    this.sound = sound; this.out = null; this.timer = null; this.step = 0; this.next = 0;
    this.lead = false;      // arpège actif (pendant la course)
    try { this.off = localStorage.getItem(KEY) === '1'; } catch (e) { this.off = false; }
    // Pause quand l'appli passe en arrière-plan
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); else this.start(); });
  }
  setOff(off) {
    this.off = off; try { localStorage.setItem(KEY, off ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
    if (off) this.stop(); else this.start();
  }
  setLead(on) { this.lead = on; }
  // Crée les bus de mixage (une seule fois)
  build(ctx, dest) {
    this.out = ctx.createGain(); this.out.gain.value = 0.0001;
    // Compresseur général : colle le mix et donne du punch
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.12;
    this.out.connect(comp).connect(dest);
    // Bus basse : son gain baisse à chaque coup de grosse caisse (effet "pompe")
    this.bassBus = ctx.createGain(); this.bassBus.gain.value = 1; this.bassBus.connect(this.out);
    // Saturation douce pour la basse médium
    this.shaper = ctx.createWaveShaper();
    const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 3.2) / Math.tanh(3.2); }
    this.shaper.curve = c; this.shaper.connect(this.bassBus);
    this.noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  start() {
    const ctx = this.sound.ctx;
    if (this.off || !ctx || this.timer || document.hidden) return;
    if (!this.out) this.build(ctx, this.sound.master);
    this.out.gain.setTargetAtTime(0.3, ctx.currentTime, 0.4);   // fondu d'entrée
    this.next = ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.out && this.sound.ctx) this.out.gain.setTargetAtTime(0.0001, this.sound.ctx.currentTime, 0.1);
  }
  // Programme les notes des 120 prochaines millisecondes
  schedule() {
    const ctx = this.sound.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.next < ctx.currentTime - 0.2) this.next = ctx.currentTime + 0.05; // rattrapage après une pause
    while (this.next < ctx.currentTime + 0.12) { this.playStep(this.step, this.next); this.step = (this.step + 1) % (SONG.length * 16); this.next += STEP; }
  }
  playStep(i, t) {
    const bar = Math.floor(i / 16), s = i % 16, ch = CHORDS[SONG[bar]];
    const partB = bar >= 8, lastBar = bar % 4 === 3;
    // Grosse caisse : 4 temps + relances ; la dernière mesure de chaque phrase laisse place au roulement
    const kicks = partB ? KICK_B : KICK_A;
    if (kicks.has(s) && !(lastBar && s >= 12)) this.kick(t, s % 4 === 0 ? 1 : 0.75);
    // Caisse claire + clap sur 2 et 4, notes fantômes, roulement en doubles croches en fin de phrase
    if (s === 4 || s === 12) { this.snare(t, 0.5); this.clap(t); }
    else if (s === 7 || s === 15 || (partB && s === 10)) this.snare(t, 0.12);
    if (lastBar && s >= 12) this.snare(t, 0.18 + (s - 12) * 0.08);
    if (lastBar && bar === SONG.length - 1 && s === 15) this.crashFx(t + STEP);
    // Charleston en doubles croches, ouvert sur les contretemps
    if (s % 4 === 2) this.hat(t, 0.06, 0.14); else this.hat(t, s % 2 ? 0.018 : 0.03, 0.035);
    // Basse en doubles croches
    const b = BASS[s];
    if (b) this.bass(mtof(ch.bass + (b === 2 ? 12 : b === 3 ? 7 : 0)), t, STEP * (BASS[(s + 1) % 16] ? 0.9 : 1.8), b === 1 && s % 4 === 0);
    // Arpège sombre pendant la course : doubles croches montantes, filtre qui s'ouvre au fil de la phrase
    if (this.lead && s % 2 === 0) this.arp(mtof(ch.arp[(s / 2) % 4] + 12), t, STEP * 1.6, (bar % 4) / 3);
  }

  // ---------- instruments ----------
  env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  // Grosse caisse : corps grave qui descend + attaque claquante, et "pompe" sur la basse
  kick(t, vol) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.09); o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
    this.env(g, t, 0.003, 1.1 * vol, 0.34); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.36);
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 2500;
    this.env(ng, t, 0.001, 0.25 * vol, 0.012); n.connect(f).connect(ng).connect(this.out); n.start(t); n.stop(t + 0.02);
    const bg = this.bassBus.gain; bg.cancelScheduledValues(t); bg.setValueAtTime(0.25, t); bg.linearRampToValueAtTime(1, t + 0.16);
  }
  snare(t, vol) {
    const ctx = this.sound.ctx, n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.7;
    this.env(g, t, 0.002, vol, 0.2); n.connect(f).connect(g).connect(this.out); n.start(t, Math.random() * 0.2); n.stop(t + 0.22);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.07);
    this.env(og, t, 0.002, vol * 0.9, 0.1); o.connect(og).connect(this.out); o.start(t); o.stop(t + 0.12);
  }
  // Clap : trois petites rafales de bruit rapprochées
  clap(t) {
    const ctx = this.sound.ctx;
    for (const [dt, v, len] of [[0, 0.25, 0.02], [0.011, 0.22, 0.02], [0.022, 0.3, 0.14]]) {
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      n.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 1.2;
      this.env(g, t + dt, 0.001, v, len); n.connect(f).connect(g).connect(this.out); n.start(t + dt, Math.random() * 0.3); n.stop(t + dt + len + 0.02);
    }
  }
  hat(t, vol, dur) {
    const ctx = this.sound.ctx, n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 8000;
    this.env(g, t, 0.001, vol, dur); n.connect(f).connect(g).connect(this.out); n.start(t, Math.random() * 0.4); n.stop(t + dur + 0.01);
  }
  crashFx(t) {
    const ctx = this.sound.ctx, n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noiseBuf; n.loop = true; f.type = 'highpass'; f.frequency.value = 5000;
    this.env(g, t, 0.003, 0.12, 1.2); n.connect(f).connect(g).connect(this.out); n.start(t); n.stop(t + 1.25);
  }
  // Basse : sub sinus propre + dent de scie saturée et filtrée ; les notes sur les temps sont un peu plus longues
  bass(freq, t, dur, accent) {
    const ctx = this.sound.ctx;
    const sub = ctx.createOscillator(), sg = ctx.createGain();
    sub.type = 'sine'; sub.frequency.value = freq < 50 ? freq * 2 : freq;
    this.env(sg, t, 0.004, accent ? 0.55 : 0.45, dur); sub.connect(sg).connect(this.bassBus); sub.start(t); sub.stop(t + dur + 0.02);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq * 2; o2.type = 'square'; o2.frequency.value = freq * 2; o2.detune.value = -8;
    f.type = 'lowpass'; f.Q.value = 6; f.frequency.setValueAtTime(accent ? 1400 : 1000, t); f.frequency.exponentialRampToValueAtTime(220, t + dur);
    this.env(g, t, 0.004, 0.32, dur); o.connect(f); o2.connect(f); f.connect(g).connect(this.shaper);
    for (const x of [o, o2]) { x.start(t); x.stop(t + dur + 0.02); }
  }
  // Arpège : son pincé sombre, filtre qui s'ouvre progressivement (open = 0..1)
  arp(freq, t, dur, open) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'lowpass'; f.Q.value = 5; f.frequency.setValueAtTime(700 + open * 1600, t); f.frequency.exponentialRampToValueAtTime(300, t + dur);
    this.env(g, t, 0.003, 0.06, dur); o.connect(f).connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  }
}
