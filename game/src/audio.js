// Procedural sound, synthesised with the Web Audio API: no files, no network.
// Audio is created on the first key press, as browsers require, and every effect
// is a short envelope on an oscillator.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
    return this.muted;
  }

  tone({ freq = 440, endFreq = freq, type = 'sine', dur = 0.2, gain = 0.5, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(env);
    env.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  noise({ dur = 0.3, gain = 0.4, filter = 900 } = {}) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      const fade = 1 - i / frames;
      data[i] = (Math.random() * 2 - 1) * fade * fade;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(filter, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + dur);
    const env = this.ctx.createGain();
    env.gain.value = gain;
    src.connect(lp);
    lp.connect(env);
    env.connect(this.master);
    src.start(now);
  }

  ember() {
    this.tone({ freq: 640, endFreq: 980, type: 'triangle', dur: 0.18, gain: 0.35 });
    this.tone({ freq: 960, endFreq: 1440, type: 'sine', dur: 0.22, gain: 0.16, delay: 0.03 });
  }

  sting() {
    this.noise({ dur: 0.36, gain: 0.55, filter: 1200 });
    this.tone({ freq: 180, endFreq: 60, type: 'sawtooth', dur: 0.38, gain: 0.3 });
  }

  vent() {
    this.noise({ dur: 0.45, gain: 0.4, filter: 2400 });
    this.tone({ freq: 320, endFreq: 90, type: 'sine', dur: 0.5, gain: 0.25 });
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => this.tone({ freq, dur: 0.42, type: 'triangle', gain: 0.28, delay: i * 0.12 }));
  }

  lose() {
    const notes = [392, 329.63, 261.63, 196];
    notes.forEach((freq, i) => this.tone({ freq, endFreq: freq * 0.94, dur: 0.5, type: 'sawtooth', gain: 0.2, delay: i * 0.15 }));
  }

  start() {
    this.tone({ freq: 392, endFreq: 784, type: 'triangle', dur: 0.5, gain: 0.3 });
  }
}
