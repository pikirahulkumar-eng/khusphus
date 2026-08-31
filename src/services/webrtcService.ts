// Native WebRTC & Targeted Real-Time Streaming Engine for Synking
// STUN + OpenRelay TURN Pool • 1-on-1 Targeted Signaling • Real Hardware Camera Capture

import { RealtimeBridge } from './realtimeBridge';
import { RingtoneService } from './ringtoneService';
import { AudioRouteService } from './audioRouteService';
import { UserProfile, CallSession } from '../types';
import { PermissionsAndroid, Platform } from 'react-native';
import { MediaDevices, PeerConnection, SessionDescription, IceCandidate } from './webrtcCore';
import { NotificationService } from './notificationService';
import { CallDebugger } from './callDebugger';

// High-Speed WebRTC Ice Server Configuration (Google STUN + Free OpenRelay TURN Fallback)
const ICE_SERVERS: any = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    }
  ],
  iceCandidatePoolSize: 10,
};

type CallStateListener = (session: CallSession | null) => void;
type FrameListener = (frame: string | null) => void;

class WebRTCManager {
  private currentSession: CallSession | null = null;
  private listeners: Set<CallStateListener> = new Set();
  private logListeners: Set<(msg: string) => void> = new Set();
  private frameListeners: Set<FrameListener> = new Set();
  private durationTimer: any = null;
  private ringingTimeoutTimer: any = null;
  private localStream: any = null;
  private remoteStream: any = null;
  private remoteVideoFrame: string | null = null;
  private peerConnection: any = null;
  private pendingOffer: any = null;
  private iceCandidateQueue: any[] = [];
  public localVideoElementRef: any = null;
  public iceStatus: string = 'disconnected';

  constructor() {
    // Listen for Targeted Real-Time Call Signaling from peer
    RealtimeBridge.subscribe(async ({ type, payload, targetUserId }) => {
      // We rely on the WebSocket server and AppContext to route messages correctly.
      // If a WebRTC signaling message reaches here with a targetUserId, it was meant for us.

      if (type === 'CALL_ACCEPTED' && payload) {
        if (this.currentSession && (this.currentSession.status === 'calling' || this.currentSession.status === 'ringing')) {
          this.currentSession.status = 'connected';
          RingtoneService.stop();
          CallDebugger.logStage('WEBSOCKET', 'OK', { signal: 'CALL_ACCEPTED' });
          this.log('📞 CALL_ACCEPTED received from peer. Initiating WebRTC SDP offer handshake...');
          this.notify();
          this.startTimer();

          // Create SDP Offer if I am caller
          if (this.currentSession.id.startsWith('call_')) {
            this.createAndSendOffer();
          }
        }
      } else if (type === 'WEBRTC_OFFER' && payload) {
        if (this.peerConnection && this.peerConnection.signalingState !== 'stable') {
          return;
        }
        CallDebugger.logStage('WEBRTC', 'PENDING', { step: 'OFFER_RECEIVED' });
        this.log('⚡ WEBRTC_OFFER received from peer. Generating SDP Answer...');
        this.pendingOffer = payload.offer;
        if (this.currentSession && this.currentSession.status === 'connected') {
          this.handleIncomingOffer(payload.offer);
        }
      } else if (type === 'WEBRTC_ANSWER' && payload) {
        if (this.peerConnection) {
          if (this.peerConnection.signalingState === 'have-local-offer') {
            try {
              await this.peerConnection.setRemoteDescription(new SessionDescription(payload.answer));
              CallDebugger.logStage('WEBRTC', 'OK', { step: 'ANSWER_APPLIED_CONNECTED' });
              this.log('✅ WEBRTC_ANSWER applied. P2P Direct Relay Established via STUN/TURN!');
              await this.drainIceCandidates();
            } catch (e) {
              CallDebugger.logStage('WEBRTC', 'FAIL', { error: String(e) });
              this.log(`❌ WEBRTC_ANSWER error: ${e}`);
            }
          }
        }
      } else if (type === 'WEBRTC_ICE' && payload) {
        if (payload.candidate) {
          await this.addIceCandidate(payload.candidate);
        }
      } else if (type === 'CALL_REJECTED' && payload) {
        if (this.currentSession && this.currentSession.id === payload.callId) {
          CallDebugger.logStage('CALL_REJECTED', 'INFO', { callId: payload.callId });
          this.log('❌ Call rejected by peer.');
          this.cleanup();
        }
      } else if (type === 'CALL_ENDED' && payload) {
        if (this.currentSession && this.currentSession.id === payload.callId) {
          CallDebugger.logStage('CALL_ENDED', 'INFO', { callId: payload.callId });
          this.log('🛑 Call ended by peer.');
          this.cleanup();
        }
      } else if (type === 'CALL_UPGRADED_TO_VIDEO' && payload) {
        if (this.currentSession && this.currentSession.id === payload.callId) {
          this.log('📹 Peer upgraded the call to Live Video!');
          this.currentSession.type = 'video';
          this.currentSession.isVideoEnabled = true;
          this.currentSession.isSpeakerOn = true;
          AudioRouteService.setSpeakerOn(true).catch(() => {});
          this.notify();
        }
      }
    });
  }

