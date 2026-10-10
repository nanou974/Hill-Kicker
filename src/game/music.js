// Musique de fond de Hill Kicker : boucle pop-chiptune originale, synthétisée en direct avec la Web Audio API.
// 132 BPM, couplet (Do – Lam – Fa – Sol) puis refrain (Fa – Sol – Mim – Lam), joués A A B B en boucle.
// Batterie (grosse caisse, caisse claire, charleston), basse rebondissante, accords en contretemps et mélodie.
// La mélodie n'est jouée que pendant la course : à l'accueil, seul l'accompagnement tourne.

const KEY = 'hill-kicker-music-off';
const BPM = 132;
const STEP = 60 / BPM / 4;              // durée d'une double croche
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Accords (notes MIDI) et fondamentale de basse, une mesure chacun
const CHORDS = {
  C: { notes: [60, 64, 67], bass: 36 },
  Am: { notes: [57, 60, 64], bass: 33 },
  F: { notes: [57, 60, 65], bass: 29 },
  G: { notes: [59, 62, 67], bass: 31 },
  Em: { notes: [59, 64, 67], bass: 28 },
};
const VERSE = ['C', 'Am', 'F', 'G'], CHORUS = ['F', 'G', 'Em', 'Am'];
// Mélodie : [pas de départ (sur 16), note MIDI, durée en pas]
const MEL_VERSE = [
  [[0, 76, 2], [2, 79, 2], [4, 84, 2], [6, 79, 2], [8, 81, 2], [10, 79, 2], [12, 76, 4]],
  [[0, 76, 2], [2, 74, 2], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 69, 4]],
  [[0, 77, 2], [2, 81, 2], [4, 84, 2], [6, 81, 2], [8, 79, 2], [10, 77, 2], [12, 76, 2], [14, 74, 2]],
  [[0, 74, 2], [2, 76, 2], [4, 79, 4], [8, 71, 2], [10, 74, 2], [12, 79, 4]],
];
const MEL_CHORUS = [
  [[0, 84, 3], [3, 81, 1], [4, 84, 2], [6, 86, 2], [8, 84, 2], [10, 81, 2], [12, 77, 4]],
  [[0, 83, 3], [3, 79, 1], [4, 83, 2], [6, 86, 2], [8, 83, 2], [10, 79, 2], [12, 74, 4]],
  [[0, 76, 2], [2, 79, 2], [4, 83, 2], [6, 88, 2], [8, 86, 2], [10, 83, 2], [12, 79, 2], [14, 83, 2]],
  [[0, 81, 4], [4, 84, 2], [6, 83, 2], [8, 81, 2], [10, 79, 2], [12, 81, 4]],
];
// Ordre des 16 mesures de la boucle : couplet ×2, refrain ×2
const SONG = [...VERSE.map((c, i) => [c, MEL_VERSE[i]]), ...VERSE.map((c, i) => [c, MEL_VERSE[i]]), ...CHORUS.map((c, i) => [c, MEL_CHORUS[i]]), ...CHORUS.map((c, i) => [c, MEL_CHORUS[i]])];

export class Music {
  constructor(sound) {
    this.sound = sound; this.out = null; this.timer = null; this.step = 0; this.next = 0;
    this.lead = false;      // mélodie active (pendant la course)
    try { this.off = localStorage.getItem(KEY) === '1'; } catch (e) { this.off = false; }
    // Pause quand l'appli passe en arrière-plan
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); else this.start(); });
  }
  setOff(off) {
    this.off = off; try { localStorage.setItem(KEY, off ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
    if (off) this.stop(); else this.start();
  }
  setLead(on) { this.lead = on; }
  start() {
    const ctx = this.sound.ctx;
    if (this.off || !ctx || this.timer || document.hidden) return;
    if (!this.out) {
      // Bus musique : volume modéré et léger filtrage, branché sur le volume général (coupé avec le son)
      this.out = ctx.createGain(); this.out.gain.value = 0.0001;
      this.noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.out.connect(this.sound.master);
    }
    this.out.gain.setTargetAtTime(0.28, ctx.currentTime, 0.4);   // fondu d'entrée
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
    const bar = Math.floor(i / 16), s = i % 16, [chordName, melody] = SONG[bar], ch = CHORDS[chordName];
    const chorus = bar >= 8;
    // Batterie : grosse caisse sur les temps (plus dense au refrain), caisse claire sur 2 et 4, charleston en croches
    if (s % 4 === 0 || (chorus && s === 10)) this.kick(t);
    if (s === 4 || s === 12) this.snare(t);
    if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.07 : 0.035);
    if (chorus && s % 2 === 1) this.hat(t, 0.02);
    if (bar % 4 === 3 && s >= 12) this.snare(t, 0.12);       // roulement de fin de phrase
    // Basse : croches rebondissantes fondamentale / octave
    if (s % 2 === 0) this.bass(mtof(ch.bass + (s % 4 === 2 ? 12 : 0)), t, STEP * 1.8);
    // Accords en contretemps (sur le "et" de chaque temps)
    if (s % 4 === 2) for (const n of ch.notes) this.stab(mtof(n), t, STEP * 1.4);
    // Mélodie
    if (this.lead) for (const [st, n, len] of melody) if (st === s) this.leadNote(mtof(n), t, STEP * len * 0.92);
  }

  // ---------- instruments ----------
  env(g, t, a, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  kick(t) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.004, 0.75, 0.22); o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.25);
  }
  snare(t, vol = 0.32) {
    const ctx = this.sound.ctx, n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    this.env(g, t, 0.002, vol, 0.16); n.connect(f).connect(g).connect(this.out); n.start(t); n.stop(t + 0.18);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    this.env(og, t, 0.002, vol * 0.6, 0.09); o.connect(og).connect(this.out); o.start(t); o.stop(t + 0.1);
  }
  hat(t, vol) {
    const ctx = this.sound.ctx, n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 7500;
    this.env(g, t, 0.001, vol, 0.045); n.connect(f).connect(g).connect(this.out); n.start(t, Math.random() * 0.2); n.stop(t + 0.05);
  }
  bass(freq, t, dur) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(260, t + dur); f.Q.value = 4;
    this.env(g, t, 0.005, 0.28, dur); o.connect(f).connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  }
  stab(freq, t, dur) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
    this.env(g, t, 0.004, 0.045, dur); o.connect(f).connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  }
  leadNote(freq, t, dur) {
    const ctx = this.sound.ctx, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'square'; o.frequency.value = freq; o2.type = 'triangle'; o2.frequency.value = freq * 2; o2.detune.value = 6;
    // vibrato léger sur les notes longues
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 6; lg.gain.value = dur > STEP * 3 ? freq * 0.012 : 0;
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    f.type = 'lowpass'; f.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.085, t + 0.01); g.gain.setValueAtTime(0.07, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); o2.connect(f); f.connect(g).connect(this.out);
    for (const x of [o, o2, lfo]) { x.start(t); x.stop(t + dur + 0.03); }
  }
}
