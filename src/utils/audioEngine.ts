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

  private bassPattern = [0, 0, 4, 4, 0, 0, 4, 4];
  private currentMelody: number[] = [];

  initialize(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
      this.currentMelody = this.melodyPatterns[Math.floor(Math.random() * this.melodyPatterns.length)];
    }
  }

  start(): void {
    if (this.isPlaying || !this.audioContext || !this.masterGain) return;

    this.isPlaying = true;
    this.melodyIndex = 0;
    this.bassIndex = 0;

    this.playMelodyNote();
    this.melodyIntervalId = window.setInterval(() => this.playMelodyNote(), 300);

    this.playBassNote();
    this.bassIntervalId = window.setInterval(() => this.playBassNote(), 600);
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

  private playBassNote(): void {
    if (!this.audioContext || !this.masterGain) return;

    const noteIndex = this.bassPattern[this.bassIndex % this.bassPattern.length];
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
}
