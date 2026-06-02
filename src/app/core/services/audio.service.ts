import { Injectable, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService, DayNightTheme } from './theme.service';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioCtx: AudioContext | null = null;
  private isInitialized = false;
  
  // Volume controls (0 to 1)
  masterVolume = 0.5;
  
  // Sound states
  isPlaying = signal<boolean>(false);
  
  // Nodes for synthesis
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private birdsGain: GainNode | null = null;
  private cricketsGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  
  // Timer references for periodic chirps
  private birdTimer: any = null;
  private cricketTimer: any = null;
  private fireTimer: any = null;

  constructor(
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      // Sync sound environment with Day/Night transitions when theme changes
      // and we are already playing sounds.
      themeService.theme; // Listen to theme signals
    }
  }

  /**
   * Initializes the Web Audio context. Must be triggered via user interaction.
   */
  private initAudio() {
    if (this.isInitialized) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
      
      // Initialize sub-gains for each sound element
      this.windGain = this.audioCtx.createGain();
      this.windGain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      this.windGain.connect(this.masterGain);
      
      this.birdsGain = this.audioCtx.createGain();
      this.birdsGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.birdsGain.connect(this.masterGain);
      
      this.cricketsGain = this.audioCtx.createGain();
      this.cricketsGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.cricketsGain.connect(this.masterGain);
      
      this.fireGain = this.audioCtx.createGain();
      this.fireGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.fireGain.connect(this.masterGain);
      
      // Start background wind loop
      this.startWind();
      
      this.isInitialized = true;
      this.updateSoundscape(this.themeService.theme());
    } catch (e) {
      console.error("Web Audio API not supported or failed to initialize:", e);
    }
  }

  /**
   * Starts synthesizing wind using white noise and a modulated bandpass filter.
   */
  private startWind() {
    if (!this.audioCtx || !this.windGain) return;
    
    const bufferSize = 2 * this.audioCtx.sampleRate;
    const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = this.audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.5;
    
    noiseSource.connect(filter);
    filter.connect(this.windGain);
    
    noiseSource.start(0);
    
    // Modulate filter frequency to simulate wind gusts
    const modulateWind = () => {
      if (!this.audioCtx || !this.isPlaying()) return;
      const t = this.audioCtx.currentTime;
      // Procedural frequency modulation (between 250Hz and 700Hz)
      const freq = 450 + Math.sin(t * 0.2) * 150 + Math.cos(t * 0.7) * 50;
      filter.frequency.setValueAtTime(freq, t);
      setTimeout(modulateWind, 100);
    };
    
    modulateWind();
  }

  /**
   * Periodically triggers bird chirping sound effects.
   */
  private triggerBirdChirp() {
    if (!this.audioCtx || !this.birdsGain || !this.isPlaying()) return;
    
    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.birdsGain);
    
    // Birds chirp at around 2kHz to 4.5kHz with rapid pitch sweeps
    osc.frequency.setValueAtTime(2500, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    
    // Fast frequency sweep up
    osc.frequency.exponentialRampToValueAtTime(4200, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(2800, t + 0.35);
    
    osc.start(t);
    osc.stop(t + 0.4);
    
    // Double chirp
    setTimeout(() => {
      if (!this.audioCtx || !this.birdsGain || !this.isPlaying()) return;
      const t2 = this.audioCtx.currentTime;
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      
      osc2.type = 'sine';
      osc2.connect(gain2);
      gain2.connect(this.birdsGain);
      
      osc2.frequency.setValueAtTime(2800, t2);
      gain2.gain.setValueAtTime(0, t2);
      gain2.gain.linearRampToValueAtTime(0.25, t2 + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.28);
      
      osc2.frequency.exponentialRampToValueAtTime(4500, t2 + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(3200, t2 + 0.28);
      
      osc2.start(t2);
      osc2.stop(t2 + 0.3);
    }, 250);
  }

  /**
   * Periodically triggers crickets chirping sound effects.
   */
  private triggerCricketChirp() {
    if (!this.audioCtx || !this.cricketsGain || !this.isPlaying()) return;
    
    const t = this.audioCtx.currentTime;
    const carrier = this.audioCtx.createOscillator();
    const modulator = this.audioCtx.createOscillator();
    const modGain = this.audioCtx.createGain();
    const gain = this.audioCtx.createGain();
    
    carrier.type = 'sine';
    carrier.frequency.value = 4600; // High pitch cricket chirp
    
    modulator.type = 'sawtooth';
    modulator.frequency.value = 65; // Rapid modulation frequency
    modGain.gain.value = 4000;
    
    modulator.connect(modGain);
    modGain.connect(carrier.frequency); // FM Synthesis for buzz quality
    
    carrier.connect(gain);
    gain.connect(this.cricketsGain);
    
    gain.gain.setValueAtTime(0, t);
    
    // Chirp pattern (3 short bursts)
    let burstStart = t;
    for (let i = 0; i < 3; i++) {
      gain.gain.linearRampToValueAtTime(0.15, burstStart + 0.02);
      gain.gain.setValueAtTime(0.15, burstStart + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, burstStart + 0.12);
      burstStart += 0.18;
    }
    
    modulator.start(t);
    carrier.start(t);
    
    modulator.stop(burstStart);
    carrier.stop(burstStart);
  }

  /**
   * Synthesizes bonfire crackling and pop sound effects.
   */
  private startFireSounds() {
    if (!this.audioCtx || !this.fireGain) return;
    
    // 1. Low rumble
    const rumbleOsc = this.audioCtx.createOscillator();
    const rumbleFilter = this.audioCtx.createBiquadFilter();
    const rumbleGain = this.audioCtx.createGain();
    
    rumbleOsc.type = 'triangle';
    rumbleOsc.frequency.setValueAtTime(75, this.audioCtx.currentTime);
    
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.setValueAtTime(90, this.audioCtx.currentTime);
    
    rumbleGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
    
    rumbleOsc.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.fireGain);
    rumbleOsc.start(0);
    
    // Rumble pitch modulation
    const modulateRumble = () => {
      if (!this.audioCtx || !this.isPlaying()) return;
      rumbleOsc.frequency.setValueAtTime(65 + Math.random() * 20, this.audioCtx.currentTime);
      setTimeout(modulateRumble, 200);
    };
    modulateRumble();

    // 2. High crackle impulses
    const crackle = () => {
      if (!this.audioCtx || !this.isPlaying() || !this.fireGain) return;
      
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const filter = this.audioCtx.createBiquadFilter();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2000 + Math.random() * 8000, now);
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(4000, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08 * Math.random(), now + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.01 + Math.random() * 0.03);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.fireGain);
      
      osc.start(now);
      osc.stop(now + 0.05);
      
      // Schedule next crackle pop randomly
      const nextCrackle = 40 + Math.random() * 800;
      this.fireTimer = setTimeout(crackle, nextCrackle);
    };
    crackle();
  }

  /**
   * Fades audio gain nodes smoothly between Day (birds) and Night (crickets, fire) states.
   */
  updateSoundscape(theme: DayNightTheme) {
    if (!this.audioCtx || !this.isInitialized) return;
    
    const t = this.audioCtx.currentTime;
    const fadeDuration = 3.0; // 3 seconds smooth crossfade
    
    // Clear existing timers
    clearInterval(this.birdTimer);
    clearInterval(this.cricketTimer);
    clearTimeout(this.fireTimer);
    
    if (this.isPlaying()) {
      if (theme === 'day') {
        // Fade in birds and wind
        this.birdsGain?.gain.linearRampToValueAtTime(1.0, t + fadeDuration);
        this.windGain?.gain.linearRampToValueAtTime(0.08, t + fadeDuration);
        // Fade out crickets and fire
        this.cricketsGain?.gain.linearRampToValueAtTime(0, t + fadeDuration);
        this.fireGain?.gain.linearRampToValueAtTime(0, t + fadeDuration);
        
        // Start bird scheduler (chirp every 4-8 seconds)
        this.triggerBirdChirp();
        this.birdTimer = setInterval(() => this.triggerBirdChirp(), 6000);
      } else {
        // Fade in crickets and fire
        this.cricketsGain?.gain.linearRampToValueAtTime(1.2, t + fadeDuration);
        this.fireGain?.gain.linearRampToValueAtTime(1.0, t + fadeDuration);
        this.windGain?.gain.linearRampToValueAtTime(0.05, t + fadeDuration); // Softer nighttime breeze
        // Fade out birds
        this.birdsGain?.gain.linearRampToValueAtTime(0, t + fadeDuration);
        
        // Start cricket scheduler (chirp every 2-4 seconds)
        this.triggerCricketChirp();
        this.cricketTimer = setInterval(() => this.triggerCricketChirp(), 3000);
        
        // Start bonfire crackler
        this.startFireSounds();
      }
    }
  }

  /**
   * Toggles the audio playback.
   */
  togglePlayback() {
    if (!this.isInitialized) {
      this.initAudio();
    }
    
    const wasPlaying = this.isPlaying();
    this.isPlaying.set(!wasPlaying);
    
    if (this.audioCtx) {
      if (this.isPlaying()) {
        // Resume context if suspended
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }
        
        // Fade Master Volume In
        const t = this.audioCtx.currentTime;
        this.masterGain?.gain.setValueAtTime(0, t);
        this.masterGain?.gain.linearRampToValueAtTime(this.masterVolume, t + 1.0);
        
        // Update to current theme state
        this.updateSoundscape(this.themeService.theme());
      } else {
        // Fade Master Volume Out
        const t = this.audioCtx.currentTime;
        this.masterGain?.gain.linearRampToValueAtTime(0, t + 0.5);
        
        // Pause timers
        clearInterval(this.birdTimer);
        clearInterval(this.cricketTimer);
        clearTimeout(this.fireTimer);
      }
    }
  }
}
