import { Platform } from 'react-native';

// Web & Native Audio Service
class VoiceRecordingService {
  private isRecording = false;
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private currentSound: any = null;
  private nativeRecording: any = null;
  private activePlaybackUrl: string | null = null;
  private playbackCallback: ((isPlaying: boolean) => void) | null = null;

  public async startRecording(): Promise<boolean> {
    try {
      this.isRecording = true;
      if (Platform.OS === 'web') {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('[VOICE] getUserMedia not supported on this browser');
          return false;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioChunks = [];
        this.mediaRecorder = new (window as any).MediaRecorder(stream);
        
        this.mediaRecorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };
        
        this.mediaRecorder.start(100);
        console.log('[VOICE] Web MediaRecorder started');
        return true;
      } else {
        // Native (Android/iOS) via expo-audio (Expo SDK 57)
        try {
          const { AudioModule, RecordingPresets, requestRecordingPermissionsAsync } = require('expo-audio');
          const perm = await requestRecordingPermissionsAsync();
          if (!perm.granted) {
            console.warn('[VOICE] Audio recording permission not granted');
            return false;
          }
          const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
          await recorder.prepareToRecordAsync();
          recorder.record();
          this.nativeRecording = recorder;
          console.log('[VOICE] Native expo-audio AudioRecorder started');
          return true;
        } catch (err) {
          console.warn('[VOICE] Native recording start error:', err);
          return false;
        }
      }
    } catch (e) {
      console.error('[VOICE] Failed to start recording:', e);
      this.isRecording = false;
      return false;
    }
  }

  public async stopRecording(): Promise<{ uri: string; durationSec: number } | null> {
    if (!this.isRecording) return null;
    this.isRecording = false;

    try {
      if (Platform.OS === 'web') {
        if (!this.mediaRecorder) return null;
        return new Promise((resolve) => {
          this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              const base64Audio = reader.result as string;
              // Clean up media tracks
              if (this.mediaRecorder && this.mediaRecorder.stream) {
                this.mediaRecorder.stream.getTracks().forEach((t: any) => t.stop());
              }
              resolve({
                uri: base64Audio,
                durationSec: Math.max(1, Math.round(this.audioChunks.length * 0.1)),
              });
            };
          };
          this.mediaRecorder.stop();
        });
      } else {
        if (!this.nativeRecording) return null;
        try {
          await this.nativeRecording.stop();
          const uri = this.nativeRecording.uri;
          const durationSec = Math.max(1, Math.round(this.nativeRecording.currentTime || 1));
          this.nativeRecording = null;
          return { uri, durationSec };
        } catch (e) {
          console.warn('[VOICE] Native stop error:', e);
          return null;
        }
      }
    } catch (e) {
      console.error('[VOICE] Error stopping recording:', e);
      return null;
    }
  }

  public cancelRecording() {
    this.isRecording = false;
    if (Platform.OS === 'web' && this.mediaRecorder) {
      try {
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach((t: any) => t.stop());
        }
        this.mediaRecorder.stop();
      } catch (e) {}
      this.mediaRecorder = null;
      this.audioChunks = [];
    } else if (this.nativeRecording) {
      try {
        this.nativeRecording.stop();
      } catch (e) {}
      this.nativeRecording = null;
    }
  }

  public async playAudio(uri: string, onPlaybackStatus?: (isPlaying: boolean) => void): Promise<void> {
    await this.stopAudio();
    this.activePlaybackUrl = uri;
    this.playbackCallback = onPlaybackStatus || null;

    if (Platform.OS === 'web') {
      try {
        const audio = new Audio(uri);
        this.currentSound = audio;
        audio.onended = () => {
          if (this.playbackCallback) this.playbackCallback(false);
          this.activePlaybackUrl = null;
          this.currentSound = null;
        };
        audio.onerror = (e) => {
          console.warn('[VOICE] Audio play error:', e);
          if (this.playbackCallback) this.playbackCallback(false);
          this.activePlaybackUrl = null;
          this.currentSound = null;
        };
        await audio.play();
        if (this.playbackCallback) this.playbackCallback(true);
      } catch (e) {
        console.warn('[VOICE] Play audio web exception:', e);
        if (this.playbackCallback) this.playbackCallback(false);
      }
    } else {
      try {
        const { createAudioPlayer } = require('expo-audio');
        const player = createAudioPlayer(uri);
        this.currentSound = player;
        player.addListener('playbackStatusUpdate', (status: any) => {
          if (status?.playbackState === 'ended' || (status?.duration > 0 && status?.currentTime >= status?.duration)) {
            if (this.playbackCallback) this.playbackCallback(false);
            this.activePlaybackUrl = null;
            this.currentSound = null;
          }
        });
        player.play();
        if (this.playbackCallback) this.playbackCallback(true);
      } catch (e) {
        console.warn('[VOICE] Play audio native exception:', e);
        if (this.playbackCallback) this.playbackCallback(false);
      }
    }
  }

  public async stopAudio(): Promise<void> {
    if (this.currentSound) {
      try {
        if (Platform.OS === 'web') {
          this.currentSound.pause();
          this.currentSound.currentTime = 0;
        } else {
          this.currentSound.pause();
          if (typeof this.currentSound.remove === 'function') {
            this.currentSound.remove();
          }
        }
      } catch (e) {}
      this.currentSound = null;
    }
    if (this.playbackCallback) {
      this.playbackCallback(false);
    }
    this.activePlaybackUrl = null;
  }

  public getActiveAudioUrl(): string | null {
    return this.activePlaybackUrl;
  }
}

export const VoiceService = new VoiceRecordingService();
