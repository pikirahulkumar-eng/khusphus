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
          const rawUri = this.nativeRecording.uri;
          const durationSec = Math.max(1, Math.round(this.nativeRecording.currentTime || 1));
          this.nativeRecording = null;

          let finalUri = rawUri;
          if (rawUri && typeof rawUri === 'string' && rawUri.startsWith('file://')) {
            try {
              // 1. Try expo-file-system modern File API (fastest native access)
              try {
                const { File } = require('expo-file-system');
                const file = new File(rawUri);
                if (file.exists) {
                  const b64 = await file.base64();
                  if (b64) {
                    finalUri = `data:audio/mp4;base64,${b64}`;
                    console.log('[VOICE] Converted native recording via File.base64, length:', finalUri.length);
                  }
                }
              } catch (fsErr) {
                console.log('[VOICE] Modern FileSystem fallback, trying legacy/fetch:', fsErr);
              }

              // 2. Try legacy expo-file-system readAsStringAsync
              if (finalUri === rawUri) {
                try {
                  const FileSystemLegacy = require('expo-file-system/legacy');
                  const b64 = await FileSystemLegacy.readAsStringAsync(rawUri, {
                    encoding: FileSystemLegacy.EncodingType.Base64,
                  });
                  if (b64) {
                    finalUri = `data:audio/mp4;base64,${b64}`;
                    console.log('[VOICE] Converted native recording via legacy FileSystem, length:', finalUri.length);
                  }
                } catch (_) {}
              }

              // 3. Fallback to React Native fetch + FileReader
              if (finalUri === rawUri) {
                const resp = await fetch(rawUri);
                const blob = await resp.blob();
                const base64Data = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const res = reader.result as string;
                    resolve(res ? res.replace(/^data:[^;]*;base64,/, 'data:audio/mp4;base64,') : rawUri);
                  };
                  reader.onerror = () => resolve(rawUri);
                  reader.readAsDataURL(blob);
                });
                if (base64Data && base64Data.startsWith('data:')) {
                  finalUri = base64Data;
                  console.log('[VOICE] Converted native recording via fetch/FileReader, length:', finalUri.length);
                }
              }
            } catch (convErr) {
              console.warn('[VOICE] Base64 conversion exception:', convErr);
            }
          }

          return { uri: finalUri, durationSec };
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
        let playUri = uri;
        if (playUri.startsWith('data:audio/m4a;')) {
          playUri = playUri.replace('data:audio/m4a;', 'data:audio/mp4;');
        }
        if (playUri.startsWith('file://')) {
          alert('This voice note was recorded with an older app version and is stored on the phone. Please record and send a new voice message.');
          if (this.playbackCallback) this.playbackCallback(false);
          this.activePlaybackUrl = null;
          return;
        }

        const audio = new Audio(playUri);
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
        this.activePlaybackUrl = null;
      }
    } else {
      try {
        let nativePlayUri = uri;

        // If it is a base64 data URI on native, write to a temp cache file so ExoPlayer can play it
        if (nativePlayUri.startsWith('data:')) {
          try {
            const isWebm = nativePlayUri.includes('webm');
            const ext = isWebm ? 'webm' : 'm4a';
            const base64Data = nativePlayUri.replace(/^data:[^;]+;base64,/, '');

            // Try legacy FileSystem first
            let wroteFile = false;
            try {
              const FileSystemLegacy = require('expo-file-system/legacy');
              const tempPath = `${FileSystemLegacy.cacheDirectory}voice_${Date.now()}.${ext}`;
              await FileSystemLegacy.writeAsStringAsync(tempPath, base64Data, {
                encoding: FileSystemLegacy.EncodingType.Base64,
              });
              nativePlayUri = tempPath;
              wroteFile = true;
              console.log('[VOICE] Wrote base64 to temp file (legacy):', nativePlayUri);
            } catch (_) {}

            // Modern FileSystem fallback
            if (!wroteFile) {
              const { File, Paths } = require('expo-file-system');
              const tempFile = new File(Paths.cache, `voice_${Date.now()}.${ext}`);
              if (tempFile.exists) {
                try { tempFile.delete(); } catch (_) {}
              }
              tempFile.create();
              const binaryStr = atob(base64Data);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              await tempFile.write(bytes);
              nativePlayUri = tempFile.uri;
              console.log('[VOICE] Wrote base64 to temp file (modern):', nativePlayUri);
            }
          } catch (writeErr) {
            console.warn('[VOICE] Could not write base64 to temp file, attempting direct play:', writeErr);
          }
        }

        const { createAudioPlayer } = require('expo-audio');
        const player = createAudioPlayer(nativePlayUri);
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
        this.activePlaybackUrl = null;
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

  public setPlaybackRate(rate: number): void {
    if (this.currentSound) {
      try {
        if (Platform.OS === 'web') {
          this.currentSound.playbackRate = rate;
        } else {
          if ('playbackRate' in this.currentSound) {
            this.currentSound.playbackRate = rate;
          } else if (typeof this.currentSound.setPlaybackRate === 'function') {
            this.currentSound.setPlaybackRate(rate);
          } else if (typeof this.currentSound.setRateAsync === 'function') {
            this.currentSound.setRateAsync(rate, true);
          }
        }
      } catch (e) {
        console.warn('[VOICE] setPlaybackRate exception:', e);
      }
    }
  }

  public getActiveAudioUrl(): string | null {
    return this.activePlaybackUrl;
  }
}

export const VoiceService = new VoiceRecordingService();
