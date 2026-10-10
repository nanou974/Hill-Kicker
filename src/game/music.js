// Musique de fond de Hill Kicker : deux morceaux électro originaux qui alternent, synthétisés en direct avec la Web Audio API.
// 128 BPM. Morceau 1 en La mineur (Lam – Fa – Rém – Mi / Lam – Sol – Fa – Mi), morceau 2 en Ré mineur
// (Rém – Sib – Do – La / Solm – Sib – Do – La), chacun joué A A B B (environ 30 s) puis on passe à l'autre.
// Grosse caisse à chaque temps avec des relances, caisse claire et clap sur 2 et 4 avec des notes fantômes et des roulements,
// vraie basse de synthé analogique (deux dents de scie désaccordées + sous-octave, filtre à enveloppe),
// mélodie entêtante (un motif rythmique répété sur chaque accord) dans le registre médium-grave, jouée par un synthé chaud doublé à l'octave inférieure. Pendant la course, un arpège discret s'ajoute.

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
  Bb: { arp: [53, 58, 62, 65], bass: 22 },
  C:  { arp: [55, 60, 64, 67], bass: 24 },
  A:  { arp: [57, 61, 64, 69], bass: 21 },
  Gm: { arp: [55, 58, 62, 67], bass: 19 },
};
// Un motif rythmique de mélodie répété sur chaque accord : c'est la répétition qui rend l'air entêtant
const motif = (steps, lens) => (notes) => notes.map((n, i) => [steps[i], n, lens[i]]);

// ---------- Morceau 1 : La mineur ----------
// Motif « ta… ta… ta-ta, ta-ta-ta, taaa » (3 + 3 + 2, trois notes rapides, une note tenue)
const hook1 = motif([0, 3, 6, 8, 10, 11, 12], [3, 3, 2, 2, 1, 1, 4]);
const SONG1 = {
  name: 'La mineur',
  bars: ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'Dm', 'E', 'Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'],
  melody: (() => {
    const A = [
      hook1([76, 76, 74, 72, 74, 72, 69]),   // Lam : Mi Mi Ré Do Ré Do La
      hook1([76, 76, 74, 72, 74, 72, 65]),   // Fa  : … Fa
      hook1([77, 77, 76, 74, 76, 74, 69]),   // Rém : Fa Fa Mi Ré Mi Ré La
      hook1([76, 76, 74, 71, 72, 71, 68]),   // Mi  : Mi Mi Ré Si Do Si Sol#
    ], B = [
      hook1([72, 72, 71, 69, 71, 69, 64]),   // Lam : même motif, une tierce plus bas
      hook1([74, 74, 72, 71, 72, 71, 67]),   // Sol
      hook1([72, 72, 71, 69, 71, 69, 65]),   // Fa
      hook1([71, 71, 74, 72, 71, 68, 64]),   // Mi  : la fin remonte puis retombe pour relancer la boucle
    ];
    return [...A, ...A, ...B, ...B];
  })(),
  // Ligne de basse sur 16 pas : [pas, intervalle (0 = fondamentale, 12 = octave, 7 = quinte), durée en pas]
  bass: [[0, 0, 3], [3, 0, 1], [4, 0, 2], [6, 12, 2], [8, 0, 3], [11, 0, 1], [12, 7, 2], [14, 12, 2]],
  kickA: new Set([0, 4, 8, 12, 14]), kickB: new Set([0, 4, 7, 8, 10, 12, 14]),
};

