// Joystick flottant : le cercle apparaît là où le pouce se pose, le point suit le pouce.
export class Joystick {
  constructor(el, base, knob) {
    this.el = el; this.base = base; this.knob = knob;
    this.active = false; this.id = null; this.ox = 0; this.oy = 0;
    this.steer = 0; this.up = 0; this.enabled = false;
    this.R = 56;
    el.addEventListener('pointerdown', e => this.down(e));
    addEventListener('pointermove', e => this.move(e));
    addEventListener('pointerup', e => this.end(e));
    addEventListener('pointercancel', e => this.end(e));
    // Clavier pour tester sur ordinateur : flèches gauche / droite / haut
    this.keys = new Set();
    addEventListener('keydown', e => { this.keys.add(e.key); this.fromKeys(); });
    addEventListener('keyup', e => { this.keys.delete(e.key); this.fromKeys(); });
  }
  fromKeys() {
    if (this.active) return;
    this.steer = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
    this.up = this.keys.has('ArrowUp') ? 1 : 0;
  }
  down(e) {
    if (!this.enabled || this.active) return;
    if (e.target.closest('button, a')) return;
    this.active = true; this.id = e.pointerId; this.ox = e.clientX; this.oy = e.clientY;
    this.base.style.left = (e.clientX - 60) + 'px'; this.base.style.top = (e.clientY - 60) + 'px';
    this.base.hidden = false; this.knob.hidden = false; this.place(0, 0);
  }
  move(e) {
    if (!this.active || e.pointerId !== this.id) return;
    let dx = e.clientX - this.ox, dy = e.clientY - this.oy;
    // Direction : seul l'écart horizontal compte (un pouce qui dérive vers le haut ne réduit plus le braquage),
    // et le braquage est déjà à fond aux trois quarts du cercle
    this.steer = Math.max(-1, Math.min(1, dx / (this.R * 0.75)));
    this.up = Math.max(0, Math.min(1, -dy / this.R));
    const d = Math.hypot(dx, dy); if (d > this.R) { dx *= this.R / d; dy *= this.R / d; }
    this.place(dx, dy);
  }
  end(e) {
    if (!this.active || e.pointerId !== this.id) return;
    this.active = false; this.steer = 0; this.up = 0; this.base.hidden = true; this.knob.hidden = true;
  }
  place(dx, dy) { this.knob.style.left = (this.ox + dx - 23) + 'px'; this.knob.style.top = (this.oy + dy - 23) + 'px'; }
  reset() { this.active = false; this.steer = 0; this.up = 0; this.base.hidden = true; this.knob.hidden = true; }
}
