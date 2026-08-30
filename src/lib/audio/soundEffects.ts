// Web Audio API Procedural Sound Engine
// Works 100% offline, zero asset downloads required, crystal clear audio quality
import { AmbientSoundType } from '@/types';
export type { AmbientSoundType };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioNode | null = null;
  private ambientGain: GainNode | null = null;
  private currentAmbientType: string = 'none';

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Âm chuông Singing Bowl / Thiền sâu khi kết thúc Pomodoro / Bắt đầu Focus
   */
  playBell(type: 'complete' | 'start' | 'break' = 'complete') {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = type === 'complete' ? 528 : type === 'start' ? 432 : 396; // Solfeggio frequencies

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.5, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'complete' ? 3.5 : 2.0));

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 4);
      osc2.stop(now + 4);
    } catch {
      // AudioContext might be blocked before first user interaction
    }
  }

  /**
   * Âm thanh tick nhẹ khi hoàn thành 1 task / thói quen
   */
  playPop() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio blocked
    }
  }

  /**
   * Phát âm thanh nền thực nghiệm (Procedural Ambient Sound)
   */
  playAmbient(type: AmbientSoundType, volume = 50) {
    if (type === 'none') {
      this.stopAmbient();
      return;
    }

    if (this.currentAmbientType === type && this.ambientSource) {
      return;
    }

    this.stopAmbient();
    this.currentAmbientType = type;

    try {
      const ctx = this.getContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime((volume / 100) * 0.15, ctx.currentTime);
      gain.connect(ctx.destination);
      this.ambientGain = gain;

      if (type === 'whitenoise' || type === 'rain' || type === 'waves' || type === 'cafe') {
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = noiseBuffer;
        noiseNode.loop = true;

        if (type === 'rain') {
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, ctx.currentTime);
          noiseNode.connect(filter);
          filter.connect(gain);
        } else if (type === 'waves') {
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(400, ctx.currentTime);

          // LFO oscillator for rhythmic wave sweep
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8s cycle
          lfoGain.gain.setValueAtTime(300, ctx.currentTime);

          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          lfo.start();

          noiseNode.connect(filter);
          filter.connect(gain);
        } else if (type === 'cafe') {
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(600, ctx.currentTime);
          filter.Q.setValueAtTime(1.5, ctx.currentTime);

          noiseNode.connect(filter);
          filter.connect(gain);
        } else {
          noiseNode.connect(gain);
        }

        noiseNode.start();
        this.ambientSource = noiseNode;
      } else if (type === 'gamma40hz') {
        const merger = ctx.createChannelMerger(2);
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();

        oscL.type = 'sine';
        oscL.frequency.setValueAtTime(200, ctx.currentTime);

        oscR.type = 'sine';
        oscR.frequency.setValueAtTime(240, ctx.currentTime);

        oscL.connect(merger, 0, 0);
        oscR.connect(merger, 0, 1);

        merger.connect(gain);

        oscL.start();
        oscR.start();
        this.ambientSource = merger;
      }
    } catch {
      // Audio setup error
    }
  }

  setAmbientVolume(volume: number) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime((volume / 100) * 0.15, this.ctx.currentTime);
    }
  }

  stopAmbient() {
    if (this.ambientSource) {
      try {
        if (
          'stop' in this.ambientSource &&
          typeof (this.ambientSource as AudioScheduledSourceNode).stop === 'function'
        ) {
          (this.ambientSource as AudioScheduledSourceNode).stop();
        }
        this.ambientSource.disconnect();
      } catch {
        // Ignore
      }
      this.ambientSource = null;
    }
    this.currentAmbientType = 'none';
  }
}

export const soundEngine =
  typeof window !== 'undefined' ? new AudioEngine() : (null as unknown as AudioEngine);
