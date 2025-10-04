export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private isPlaying = false;
  private melodyIndex = 0;
  private bassIndex = 0;
  private melodyIntervalId: number | null = null;
  private bassIntervalId: number | null = null;

  private scale = [220, 246.94, 277.18, 293.66, 329.63, 369.99, 415.30, 440];

  private melodyPatterns = [
    [0, 2, 4, 2, 0, 2, 4, 5],
    [4, 5, 7, 5, 4, 2, 0, 2],
    [2, 4, 5, 7, 5, 4, 2, 0],
    [0, 4, 2, 5, 0, 4, 2, 7],
  ];

    private drumPatterns = {
    kick: [1, 0, 0, 0, 1, 0, 0, 0],   // on the "1"
    snare: [0, 0, 1, 0, 0, 0, 1, 0],  // on 2 & 4
    hat:   [1, 1, 1, 1, 1, 1, 1, 1],  // every beat
  };

  private drumIndex = 0;
  private drumIntervalId: number | null = null;

  private bassPatterns = [
  [0, 0, 4, 4, 0, 0, 4, 4],
  [0, 4, 0, 5, 0, 7, 0, 5],
  [0, 0, 5, 5, 4, 4, 2, 2],
  [0, 2, 4, 5, 4, 2, 0, 0],
  [0, 7, 0, 5, 0, 4, 0, 2],
];
private currentBass: number[] = [];

  private currentMelody: number[] = [];

  initialize(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
      this.currentMelody = this.melodyPatterns[Math.floor(Math.random() * this.melodyPatterns.length)];
      this.currentBass = this.bassPatterns[Math.floor(Math.random() * this.bassPatterns.length)];
    }
  }

   start(): void {
    if (this.isPlaying || !this.audioContext || !this.masterGain) return;

    this.isPlaying = true;
    this.melodyIndex = 0;
    this.bassIndex = 0;
    this.drumIndex = 0;

    this.playMelodyNote();
    this.melodyIntervalId = window.setInterval(() => this.playMelodyNote(), 300);

    this.playBassNote();
    this.bassIntervalId = window.setInterval(() => this.playBassNote(), 600);

    this.playDrumBeat();
    this.drumIntervalId = window.setInterval(() => this.playDrumBeat(), 150); // fast ticks
  }


  stop(): void {
    this.isPlaying = false;

    if (this.melodyIntervalId) {
      clearInterval(this.melodyIntervalId);
      this.melodyIntervalId = null;
    }

    if (this.bassIntervalId) {
      clearInterval(this.bassIntervalId);
      this.bassIntervalId = null;
    }

    if (this.drumIntervalId) {
      clearInterval(this.drumIntervalId);
      this.drumIntervalId = null;
    }

    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator already stopped
      }
    });
    this.oscillators = [];
  }

  private playMelodyNote(): void {
    if (!this.audioContext || !this.masterGain) return;

    const noteIndex = this.currentMelody[this.melodyIndex % this.currentMelody.length];
    const frequency = this.scale[noteIndex];

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.value = frequency;

    gain.gain.value = 0.25;
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.25);

    this.oscillators.push(osc);
    this.melodyIndex++;

    if (this.melodyIndex >= this.currentMelody.length * 2) {
      this.currentMelody = this.melodyPatterns[Math.floor(Math.random() * this.melodyPatterns.length)];
      this.melodyIndex = 0;
    }
  }

  private playDrumBeat(): void {
    if (!this.audioContext || !this.masterGain) return;

    const step = this.drumIndex % 8;

    if (this.drumPatterns.kick[step]) this.playKick();
    if (this.drumPatterns.snare[step]) this.playSnare();
    if (this.drumPatterns.hat[step]) this.playHat();

    this.drumIndex++;
  }


  private playBassNote(): void {
    if (!this.audioContext || !this.masterGain) return;

    const noteIndex = this.currentBass[this.bassIndex % this.currentBass.length];
    const frequency = this.scale[noteIndex] / 2;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = frequency;

    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.5);

    this.oscillators.push(osc);
    this.bassIndex++;
  }

    private playKick(): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);

    gain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.5);
  }

  private playSnare(): void {
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * 0.2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // white noise
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    noise.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    noise.stop(this.audioContext.currentTime + 0.2);
  }

  private playHat(): void {
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * 0.05;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const highpass = this.audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 5000;

    const bandpass = this.audioContext.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 10000;


    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
    noise.stop(this.audioContext.currentTime + 0.1);
  }


  playCollectSound(): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 523.25;
    osc.frequency.exponentialRampToValueAtTime(1046.5, this.audioContext.currentTime + 0.1);

    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  playHitSound(): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 120;
    osc.frequency.exponentialRampToValueAtTime(60, this.audioContext.currentTime + 0.2);

    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  playAuraFarmingSound(): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc1.type = 'square';
    osc1.frequency.value = 200;
    osc1.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.3);

    osc2.type = 'sine';
    osc2.frequency.value = 400;
    osc2.frequency.exponentialRampToValueAtTime(1600, this.audioContext.currentTime + 0.3);

    gain.gain.value = 0.4;
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    osc1.stop(this.audioContext.currentTime + 0.3);
    osc2.stop(this.audioContext.currentTime + 0.3);
  }
}
