const NAMES = [
  'wind', 'fire', 'step_wood', 'step_gravel', 'door', 'switch',
  'pop', 'buzz', 'text', 'creak', 'pickup', 'thump', 'breath', 'drag',
] as const;

export type SoundName = (typeof NAMES)[number];

export interface LoopHandle {
  gain: GainNode;
  stop(): void;
}

// Loads real files from public/audio/<name>.(ogg|mp3|wav) when present;
// otherwise synthesizes a rough placeholder so the game is never silent.
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private noise: AudioBuffer | null = null;

  async init(): Promise<void> {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    await ctx.resume();
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = w * 0.5 + last * 0.5;
    }
    this.noise = buf;

    await Promise.all(NAMES.map((n) => this.tryLoad(n)));
  }

  private async tryLoad(name: string): Promise<void> {
    const ctx = this.ctx!;
    for (const ext of ['ogg', 'mp3', 'wav']) {
      try {
        const r = await fetch(`audio/${name}.${ext}`);
        if (!r.ok) continue;
        const type = r.headers.get('content-type') ?? '';
        if (type.includes('text/html')) continue;
        const ab = await r.arrayBuffer();
        const buf = await ctx.decodeAudioData(ab);
        this.buffers.set(name, buf);
        return;
      } catch {
        // fall through to next extension / synth fallback
      }
    }
  }

  play(name: SoundName, opts: { vol?: number; rate?: number; pan?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const vol = opts.vol ?? 1;
    const pan = opts.pan ?? 0;
    const buf = this.buffers.get(name);
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      src.connect(this.out(vol, pan));
      src.start();
      return;
    }
    this.synth(name, vol, pan);
  }

  loop(name: 'wind' | 'fire', vol: number): LoopHandle | null {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return null;
    const g = this.out(vol);
    const buf = this.buffers.get(name);
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(g);
      src.start();
      return { gain: g, stop: () => src.stop() };
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = name === 'wind' ? 340 : 150;
    f.Q.value = 0.7;
    src.connect(f);
    f.connect(g);
    if (name === 'wind') {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lg = ctx.createGain();
      lg.gain.value = 130;
      lfo.connect(lg);
      lg.connect(f.frequency);
      lfo.start();
    }
    src.start();
    return { gain: g, stop: () => src.stop() };
  }

  private out(vol: number, pan = 0): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = vol;
    let node: AudioNode = g;
    if (pan !== 0) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      node = p;
    }
    node.connect(this.master!);
    return g;
  }

  private burst(dur: number, vol: number, type: BiquadFilterType, freq: number, pan = 0, delay = 0): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.out(0.0001, pan);
    g.gain.setValueAtTime(Math.max(vol, 0.0002), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  private tone(
    type: OscillatorType, f0: number, f1: number, dur: number,
    vol: number, pan = 0, delay = 0, lp = 0,
  ): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(f0, 1), t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    const g = this.out(0.0001, pan);
    g.gain.setValueAtTime(Math.max(vol, 0.0002), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let head: AudioNode = o;
    if (lp > 0) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      o.connect(f);
      head = f;
    }
    head.connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  // Noise through a filter with a slow rise-and-fall envelope; the filter
  // frequency can sweep from f0 to f1 across the swell.
  private swell(dur: number, vol: number, type: BiquadFilterType, f0: number, f1: number, pan = 0, delay = 0): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.linearRampToValueAtTime(f1, t0 + dur);
    const g = this.out(0.0001, pan);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f);
    f.connect(g);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  private synth(name: SoundName, vol: number, pan: number): void {
    switch (name) {
      case 'step_wood':
        this.burst(0.08, vol * 0.5, 'bandpass', 240, pan);
        this.tone('sine', 92, 50, 0.07, vol * 0.6, pan);
        break;
      case 'step_gravel':
        this.burst(0.11, vol * 0.55, 'bandpass', 1500, pan);
        break;
      case 'door':
        this.tone('sine', 82, 44, 0.22, vol * 0.8, pan);
        this.burst(0.1, vol * 0.3, 'lowpass', 320, pan);
        break;
      case 'switch':
        this.burst(0.02, vol * 0.6, 'highpass', 2600, pan);
        break;
      case 'pop':
        this.burst(0.04, vol * 0.9, 'highpass', 1400, pan);
        this.tone('sine', 800, 110, 0.08, vol * 0.5, pan);
        break;
      case 'buzz':
        for (let i = 0; i < 2; i++) this.tone('square', 168, 168, 0.12, vol * 0.22, pan, i * 0.2, 900);
        break;
      case 'text':
        this.tone('sine', 880, 880, 0.07, vol * 0.3, pan);
        this.tone('sine', 1244, 1244, 0.09, vol * 0.24, pan, 0.08);
        break;
      case 'creak':
        this.tone('sawtooth', 160, 68, 0.85, vol * 0.14, pan, 0, 480);
        break;
      case 'pickup':
        this.tone('sine', 500, 640, 0.06, vol * 0.25, pan);
        break;
      case 'thump':
        this.tone('sine', 64, 36, 0.24, vol * 0.7, pan);
        this.burst(0.07, vol * 0.25, 'lowpass', 220, pan);
        break;
      case 'breath':
        for (let i = 0; i < 3; i++) this.swell(1.5, vol * 0.35, 'lowpass', 340, 340, pan, i * 1.9);
        break;
      case 'drag':
        this.swell(2.3, vol * 0.5, 'bandpass', 210, 110, pan);
        this.tone('sine', 55, 40, 2.0, vol * 0.3, pan);
        break;
      case 'wind':
      case 'fire':
        break;
    }
  }
}