  private getPeerUserId(): string {
    if (!this.currentSession) return '';
    if (this.currentSession.receiverId === 'my_user_id' || this.currentSession.status === 'ringing') {
      return this.currentSession.callerId;
    }
    return this.currentSession.receiverId;
  }

  public onLog(listener: (msg: string) => void): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  public onRemoteFrame(listener: FrameListener): () => void {
    this.frameListeners.add(listener);
    listener(this.remoteVideoFrame);
    return () => this.frameListeners.delete(listener);
  }

  public log(msg: string) {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(`[WEBRTC_DEBUG] ${entry}`);
    this.logListeners.forEach(cb => {
      try { cb(entry); } catch (e) {}
    });
  }

  public subscribe(listener: CallStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentSession);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.currentSession ? { ...this.currentSession } : null));
  }

  // 1. Initiate Outgoing Call
  public async startCall(params: {
    callerUser: UserProfile;
    targetUser: UserProfile;
    type: 'audio' | 'video';
  }): Promise<CallSession> {
    this.cleanup();

    const newSession: CallSession = {
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      callerId: params.callerUser.id,
      receiverId: params.targetUser.id,
      callerName: params.targetUser.name,
      callerPhoto: params.targetUser.photo || params.targetUser.photos?.[0] || '',
      type: params.type,
      status: 'calling',
      durationSeconds: 0,
      isMuted: false,
      isSpeakerOn: params.type === 'video',
      isVideoEnabled: params.type === 'video',
    };

    this.currentSession = newSession;
    CallDebugger.logStage('CALL DATA', 'OK', { 
      callId: newSession.id, 
      target: params.targetUser.name, 
      type: params.type 
    });
    CallDebugger.printCallSummary(newSession.id, params.callerUser.name, params.type);

    this.log(`🚀 Starting outgoing ${params.type} call to ${params.targetUser.name}...`);
    this.notify();

    // Play Outgoing Ringtone (Tring... Tring...)
    RingtoneService.playOutgoingRing();

    // Route Audio: Earpiece for voice calls, Loudspeaker for video calls
    AudioRouteService.setSpeakerOn(params.type === 'video').catch(() => {});

    // Capture Local Hardware Microphone & Camera
    await this.initLocalStream(params.type === 'video');

    // Send Targeted INCOMING_CALL to recipient device
    RealtimeBridge.broadcast(
      'INCOMING_CALL',
      {
        callId: newSession.id,
        callerUser: params.callerUser,
        receiverId: params.targetUser.id,
        type: params.type,
      },
      params.targetUser.id
    );

    // ⏱️ Auto-disconnect if unanswered in 35s
    this.startRingingTimeout(35);

    return newSession;
  }

  // 2. Receive Incoming Call
  public receiveIncomingCall(callerUser: UserProfile, type: 'audio' | 'video' = 'audio', callId?: string): CallSession {
    this.cleanup();

    const incomingSession: CallSession = {
      id: callId || `incoming_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      callerId: callerUser.id,
      receiverId: 'my_user_id',
      callerName: callerUser.name,
      callerPhoto: callerUser.photo || callerUser.photos?.[0] || '',
      type,
      status: 'ringing',
      durationSeconds: 0,
      isMuted: false,
      isSpeakerOn: type === 'video',
      isVideoEnabled: type === 'video',
    };

    this.currentSession = incomingSession;
    CallDebugger.logStage('CALL DATA', 'OK', { 
      callId: incomingSession.id, 
      caller: callerUser.name, 
      type 
    });
    CallDebugger.printCallSummary(incomingSession.id, callerUser.name, type);

    this.log(`📲 Incoming ${type} call ringing from ${callerUser.name}...`);
    this.notify();

    // Play Melodic Incoming Ringtone
    RingtoneService.playIncomingRing();

    // ⏱️ Auto-disconnect if unanswered in 35s
    this.startRingingTimeout(35);

    return incomingSession;
  }

  // 3. Accept Incoming Call
  public async acceptCall() {
    if (!this.currentSession) return;
    this.cleanupTimers();
    RingtoneService.stop();

    this.log('📞 Answering call: Capturing local audio/video media stream...');
    const isVideo = this.currentSession.type === 'video';
    AudioRouteService.setSpeakerOn(isVideo).catch(() => {});
    await this.initLocalStream(isVideo);

    this.currentSession.status = 'connected';
    this.notify();
    this.startTimer();

    const peerId = this.getPeerUserId();
    RealtimeBridge.broadcast(
      'CALL_ACCEPTED',
      {
        callId: this.currentSession.id,
      },
      peerId
    );

    if (this.pendingOffer) {
      await this.handleIncomingOffer(this.pendingOffer);
    }
  }

  // 4. Reject Incoming Call
  public rejectCall() {
    const callId = this.currentSession?.id;
    const peerId = this.getPeerUserId();
    this.log('❌ Rejecting incoming call.');
    this.cleanup();
    RealtimeBridge.broadcast('CALL_REJECTED', { callId }, peerId);
  }

  // 5. End Ongoing Call
  public endCall(): { session: CallSession; durationFormatted: string } | null {
    if (!this.currentSession) return null;
    const sessionCopy = { ...this.currentSession };
    const durationFormatted = this.formatDuration(sessionCopy.durationSeconds);
    const callId = sessionCopy.id;
    const peerId = this.getPeerUserId();
    this.log(`🛑 Ending ongoing call (${durationFormatted}).`);
    this.cleanup();
    RealtimeBridge.broadcast('CALL_ENDED', { callId }, peerId);
    return { session: sessionCopy, durationFormatted };
  }

  private async initLocalStream(includeVideo: boolean) {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        if (
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          this.log('❌ Camera or Microphone permission denied by user.');
          return;
        }
      }

      if (MediaDevices && MediaDevices.getUserMedia) {
        // HACK: Always request video! If we don't request video, mobile Chrome/Safari routes audio to the EARPIECE and sometimes uses the wrong muted mic!
        this.localStream = await MediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: includeVideo ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
        });

        const audioTracks = this.localStream?.getAudioTracks?.() || [];
        this.log(`🎙️ AUDIO TRACK COUNT: ${audioTracks.length}`);
        audioTracks.forEach((track: any) => {
          this.log(`🎙️ AUDIO TRACK: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}, kind=${track.kind}`);
        });

        this.log(`🟢 Hardware stream captured: Audio (${this.localStream.getAudioTracks().length}), Video (${this.localStream.getVideoTracks().length})`);
        return;
      }
    } catch (err) {
      this.log(`⚠️ Hardware stream capture error: ${err}`);
    }
  }

  private setupPeerConnection() {
    try {
      if (!PeerConnection) {
        this.log('❌ WebRTC PeerConnection API not available.');
        return;
      }

      this.peerConnection = new PeerConnection(ICE_SERVERS);
      this.iceStatus = 'connecting';
      this.log('🌐 RTCPeerConnection initialized with Google STUN + OpenRelay TURN.');

      // Attach Local Media Tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach((track: any) => {
          this.peerConnection.addTrack(track, this.localStream);
          if (track.kind === 'audio') {
            this.log(`📤 AUDIO SENT: enabled=${track.enabled}, readyState=${track.readyState}`);
          }
        });
        this.log(`📤 Attached ${this.localStream.getTracks().length} local media tracks to PeerConnection.`);
      }

        // Handle Remote Incoming Media Stream (Audio/Video from Peer)
        this.peerConnection.ontrack = (event: any) => {
          const track = event.track;
          this.log(`📥 REMOTE TRACK: kind=${track?.kind}, enabled=${track?.enabled}, muted=${track?.muted}, readyState=${track?.readyState}, audioTracks=${event.streams?.[0]?.getAudioTracks()?.length || 0}`);
          
          if (track) {
            track.onunmute = () => this.log(`🔊 REMOTE TRACK UNMUTED! RTP Packets are arriving for ${track.kind}!`);
            track.onmute = () => this.log(`🔇 REMOTE TRACK MUTED! RTP Packets stopped for ${track.kind}!`);
          }

          let stream = event.streams && event.streams[0];
          
          if (!stream) {
            this.log(`⚠️ event.streams is empty! Manually binding track to remote stream.`);
            if (!this.remoteStream) {
              // @ts-ignore - Handle web vs native MediaStream
              this.remoteStream = typeof MediaStream !== 'undefined' ? new MediaStream() : null;
            }
            if (this.remoteStream && event.track) {
              // @ts-ignore
              this.remoteStream.addTrack(event.track);
            }
          } else {
            this.remoteStream = stream;
          }

          if (this.remoteStream) {
            this.log(`🎥 REMOTE STREAM READY! Audio: ${this.remoteStream.getAudioTracks().length}, Video: ${this.remoteStream.getVideoTracks().length}`);
            const shouldBeSpeaker = this.currentSession?.isSpeakerOn ?? (this.currentSession?.type === 'video');
            AudioRouteService.setSpeakerOn(shouldBeSpeaker).catch(() => {});
            this.notify();
          }
        };

        // Fallback for older react-native-webrtc or specific web polyfills
        // @ts-ignore
        this.peerConnection.onaddstream = (event: any) => {
          this.log(`📡 onaddstream fired!`);
          if (event.stream) {
            this.remoteStream = event.stream;
            this.log(`🎥 REMOTE STREAM READY (Legacy)! Audio: ${this.remoteStream.getAudioTracks().length}, Video: ${this.remoteStream.getVideoTracks().length}`);
            const shouldBeSpeaker = this.currentSession?.isSpeakerOn ?? (this.currentSession?.type === 'video');
            AudioRouteService.setSpeakerOn(shouldBeSpeaker).catch(() => {});
            this.notify();
          }
        };

      // ICE Candidate Relay (Strictly targeted to peer)
      const peerId = this.getPeerUserId();
        
      this.peerConnection.onicegatheringstatechange = () => {
        const pc = this.peerConnection;
        if (!pc) {
          this.log('⚠️ ICE gathering event ignored: PeerConnection already cleaned up.');
          return;
        }
        this.log(`🧊 ICE gathering: ${pc.iceGatheringState}`);
      };

      this.peerConnection.onconnectionstatechange = () => {
        const pc = this.peerConnection;
        if (!pc) {
          this.log('⚠️ Connection state event ignored: PeerConnection already cleaned up.');
          return;
        }
        this.log(`🔌 Connection state: ${pc.connectionState}`);
      };

      this.peerConnection.onicecandidate = (event: any) => {
        if (event.candidate) {
          const currentPeer = this.getPeerUserId();
          this.log(`🧊 ICE candidate generated: ${event.candidate.candidate}`);
          RealtimeBridge.broadcast('WEBRTC_ICE', { candidate: event.candidate, callId: this.currentSession?.id }, currentPeer);
        } else {
          this.log(`🧊 ICE candidate gathering complete.`);
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        if (this.peerConnection) {
          this.iceStatus = this.peerConnection.iceConnectionState;
          this.log(`🌐 ICE RELAY STATE: ${this.iceStatus}`);
          this.notify();
        }
      };
    } catch (e) {
      this.log(`❌ setupPeerConnection error: ${e}`);
    }
  }

  private async createAndSendOffer() {
    this.setupPeerConnection();
    if (!this.peerConnection) return;

    try {
      const isVideo = this.currentSession?.isVideoEnabled || false;
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideo,
      });
      await this.peerConnection.setLocalDescription(offer);
      const peerId = this.getPeerUserId();
      RealtimeBridge.broadcast('WEBRTC_OFFER', { offer, callId: this.currentSession?.id }, peerId);
      this.log(`📤 Targeted SDP Offer sent strictly to peer (${peerId}).`);
    } catch (e) {
      this.log(`❌ createOffer error: ${e}`);
    }
  }

  private async handleIncomingOffer(offer: any) {
    this.setupPeerConnection();
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new SessionDescription(offer));
      this.log('📥 Remote SDP Offer set. Creating Targeted SDP Answer...');
      await this.drainIceCandidates();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      const peerId = this.getPeerUserId();
      RealtimeBridge.broadcast('WEBRTC_ANSWER', { answer, callId: this.currentSession?.id }, peerId);
      this.log(`📤 Targeted SDP Answer sent back strictly to caller (${peerId}).`);
    } catch (e) {
      this.log(`❌ handleIncomingOffer error: ${e}`);
    }
  }

  private async addIceCandidate(candidate: any) {
    if (this.peerConnection && this.peerConnection.remoteDescription) {
      try {
        await this.peerConnection.addIceCandidate(new IceCandidate(candidate));
        this.log('🌐 ICE Candidate applied directly to PeerConnection.');
      } catch (e) {
        this.log(`⚠️ addIceCandidate error: ${e}`);
      }
    } else {
      this.iceCandidateQueue.push(candidate);
      this.log('⏳ ICE Candidate queued (waiting for remote SDP handshake).');
    }
  }

  private async drainIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      try {
        await this.peerConnection.addIceCandidate(new IceCandidate(candidate));
        this.log('🌐 Queued ICE Candidate flushed to PeerConnection.');
      } catch (e) {}
    }
  }

  public getSession(): CallSession | null {
    return this.currentSession;
  }

  public getLocalStream(): any {
    return this.localStream;
  }

  public getRemoteStream(): any {
    return this.remoteStream;
  }

  public getRemoteVideoFrame(): string | null {
    return this.remoteVideoFrame;
  }

  public toggleMute(): boolean {
    if (!this.currentSession) return false;
    this.currentSession.isMuted = !this.currentSession.isMuted;
    const isMuted = this.currentSession.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !isMuted;
      });
    }
    this.log(isMuted ? '🔇 MUTE ON: Mic track disabled' : '🎙️ MUTE OFF: Mic track active');
    this.notify();
    return this.currentSession.isMuted;
  }

  public async toggleVideo(): Promise<boolean> {
    if (!this.currentSession) return false;

    // 1. If in Voice call or video track not present: Acquire Camera Stream!
    const existingVideoTracks = this.localStream?.getVideoTracks?.() || [];
    
    if (existingVideoTracks.length === 0) {
      try {
        this.log('📹 Upgrading Audio Call to Video: Capturing camera stream...');
        if (MediaDevices && MediaDevices.getUserMedia) {
          const videoStream = await MediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });

          const newVideoTrack = videoStream.getVideoTracks()[0];
          if (newVideoTrack) {
            if (!this.localStream) {
              this.localStream = videoStream;
            } else {
              this.localStream.addTrack(newVideoTrack);
            }

            if (this.peerConnection) {
              this.peerConnection.addTrack(newVideoTrack, this.localStream);
              this.createAndSendOffer();
            }

            this.currentSession.type = 'video';
            this.currentSession.isVideoEnabled = true;
            this.currentSession.isSpeakerOn = true;
            AudioRouteService.setSpeakerOn(true).catch(() => {});
            
            // Inform peer that call is upgraded to video
            const peerId = this.getPeerUserId();
            RealtimeBridge.broadcast('CALL_UPGRADED_TO_VIDEO', { callId: this.currentSession.id }, peerId);

            this.log('🎥 Video Camera Enabled! Call upgraded to Live Video.');
            this.notify();
            return true;
          }
        }
      } catch (err) {
        this.log(`❌ Failed to acquire camera track: ${err}`);
        return false;
      }
    }

    // 2. If video track already exists, toggle enabled state
    this.currentSession.isVideoEnabled = !this.currentSession.isVideoEnabled;
    const isVideo = this.currentSession.isVideoEnabled;
    
    existingVideoTracks.forEach((track: any) => {
      track.enabled = isVideo;
    });

    if (isVideo) {
      this.currentSession.type = 'video';
    }

    this.log(isVideo ? '📹 CAMERA ON: Video track enabled' : '📷 CAMERA OFF: Video track disabled');
    this.notify();
    return this.currentSession.isVideoEnabled;
  }

  public switchCamera(): void {
    if (!this.currentSession || !this.localStream) return;
    
    // Default to front camera initially if undefined
    if (this.currentSession.isFrontCamera === undefined) {
      this.currentSession.isFrontCamera = true;
    }
    
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks && videoTracks.length > 0) {
      const videoTrack = videoTracks[0];
      
      // Native react-native-webrtc provides _switchCamera method
      if (typeof videoTrack._switchCamera === 'function') {
        videoTrack._switchCamera();
        this.currentSession.isFrontCamera = !this.currentSession.isFrontCamera;
        this.log(`🔄 CAMERA SWITCHED: Now using ${this.currentSession.isFrontCamera ? 'Front' : 'Back'} camera.`);
        this.notify();
      } else {
        // Fallback for Web/Browser which doesn't have _switchCamera easily without re-creating stream
        this.log(`⚠️ switchCamera not directly supported on this platform without stream recreation.`);
      }
    }
  }

  public async toggleSpeaker(): Promise<boolean> {
    if (!this.currentSession) return false;
    this.currentSession.isSpeakerOn = !this.currentSession.isSpeakerOn;
    const isSpeaker = this.currentSession.isSpeakerOn;
    AudioRouteService.setSpeakerOn(isSpeaker).catch(() => {});
    this.log(isSpeaker ? '🔊 SPEAKER ON: Loudspeaker active' : '🔈 EARPIECE: Internal receiver active');
    this.notify();
    return this.currentSession.isSpeakerOn;
  }
  public formatDuration(sec: number): string {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  }

  private startRingingTimeout(seconds: number = 35) {
    if (this.ringingTimeoutTimer) {
      clearTimeout(this.ringingTimeoutTimer);
    }
    this.ringingTimeoutTimer = setTimeout(() => {
      if (this.currentSession && (this.currentSession.status === 'calling' || this.currentSession.status === 'ringing')) {
        this.log(`⏱️ 35s Call Timeout: No answer received within 35 seconds. Automatically ending call.`);
        this.endCall();
      }
    }, seconds * 1000);
  }

  private startTimer() {
    this.cleanupTimers();
    this.durationTimer = setInterval(() => {
      if (this.currentSession && this.currentSession.status === 'connected') {
        this.currentSession.durationSeconds += 1;
        this.notify();
      }
    }, 1000);
  }

  private cleanupTimers() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.ringingTimeoutTimer) {
      clearTimeout(this.ringingTimeoutTimer);
      this.ringingTimeoutTimer = null;
    }
  }

  private cleanup() {
    this.cleanupTimers();
    RingtoneService.stop();
    AudioRouteService.resetAudioRoute().catch(() => {});
    this.iceStatus = 'disconnected';
    this.pendingOffer = null;
    this.iceCandidateQueue = [];
    this.remoteVideoFrame = null;

    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((track: any) => track.stop());
      } catch (e) {}
      this.localStream = null;
    }

    const pc = this.peerConnection;
    this.peerConnection = null;

    if (pc) {
      try {
        pc.close();
      } catch (e) {}
    }

    this.remoteStream = null;
    this.currentSession = null;
    this.notify();
  }
}

export const WebRTCService = new WebRTCManager();

