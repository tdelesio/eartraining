// Zero-dependency, high-fidelity Web Audio API Sound Engine

export type SoundPreset = 'grand_piano' | 'rhodes' | 'synth' | 'marimba';

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteToFreq(note: string): number {
  const match = note.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return 440;
  let pitch = match[1];
  const octave = parseInt(match[2], 10);
  if (pitch === 'Db') pitch = 'C#';
  if (pitch === 'Eb') pitch = 'D#';
  if (pitch === 'Gb') pitch = 'F#';
  if (pitch === 'Ab') pitch = 'G#';
  if (pitch === 'Bb') pitch = 'A#';
  const semitoneIndex = CHROMATIC.indexOf(pitch);
  const midi = (octave + 1) * 12 + semitoneIndex;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentPreset: SoundPreset = 'grand_piano';
  private masterGain: GainNode | null = null;
  private activeDroneGain: GainNode | null = null;

  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx && (this.ctx.state === 'suspended' || (this.ctx.state as string) === 'interrupted')) {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  // Explicit unlock called on user interactions (touchstart/touchend/click)
  public async unlock(): Promise<boolean> {
    const ctx = this.initContext();
    if (!ctx) return false;

    try {
      if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
        await ctx.resume();
      }

      // 1. Play 1-frame silent buffer through Web Audio API
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      // 2. Play a brief silent HTML5 audio element to switch iOS from 'ambient' to 'playback'
      // This allows sound to play even if the iPhone ring/silent switch is set to silent!
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.setAttribute('playsinline', 'true');
      silentAudio.volume = 0.01;
      const playPromise = silentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }

      return true;
    } catch (e) {
      console.warn('Web Audio unlock failed:', e);
      return false;
    }
  }

  public async ensureRunning(): Promise<void> {
    const ctx = this.initContext();
    if (ctx && (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted')) {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('Context resume failed:', e);
      }
    }
  }

  public setPreset(preset: SoundPreset) {
    this.currentPreset = preset;
  }

  public getPreset(): SoundPreset {
    return this.currentPreset;
  }

  // Play a single synthesized note
  public playNote(
    note: string,
    duration: number = 1.0,
    delay: number = 0,
    velocity: number = 0.8
  ) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const startTime = this.ctx.currentTime + delay;
    const freq = noteToFreq(note);

    if (this.currentPreset === 'grand_piano') {
      this.synthesizePianoNote(freq, startTime, duration, velocity);
    } else if (this.currentPreset === 'rhodes') {
      this.synthesizeRhodesNote(freq, startTime, duration, velocity);
    } else if (this.currentPreset === 'synth') {
      this.synthesizeSynthNote(freq, startTime, duration, velocity);
    } else if (this.currentPreset === 'marimba') {
      this.synthesizeMarimbaNote(freq, startTime, duration, velocity);
    }
  }

  // Grand Piano synthesis: Fundamental + 3 natural overtones + hammer attack + exponential release
  private synthesizePianoNote(freq: number, startTime: number, duration: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;

    const harmonics = [
      { mult: 1, gain: 0.75, decay: duration * 1.5 },
      { mult: 2, gain: 0.35, decay: duration * 1.0 },
      { mult: 3, gain: 0.18, decay: duration * 0.7 },
      { mult: 4, gain: 0.08, decay: duration * 0.4 }
    ];

    // Low-pass filter simulating wooden piano soundboard damping
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 8, 8000), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 2, 800), startTime + duration);
    filter.connect(this.masterGain);

    harmonics.forEach(h => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = h.mult === 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * h.mult, startTime);

      // Attack: fast 8ms ramp to avoid clicking
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(h.gain * velocity, startTime + 0.008);
      // Exponential decay
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + h.decay);

      osc.connect(gainNode);
      gainNode.connect(filter);

      osc.start(startTime);
      osc.stop(startTime + h.decay);
    });
  }

  // Rhodes Electric Piano synthesis: Sine body with FM bell modulator
  private synthesizeRhodesNote(freq: number, startTime: number, duration: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;

    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const carrierGain = this.ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(freq, startTime);

    // Modulator at 2x frequency (FM bell timbre)
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(freq * 2, startTime);
    modGain.gain.setValueAtTime(freq * 1.5, startTime);
    modGain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.6);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    carrierGain.gain.setValueAtTime(0.0001, startTime);
    carrierGain.gain.exponentialRampToValueAtTime(0.6 * velocity, startTime + 0.015);
    carrierGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 1.3);

    carrier.connect(carrierGain);
    carrierGain.connect(this.masterGain);

    modulator.start(startTime);
    carrier.start(startTime);
    modulator.stop(startTime + duration * 1.3);
    carrier.stop(startTime + duration * 1.3);
  }

  // Warm Analog Synth: Sawtooth + Sub Sine with lowpass filter
  private synthesizeSynthNote(freq: number, startTime: number, duration: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq / 2, startTime); // sub-octave

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, startTime);
    filter.Q.setValueAtTime(3, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.5 * velocity, startTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  }

  // Marimba: Crisp wooden percussive mallet
  private synthesizeMarimbaNote(freq: number, startTime: number, duration: number, velocity: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.7 * velocity, startTime + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(duration, 0.7));

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + Math.min(duration, 0.7));
  }

  // Play a Polyphonic Chord (all at once, or arpeggiated)
  public playChord(notes: string[], duration: number = 1.4, arpeggioDelay: number = 0) {
    notes.forEach((note, index) => {
      const delay = index * arpeggioDelay;
      this.playNote(note, duration, delay, 0.75);
    });
  }

  // Play a Sequence of notes
  public playSequence(notes: string[], durations: number[] = [], delays: number[] = []) {
    notes.forEach((note, index) => {
      const dur = durations[index] || 0.6;
      const del = delays[index] !== undefined ? delays[index] : index * 0.65;
      this.playNote(note, dur, del, 0.8);
    });
  }

  // Play continuous background Tonic Drone (anchor pitch)
  public playTonicDrone(tonicNote: string = 'C4', duration: number = 3.5) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Stop existing drone if playing
    if (this.activeDroneGain) {
      try {
        this.activeDroneGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      } catch (e) {
        // ignore
      }
    }

    const freq = noteToFreq(tonicNote);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
    this.activeDroneGain = gain;
  }

  // Play comparison between two sounds (e.g. what was played vs user's chosen answer)
  public playComparison(firstNotes: string[], secondNotes: string[]) {
    // Play first sound
    if (firstNotes.length === 1) {
      this.playNote(firstNotes[0], 0.9, 0);
    } else {
      this.playChord(firstNotes, 1.0, 0.03);
    }

    // Play second sound after 1.2s pause
    setTimeout(() => {
      if (secondNotes.length === 1) {
        this.playNote(secondNotes[0], 0.9, 0);
      } else {
        this.playChord(secondNotes, 1.0, 0.03);
      }
    }, 1200);
  }

  // UI Sound Effects
  public playSuccessChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const startTime = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);

      gain.gain.setValueAtTime(0.0001, startTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.25, startTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime + idx * 0.08);
      osc.stop(startTime + idx * 0.08 + 0.4);
    });
  }

  public playErrorSound() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playStreakFanfare() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const notes = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
    const startTime = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.1);

      gain.gain.setValueAtTime(0.0001, startTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.35, startTime + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + idx * 0.1 + (idx === notes.length - 1 ? 1.0 : 0.5));

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime + idx * 0.1);
      osc.stop(startTime + idx * 0.1 + 1.0);
    });
  }

  public playButtonClick() {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
}

export const soundEngine = new SoundEngine();
