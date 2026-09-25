/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio API sound system for SimCopter
// 100% self-contained, works completely offline with zero external audio assets!

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private radioGain: GainNode | null = null;

  // Helicopter engine audio nodes
  private turbineOsc: OscillatorNode | null = null;
  private turbineGain: GainNode | null = null;
  private rotorNoiseNode: AudioBufferSourceNode | null = null;
  private rotorGain: GainNode | null = null;
  private rotorFilter: BiquadFilterNode | null = null;
  private rotorLfo: OscillatorNode | null = null;
  private rotorLfoGain: GainNode | null = null;
  private engineRunning = false;

  // Siren audio nodes
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenActive = false;

  // Radio station player
  private radioPlaying = false;
  private currentStation = 1; // 0: Off, 1: Classical, 2: Lounge Jazz, 3: Retro Synthwave
  private radioTimer: number | null = null;
  private radioStep = 0;

  constructor() {
    // Lazy initialize on first user gesture
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.masterGain);

      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = 0.35;
      this.radioGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio could not initialize:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(master: number, sfx: number, radio: number) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, master));
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, sfx));
    if (this.radioGain) this.radioGain.gain.value = Math.max(0, Math.min(1, radio));
  }

  // --- Helicopter Turbine & Rotor Simulation ---
  public startEngine() {
    this.init();
    this.resume();
    if (!this.ctx || !this.sfxGain || this.engineRunning) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Turbine Whine (Smooth, soft dual-tone sine/triangle harmonic)
      this.turbineOsc = this.ctx.createOscillator();
      this.turbineOsc.type = 'sine';
      this.turbineOsc.frequency.setValueAtTime(120, now);

      this.turbineGain = this.ctx.createGain();
      this.turbineGain.gain.setValueAtTime(0.001, now);
      this.turbineGain.gain.exponentialRampToValueAtTime(0.04, now + 1.2);

      this.turbineOsc.connect(this.turbineGain);
      this.turbineGain.connect(this.sfxGain);
      this.turbineOsc.start();

      // 2. Main Rotor Blade Thrum (Low-frequency air-wash)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.992 * b0 + white * 0.035;
        b1 = 0.97 * b1 + white * 0.08;
        b2 = 0.88 * b2 + white * 0.18;
        output[i] = (b0 + b1 + b2) * 0.45;
      }

      this.rotorNoiseNode = this.ctx.createBufferSource();
      this.rotorNoiseNode.buffer = noiseBuffer;
      this.rotorNoiseNode.loop = true;

      this.rotorFilter = this.ctx.createBiquadFilter();
      this.rotorFilter.type = 'lowpass';
      this.rotorFilter.frequency.setValueAtTime(140, now);
      this.rotorFilter.Q.setValueAtTime(1.2, now); // Gentle, smooth Q factor

      this.rotorGain = this.ctx.createGain();
      this.rotorGain.gain.setValueAtTime(0.001, now);
      this.rotorGain.gain.exponentialRampToValueAtTime(0.08, now + 1.0);

      // Smooth sine wave LFO for the characteristic rhythmic rotor "chop"
      this.rotorLfo = this.ctx.createOscillator();
      this.rotorLfo.type = 'sine'; // Smooth sinusoidal pulse, never harsh sawtooth!
      this.rotorLfo.frequency.setValueAtTime(17, now);

      this.rotorLfoGain = this.ctx.createGain();
      this.rotorLfoGain.gain.setValueAtTime(0.045, now);

      this.rotorLfo.connect(this.rotorLfoGain);
      this.rotorLfoGain.connect(this.rotorGain.gain);

      this.rotorNoiseNode.connect(this.rotorFilter);
      this.rotorFilter.connect(this.rotorGain);
      this.rotorGain.connect(this.sfxGain);

      this.rotorNoiseNode.start();
      this.rotorLfo.start();

      this.engineRunning = true;
    } catch (e) {
      console.warn('Engine sound error:', e);
    }
  }

  public updateEngine(rpm: number, collective: number, bankAngle: number, speed: number) {
    if (!this.ctx || !this.engineRunning) return;

    const normalizedRpm = Math.max(0.05, Math.min(1.15, rpm / 100));
    const gForceSwell = 1 + Math.abs(bankAngle) * 0.4 + (speed / 140) * 0.25;
    const now = this.ctx.currentTime;

    // Turbine pitch follows RPM with gentle smooth glide
    if (this.turbineOsc) {
      const targetFreq = 95 + normalizedRpm * 320 + (collective / 100) * 45;
      this.turbineOsc.frequency.setTargetAtTime(targetFreq, now, 0.18);
    }
    if (this.turbineGain) {
      const vol = (0.025 + (collective / 100) * 0.035) * Math.min(1, normalizedRpm * 1.5);
      this.turbineGain.gain.setTargetAtTime(vol, now, 0.15);
    }

    // Rotor beat rate
    if (this.rotorLfo) {
      const rotorHz = (13 + (collective / 100) * 4) * normalizedRpm;
      this.rotorLfo.frequency.setTargetAtTime(rotorHz, now, 0.18);
    }

    // Warm resonant filter swells smoothly
    if (this.rotorFilter) {
      const filterFreq = 120 + (collective / 100) * 60 + (gForceSwell - 1) * 80;
      this.rotorFilter.frequency.setTargetAtTime(filterFreq, now, 0.15);
    }
    if (this.rotorGain) {
      const rotorVol = (0.06 + (collective / 100) * 0.05) * gForceSwell * Math.min(1, normalizedRpm * 1.8);
      this.rotorGain.gain.setTargetAtTime(rotorVol, now, 0.15);
    }
  }

  public stopEngine() {
    if (!this.engineRunning || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.turbineGain?.gain.setTargetAtTime(0.0001, now, 0.6);
      this.rotorGain?.gain.setTargetAtTime(0.0001, now, 0.8);
      setTimeout(() => {
        try {
          this.turbineOsc?.stop();
          this.rotorNoiseNode?.stop();
          this.rotorLfo?.stop();
        } catch {}
        this.engineRunning = false;
      }, 900);
    } catch {
      this.engineRunning = false;
    }
  }

  // Preemptive Terrain / Obstacle warning chime
  public playTerrainAlert() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.setValueAtTime(510, now + 0.1);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // --- Emergency Siren & Megaphone ---
  public toggleSiren(active: boolean) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    if (active && !this.sirenActive) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.18;

      const now = this.ctx.currentTime;
      // Classic police/ambulance dual-pitch wail
      this.sirenOsc.type = 'sawtooth';
      this.sirenOsc.frequency.setValueAtTime(650, now);

      // Modulate frequency
      const sirenLfo = this.ctx.createOscillator();
      sirenLfo.frequency.setValueAtTime(0.8, now); // 0.8 Hz sweep
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(250, now);

      sirenLfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.sfxGain);

      sirenLfo.start();
      this.sirenOsc.start();
      this.sirenActive = true;
    } else if (!active && this.sirenActive) {
      try {
        this.sirenGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        setTimeout(() => {
          this.sirenOsc?.stop();
          this.sirenActive = false;
        }, 150);
      } catch {
        this.sirenActive = false;
      }
    }
  }

  // Megaphone announcement click & beep
  public playMegaphone() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(440, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // --- Dispatcher Two-Tone Radio Chime ---
  public playDispatchChime() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Classic Motorola Quick-Call II paging tones
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(746.8, now); // Tone A
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.setValueAtTime(0.18, now + 0.25);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.28);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.frequency.setValueAtTime(979.9, now + 0.3); // Tone B
    gain2.gain.setValueAtTime(0.2, now + 0.3);
    gain2.gain.setValueAtTime(0.2, now + 0.65);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.3);
    osc2.stop(now + 0.7);

    // Static burst after chime
    setTimeout(() => this.playRadioStatic(0.2), 720);
  }

  public playRadioStatic(duration = 0.25) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  // --- Water Drop & Splash ---
  public playWaterDrop() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Heavy water whoosh
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.8);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  // Water sizzle on fire
  public playSteamSizzle() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  // Rescue Hoist / Winch Motor
  public playWinchClick() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Victim Rescued Chime
  public playRescueSuccess() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  // Touchdown landing sound
  public playTouchdown(hard = false) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = hard ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(hard ? 180 : 90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    gain.gain.setValueAtTime(hard ? 0.4 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Crash / structural impact sound
  public playCrash() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 1.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.8;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  // Thunder Crack & Rumble
  public playThunder() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 2.0);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 1.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  // Low Fuel / Sink Rate Alarm
  public playWarningBeep() {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // --- Procedural FM Radio Player (SimCopter Classics!) ---
  public setRadioStation(stationIndex: number) {
    this.currentStation = stationIndex;
    if (stationIndex === 0) {
      this.stopRadio();
    } else {
      this.startRadio();
    }
  }

  public getRadioStation(): number {
    return this.currentStation;
  }

  public startRadio() {
    if (this.radioPlaying || this.currentStation === 0) return;
    this.init();
    this.resume();
    this.radioPlaying = true;
    this.radioStep = 0;
    this.scheduleRadioTick();
  }

  public stopRadio() {
    this.radioPlaying = false;
    if (this.radioTimer !== null) {
      clearTimeout(this.radioTimer);
      this.radioTimer = null;
    }
  }

  private scheduleRadioTick() {
    if (!this.radioPlaying || !this.ctx || !this.radioGain) return;

    // Synthesize notes based on channel
    // Station 1: Classical Air (Ode to Joy / Bach-style arpeggios)
    // Station 2: Smooth Skyway Lounge Jazz
    // Station 3: Action Response Synthwave
    const now = this.ctx.currentTime;

    if (this.currentStation === 1) {
      // Classical Channel (Flute / Harpsichord synth)
      const classicalScale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
      const melody = [4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 4, 2, 2, 0];
      const noteIdx = melody[this.radioStep % melody.length];
      const freq = classicalScale[noteIdx];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.radioGain);
      osc.start(now);
      osc.stop(now + 0.3);

      this.radioStep++;
      this.radioTimer = window.setTimeout(() => this.scheduleRadioTick(), 300);
    } else if (this.currentStation === 2) {
      // Smooth Skyway Jazz (Rhodes / Vibraphone chords)
      const jazzChords = [
        [261.63, 329.63, 392.00, 493.88], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [293.66, 349.23, 440.00, 523.25], // Dm7
        [196.00, 246.94, 293.66, 349.23], // G7
      ];
      const chord = jazzChords[Math.floor(this.radioStep / 4) % jazzChords.length];
      const note = chord[this.radioStep % chord.length];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.radioGain);
      osc.start(now);
      osc.stop(now + 0.48);

      this.radioStep++;
      this.radioTimer = window.setTimeout(() => this.scheduleRadioTick(), 340);
    } else if (this.currentStation === 3) {
      // Action Synthwave (Driving bassline + arp)
      const bassline = [110, 110, 130.81, 110, 98.0, 98.0, 123.47, 98.0];
      const arpNotes = [440, 523.25, 659.25, 523.25];
      const freqBass = bassline[this.radioStep % bassline.length];
      const freqLead = arpNotes[(this.radioStep * 2) % arpNotes.length];

      // Bass synth
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freqBass, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.radioGain);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Lead arp
      if (this.radioStep % 2 === 0) {
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freqLead, now);
        gain2.gain.setValueAtTime(0.06, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc2.connect(gain2);
        gain2.connect(this.radioGain);
        osc2.start(now);
        osc2.stop(now + 0.14);
      }

      this.radioStep++;
      this.radioTimer = window.setTimeout(() => this.scheduleRadioTick(), 220);
    }
  }
}

export const soundManager = new SoundSystem();
