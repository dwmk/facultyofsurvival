export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private isPlaying = false;
  private melodyIndex = 0;
  private bassIndex = 0;
  private drumIndex = 0;
  private bgmIntervalId: number | null = null;

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

    this.playBackgroundBeat();
    this.bgmIntervalId = window.setInterval(() => this.playBackgroundBeat(), 150);
  }

  stop(): void {
    this.isPlaying = false;

    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
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

  private playBackgroundBeat(): void {
    if (!this.isPlaying || !this.audioContext || !this.masterGain) return;

    const step = this.drumIndex % 8;

    // Play drums
    if (this.drumPatterns.kick[step]) this.playKick();
    if (this.drumPatterns.snare[step]) this.playSnare();
    if (this.drumPatterns.hat[step]) this.playHat();

    // Play melody every 2 steps (300ms)
    if (step % 2 === 0) {
      this.playMelodyNote();
    }

    // Play bass every 4 steps (600ms)
    if (step % 4 === 0) {
      this.playBassNote();
    }

    this.drumIndex++;
  }

  private createBitCrusher(bits = 6, normFreq = 0.1): AudioNode {
    const node = this.audioContext!.createScriptProcessor(256, 1, 1);
    const step = Math.pow(0.5, bits);
    let phaser = 0, last = 0;
    node.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i++) {
        phaser += normFreq;
        if (phaser >= 1.0) {
          phaser -= 1.0;
          last = step * Math.floor(input[i] / step + 0.5);
        }
        output[i] = last;
      }
    };
    return node;
  }


  private playMelodyNote(): void {
    const noteIndex = this.currentMelody[this.melodyIndex % this.currentMelody.length];
    const root = this.scale[noteIndex];
  
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
  
    // Cycle through a quick arpeggio (root, 3rd, 5th)
    const arpeggio = [root, root * 1.25, root * 1.5];
    let t = this.audioContext.currentTime;
    arpeggio.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
    });
  
    osc.type = 'square';
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
  
    osc.connect(gain);
    gain.connect(this.createBitCrusher(5, 0.25)).connect(this.masterGain);
  
    osc.start();
    osc.stop(t + 0.3);
  
    this.oscillators.push(osc);
    this.melodyIndex++;
  
    if (this.melodyIndex >= this.currentMelody.length * 2) {
      this.currentMelody = this.melodyPatterns[Math.floor(Math.random() * this.melodyPatterns.length)];
      this.melodyIndex = 0;
    }
  }


  private playBassNote(): void {
    const noteIndex = this.currentBass[this.bassIndex % this.currentBass.length];
    const frequency = this.scale[noteIndex] / 2;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = frequency;

    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.createBitCrusher(5, 0.25)).connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.5);

    this.oscillators.push(osc);
    this.bassIndex++;
  }

  private playKick(): void {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.5);

    gain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.createBitCrusher(5, 0.25)).connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.5);
  }

  private playSnare(): void {
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
    gain.connect(this.createBitCrusher(5, 0.25)).connect(this.masterGain);

    noise.start();
    noise.stop(this.audioContext.currentTime + 0.2);
  }

  private playHat(): void {
    const bufferSize = this.audioContext!.sampleRate * 0.02;
    const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
    const data = buffer.getChannelData(0);
  
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // decay
    }
  
    const noise = this.audioContext!.createBufferSource();
    noise.buffer = buffer;
  
    const gain = this.audioContext!.createGain();
    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
  
    // Add tiny blip for retro feel
    const osc = this.audioContext!.createOscillator();
    osc.type = "square";
    osc.frequency.value = 8000;
    const oscGain = this.audioContext!.createGain();
    oscGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
  
    noise.connect(gain);
    osc.connect(oscGain);
    gain.connect(this.createBitCrusher(5, 0.25)).connect(this.masterGain);
    oscGain.connect(this.masterGain);
  
    noise.start();
    noise.stop(this.audioContext!.currentTime + 0.05);
    osc.start();
    osc.stop(this.audioContext!.currentTime + 0.05);
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
    gain.connect(this.createBitCrusher(5, 0.25)).connect(this.masterGain);

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
    gain.connect(this.createBitCrusher(5, 0.25)).connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  playAuraFarmingSound(): void {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;

    // Master gain for explosion
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(1.0, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 5); // 5-second decay
    gain.connect(this.createBitCrusher(5, 0.25)).connect(this.masterGain);

    // Low-frequency rumble oscillator
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, now);           // deep rumble
    osc.frequency.exponentialRampToValueAtTime(20, now + 5); // slow downward sweep
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 5);

    // Noise burst for explosion texture
    const bufferSize = this.audioContext.sampleRate * 1; // 1 second buffer
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize); // decaying noise
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(1.0, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 5); // match rumble decay

    noise.connect(noiseGain);
    noiseGain.connect(gain);
    noise.start(now);
    noise.stop(now + 5);

    // Optional: add mid-frequency crackle using short oscillators
    const osc2 = this.audioContext.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.exponentialRampToValueAtTime(100, now + 5);
    const osc2Gain = this.audioContext.createGain();
    osc2Gain.gain.setValueAtTime(0.2, now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 5);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);
    osc2.start(now);
    osc2.stop(now + 5);
  }
}
