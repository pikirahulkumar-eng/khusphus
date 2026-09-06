import { Platform, Vibration } from 'react-native';
import { CallDebugger } from './callDebugger';

// Professional Ringtone Engine for SYNKING
// Uses expo-audio on native Android/iOS & Web Audio API for Web browsers
// Completely isolated from WebRTC call audio to prevent interference

let ExpoAudioModule: any = null;
try {
  ExpoAudioModule = require('expo-audio');
} catch (e) {}

const INCOMING_RINGTONE_URL = 'https://raw.githubusercontent.com/pikirahulkumar-eng/synking/main/assets/sounds/synk_signature.mp3';
const OUTGOING_RINGTONE_URL = 'https://assets.mixkit.co/active_storage/sfx/1360/1360-preview.mp3';

class RingtoneServiceClass {
  private audioCtx: any = null;
  private isPlaying: boolean = false;
  private currentMode: 'incoming' | 'outgoing' | null = null;
  private nativePlayer: any = null;
  private webAudio: any = null;

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

  // 1. OUTGOING CALL: Pleasant Ringback Tone (looping "Tuuu... Tuuu...")
  public async playOutgoingRing() {
    if ((globalThis as any).__SYNKING_RINGTONE_PLAYING__ && (globalThis as any).__SYNKING_RINGTONE_MODE__ === 'outgoing') {
      return;
    }
    this.stop();
    this.isPlaying = true;
    this.currentMode = 'outgoing';
    (globalThis as any).__SYNKING_RINGTONE_PLAYING__ = true;
    (globalThis as any).__SYNKING_RINGTONE_MODE__ = 'outgoing';
    CallDebugger.logStage('RINGTONE', 'OK', { mode: 'outgoing' });

    // Use native Android ToneGenerator for reliable ringback
    if (Platform.OS === 'android') {
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules.AudioRouteModule?.startRingbackTone) {
          NativeModules.AudioRouteModule.startRingbackTone();
          return;
        }
      } catch (e) {}
    }

    // Fallback: expo-audio for iOS
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

    // Audio Oscillator for Web
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
    (globalThis as any).__SYNKING_RINGTONE_INTERVAL__ = setInterval(playPulse, 3200);
  }

  // 2. INCOMING CALL: Melodic Marimba Tone + Looping Vibration
  public async playIncomingRing() {
    if ((globalThis as any).__SYNKING_RINGTONE_PLAYING__ && (globalThis as any).__SYNKING_RINGTONE_MODE__ === 'incoming') {
      return;
    }
    this.stop();
    this.isPlaying = true;
    this.currentMode = 'incoming';
    (globalThis as any).__SYNKING_RINGTONE_PLAYING__ = true;
    (globalThis as any).__SYNKING_RINGTONE_MODE__ = 'incoming';
    CallDebugger.logStage('RINGTONE', 'OK', { mode: 'incoming' });

    // Trigger vibration on mobile
    if (Platform.OS !== 'web') {
      try {
        Vibration.vibrate([0, 800, 1000], true);
      } catch (e) {}
    }

    // Native Android custom ringtone ("Synk Signature") via MediaPlayer
    if (Platform.OS === 'android') {
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules.AudioRouteModule?.startIncomingRingtone) {
          NativeModules.AudioRouteModule.startIncomingRingtone();
          return;
        }
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

    // Web HTML5 Audio playback for Synk Signature
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
      try {
        const webPlayer = new window.Audio(INCOMING_RINGTONE_URL);
        webPlayer.loop = true;
        webPlayer.volume = 1.0;
        this.webAudio = webPlayer;
        webPlayer.play().catch(err => {
          console.warn('[WEB_AUDIO_AUTOPLAY_BLOCKED]', err);
        });
        return;
      } catch (e) {
        console.warn('[WEB_AUDIO_INIT_ERR]', e);
      }
    }
  }

  // 3. STOP RINGTONE INSTANTLY & CANCEL VIBRATION
  public async stop() {
    this.isPlaying = false;
    this.currentMode = null;
    (globalThis as any).__SYNKING_RINGTONE_PLAYING__ = false;
    (globalThis as any).__SYNKING_RINGTONE_MODE__ = null;

    if ((globalThis as any).__SYNKING_RINGTONE_INTERVAL__) {
      clearInterval((globalThis as any).__SYNKING_RINGTONE_INTERVAL__);
      (globalThis as any).__SYNKING_RINGTONE_INTERVAL__ = null;
    }

    if (Platform.OS !== 'web') {
      try {
        Vibration.cancel();
      } catch (e) {}
    }

    // Stop native Android ringtone & ringback tone
    if (Platform.OS === 'android') {
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules.AudioRouteModule?.stopRingbackTone) {
          NativeModules.AudioRouteModule.stopRingbackTone();
        }
        if (NativeModules.AudioRouteModule?.stopIncomingRingtone) {
          NativeModules.AudioRouteModule.stopIncomingRingtone();
        }
      } catch (e) {}
    }

    if (this.webAudio) {
      try {
        this.webAudio.pause();
        this.webAudio.currentTime = 0;
      } catch (e) {}
      this.webAudio = null;
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


