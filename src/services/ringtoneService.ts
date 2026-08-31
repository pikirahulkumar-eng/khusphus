import { Platform, Vibration } from 'react-native';
import { CallDebugger } from './callDebugger';

// Professional Ringtone Engine for SYNKING
// Uses expo-audio on native Android/iOS & Web Audio API for Web browsers
// Completely isolated from WebRTC call audio to prevent interference

let ExpoAudioModule: any = null;
try {
  ExpoAudioModule = require('expo-audio');
} catch (e) {}

const INCOMING_RINGTONE_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const OUTGOING_RINGTONE_URL = 'https://assets.mixkit.co/active_storage/sfx/1360/1360-preview.mp3';

class RingtoneServiceClass {
  private audioCtx: any = null;
  private ringInterval: any = null;
  private isPlaying: boolean = false;
  private currentMode: 'incoming' | 'outgoing' | null = null;
  private nativePlayer: any = null;

  private getAudioContext(): any {
    if (typeof window === 'undefined') return null;
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!this.audioCtx || this.audioCtx.state === 'closed') {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        return this.audioCtx;
      }
    } catch (e) {
      console.warn('[RINGTONE_CTX_WARN]', e);
    }
    return null;
  }

  // 1. OUTGOING CALL: Modern Dial Tone ("Tring... Tring...")
  public async playOutgoingRing() {
    if (this.isPlaying && this.currentMode === 'outgoing') return;
    this.stop();
    this.isPlaying = true;
    this.currentMode = 'outgoing';
    CallDebugger.logStage('RINGTONE', 'OK', { mode: 'outgoing' });

    // Native expo-audio playback
    if (Platform.OS !== 'web' && ExpoAudioModule && typeof ExpoAudioModule.createAudioPlayer === 'function') {
      try {
        const player = ExpoAudioModule.createAudioPlayer({ uri: OUTGOING_RINGTONE_URL });
        player.loop = true;
        player.volume = 0.8;
        player.play();
        this.nativePlayer = player;
        return;
      } catch (e) {
        console.warn('[EXPO_AUDIO_OUTGOING_WARN]', e);
      }
    }

    // Audio Oscillator for Web & Fallback Environments
    const playPulse = () => {
      if (!this.isPlaying || this.currentMode !== 'outgoing') return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gainNode.gain.setValueAtTime(0.12, now + 0.9);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 1.1);
        gainNode.connect(ctx.destination);

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(425, now);
        osc1.connect(gainNode);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(450, now);
        osc2.connect(gainNode);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.1);
        osc2.stop(now + 1.1);
      } catch (e) {}
    };

    playPulse();
    this.ringInterval = setInterval(playPulse, 3200);
  }

  // 2. INCOMING CALL: Melodic Marimba Tone + Looping Vibration
  public async playIncomingRing() {
    if (this.isPlaying && this.currentMode === 'incoming') return;
    this.stop();
    this.isPlaying = true;
    this.currentMode = 'incoming';
    CallDebugger.logStage('RINGTONE', 'OK', { mode: 'incoming' });

    // 📳 Trigger standard incoming call vibration pattern on mobile
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 800, 1000], true);
        CallDebugger.logStage('VIBRATION', 'OK', { pattern: '[0, 800, 1000]' });
      } catch (e) {}
    }

    // Native expo-audio playback
    if (Platform.OS !== 'web' && ExpoAudioModule && typeof ExpoAudioModule.createAudioPlayer === 'function') {
      try {
        const player = ExpoAudioModule.createAudioPlayer({ uri: INCOMING_RINGTONE_URL });
        player.loop = true;
        player.volume = 1.0;
        player.play();
        this.nativePlayer = player;
        return;
      } catch (e) {
        console.warn('[EXPO_AUDIO_INCOMING_WARN]', e);
      }
    }

    // Melodic Synth Chime for Web
    const playMelody = () => {
      if (!this.isPlaying || this.currentMode !== 'incoming') return;
      const ctx = this.getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const notes = [
          { freq: 659.25, time: 0.00, dur: 0.22 },
          { freq: 830.61, time: 0.16, dur: 0.22 },
          { freq: 987.77, time: 0.32, dur: 0.22 },
          { freq: 1318.51, time: 0.48, dur: 0.35 },
          { freq: 987.77, time: 0.72, dur: 0.22 },
          { freq: 1318.51, time: 0.88, dur: 0.45 },
        ];

        notes.forEach(({ freq, time, dur }) => {
          const noteStart = now + time;
          const noteEnd = noteStart + dur;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, noteStart);
          gain.gain.linearRampToValueAtTime(0.22, noteStart + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);
          gain.connect(ctx.destination);

          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteStart);
          osc.connect(gain);

          osc.start(noteStart);
          osc.stop(noteEnd);
        });
      } catch (e) {}
    };

    playMelody();
    this.ringInterval = setInterval(playMelody, 2200);
  }

  // 3. STOP RINGTONE INSTANTLY & CANCEL VIBRATION
  public async stop() {
    this.isPlaying = false;
    this.currentMode = null;

    if (Platform.OS !== 'web') {
      try {
        Vibration.cancel();
      } catch (e) {}
    }

    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }

    if (this.nativePlayer) {
      try {
        this.nativePlayer.pause();
        if (typeof this.nativePlayer.release === 'function') {
          this.nativePlayer.release();
        }
      } catch (e) {}
      this.nativePlayer = null;
    }
  }

  // 4. IN-APP MESSAGE CHIME: Sweet notification ping ("Pop... Ting")
  public playMessageChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      osc.connect(gain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }
}

export const RingtoneService = new RingtoneServiceClass();


