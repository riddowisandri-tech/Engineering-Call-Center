
/**
 * Master Audio Service - Single Source of Truth for all sounds
 */

let sharedAudioCtx: AudioContext | null = null;

export const getSharedAudioCtx = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
      sampleRate: 44100 
    });
  }
  return sharedAudioCtx;
};

/**
 * Explicitly resumes the audio context and primes it with a silent buffer.
 * This is CRITICAL for mobile browsers (iOS/Android) to allow subsequent 
 * audio playback triggered by network events (like Gemini API responses).
 */
export const resumeAudioContext = async () => {
  const ctx = getSharedAudioCtx();
  
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Audio Priming: Play a short burst of silence to "warm up" the hardware
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
};

/**
 * Tracks the last time a dispatch chime started
 */
let lastDispatchEndTime = 0;
const DISPATCH_CHIME_TOTAL_DURATION = 1.8; 

/**
 * Plays a professional 4-tone ascending arpeggio
 */
export const playDispatchSound = () => {
  const ctx = getSharedAudioCtx();
  
  const now = ctx.currentTime;
  
  const playTone = (freq: number, start: number, duration: number, volume: number = 0.4) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(volume, start + 0.05); 
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    
    osc.connect(g);
    g.connect(ctx.destination);
    
    osc.start(start);
    osc.stop(start + duration);
  };

  const interval = 0.25; 
  playTone(392.00, now, 0.6);                // G4
  playTone(493.88, now + interval, 0.6);      // B4
  playTone(587.33, now + interval * 2, 0.6);  // D5
  playTone(783.99, now + interval * 3, 0.8, 0.5);  // G5

  lastDispatchEndTime = now + DISPATCH_CHIME_TOTAL_DURATION;
  return lastDispatchEndTime;
};

export const getDispatchEndTime = () => {
  return lastDispatchEndTime;
};

export const playNewTicketAlert = () => {
  const ctx = getSharedAudioCtx();
  const now = ctx.currentTime;
  
  for (let i = 0; i < 3; i++) {
    const t = now + (i * 0.15);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, t); 
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }
};

export const playAcknowledgeSound = () => {
  const ctx = getSharedAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(554.37, now);
  g.gain.setValueAtTime(0.1, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
  
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
};

export const playResolveSound = () => {
  const ctx = getSharedAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, now);
  osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.4);
  g.gain.setValueAtTime(0.1, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
  
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
};
