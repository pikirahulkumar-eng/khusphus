// Native WebRTC & Targeted Real-Time Streaming Engine for Synking
// STUN + OpenRelay TURN Pool • 1-on-1 Targeted Signaling • Real Hardware Camera Capture

import { RealtimeBridge } from './realtimeBridge';
import { RingtoneService } from './ringtoneService';
import { AudioRouteService } from './audioRouteService';
import { UserProfile, CallSession } from '../types';
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
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

  public getCurrentSession(): CallSession | null {
    return this.currentSession;
  }
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
  private isSwitchingCamera: boolean = false;
  private iceDisconnectTimer: any = null;
  private declineDismissTimer: any = null;
  private ringingPulseTimer: any = null;
  private connectionWatchdogTimer: any = null;
  private isCallMinimized: boolean = false;

  private targetChatUserId: string | null = null;

  public setMinimized(minimized: boolean) {
    this.isCallMinimized = minimized;
    this.notify();
  }

  public getIsMinimized(): boolean {
    return this.isCallMinimized;
  }

  public setTargetChatUserId(userId: string | null) {
    this.targetChatUserId = userId;
  }

  public getTargetChatUserId(): string | null {
    return this.targetChatUserId;
  }

  constructor() {
    // Listen for Targeted Real-Time Call Signaling from peer
    RealtimeBridge.subscribe(async ({ type, payload, targetUserId }) => {
      // We rely on the WebSocket server and AppContext to route messages correctly.
      // If a WebRTC signaling message reaches here with a targetUserId, it was meant for us.

      if (type === 'CALL_RINGING' && payload) {
        if (this.currentSession && (this.currentSession.id === payload.callId || !payload.callId) && this.currentSession.status === 'calling') {
          this.currentSession.status = 'ringing';
          CallDebugger.logStage('WEBSOCKET', 'OK', { signal: 'CALL_RINGING' });
          this.log('🔔 CALL_RINGING received from peer: Remote phone is ringing!');
          this.notify();
        }
      } else if (type === 'CALL_ACCEPTED' && payload) {
        if (this.currentSession && (this.currentSession.status === 'calling' || this.currentSession.status === 'ringing')) {
          this.currentSession.status = 'connected';
          RingtoneService.stop();
          CallDebugger.logStage('WEBSOCKET', 'OK', { signal: 'CALL_ACCEPTED' });
          this.log('📞 CALL_ACCEPTED received from peer. Initiating WebRTC SDP offer handshake...');
          this.notify();
          this.cleanupRingingPulse();
          this.startConnectionWatchdog();
          this.startTimer();
          if (Platform.OS === 'android' && NativeModules.TelecomModule?.startOngoingCall) {
            NativeModules.TelecomModule.startOngoingCall(this.currentSession.callerName || 'Synkin Call').catch(() => {});
          }

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
        if (this.currentSession && (!payload.callId || this.currentSession.id === payload.callId)) {
          this.handleCallDeclined();
        }
      } else if (type === 'CALL_ENDED' && payload) {
        if (this.currentSession && (!payload.callId || this.currentSession.id === payload.callId)) {
          this.handleCallEnded();
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
    const myId = RealtimeBridge.myUserId;
    if (myId && this.currentSession.callerId === myId) {
      return this.currentSession.receiverId || '';
    }
    if (myId && this.currentSession.receiverId === myId) {
      return this.currentSession.callerId || '';
    }
    return this.currentSession.callerId || this.currentSession.receiverId || '';
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
      isIncoming: false,
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

    // Capture Local Hardware Microphone & Camera (This resets the audio route)
    await this.initLocalStream(params.type === 'video');

    // Route audio: Loudspeaker for video call, In-ear Handset Earpiece for voice call
    const isVideo = params.type === 'video';
    setTimeout(() => {
        AudioRouteService.setSpeakerOn(isVideo).catch(() => {});
    }, 500);

    // Send Targeted INCOMING_CALL to recipient device
    RealtimeBridge.broadcast(
      'INCOMING_CALL',
      {
        callId: newSession.id,
        callerUser: params.callerUser,
        receiverId: params.targetUser.id,
        type: params.type,
        callType: params.type,
      },
      params.targetUser.id
    );

    // ⏱️ Auto-disconnect if unanswered in 50s (WhatsApp/Telecom Standard)
    this.startRingingTimeout(50);

    // 💓 3.5s Continuous Ringing Pulse: ensures instant incoming call screen if recipient opens app mid-call after force close
    if (this.ringingPulseTimer) clearInterval(this.ringingPulseTimer);
    this.ringingPulseTimer = setInterval(() => {
      if (this.currentSession && (this.currentSession.status === 'calling' || this.currentSession.status === 'ringing')) {
        RealtimeBridge.broadcast(
          'INCOMING_CALL',
          {
            callId: newSession.id,
            callerUser: params.callerUser,
            receiverId: params.targetUser.id,
            type: params.type,
            callType: params.type,
          },
          params.targetUser.id
        );
      } else {
        if (this.ringingPulseTimer) {
          clearInterval(this.ringingPulseTimer);
          this.ringingPulseTimer = null;
        }
      }
    }, 3500);

    return newSession;
  }

  // 2. Receive Incoming Call
  public receiveIncomingCall(callerUser: UserProfile, type: 'audio' | 'video' = 'audio', callId?: string, autoAccept: boolean = false): CallSession {
    if (callId && this.currentSession && this.currentSession.id === callId && (this.currentSession.status === 'ringing' || this.currentSession.status === 'connected')) {
      this.log(`📲 Duplicate call event ignored for callId=${callId}`);
      return this.currentSession;
    }

    this.cleanupPeerConnectionOnly();

    const incomingSession: CallSession = {
      id: callId || `incoming_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      callerId: callerUser.id,
      receiverId: 'my_user_id',
      callerName: callerUser.name,
      callerPhoto: callerUser.photo || callerUser.photos?.[0] || '',
      type,
      status: autoAccept ? 'connected' : 'ringing', // Bypass ringing if coming from native accept!
      durationSeconds: 0,
      isMuted: false,
      isSpeakerOn: type === 'video', // Video defaults to Loudspeaker, Audio defaults to In-ear Earpiece
      isVideoEnabled: type === 'video',
      isIncoming: true,
    };

    this.currentSession = incomingSession;
    CallDebugger.logStage('CALL DATA', 'OK', { 
      callId: incomingSession.id, 
      caller: callerUser.name, 
      type 
    });
    CallDebugger.printCallSummary(incomingSession.id, callerUser.name, type);

    this.log(`📲 Incoming ${type} call from ${callerUser.name} (autoAccept: ${autoAccept})...`);
    this.notify();

    if (autoAccept) {
      // Native lockscreen already accepted it, skip ringtone and timer!
      this.startTimer();
    } else {
      // Normal React Native incoming call flow
      RingtoneService.playIncomingRing();
      this.startRingingTimeout(50);
      RealtimeBridge.broadcast(
        'CALL_RINGING',
        { callId: incomingSession.id },
        callerUser.id
      );
    }

    return incomingSession;
  }

  private acceptingCallId: string | null = null;

  // 3. Accept Incoming Call
  public async acceptCall(callId?: string) {
    const targetCallId = callId || this.currentSession?.id;
    if (!this.currentSession || !targetCallId) return;
    if (this.currentSession.status === 'connected' && this.currentSession.id === targetCallId && this.peerConnection) {
      this.log(`⚠️ acceptCall: already connected for callId=${targetCallId}, skipping.`);
      return;
    }
    if (this.acceptingCallId === targetCallId) {
      this.log(`⚠️ acceptCall: already in progress for callId=${targetCallId}, skipping.`);
      return;
    }
    this.acceptingCallId = targetCallId;
    try {
      this.cleanupTimers();
      RingtoneService.stop();

      // Dismiss heads-up incoming call notification banner immediately
      if (Platform.OS === 'android' && NativeModules.TelecomModule?.dismissIncomingNotification) {
        NativeModules.TelecomModule.dismissIncomingNotification().catch(() => {});
      }

      const isVideo = this.currentSession?.type === 'video';
      
      if (!this.localStream) {
        await this.initLocalStream(isVideo);
      }

      // Route audio: Loudspeaker for video call, In-ear Handset Earpiece for voice call
      const isVideoCall = this.currentSession?.type === 'video' || this.currentSession?.isVideoEnabled;
      setTimeout(() => {
        AudioRouteService.setSpeakerOn(!!isVideoCall).catch(() => {});
      }, 500);

      this.currentSession.status = 'connected';
      this.notify();
      this.cleanupRingingPulse();
      this.startConnectionWatchdog();
      this.startTimer();
      if (Platform.OS === 'android' && NativeModules.TelecomModule?.startOngoingCall) {
        NativeModules.TelecomModule.startOngoingCall(this.currentSession.callerName || 'Synkin Call').catch(() => {});
      }

      const peerId = this.getPeerUserId();
      this.log(`🚀 Broadcasting CALL_ACCEPTED for callId=${this.currentSession.id} to peerId=${peerId || 'ALL'}`);
      RealtimeBridge.broadcast(
        'CALL_ACCEPTED',
        {
          callId: this.currentSession.id,
        },
        peerId || undefined
      );

      if (this.pendingOffer) {
        await this.handleIncomingOffer(this.pendingOffer);
      }
    } finally {
      this.acceptingCallId = null;
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
    if (this.declineDismissTimer) {
      clearTimeout(this.declineDismissTimer);
      this.declineDismissTimer = null;
    }
    if (!this.currentSession) { this.cleanup(); return null; }
    const sessionCopy = { ...this.currentSession };
    const durationFormatted = this.formatDuration(sessionCopy.durationSeconds || 0);
    const callId = sessionCopy.id;
    const callerName = sessionCopy.callerName || '';
    const peerId = this.getPeerUserId();
    this.log(`🛑 Ending ongoing call (${durationFormatted}).`);
    this.cleanup();
    RealtimeBridge.broadcast('CALL_ENDED', { callId, callerName }, peerId);
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
          this.notifyNativeVideoStreams();
          }

          if (this.remoteStream) {
            this.log(`🎥 REMOTE STREAM READY! Audio: ${this.remoteStream.getAudioTracks().length}, Video: ${this.remoteStream.getVideoTracks().length}`);
            const isVideoCall = this.currentSession?.type === 'video' || this.currentSession?.isVideoEnabled;
            const shouldBeSpeaker = this.currentSession?.isSpeakerOn ?? !!isVideoCall;
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
            this.notifyNativeVideoStreams();
            this.log(`🎥 REMOTE STREAM READY (Legacy)! Audio: ${this.remoteStream.getAudioTracks().length}, Video: ${this.remoteStream.getVideoTracks().length}`);
            const isVideoCall = this.currentSession?.type === 'video' || this.currentSession?.isVideoEnabled;
            const shouldBeSpeaker = this.currentSession?.isSpeakerOn ?? !!isVideoCall;
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
        if (Platform.OS === 'android' && NativeModules.TelecomModule?.updateDebugStatus) {
          NativeModules.TelecomModule.updateDebugStatus('WEBRTC', pc.connectionState.toUpperCase()).catch(() => {});
        }
        // 🚀 Signal IncomingCallActivity to hand off when WebRTC is connected
        if (pc.connectionState === 'connected' && Platform.OS === 'android' && NativeModules.TelecomModule?.notifyWebRTCConnected) {
          NativeModules.TelecomModule.notifyWebRTCConnected().catch(() => {});
        }
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          this.log('🛑 Remote peer disconnected. Auto cleaning up...');
          this.cleanup();
        }
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
          if (Platform.OS === 'android' && NativeModules.TelecomModule?.updateDebugStatus) {
            NativeModules.TelecomModule.updateDebugStatus('ICE RELAY', this.iceStatus.toUpperCase()).catch(() => {});
          }
          if (this.iceStatus === 'failed' || this.iceStatus === 'closed') {
            this.log('🛑 Remote ICE closed/failed. Auto cleaning up...');
            this.cleanup();
          } else if (this.iceStatus === 'disconnected') {
            this.log('⏳ Remote ICE transient disconnect. Waiting 5s grace period before cleanup...');
            if (!this.iceDisconnectTimer) {
              this.iceDisconnectTimer = setTimeout(() => {
                if (this.iceStatus === 'disconnected' || this.iceStatus === 'failed') {
                  this.log('🛑 Remote ICE disconnected for >5s. Auto cleaning up...');
                  this.cleanup();
                }
                this.iceDisconnectTimer = null;
              }, 5000);
            }
          } else if (this.iceStatus === 'connected' || this.iceStatus === 'completed') {
            if (this.connectionWatchdogTimer) {
              clearTimeout(this.connectionWatchdogTimer);
              this.connectionWatchdogTimer = null;
            }
            if (this.iceDisconnectTimer) {
              clearTimeout(this.iceDisconnectTimer);
              this.iceDisconnectTimer = null;
            }
          }
          this.notify();
        }
      };
    } catch (e) {
      this.log(`❌ setupPeerConnection error: ${e}`);
    }
  }

  private async createAndSendOffer() {
    // 🛡️ HARDWARE-READY LOCK: Ensure local audio/video hardware is captured before creating Offer
    if (!this.localStream) {
      const isVideo = this.currentSession?.type === 'video' || this.currentSession?.isVideoEnabled;
      await this.initLocalStream(!!isVideo);
    }

    this.setupPeerConnection();
    if (!this.peerConnection) return;

    // Attach any unattached local stream tracks to PeerConnection
    if (this.localStream && this.peerConnection) {
      const senders = typeof this.peerConnection.getSenders === 'function' ? this.peerConnection.getSenders() : [];
      this.localStream.getTracks().forEach((track: any) => {
        const alreadyAdded = senders.some((s: any) => s.track && s.track.kind === track.kind);
        if (!alreadyAdded) {
          try {
            this.peerConnection.addTrack(track, this.localStream);
            this.log(`📤 Attached local ${track.kind} track to PeerConnection before Offer.`);
          } catch (e) {}
        }
      });
    }

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
    // 🛡️ HARDWARE-READY LOCK: Ensure local audio/video hardware is captured before creating Answer
    if (!this.localStream) {
      const isVideo = this.currentSession?.type === 'video' || this.currentSession?.isVideoEnabled;
      await this.initLocalStream(!!isVideo);
    }

    this.setupPeerConnection();
    if (!this.peerConnection) return;

    // Attach any unattached local stream tracks to PeerConnection
    if (this.localStream && this.peerConnection) {
      const senders = typeof this.peerConnection.getSenders === 'function' ? this.peerConnection.getSenders() : [];
      this.localStream.getTracks().forEach((track: any) => {
        const alreadyAdded = senders.some((s: any) => s.track && s.track.kind === track.kind);
        if (!alreadyAdded) {
          try {
            this.peerConnection.addTrack(track, this.localStream);
            this.log(`📤 Attached local ${track.kind} track to PeerConnection before Answer.`);
          } catch (e) {}
        }
      });
    }

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

  public setMute(on: boolean): boolean {
    if (!this.currentSession) return false;
    if (this.currentSession.isMuted === on) return on;
    this.currentSession.isMuted = on;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !on;
      });
    }
    this.log(on ? '🔇 MUTE ON: Mic track disabled' : '🎙️ MUTE OFF: Mic track active');
    this.notify();
    return on;
  }

  public toggleMute(): boolean {
    if (!this.currentSession) return false;
    return this.setMute(!this.currentSession.isMuted);
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

  public async switchCamera(): Promise<void> {
    if (!this.currentSession || !this.localStream) return;
    
    if (this.isSwitchingCamera) {
      this.log('⏳ CAMERA SWITCH: Switch already in progress, debouncing duplicate tap.');
      return;
    }
    this.isSwitchingCamera = true;

    try {
      // Default to front camera initially if undefined
      if (this.currentSession.isFrontCamera === undefined) {
        this.currentSession.isFrontCamera = true;
      }

      const nextIsFront = !this.currentSession.isFrontCamera;
      const targetFacingMode = nextIsFront ? 'user' : 'environment';

      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks && videoTracks.length > 0) {
        const videoTrack = videoTracks[0];

        // Method 1: Try Native react-native-webrtc _switchCamera method
        if (typeof videoTrack._switchCamera === 'function') {
          try {
            const res = videoTrack._switchCamera();
            if (res instanceof Promise) {
              await res;
            }
            this.currentSession.isFrontCamera = nextIsFront;
            this.log(`🔄 CAMERA SWITCHED (Native): Now using ${nextIsFront ? 'Front' : 'Back'} camera.`);
            this.notify();
            return;
          } catch (nativeErr) {
            this.log(`⚠️ Native _switchCamera error: ${nativeErr}, attempting re-capture fallback...`);
          }
        }

        // Method 2: Universal Fallback for Browsers & Multi-Lens Android Devices
        try {
          if (MediaDevices && MediaDevices.getUserMedia) {
            this.log(`🔄 Re-capturing camera stream with facingMode='${targetFacingMode}'...`);
            
            let newVideoStream: any = null;
            try {
              newVideoStream = await MediaDevices.getUserMedia({
                video: { facingMode: targetFacingMode, width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
              });
            } catch (facingErr) {
              newVideoStream = await MediaDevices.getUserMedia({
                video: { facingMode: targetFacingMode },
                audio: false,
              });
            }

            const newVideoTrack = newVideoStream?.getVideoTracks()?.[0];
            if (newVideoTrack) {
              videoTrack.stop();
              this.localStream.removeTrack(videoTrack);
              this.localStream.addTrack(newVideoTrack);

              if (this.peerConnection) {
                const senders = this.peerConnection.getSenders ? this.peerConnection.getSenders() : [];
                const videoSender = senders.find((s: any) => s.track && s.track.kind === 'video');
                if (videoSender && typeof videoSender.replaceTrack === 'function') {
                  await videoSender.replaceTrack(newVideoTrack);
                  this.log('✅ Replaced video track on RTCRtpSender successfully.');
                }
              }

              this.currentSession.isFrontCamera = nextIsFront;
              this.log(`🔄 CAMERA SWITCHED (Fallback): Now using ${nextIsFront ? 'Front' : 'Back'} camera.`);
              this.notify();
            }
          }
        } catch (err) {
          this.log(`❌ Failed to switch camera: ${err}`);
        }
      }
    } finally {
      setTimeout(() => {
        this.isSwitchingCamera = false;
      }, 500);
    }
  }

  public async setSpeaker(on: boolean): Promise<boolean> {
    if (!this.currentSession) return false;
    if (this.currentSession.isSpeakerOn === on) return on;
    this.currentSession.isSpeakerOn = on;
    AudioRouteService.setSpeakerOn(on).catch(() => {});
    if (Platform.OS === 'android' && NativeModules.TelecomModule?.setSpeakerOn) {
      NativeModules.TelecomModule.setSpeakerOn(on).catch(() => {});
    }
    if (this.currentSession.status === 'connected' && this.currentSession.type === 'audio') {
      AudioRouteService.setProximitySensorEnabled(!on).catch(() => {});
    }
    this.log(on ? '🔊 SPEAKER SET: Loudspeaker active' : '🔈 EARPIECE SET: Internal receiver active');
    this.notify();
    return on;
  }

  public async toggleSpeaker(): Promise<boolean> {
    if (!this.currentSession) return false;
    return this.setSpeaker(!this.currentSession.isSpeakerOn);
  }
  public formatDuration(sec: number): string {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  }

  private startRingingTimeout(seconds: number = 50) {
    if (this.ringingTimeoutTimer) {
      clearTimeout(this.ringingTimeoutTimer);
    }
    this.ringingTimeoutTimer = setTimeout(() => {
      if (this.currentSession && (this.currentSession.status === 'calling' || this.currentSession.status === 'ringing')) {
        this.log(`⏱️ ${seconds}s Call Timeout: No answer received within ${seconds} seconds. Automatically ending call.`);
        this.endCall();
      }
    }, seconds * 1000);
  }

  private cleanupRingingPulse() {
    if (this.ringingPulseTimer) {
      clearInterval(this.ringingPulseTimer);
      this.ringingPulseTimer = null;
    }
  }

  private startConnectionWatchdog() {
    if (this.connectionWatchdogTimer) {
      clearTimeout(this.connectionWatchdogTimer);
    }
    this.connectionWatchdogTimer = setTimeout(async () => {
      if (this.currentSession && this.currentSession.status === 'connected') {
        const isIceActive = this.iceStatus === 'connected' || this.iceStatus === 'completed';
        if (!isIceActive) {
          this.log('🛡️ [3s WATCHDOG] WebRTC stream not yet active after 3s. Auto ICE restart triggered...');
          try {
            if (this.peerConnection && typeof this.peerConnection.restartIce === 'function') {
              this.peerConnection.restartIce();
            }
            if (this.currentSession.id.startsWith('call_')) {
              await this.createAndSendOffer();
            }
          } catch (e) {
            this.log(`⚠️ Watchdog ICE restart error: ${e}`);
          }
        }
      }
      this.connectionWatchdogTimer = null;
    }, 3000);
  }

  private notifyNativeVideoStreams() {
    try {
      const { NativeModules, Platform } = require('react-native');
      if (Platform.OS === 'android' && this.currentSession?.type === 'video') {
        if (this.localStream && NativeModules.TelecomModule?.attachLocalVideo) {
          NativeModules.TelecomModule.attachLocalVideo(this.localStream.toURL());
        }
        if (this.remoteStream && NativeModules.TelecomModule?.attachRemoteVideo) {
          NativeModules.TelecomModule.attachRemoteVideo(this.remoteStream.toURL());
        }
      }
    } catch (e) {
      console.warn('Native WebRTC bridge failed:', e);
    }
  }

  private startTimer() {
    this.cleanupTimers();
    this.durationTimer = setInterval(() => {
      if (this.currentSession && this.currentSession.status === 'connected') {
        this.currentSession.durationSeconds = (this.currentSession.durationSeconds || 0) + 1;
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
    if (this.iceDisconnectTimer) {
      clearTimeout(this.iceDisconnectTimer);
      this.iceDisconnectTimer = null;
    }
    if (this.ringingPulseTimer) {
      clearInterval(this.ringingPulseTimer);
      this.ringingPulseTimer = null;
    }
    if (this.connectionWatchdogTimer) {
      clearTimeout(this.connectionWatchdogTimer);
      this.connectionWatchdogTimer = null;
    }
  }

  private isCleaningUp = false;

  private cleanupPeerConnectionOnly() {
    try {
      this.cleanupTimers();
      RingtoneService.stop();
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
    } catch (e) {}
  }

  public handleCallDeclined() {
    if (!this.currentSession) return;
    this.log('❌ Call was declined by recipient.');
    CallDebugger.logStage('CALL_DECLINED', 'INFO', { callId: this.currentSession.id });

    // 1. Instantly stop outgoing ringtone, ringback, and any vibrations
    RingtoneService.stop();
    try {
      const { Vibration } = require('react-native');
      Vibration.cancel();
      // Distinct double vibration pulse to alert caller of call decline
      Vibration.vibrate([0, 150, 100, 150]);
    } catch (e) {}

    // 2. Stop 35s ringing timeout and duration timers
    this.cleanupTimers();

    // 3. Immediately close peer connection & stop media tracks (turn off mic & camera)
    this.cleanupPeerConnectionOnly();

    // 4. Update session status to 'rejected' and notify UI components
    this.currentSession.status = 'rejected';
    this.notify();

    // 5. Hold visual "Call Declined" screen for 2.5s before graceful auto-dismiss
    if (this.declineDismissTimer) {
      clearTimeout(this.declineDismissTimer);
    }
    this.declineDismissTimer = setTimeout(() => {
      this.declineDismissTimer = null;
      this.cleanup();
    }, 2500);
  }

  public handleCallEnded() {
    if (!this.currentSession) return;
    this.log('🛑 Call ended by peer.');
    CallDebugger.logStage('CALL_ENDED', 'INFO', { callId: this.currentSession.id });

    // 1. Instantly stop all audio & ringtones
    RingtoneService.stop();
    try {
      const { Vibration } = require('react-native');
      Vibration.cancel();
      Vibration.vibrate(150);
    } catch (e) {}

    // 2. Stop timers and release peer connection
    this.cleanupTimers();
    this.cleanupPeerConnectionOnly();

    // 3. Update session status to 'ended' and notify UI
    this.currentSession.status = 'ended';
    this.notify();

    // 4. Hold "Call Ended" state for 1.8s before auto-dismiss
    if (this.declineDismissTimer) {
      clearTimeout(this.declineDismissTimer);
    }
    this.declineDismissTimer = setTimeout(() => {
      this.declineDismissTimer = null;
      this.cleanup();
    }, 1800);
  }

  private cleanup() {
    if (this.declineDismissTimer) {
      clearTimeout(this.declineDismissTimer);
      this.declineDismissTimer = null;
    }
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;
    try {
      this.isCallMinimized = false;
      this.cleanupTimers();
      RingtoneService.stop();
      AudioRouteService.resetAudioRoute().catch(() => {});
      
      // TELL OS THAT CALL IS OVER SO NATIVE DIALER IS UNBLOCKED
      if (Platform.OS === 'android' && NativeModules.TelecomModule?.endCall) {
        NativeModules.TelecomModule.endCall().catch(() => {});
      }

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
    } finally {
      this.isCleaningUp = false;
    }
  }
}

export const WebRTCService = new WebRTCManager();