// ---------- Morceau 2 : Ré mineur ----------
// Motif « ta-ta-ta, taaa… ta… ta, ta » : trois notes qui montent vers une note tenue, puis une réponse qui redescend
const hook2 = motif([0, 1, 2, 4, 8, 11, 14], [1, 1, 2, 4, 3, 3, 2]);
const SONG2 = {
  name: 'Ré mineur',
  bars: ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A', 'Gm', 'Bb', 'C', 'A', 'Gm', 'Bb', 'C', 'A'],
  melody: (() => {
    const A = [
      hook2([69, 69, 72, 74, 77, 76, 74]),   // Rém : La La Do Ré… Fa Mi Ré
      hook2([70, 70, 74, 77, 74, 72, 70]),   // Sib : Sib Sib Ré Fa… Ré Do Sib
      hook2([67, 67, 72, 76, 74, 72, 67]),   // Do  : Sol Sol Do Mi… Ré Do Sol
      hook2([69, 69, 73, 76, 73, 71, 69]),   // La  : La La Do# Mi… Do# Si La
    ], B = [
      hook2([67, 67, 70, 74, 72, 70, 67]),   // Solm : Sol Sol Sib Ré… Do Sib Sol
      hook2([65, 65, 70, 74, 72, 70, 74]),   // Sib  : Fa Fa Sib Ré… Do Sib Ré
      hook2([67, 67, 72, 76, 79, 76, 72]),   // Do   : monte jusqu'au Sol aigu
      hook2([69, 69, 73, 76, 73, 69, 64]),   // La   : redescend pour relancer
    ];
    return [...A, ...A, ...B, ...B];
  })(),
  // Basse plus continue, avec une septième qui tire vers l'accord suivant
  bass: [[0, 0, 2], [2, 0, 2], [4, 12, 2], [6, 0, 1], [7, 0, 1], [8, 0, 2], [10, 7, 2], [12, 12, 2], [14, 10, 2]],
  kickA: new Set([0, 4, 6, 8, 12]), kickB: new Set([0, 3, 4, 8, 11, 12, 14]),
};
// Les morceaux s'enchaînent à chaque fin de boucle (environ 30 s chacun)
const SONGS = [SONG1, SONG2];

