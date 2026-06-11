/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// Generates white noise for stadium simulation
function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const bufferSize = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Synthesizes a referee's whistle ('beep-beep-beeep!') paired with a rising crowd roar ('GOAL!').
 */
export function playGoalCheers() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // -------------------------------------------------------------
    // PART 1: Referee Whistle Synthesis (High Pitch + Rapid Vibrato)
    // -------------------------------------------------------------
    const playWhistleBurst = (startSec: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      // Whistle vibrato LFO (low frequency oscillator) to mimic pea-whistle
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 35; // Vibrato frequency (Hz)
      lfoGain.gain.value = 180; // Vibrato depth (Hz deviation)
      
      osc.type = 'sine';
      osc.frequency.value = 2100; // Whistle peak frequency

      // Connect LFO to pitch
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Whistle Amplitude Envelope
      oscGain.gain.setValueAtTime(0, startSec);
      oscGain.gain.linearRampToValueAtTime(gainVal * 0.35, startSec + 0.02);
      oscGain.gain.setValueAtTime(gainVal * 0.35, startSec + duration - 0.03);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, startSec + duration);

      // Filter to sweeten whistle sound and reduce clickiness
      const bandpassNode = ctx.createBiquadFilter();
      bandpassNode.type = 'bandpass';
      bandpassNode.frequency.value = 2100;
      bandpassNode.Q.value = 4.0;

      osc.connect(oscGain);
      oscGain.connect(bandpassNode);
      bandpassNode.connect(ctx.destination);

      lfo.start(startSec);
      osc.start(startSec);

      lfo.stop(startSec + duration);
      osc.stop(startSec + duration);
    };

    // Referee blows whistle twice quickly at kickoff/goal
    playWhistleBurst(now, 0.08, 0.8);
    playWhistleBurst(now + 0.12, 0.25, 0.9);

    // -------------------------------------------------------------
    // PART 2: Crowd Roar Synthesis (Filtered White Noise + Soft Envelope)
    // -------------------------------------------------------------
    const noiseSec = 3.5;
    const noiseBuffer = createNoiseBuffer(ctx, noiseSec);
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();

    // Stadium acoustics are low-mid heavy, bandpass around 380Hz with wide bandwidth Q=1.2
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 420;
    noiseFilter.Q.value = 1.2;

    // Highpass to clean sub-bass rumble
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 150;

    // Crowd Roar Volume Envelope (gradual swell then fade)
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.4); // Roar swells up instantly
    noiseGain.gain.exponentialRampToValueAtTime(0.3, now + 1.2); // Sizzles down slightly
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseSec); // Fades away

    // Setup connections
    noiseNode.connect(noiseFilter);
    noiseFilter.connect(hpFilter);
    hpFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseNode.start(now + 0.15); // Start roar right after first whistle
    noiseNode.stop(now + noiseSec);

  } catch (error) {
    console.warn('Audio synthesis neglected due to browser context limitations or missing interaction:', error);
  }
}
