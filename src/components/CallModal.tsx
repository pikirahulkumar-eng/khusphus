import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Platform, ScrollView, Share, Animated, PanResponder, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CallSession } from '../types';
import { WebRTCService } from '../services/webrtcService';
import { RingtoneService } from '../services/ringtoneService';
import { NativeRTCView } from '../services/webrtcCore';
import { useKeepAwake } from 'expo-keep-awake';
import { AudioRouteService } from '../services/audioRouteService';

// 1. Live Self Video Component (PiP) - Real Hardware Front Camera
const LiveSelfVideo: React.FC<{ isPip?: boolean }> = ({ isPip = true }) => {
  const videoRef = useRef<any>(null);

  const attachSelf = () => {
    if (Platform.OS === 'web') {
      const stream = WebRTCService.getLocalStream();
      if (stream && videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  };

  useEffect(() => {
    attachSelf();
    const interval = setInterval(attachSelf, 400);
    return () => clearInterval(interval);
  }, []);

  const stream = WebRTCService.getLocalStream();

  return (
    <View style={[styles.selfVideoPlaceholder, { backgroundColor: '#000000', borderRadius: isPip ? 16 : 0 }]}>
      {Platform.OS === 'web' ? (
        // @ts-ignore
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            borderRadius: isPip ? 16 : 0,
            backgroundColor: '#000000',
          }}
        />
      ) : (
        (NativeRTCView && stream) ? (
          <NativeRTCView
            streamURL={typeof stream.toURL === 'function' ? stream.toURL() : stream}
            style={{ width: '100%', height: '100%', borderRadius: isPip ? 16 : 0, backgroundColor: '#000000' }}
            objectFit="cover"
            mirror={true}
            zOrder={isPip ? 1 : 0}
          />
        ) : (
          <View style={{ width: '100%', height: '100%', borderRadius: isPip ? 16 : 0, overflow: 'hidden', backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="videocam-off" size={24} color="#555" />
          </View>
        )
      )}
    </View>
  );
};

// 2. Unified Live Media Component (Handles BOTH Audio and Video gracefully)
const LiveRemoteMedia: React.FC<{ type: 'voice' | 'video'; photoUrl?: string; isSpeakerOn?: boolean }> = ({ type, photoUrl, isSpeakerOn }) => {
  const mediaRef = useRef<any>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  const attemptPlay = () => {
    if (Platform.OS !== 'web') return;
    const remoteStream = WebRTCService.getRemoteStream();
    if (remoteStream && mediaRef.current) {
      if (mediaRef.current.srcObject !== remoteStream) {
        mediaRef.current.srcObject = remoteStream;
      }
      
      // NEVER mute the remote stream, otherwise we won't hear them!
      mediaRef.current.muted = false;
      mediaRef.current.volume = 1.0;
      
      const vTracks = remoteStream.getVideoTracks ? remoteStream.getVideoTracks() : [];
      if (vTracks.length > 0) {
        setHasVideo(true);
      }

      // Audio Hardware Sink Switcher: Earpiece (Voice Call) vs Loudspeaker (Video Call)
      if (typeof mediaRef.current.setSinkId === 'function' && navigator.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
          const earpiece = audioOutputs.find(d => 
            d.label.toLowerCase().includes('earpiece') || 
            d.label.toLowerCase().includes('receiver') || 
            d.label.toLowerCase().includes('internal') ||
            d.deviceId === 'earpiece' ||
            d.deviceId === 'communications'
          );
          const speaker = audioOutputs.find(d => 
            d.label.toLowerCase().includes('speaker') || 
            d.label.toLowerCase().includes('loudspeaker') ||
            d.deviceId === 'speaker'
          );
          
          if (isSpeakerOn && speaker) {
            mediaRef.current.setSinkId(speaker.deviceId).catch(() => {});
          } else if (!isSpeakerOn && earpiece) {
            mediaRef.current.setSinkId(earpiece.deviceId).catch(() => {});
          }
        }).catch(() => {});
      }

      mediaRef.current.play().then(() => {
        if (audioBlocked) {
          WebRTCService.log('🔊 AUDIO UNBLOCKED! Sound is playing.');
          setAudioBlocked(false);
        }
      }).catch((e: any) => {
        if (!audioBlocked) {
          WebRTCService.log('🔇 BROWSER BLOCKED AUDIO. User interaction needed.');
          setAudioBlocked(true);
        }
      });
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      attemptPlay();
      const interval = setInterval(attemptPlay, 400);
      return () => clearInterval(interval);
    }
  }, [isSpeakerOn]);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      {/* 100% Fullscreen Remote Video Surface */}
      {/* @ts-ignore */}
      <video
        ref={mediaRef}
        autoPlay
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />

      {audioBlocked && (
        <TouchableOpacity
          style={styles.unmuteFloatingBtn}
          onPress={attemptPlay}
          activeOpacity={0.8}
        >
          <Ionicons name="volume-high" size={14} color="#FFF" />
          <Text style={styles.unmuteFloatingText}>Tap to Unmute 🔊</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface Props {
  session: CallSession | null;
  onEndCall: () => void;
  onAcceptCall?: () => void;
  onToggleMute?: () => boolean;
  onToggleVideo?: () => boolean | Promise<boolean>;
  onToggleSpeaker?: () => boolean | Promise<boolean>;
}

export const CallModal: React.FC<Props> = ({ session, onEndCall, onAcceptCall }) => {
  if (!session) return null;

  // Prevent screen from sleeping while modal is open
  useKeepAwake();

  useEffect(() => {
    // If it's an audio call and connected, turn on proximity sensor to turn screen black near ear
    if (session.status === 'connected' && session.type === 'audio' && !session.isSpeakerOn) {
      AudioRouteService.setProximitySensorEnabled(true);
    } else {
      AudioRouteService.setProximitySensorEnabled(false);
    }
    return () => {
      AudioRouteService.setProximitySensorEnabled(false);
    };
  }, [session.status, session.type, session.isSpeakerOn]);

  const pipPan = useRef(new Animated.ValueXY()).current;
  const pipPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pipPan.x, dy: pipPan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pipPan.extractOffset();
      },
    })
  ).current;

  const [showDebugger, setShowDebugger] = useState(false);
  const [isLocalExpanded, setIsLocalExpanded] = useState(false);
  const isIncomingRinging = session.status === 'ringing' && (session.receiverId === 'my_user_id' || !session.callerId);
  const isConnected = session.status === 'connected';
  const durationText = WebRTCService.formatDuration(session.durationSeconds);
  const localStream = WebRTCService.getLocalStream();

  const [remoteStream, setRemoteStream] = useState<any>(() => WebRTCService.getRemoteStream());

  useEffect(() => {
    const updateRemoteStream = () => {
      setRemoteStream(WebRTCService.getRemoteStream());
    };
    updateRemoteStream();
    const unsub = WebRTCService.subscribe(updateRemoteStream);
    const interval = setInterval(updateRemoteStream, 300);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const [actionLogs, setActionLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] 🚀 Call session initialized: ${session.type.toUpperCase()} call.`
  ]);

  useEffect(() => {
    const unsubscribe = WebRTCService.onLog((entry: string) => {
      setActionLogs(prev => [entry, ...prev].slice(0, 30));
    });
    return () => unsubscribe();
  }, []);

  // Ringtone & Repeating Vibration Manager for Incoming Calls
  useEffect(() => {
    if (session.status === 'ringing') {
      RingtoneService.playIncomingRing();
      // Repeating Vibration Pattern: wait 0ms, vibrate 1000ms, pause 1000ms (repeating loop)
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 1000, 1000], true);
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([1000, 1000]);
        } catch (e) {}
      }
    } else if (session.status === 'calling') {
      RingtoneService.playOutgoingRing();
      Vibration.cancel();
    } else {
      RingtoneService.stop();
      Vibration.cancel();
    }

    return () => {
      RingtoneService.stop();
      Vibration.cancel();
    };
  }, [session.status]);

  const handleAccept = () => {
    RingtoneService.stop();
    Vibration.cancel();
    WebRTCService.log(`📞 ACCEPT TAPPED: User accepted incoming ${session.type} call. Connecting WebRTC P2P stream...`);
    if (onAcceptCall) {
      onAcceptCall();
    } else {
      WebRTCService.acceptCall();
    }
  };

  const handleDecline = () => {
    RingtoneService.stop();
    Vibration.cancel();
    WebRTCService.log('❌ DECLINE TAPPED: User declined incoming call. Sending CALL_REJECTED.');
    WebRTCService.rejectCall();
    onEndCall();
  };

  const handleEndCallAction = () => {
    RingtoneService.stop();
    Vibration.cancel();
    WebRTCService.log(`🛑 END CALL TAPPED: User ended ${session.type} call. Cleaning up tracks.`);
    onEndCall();
  };

  const [copied, setCopied] = useState(false);
  const [debugReportText, setDebugReportText] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [isLoopbackActive, setIsLoopbackActive] = useState(false);

  // Real-Time Microphone Level Analyzer (0% to 100%)
  useEffect(() => {
    // [DISABLED] Connecting WebAudio API (AudioContext) to a local MediaStream 
    // can cause Safari/Chrome to silently mute the outgoing WebRTC audio track!
    /*
    let animationId: any = null;
    let audioCtx: any = null;

    try {
      if (typeof window !== 'undefined' && localStream) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(localStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const percentage = Math.min(100, Math.round((avg / 128) * 100));
            setMicLevel(percentage);
            animationId = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      }
    } catch (e) {}

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioCtx) {
        try { audioCtx.close(); } catch (e) {}
      }
    };
    */
  }, [localStream]);

  // Test Mic Loopback (Hear your own voice live from speaker)
  const handleTestMicLoopback = () => {
    WebRTCService.log('🎙️ MIC LOOPBACK TEST: Routing local mic directly to speaker for 4s! Speak into your phone now...');
    try {
      if (typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext && localStream) {
          const ctx = new AudioContext();
          const source = ctx.createMediaStreamSource(localStream);
          source.connect(ctx.destination);
          setIsLoopbackActive(true);
          setTimeout(() => {
            try {
              source.disconnect();
              ctx.close();
            } catch (e) {}
            setIsLoopbackActive(false);
            WebRTCService.log('✅ MIC LOOPBACK COMPLETE: Verified local microphone hardware.');
          }, 4000);
        }
      }
    } catch (e) {
      WebRTCService.log(`❌ MIC TEST FAILED: ${e}`);
    }
  };

  // Test speaker sound beep (440Hz test tone via Web Audio)
  const handleTestSpeakerBeep = () => {
    WebRTCService.log('🧪 SPEAKER TEST: Generating 520Hz WebAudio test tone directly to speaker...');
    try {
      if (typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = 520;
          gain.gain.value = 0.4;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          setTimeout(() => {
            osc.stop();
            ctx.close();
            WebRTCService.log('✅ SPEAKER TEST COMPLETE: 520Hz tone played to audio destination.');
          }, 500);
        }
      }
    } catch (e) {
      WebRTCService.log(`❌ SPEAKER TEST FAILED: ${e}`);
    }
  };

  const generateReport = () => {
    const localAudio = localStream?.getAudioTracks().map((t: any) => ({ label: t.label, enabled: t.enabled, readyState: t.readyState })) || [];
    const localVideo = localStream?.getVideoTracks().map((t: any) => ({ label: t.label, enabled: t.enabled, readyState: t.readyState })) || [];
    const remoteAudio = remoteStream?.getAudioTracks().map((t: any) => ({ label: t.label, enabled: t.enabled, readyState: t.readyState })) || [];
    const remoteVideo = remoteStream?.getVideoTracks().map((t: any) => ({ label: t.label, enabled: t.enabled, readyState: t.readyState })) || [];

    return `=== SYNKING WEBRTC CALL DIAGNOSTICS ===
Timestamp: ${new Date().toISOString()}
Session ID: ${session.id}
Call Type: ${session.type}
Status: ${session.status}
Duration: ${session.durationSeconds}s
ICE Connection: ${WebRTCService.iceStatus}
Platform: ${Platform.OS}
UserAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}

--- LOCAL MEDIA STREAM ---
Local Stream Active: ${!!localStream}
Local Mic Tracks (${localAudio.length}): ${JSON.stringify(localAudio)}
Local Cam Tracks (${localVideo.length}): ${JSON.stringify(localVideo)}

--- REMOTE MEDIA STREAM ---
Remote Stream Active: ${!!remoteStream}
Remote Audio Tracks (${remoteAudio.length}): ${JSON.stringify(remoteAudio)}
Remote Video Tracks (${remoteVideo.length}): ${JSON.stringify(remoteVideo)}
=======================================`;
  };

  const handleCopyDebugReport = async () => {
    const report = generateReport();
    setDebugReportText(report);

    let success = false;
    // 1. Try Modern Clipboard API (Web)
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(report);
        success = true;
      }
    } catch (e) {}

    // 2. Fallback to execCommand (Works on Mobile Web / HTTP)
    if (!success && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = report;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        success = true;
      } catch (e) {}
    }

    // 3. React Native Native Share / Copy Sheet (Android APK & iOS)
    if (Platform.OS !== 'web') {
      try {
        await Share.share({
          message: report,
          title: 'SYNKING WebRTC Debug Report',
        });
        success = true;
      } catch (e) {}
    }

    // 4. Auto send report directly to Local Server Logger
    try {
      let host = '127.0.0.1';
      if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        host = window.location.hostname;
      }
      fetch(`http://${host}:8082/api/debug-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: report,
      }).catch(() => {});
    } catch (e) {}

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Modal visible={!!session} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['#0F172A', '#05060A', '#020617']}
          style={styles.callingCard}
        >
          {/* 1. CONNECTED VIDEO CALL: Fullscreen Remote Video + Draggable Self PiP */}
          {isConnected && (session.type === 'video' || session.isVideoEnabled) && (
            <>
              {/* Fullscreen Remote Video */}
              <View style={styles.videoSurfaceContainer}>
                {Platform.OS !== 'web' && NativeRTCView && remoteStream ? (
                  <NativeRTCView
                    streamURL={typeof remoteStream.toURL === 'function' ? remoteStream.toURL() : remoteStream}
                    style={[styles.nativeRemoteVideo, { backgroundColor: '#000000' }]}
                    objectFit="cover"
                    zOrder={0}
                  />
                ) : (
                  <LiveRemoteMedia type={session.type === 'video' ? 'video' : 'voice'} photoUrl={session.callerPhoto} isSpeakerOn={session.isSpeakerOn} />
                )}
              </View>

              {/* Draggable Self PiP Overlay */}
              <Animated.View 
                style={[styles.pipSelfView, { transform: pipPan.getTranslateTransform(), zIndex: 20 }]}
                {...pipPanResponder.panHandlers}
              >
                <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#000000' }}>
                  <LiveSelfVideo isPip={true} />
                  
                  {/* 📸 Flip Camera Button Overlay */}
                  <TouchableOpacity 
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      zIndex: 100,
                    }}
                    onPress={(e) => { 
                      e.stopPropagation(); 
                      WebRTCService.switchCamera(); 
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-reverse" size={18} color="#00E5FF" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          )}

          {/* 2. CONNECTED VOICE CALL (WEB AUDIO SINK): Audio Player */}
          {isConnected && session.type !== 'video' && !session.isVideoEnabled && Platform.OS === 'web' && (
            <LiveRemoteMedia type="voice" photoUrl={session.callerPhoto} isSpeakerOn={session.isSpeakerOn} />
          )}

          {/* 3. OUTGOING VIDEO CALL (CALLER PREVIEW): Fullscreen Self Camera */}
          {!isConnected && !isIncomingRinging && (session.type === 'video' || session.isVideoEnabled) && (
            <View style={styles.videoSurfaceContainer}>
              <LiveSelfVideo isPip={false} />
              
              {/* Flip Camera Button for Caller Preview */}
              <TouchableOpacity 
                style={{
                  position: 'absolute',
                  top: 60,
                  right: 20,
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: 'rgba(0, 229, 255, 0.4)',
                  zIndex: 100,
                }}
                onPress={() => WebRTCService.switchCamera()}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse" size={22} color="#00E5FF" />
              </TouchableOpacity>
            </View>
          )}

          {/* 1. TOP STATUS HEADER (ALWAYS AT TOP) */}
          <View style={[styles.topHeader, (session.type === 'video' || session.isVideoEnabled) && styles.topHeaderFloating]}>
            <View style={styles.e2eeBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#22C55E" />
              <Text style={styles.e2eeText}>P2P WebRTC Direct</Text>
            </View>

            <Text style={styles.callTypeTitle}>
              {isIncomingRinging
                ? `Incoming ${session.type === 'video' ? 'Video' : 'Voice'} Call 📲`
                : session.callerName}
            </Text>

            <Text style={[styles.callStatus, isConnected && styles.callStatusConnected]}>
              {isIncomingRinging && 'Incoming Call... 📲'}
              {!isIncomingRinging && session.status === 'calling' && 'Connecting to peer...'}
              {!isIncomingRinging && session.status === 'ringing' && 'Ringing... 📲'}
              {session.status === 'connected' && `Connected • ${durationText}`}
              {session.status === 'ended' && 'Call Ended'}
              {session.status === 'rejected' && 'Call Declined'}
            </Text>
          </View>

          {/* 2. INCOMING CALL (RECEIVER DIALER) OR VOICE CALL: Center Avatar */}
          {(session.type !== 'video' && !session.isVideoEnabled) || (isIncomingRinging && !isConnected) ? (
            <View style={styles.centerSection}>
              <View style={styles.avatarContainer}>
                {/* Glowing Wave Rings */}
                <View style={[styles.pulseRing, isConnected ? styles.pulseRingActive : styles.pulseRingIncoming]} />
                <View style={[styles.pulseRingOuter, isConnected ? styles.pulseRingOuterActive : styles.pulseRingOuterIncoming]} />

                <Image
                  source={{ uri: session.callerPhoto }}
                  style={styles.avatar}
                />
              </View>

              <Text style={styles.callerName}>{session.callerName}</Text>
              <Text style={styles.callerSub}>
                {isIncomingRinging
                  ? `Incoming ${session.type === 'video' ? 'Video 📹' : 'Voice 📞'} Call • Tap Accept`
                  : isConnected
                  ? '🔒 Direct Peer-to-Peer Encrypted'
                  : 'Connecting safely on SYNKING'}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {/* 3. BOTTOM CONTROL BAR */}
          {isIncomingRinging ? (
            // INCOMING CALL ACCEPT / DECLINE ACTIONS
            <View style={styles.incomingActionsRow}>
              {/* Decline Button */}
              <TouchableOpacity
                style={[styles.actionCircleBtn, styles.declineCallBtn]}
                onPress={handleDecline}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                <Text style={styles.actionBtnLabel}>Decline</Text>
              </TouchableOpacity>

              {/* Accept Button */}
              <TouchableOpacity
                style={[styles.actionCircleBtn, styles.acceptCallBtn]}
                onPress={handleAccept}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={28} color="#FFFFFF" />
                <Text style={styles.actionBtnLabel}>Accept</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ACTIVE / OUTGOING CALL CONTROLS
            <View style={styles.controlBar}>
              {/* Mute Button */}
              <TouchableOpacity
                style={[styles.controlBtn, session.isMuted && styles.controlBtnActive]}
                onPress={() => WebRTCService.toggleMute()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={session.isMuted ? 'mic-off' : 'mic'}
                  size={20}
                  color={session.isMuted ? '#EF4444' : '#FFFFFF'}
                />
                <Text style={styles.controlLabel}>{session.isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              {/* Speaker Button */}
              <TouchableOpacity
                style={[styles.controlBtn, session.isSpeakerOn && styles.controlBtnActive]}
                onPress={() => WebRTCService.toggleSpeaker()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={session.isSpeakerOn ? 'volume-high' : 'volume-mute'}
                  size={20}
                  color={session.isSpeakerOn ? '#38BDF8' : '#FFFFFF'}
                />
                <Text style={styles.controlLabel}>{session.isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
              </TouchableOpacity>

              {/* Video Toggle */}
              <TouchableOpacity
                style={[styles.controlBtn, session.isVideoEnabled && styles.controlBtnActive]}
                onPress={() => WebRTCService.toggleVideo()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={session.isVideoEnabled ? 'videocam' : 'videocam-off'}
                  size={20}
                  color={session.isVideoEnabled ? '#A855F7' : '#FFFFFF'}
                />
                <Text style={styles.controlLabel}>Camera</Text>
              </TouchableOpacity>

              {/* End Call Button */}
              <TouchableOpacity
                style={styles.endCallBtn}
                onPress={onEndCall}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={24} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#05060A',
  },
  callingCard: {
    flex: 1,
    width: '100%',
    height: '100%',
    paddingVertical: 32,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  topHeader: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  e2eeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  e2eeText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  debugToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  debugToggleText: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '900',
  },
  debugPanel: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    padding: 10,
    marginVertical: 4,
  },
  debugTitle: {
    color: '#00E5FF',
    fontSize: 10.5,
    fontWeight: '900',
    marginBottom: 4,
  },
  debugLine: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  testSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  testSoundText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  callTypeTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  callStatus: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  callStatusConnected: {
    color: '#22C55E',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    width: '100%',
    marginBottom: 80,
  },
  avatarContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FD3A73',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  pulseRingIncoming: {
    borderColor: 'rgba(253, 58, 115, 0.6)',
  },
  pulseRingActive: {
    borderColor: 'rgba(34, 197, 94, 0.6)',
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
  },
  pulseRingOuterIncoming: {
    borderColor: 'rgba(253, 58, 115, 0.25)',
  },
  pulseRingOuterActive: {
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  topHeaderFloating: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 18 : 48,
    alignSelf: 'center',
    minWidth: 210,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    zIndex: 20,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  videoSurfaceContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 0,
  },
  nativeRemoteVideo: {
    width: '100%',
    height: '100%',
  },
  pipSelfView: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 140 : 145,
    right: 16,
    width: 96,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    backgroundColor: '#000000',
    zIndex: 25,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  selfVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  callerSub: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  incomingActionsRow: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  actionCircleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    elevation: 6,
  },
  declineCallBtn: {
    backgroundColor: '#EF4444',
  },
  acceptCallBtn: {
    backgroundColor: '#22C55E',
  },
  actionBtnLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  controlBar: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#13141F',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 9999,
    elevation: 9999,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  endCallBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  unmuteFloatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FD3A73',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#FD3A73',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  unmuteFloatingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  terminalBox: {
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  terminalTitle: {
    color: '#38BDF8',
    fontSize: 9.5,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  terminalLine: {
    color: '#A7F3D0',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 13,
  },
  micLevelBox: {
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  micLevelLabel: {
    color: '#00E5FF',
    fontSize: 9.5,
    fontWeight: '900',
    marginBottom: 4,
  },
  micLevelTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  micLevelFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
});