export class Music {
  constructor(sound) {
    this.sound = sound; this.out = null; this.timer = null; this.step = 0; this.next = 0; this.song = 0;
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
    this.shaper.curve = c;
    const sh = ctx.createGain(); sh.gain.value = 0.3; this.shaper.connect(sh).connect(this.bassBus); // la saturation sort à pleine échelle : on la ramène
    this.noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  start() {
    const ctx = this.sound.ctx;
    if (this.off || !ctx || this.timer || document.hidden) return;
    if (!this.out) this.build(ctx, this.sound.master);
    this.out.gain.setTargetAtTime(0.22, ctx.currentTime, 0.4);   // fondu d'entrée
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
    while (this.next < ctx.currentTime + 0.12) { this.playStep(this.step, this.next); this.advance(); this.next += STEP; }
  }
  // Pas suivant ; en fin de boucle, on passe au morceau suivant
  advance() {
    this.step++;
    if (this.step >= SONGS[this.song].bars.length * 16) { this.step = 0; this.song = (this.song + 1) % SONGS.length; }
  }
  playStep(i, t) {
    const song = SONGS[this.song], bar = Math.floor(i / 16), s = i % 16, ch = CHORDS[song.bars[bar]];
    const partB = bar >= 8, lastBar = bar % 4 === 3;
    // Grosse caisse : 4 temps + relances ; la dernière mesure de chaque phrase laisse place au roulement
    const kicks = partB ? song.kickB : song.kickA;
    if (kicks.has(s) && !(lastBar && s >= 12)) this.kick(t, s % 4 === 0 ? 1 : 0.75);
    // Caisse claire + clap sur 2 et 4, notes fantômes, roulement en doubles croches en fin de phrase
    if (s === 4 || s === 12) { this.snare(t, 0.5); this.clap(t); }
    else if (s === 7 || s === 15 || (partB && s === 10)) this.snare(t, 0.12);
    if (lastBar && s >= 12) this.snare(t, 0.18 + (s - 12) * 0.08);
    if (lastBar && bar === song.bars.length - 1 && s === 15) this.crashFx(t + STEP);
    // Charleston en doubles croches, ouvert sur les contretemps
    if (s % 4 === 2) this.hat(t, 0.06, 0.14); else this.hat(t, s % 2 ? 0.018 : 0.03, 0.035);
    // Basse : croches syncopées, fondamentale / octave / quinte, notes tenues
    for (const [st, iv, len] of song.bass) if (st === s) this.bass(mtof(ch.bass + 12 + iv), t, STEP * len * 0.95, s % 4 === 0);
    // Mélodie (toujours) et arpège discret pendant la course
    for (const [st, n, len] of song.melody[bar]) if (st === s) this.melody(mtof(n), t, STEP * len * 0.95);
    if (this.lead && s % 2 === 1) this.arp(mtof(ch.arp[((s - 1) / 2) % 4] + 12), t, STEP * 1.4, (bar % 4) / 3);
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
  // Basse de synthé analogique : deux dents de scie désaccordées + carré à l'octave inférieure,
  // filtre passe-bas résonant avec enveloppe (attaque "pincée" comme une basse jouée au médiator), légère saturation.
  bass(freq, t, dur, accent) {
    const ctx = this.sound.ctx, f = ctx.createBiquadFilter(), g = ctx.createGain();
    const oscs = [['sawtooth', freq, -9], ['sawtooth', freq, 9], ['square', freq / 2, 0]].map(([type, fr, det]) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = det; o.connect(f); return o; });
    f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(accent ? 2400 : 1800, t); f.frequency.exponentialRampToValueAtTime(380, t + Math.min(dur, 0.22));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(accent ? 0.42 : 0.36, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.26, t + 0.08); g.gain.setValueAtTime(0.26, t + Math.max(0.09, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    f.connect(g).connect(this.shaper);
    for (const o of oscs) { o.start(t); o.stop(t + dur + 0.05); }
    // sub grave propre, sous la saturation
    const sub = ctx.createOscillator(), sg = ctx.createGain(); sub.type = 'sine'; sub.frequency.value = freq / 2;
    sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.4, t + 0.008); sg.gain.setValueAtTime(0.36, t + Math.max(0.02, dur - 0.04)); sg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    sub.connect(sg).connect(this.bassBus); sub.start(t); sub.stop(t + dur + 0.05);
  }
  // Mélodie : synthé chaud et sombre (dent de scie + carré désaccordés, filtre doux), petite glissade vers la note
  melody(freq, t, dur) {
    const ctx = this.sound.ctx, f = ctx.createBiquadFilter(), g = ctx.createGain();
    const oscs = [['sawtooth', 0], ['square', -7], ['sawtooth', -1200]].map(([type, det]) => { const o = ctx.createOscillator(); o.type = type; o.detune.value = det; o.frequency.setValueAtTime(freq * 0.97, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.04); o.connect(f); return o; });
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.value = dur > STEP * 3 ? freq * 0.008 : 0;
    lfo.connect(lg); for (const o of oscs) lg.connect(o.frequency);
    f.type = 'lowpass'; f.Q.value = 2.5; f.frequency.setValueAtTime(3400, t); f.frequency.exponentialRampToValueAtTime(1100, t + Math.min(dur, 0.25)); // attaque bien marquée
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11, t + 0.008); g.gain.exponentialRampToValueAtTime(0.08, t + 0.1); g.gain.setValueAtTime(0.08, t + Math.max(0.11, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    f.connect(g).connect(this.out);
    for (const o of [...oscs, lfo]) { o.start(t); o.stop(t + dur + 0.08); }
  }
  // Arpège : son pincé sombre, filtre qui s'ouvre progressivement (open = 0..1)
  arp(freq, t, dur, open) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'lowpass'; f.Q.value = 5; f.frequency.setValueAtTime(700 + open * 1600, t); f.frequency.exponentialRampToValueAtTime(300, t + dur);
    this.env(g, t, 0.003, 0.035, dur); o.connect(f).connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  }
}
