// ════════ RANDOM GUNNY — Procedural Audio Engine (Web Audio API) ════════
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
    this.muted = false;
    this._noise = null;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.2;
      this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
      return true;
    } catch { return false; }
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = this.muted ? 0 : v; }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : this.volume; }

  _now() { return this.ctx.currentTime; }
  _env(gainNode, peak, attack, decay) {
    const g = gainNode.gain, t = this._now();
    g.cancelScheduledValues(t); g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  _osc(type, freq, t0, dur) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0); o.start(t0); o.stop(t0 + dur + 0.05); return o;
  }
  _noiseSrc(t0, dur, playbackRate = 1) {
    const s = this.ctx.createBufferSource(); s.buffer = this._noise; s.playbackRate.value = playbackRate; s.start(t0); s.stop(t0 + dur + 0.05); return s;
  }
  _chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); nodes[nodes.length - 1].connect(this.master); }
  _filter(type, freq, q = 1) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; }

  // ───── WEAPON SHOTS ─────
  shoot(kind) {
    if (!this.ensure()) return;
    const t = this._now();
    switch (kind) {
      case 'pistol': {
        const g = this.ctx.createGain(); const f = this._filter('bandpass', 1400, 0.8);
        this._chain(this._noiseSrc(t, .18), f, g); this._env(g, .9, .005, .16);
        const g2 = this.ctx.createGain(); this._chain(this._osc('square', 220, t, .12), g2); this._env(g2, .5, .004, .1);
        break;
      }
      case 'deagle': {
        const g = this.ctx.createGain(); const f = this._filter('lowpass', 900, 1);
        this._chain(this._noiseSrc(t, .3), f, g); this._env(g, 1.4, .004, .28);
        const g2 = this.ctx.createGain(); this._chain(this._osc('sawtooth', 90, t, .22), g2); this._env(g2, .9, .004, .2);
        break;
      }
      case 'revolver': {
        const g = this.ctx.createGain(); const f = this._filter('lowpass', 700, 1.4);
        this._chain(this._noiseSrc(t, .4), f, g); this._env(g, 1.6, .003, .38);
        const g2 = this.ctx.createGain(); this._chain(this._osc('sawtooth', 65, t, .3), g2); this._env(g2, 1.1, .003, .3);
        break;
      }
      case 'smg': {
        const g = this.ctx.createGain(); const f = this._filter('bandpass', 1800, 1);
        this._chain(this._noiseSrc(t, .13, 1.3), f, g); this._env(g, .75, .003, .12);
        const g2 = this.ctx.createGain(); this._chain(this._osc('square', 320, t, .08), g2); this._env(g2, .4, .003, .07);
        break;
      }
      case 'rifle': {
        const g = this.ctx.createGain(); const f = this._filter('bandpass', 1100, 0.7);
        this._chain(this._noiseSrc(t, .26), f, g); this._env(g, 1.15, .004, .24);
        const g2 = this.ctx.createGain(); this._chain(this._osc('sawtooth', 140, t, .18), g2); this._env(g2, .7, .004, .16);
        break;
      }
      case 'shotgun': {
        const g = this.ctx.createGain(); const f = this._filter('lowpass', 550, 1);
        this._chain(this._noiseSrc(t, .45), f, g); this._env(g, 1.7, .004, .42);
        const g2 = this.ctx.createGain(); this._chain(this._osc('sawtooth', 55, t, .35), g2); this._env(g2, 1.2, .004, .33);
        break;
      }
      case 'sniper': {
        const g = this.ctx.createGain(); const f = this._filter('lowpass', 1600, .6);
        this._chain(this._noiseSrc(t, .8), f, g); this._env(g, 1.8, .003, .75);
        const g2 = this.ctx.createGain(); this._chain(this._osc('sawtooth', 48, t, .6), g2); this._env(g2, 1.4, .003, .58);
        break;
      }
      case 'lmg': {
        const g = this.ctx.createGain(); const f = this._filter('bandpass', 950, .9);
        this._chain(this._noiseSrc(t, .22), f, g); this._env(g, 1.0, .004, .2);
        const g2 = this.ctx.createGain(); this._chain(this._osc('square', 120, t, .15), g2); this._env(g2, .6, .004, .13);
        break;
      }
      case 'plasma': {
        const g = this.ctx.createGain();
        const o = this._osc('sawtooth', 1400, t, .3); o.frequency.exponentialRampToValueAtTime(180, t + .28);
        const o2 = this._osc('square', 700, t, .2); o2.frequency.exponentialRampToValueAtTime(90, t + .2);
        this._chain(o, this._filter('highpass', 200), g); this._env(g, .8, .005, .3);
        const g2 = this.ctx.createGain(); this._chain(o2, g2); this._env(g2, .4, .005, .2);
        break;
      }
      case 'rail': {
        const g = this.ctx.createGain();
        const o = this._osc('sawtooth', 60, t, .7); o.frequency.exponentialRampToValueAtTime(1200, t + .08); o.frequency.exponentialRampToValueAtTime(40, t + .6);
        this._chain(o, this._filter('bandpass', 800, 2), g); this._env(g, 1.5, .01, .65);
        const g2 = this.ctx.createGain(); this._chain(this._noiseSrc(t + .05, .4, .5), this._filter('highpass', 900), g2); this._env(g2, .8, .01, .4);
        break;
      }
      default: { const g = this.ctx.createGain(); this._chain(this._noiseSrc(t, .2), this._filter('bandpass', 1200), g); this._env(g, .8, .004, .18); }
    }
  }
  dryFire() {
    if (!this.ensure()) return; const t = this._now();
    const g = this.ctx.createGain(); const o = this._osc('square', 2200, t, .05); this._chain(o, g); this._env(g, .25, .002, .05);
  }
  reloadStart() { this._click(500); }
  reloadEnd() { this._click(900); setTimeout(() => this._click(1300), 90); }
  _click(freq) {
    if (!this.ensure()) return; const t = this._now();
    const g = this.ctx.createGain(); this._chain(this._osc('square', freq, t, .06), g); this._env(g, .4, .002, .06);
  }

  // ───── MELEE ─────
  meleeSwing(heavy = false) {
    if (!this.ensure()) return; const t = this._now();
    const g = this.ctx.createGain(); const f = this._filter('bandpass', heavy ? 500 : 900, 2.5);
    const o = this._osc('sawtooth', heavy ? 180 : 260, t, heavy ? .3 : .18);
    o.frequency.exponentialRampToValueAtTime(heavy ? 60 : 120, t + (heavy ? .28 : .16));
    this._chain(o, f, g); this._env(g, heavy ? .7 : .4, .02, heavy ? .3 : .17);
  }
  meleeHit(heavy = false) {
    if (!this.ensure()) return; const t = this._now();
    const g = this.ctx.createGain(); this._chain(this._noiseSrc(t, .2, .7), this._filter('lowpass', heavy ? 500 : 900), g); this._env(g, 1.1, .003, .2);
    const g2 = this.ctx.createGain(); this._chain(this._osc('sine', heavy ? 70 : 110, t, .25), g2); this._env(g2, .9, .003, .25);
  }
  meleeMiss() { /* whoosh covered by swing */ }

  // ───── FEEDBACK ─────
  hitmarker(crit = false) {
    if (!this.ensure()) return; const t = this._now();
    const g = this.ctx.createGain(); const o = this._osc('triangle', crit ? 2600 : 1900, t, .09); this._chain(o, g); this._env(g, .5, .002, crit ? .14 : .09);
    if (crit) { const g2 = this.ctx.createGain(); const o2 = this._osc('triangle', 3400, t + .06, .1); this._chain(o2, g2); this._env(g2, .4, .002, .1); }
  }
  killChime() {
    if (!this.ensure()) return; const t = this._now();
    [880, 1320, 1760].forEach((f, i) => { const g = this.ctx.createGain(); const o = this._osc('triangle', f, t + i * .07, .25); this._chain(o, g); this._env(g, .5, .005, .25); });
  }
  randomize() {
    if (!this.ensure()) return; const t = this._now();
    const g = this.ctx.createGain(); const o = this._osc('square', 300, t, .35); o.frequency.exponentialRampToValueAtTime(1800, t + .3);
    this._chain(o, this._filter('bandpass', 900, 3), g); this._env(g, .6, .01, .34);
    const g2 = this.ctx.createGain(); this._chain(this._noiseSrc(t + .18, .2, 2), g2); this._env(g2, .35, .005, .2);
  }
  hurt() {
    if (!this.ensure()) return; const t = this._now();
    const g = this.ctx.createGain(); this._chain(this._noiseSrc(t, .18, .6), this._filter('lowpass', 800), g); this._env(g, .8, .004, .17);
  }
  footstep() {
    if (!this.ensure()) return; const t = this._now();
    const g = this.ctx.createGain(); this._chain(this._noiseSrc(t, .06, .8 + Math.random() * .4), this._filter('lowpass', 600), g); this._env(g, .18, .002, .06);
  }
  jump() { if (!this.ensure()) return; const t = this._now(); const g = this.ctx.createGain(); const o = this._osc('sine', 300, t, .12); o.frequency.exponentialRampToValueAtTime(520, t + .1); this._chain(o, g); this._env(g, .3, .005, .12); }
  uiClick() { if (!this.ensure()) return; const t = this._now(); const g = this.ctx.createGain(); const o = this._osc('square', 1500, t, .04); this._chain(o, g); this._env(g, .22, .002, .04); }
  uiHover() { if (!this.ensure()) return; const t = this._now(); const g = this.ctx.createGain(); const o = this._osc('sine', 2400, t, .03); this._chain(o, g); this._env(g, .1, .002, .03); }
  waveHorn() {
    if (!this.ensure()) return; const t = this._now();
    [98, 147].forEach(f => { const g = this.ctx.createGain(); const o = this._osc('sawtooth', f, t, .9); this._chain(o, this._filter('lowpass', 900, 2), g); this._env(g, .6, .03, .85); });
  }
  roundWin() { if (!this.ensure()) return; const t = this._now(); [523, 659, 784, 1046].forEach((f, i) => { const g = this.ctx.createGain(); const o = this._osc('triangle', f, t + i * .12, .4); this._chain(o, g); this._env(g, .5, .01, .4); }); }
  roundLose() { if (!this.ensure()) return; const t = this._now(); [392, 330, 262].forEach((f, i) => { const g = this.ctx.createGain(); const o = this._osc('sawtooth', f, t + i * .18, .5); this._chain(o, this._filter('lowpass', 1200), g); this._env(g, .4, .01, .45); }); }
  impact() { if (!this.ensure()) return; const t = this._now(); const g = this.ctx.createGain(); this._chain(this._noiseSrc(t, .08, 1.6), this._filter('highpass', 1500), g); this._env(g, .3, .002, .08); }
}
export const audio = new AudioEngine();
