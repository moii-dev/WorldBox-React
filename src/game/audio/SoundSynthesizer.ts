/**
 * Procedural Web Audio API sound effects for God Powers and Cataclysms.
 * Requires no external audio assets or network downloads.
 */
export class SoundSynthesizer {
  private static ctx: AudioContext | null = null;
  public static enabled: boolean = true;

  private static getContext(): AudioContext | null {
    if (!SoundSynthesizer.enabled) return null;
    if (!SoundSynthesizer.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          SoundSynthesizer.ctx = new AudioCtx();
        }
      } catch {
        return null;
      }
    }
    if (SoundSynthesizer.ctx && SoundSynthesizer.ctx.state === 'suspended') {
      SoundSynthesizer.ctx.resume().catch(() => {});
    }
    return SoundSynthesizer.ctx;
  }

  /**
   * Lightning strike: high-voltage crackle + thunderous sub-bass boom
   */
  public static playLightning(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Initial sharp electric crackle (white noise through bandpass)
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.15);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(t);

    // 2. Rolling thunder boom (low frequency oscillator)
    const osc = ctx.createOscillator();
    const boomGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.8);

    const boomFilter = ctx.createBiquadFilter();
    boomFilter.type = 'lowpass';
    boomFilter.frequency.setValueAtTime(250, t + 0.05);
    boomFilter.frequency.linearRampToValueAtTime(80, t + 0.8);

    boomGain.gain.setValueAtTime(0.01, t);
    boomGain.gain.linearRampToValueAtTime(0.65, t + 0.08);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(boomFilter);
    boomFilter.connect(boomGain);
    boomGain.connect(ctx.destination);

    osc.start(t + 0.05);
    osc.stop(t + 0.9);
  }

  /**
   * Massive explosion: for meteor impact, bombs, and heavy destruction
   */
  public static playExplosion(intensity: number = 1.0): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dur = 0.5 + intensity * 0.5;

    // Noise buffer
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.25));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800 * intensity, t);
    filter.frequency.exponentialRampToValueAtTime(50, t + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.9, 0.45 * intensity), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);

    // Deep sub punch
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    subGain.gain.setValueAtTime(0.6 * intensity, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.4);
  }

  /**
   * Earthquake: continuous rumbling seismic oscillation
   */
  public static playEarthquake(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dur = 1.4;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(45, t);
    osc.frequency.linearRampToValueAtTime(55, t + 0.4);
    osc.frequency.linearRampToValueAtTime(35, t + 1.2);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(14, t);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(20, t);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.2);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    lfo.start(t);
    osc.start(t);
    lfo.stop(t + dur);
    osc.stop(t + dur);
  }

  /**
   * Fire ignition / wildfire whoosh
   */
  public static playFireIgnite(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const dur = 0.4;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.setValueAtTime(1.5, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  /**
   * Healing rain: soothing celestial rain chimes
   */
  public static playHealRain(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const t = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.2, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.6);
    });
  }

  /**
   * Divine Shield: radiant harmonic protective chord
   */
  public static playShield(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const freqs = [440, 554.37, 659.25, 880]; // A major
    const t = ctx.currentTime;

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.7);
    });
  }

  /**
   * Rejuvenation: sparkling ascending fairy harp arpeggio
   */
  public static playRejuvenate(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D, F#, A, D, F#
    const t = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const noteTime = t + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.22, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });
  }

  /**
   * Warrior boost: booming brassy warhorn fanfare
   */
  public static playWarriorBoost(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(164.81, t); // E3
    osc2.frequency.setValueAtTime(246.94, t); // B3

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.linearRampToValueAtTime(1400, t + 0.15);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.7);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.75);
    osc2.stop(t + 0.75);
  }

  /**
   * Grenade tick: crisp metallic click before detonation
   */
  public static playGrenadeTick(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  /**
   * Napalm burst: sticky chemical whoosh & roar
   */
  public static playNapalm(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.6);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.Q.setValueAtTime(2.0, t);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  /**
   * Freeze: icy glass chime and frosty crackle
   */
  public static playFreeze(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t); // A6
    osc.frequency.linearRampToValueAtTime(2200, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.45);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  /**
   * Wood chopping: crisp axe thud into timber
   */
  public static playWoodChop(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Anvil clink: bright metallic blacksmith ping
   */
  public static playAnvilClink(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.18);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /**
   * Sword clash: metallic combat blade impact
   */
  public static playSwordClash(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(980, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Bow shot: quick bowstring snap
   */
  public static playBowShot(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Town alarm bell: deep resonant bronze bell toll
   */
  public static playTownBell(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, t); // C5
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.5, t); // C6 overtone

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.2);
    osc2.stop(t + 1.2);
  }

  /**
   * Boat splash: soft water wave displacement
   */
  public static playBoatSplash(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Divine chime: sacred harmonic arpeggio for prayers, temples, and blessings
   */
  public static playDivineChime(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C E G C chord
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.01, t + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, t + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.7);
    });
  }

  /**
   * Blacksmith hammer strike on steel anvil: bright metallic harmonic ping
   */
  public static playAnvilForging(): void {
    const ctx = SoundSynthesizer.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1760, t); // A6
    osc1.frequency.exponentialRampToValueAtTime(880, t + 0.15);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3520, t); // A7
    osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.3);
    osc2.stop(t + 0.3);
  }
}
