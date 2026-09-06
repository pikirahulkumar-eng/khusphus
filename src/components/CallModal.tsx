import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Platform, ScrollView, Share, Animated, PanResponder, Vibration, NativeModules, BackHandler, DeviceEventEmitter, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CallSession } from '../types';
import { WebRTCService } from '../services/webrtcService';
import { RingtoneService } from '../services/ringtoneService';
import { NativeRTCView } from '../services/webrtcCore';
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
  onMinimize?: () => void;
}

export const CallModal: React.FC<Props> = ({ session, onEndCall, onAcceptCall, onToggleMute, onToggleVideo, onToggleSpeaker, onMinimize }) => {
  if (!session) return null;

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

  // 📱 Android Back Button Minimization Hook (Minimizes to In-App PiP)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (session.status === 'connected' || session.status === 'calling' || session.status === 'ringing') {
        if (onMinimize) {
          onMinimize();
          return true; // Handled, minimize in-app
        }
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [session.status, onMinimize]);

  const pipPan = useRef(new Animated.ValueXY()).current;
  const pipPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
      onPanResponderMove: Animated.event([null, { dx: pipPan.x, dy: pipPan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pipPan.extractOffset();
      },
    })
  ).current;

  const isIncoming = session.isIncoming === true;
  const isIncomingRinging = isIncoming && session.status === 'ringing';
  const isConnected = session.status === 'connected';
  const durationText = WebRTCService.formatDuration(session.durationSeconds || 0);
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

  const [isNativePipMode, setIsNativePipMode] = useState<boolean>(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onPictureInPictureModeChanged', (event: any) => {
      const inPip = !!event?.isInPictureInPictureMode;
      console.log('[CallModal] 🖼️ onPictureInPictureModeChanged received:', inPip);
      setIsNativePipMode(inPip);
    });
    return () => sub.remove();
  }, []);

  // Ringtone & Repeating Vibration Manager
  useEffect(() => {
    const isInc = session.isIncoming === true;
    if (isInc && session.status === 'ringing') {
      RingtoneService.playIncomingRing();
      // Repeating Vibration Pattern: wait 0ms, vibrate 1000ms, pause 1000ms (repeating loop)
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 1000, 1000], true);
      } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([1000, 1000]);
        } catch (e) {}
      }
    } else if (!isInc && (session.status === 'calling' || session.status === 'ringing')) {
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
  }, [session.status, session.isIncoming]);

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

  const handleOpenChat = () => {
    const partnerId = session.callerId || session.receiverId;
    if (partnerId) {
      WebRTCService.setTargetChatUserId(partnerId);
    }
    WebRTCService.setMinimized(true);
    if (onMinimize) {
      onMinimize();
    } else {
      if (Platform.OS === 'web' && partnerId && typeof window !== 'undefined' && window.location) {
        window.location.href = `/chat/${partnerId}`;
      }
    }
  };
  const renderNativePipContent = () => {
    const isVideo = session.type === 'video' || session.isVideoEnabled;
    const durStr = durationText || '00:01';

    return (
      <View style={styles.nativePipContainer}>
        {/* Full-bleed Remote Video */}
        <View style={StyleSheet.absoluteFill}>
          {Platform.OS !== 'web' && NativeRTCView && remoteStream ? (
            <NativeRTCView
              streamURL={typeof remoteStream.toURL === 'function' ? remoteStream.toURL() : remoteStream}
              style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
              objectFit="cover"
              zOrder={0}
            />
          ) : (
            <Image
              source={{ uri: session.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Top Gradient Vignette */}
        <View style={styles.pipTopVignette} pointerEvents="none" />

        {/* Top Center: Live Timer Capsule (🟢 00:48) */}
        <View style={styles.pipTopCapsule} pointerEvents="none">
          <View style={styles.pipPulseDot} />
          <Text style={styles.pipTimerText}>{durStr}</Text>
        </View>

        {/* Bottom Gradient Vignette */}
        <View style={styles.pipBottomVignette} pointerEvents="none" />

        {/* Bottom Controls: Centered Red End Call Button + Label + Sparkle */}
        <View style={styles.pipBottomControls}>
          <View style={styles.pipEndRow}>
            {/* Red End Call Button */}
            <TouchableOpacity
              style={styles.pipEndBtn}
              onPress={onEndCall}
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="call" size={20} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            {/* Synkin Official Logo Emblem */}
            <View style={styles.pipLogoContainer} pointerEvents="none">
              <Image
                source={require('../../assets/images/logo_emblem.png')}
                style={styles.pipLogoImg}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* "End Call" Text Label Below Button */}
          <Text style={styles.pipEndLabel}>End Call</Text>
        </View>
      </View>
    );
  };

  const callContent = isNativePipMode ? (
    renderNativePipContent()
  ) : (
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
            </View>
          )}

          {/* Top Left: Chat Button */}
          {((session.type === 'video' || session.isVideoEnabled) || isConnected) && (
            <TouchableOpacity
              style={styles.chatMinimizeBtn}
              onPress={handleOpenChat}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Top Right: Flip Camera Button (Always accessible on Video Call) */}
          {(session.type === 'video' || session.isVideoEnabled) && !isIncomingRinging && (
            <TouchableOpacity 
              style={styles.floatingFlipBtn}
              onPress={() => WebRTCService.switchCamera()}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* 1. TOP STATUS HEADER (ALWAYS AT TOP, hidden in PiP) */}
          <View style={[styles.topHeader, (session.type === 'video' || session.isVideoEnabled) && styles.topHeaderFloating]}>
            <View style={styles.e2eeBadge}>
              <Ionicons name="lock-closed" size={13} color="#38BDF8" />
              <Text style={styles.e2eeText}>End-to-End Encrypted HD</Text>
            </View>

            <Text style={styles.callTypeTitle}>
              {isIncomingRinging
                ? `Incoming ${session.type === 'video' ? 'Video' : 'Voice'} Call`
                : session.callerName}
            </Text>

            <Text style={[
              styles.callStatus,
              isConnected && styles.callStatusConnected,
              session.status === 'rejected' && styles.callStatusRejected,
              session.status === 'ended' && styles.callStatusEnded,
            ]}>
              {isIncomingRinging && 'Incoming Call...'}
              {!isIncomingRinging && session.status === 'calling' && 'Calling...'}
              {!isIncomingRinging && session.status === 'ringing' && 'Ringing...'}
              {session.status === 'connected' && `Connected • ${durationText}`}
              {session.status === 'ended' && 'Call Ended'}
              {session.status === 'rejected' && '❌ Call Declined'}
            </Text>
          </View>

          {/* 2. INCOMING CALL (RECEIVER DIALER) OR VOICE CALL: Center Avatar */}
          {((session.type !== 'video' && !session.isVideoEnabled) || (isIncomingRinging && !isConnected)) ? (
            <View style={styles.centerSection}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={
                    session.status === 'rejected'
                      ? ['#EF4444', '#B91C1C']
                      : session.status === 'ended'
                      ? ['#64748B', '#475569']
                      : isConnected
                      ? ['#10B981', '#059669']
                      : ['#A855F7', '#38BDF8']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 154,
                    height: 154,
                    borderRadius: 77,
                    padding: 3,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: session.status === 'rejected' ? '#EF4444' : isConnected ? '#10B981' : '#38BDF8',
                    shadowOpacity: 0.6,
                    shadowRadius: 14,
                    elevation: 10,
                  }}
                >
                  <Image
                    source={{ uri: session.callerPhoto }}
                    style={{
                      width: 148,
                      height: 148,
                      borderRadius: 74,
                      backgroundColor: '#0F172A',
                    }}
                  />
                </LinearGradient>
              </View>

              <Text style={styles.callerName}>{session.callerName}</Text>
              <Text style={[
                styles.callerSub,
                session.status === 'rejected' && styles.callerSubRejected,
                session.status === 'ended' && styles.callerSubEnded,
                isConnected && styles.callerSubConnected,
              ]}>
                {isIncomingRinging
                  ? `Incoming ${session.type === 'video' ? 'Video' : 'Voice'} Call • Tap Accept`
                  : session.status === 'rejected'
                  ? 'Call was declined by recipient'
                  : session.status === 'ended'
                  ? 'Call has ended'
                  : isConnected
                  ? '🔒 Direct Peer-to-Peer Encrypted'
                  : session.status === 'ringing'
                  ? 'Ringing...'
                  : session.status === 'calling'
                  ? 'Calling...'
                  : 'Connecting safely on Synkin'}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          {/* 3. BOTTOM CONTROL BAR */}
          {session.status === 'rejected' || session.status === 'ended' ? (
              <View style={styles.declinedActionsRow}>
                <TouchableOpacity
                  style={styles.declinedDismissBtn}
                  onPress={onEndCall}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.declinedDismissText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : isIncomingRinging ? (
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
              // ACTIVE / OUTGOING CALL CONTROLS (LUXURY OBSIDIAN & PEARL WHITE)
              <View style={styles.controlBar}>
                {/* Mute Button */}
                <TouchableOpacity
                  style={[styles.controlBtn, session.isMuted && styles.controlBtnMuted]}
                  onPress={() => (onToggleMute ? onToggleMute() : WebRTCService.toggleMute())}
                  activeOpacity={0.75}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={session.isMuted ? 'mic-off' : 'mic'}
                    size={22}
                    color={session.isMuted ? '#EF4444' : '#FFFFFF'}
                  />
                </TouchableOpacity>

                {/* Speaker Button (Pearl White Active / Frosted Glass Inactive) */}
                <TouchableOpacity
                  style={[styles.controlBtn, session.isSpeakerOn && styles.controlBtnActive]}
                  onPress={() => (onToggleSpeaker ? onToggleSpeaker() : WebRTCService.toggleSpeaker())}
                  activeOpacity={0.75}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={session.isSpeakerOn ? 'volume-high' : 'volume-low'}
                    size={22}
                    color={session.isSpeakerOn ? '#0A0E17' : '#FFFFFF'}
                  />
                </TouchableOpacity>

                {/* Video Toggle (Pearl White Active / Frosted Glass Inactive) */}
                <TouchableOpacity
                  style={[styles.controlBtn, session.isVideoEnabled && styles.controlBtnActive]}
                  onPress={() => (onToggleVideo ? onToggleVideo() : WebRTCService.toggleVideo())}
                  activeOpacity={0.75}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={session.isVideoEnabled ? 'videocam' : 'videocam-off'}
                    size={22}
                    color={session.isVideoEnabled ? '#0A0E17' : '#FFFFFF'}
                  />
                </TouchableOpacity>

                {/* End Call Button (Apple Signature Crimson with Ambient Glow) */}
                <TouchableOpacity
                  style={styles.endCallBtn}
                  onPress={onEndCall}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="call" size={26} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
              </View>
            )
          }
        </LinearGradient>
      </View>
  );

  if (Platform.OS === 'android') {
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 999999, elevation: 999999 }]}>
        {callContent}
      </View>
    );
  }

  return (
    <Modal visible={!!session} animationType="fade" transparent>
      {callContent}
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
  chatMinimizeBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 54,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 14, 23, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    elevation: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  floatingFlipBtn: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 54,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(10, 14, 23, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    elevation: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
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
    gap: 8,
    backgroundColor: 'rgba(31, 30, 41, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  e2eeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  callTypeTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Poppins_900Black',
    letterSpacing: -0.4,
  },
  callStatus: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  callStatusConnected: {
    color: '#10B981',
    fontFamily: 'Poppins_700Bold',
  },
  callStatusRejected: {
    color: '#EF4444',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  callStatusEnded: {
    color: '#94A3B8',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  callerSubRejected: {
    color: '#F87171',
    fontFamily: 'Poppins_600SemiBold',
  },
  callerSubEnded: {
    color: '#94A3B8',
    fontFamily: 'Poppins_500Medium',
  },
  callerSubConnected: {
    color: '#10B981',
    fontFamily: 'Poppins_600SemiBold',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 80,
  },
  avatarContainer: {
    position: 'relative',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#38BDF8',
  },
  pulseRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
  },
  pulseRingIncoming: {
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  pulseRingActive: {
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
  },
  pulseRingOuterIncoming: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  pulseRingOuterActive: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  topHeaderFloating: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 18 : 48,
    alignSelf: 'center',
    minWidth: 210,
    backgroundColor: 'rgba(10, 14, 23, 0.72)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 20,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
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
    right: 20,
    width: 110,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: '#000000',
    zIndex: 25,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  selfVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'Poppins_900Black',
  },
  callerSub: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  declinedActionsRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  declinedDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 32,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  declinedDismissText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.3,
  },
  incomingActionsRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  actionCircleBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  declineCallBtn: {
    backgroundColor: '#1F1315',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  acceptCallBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins_800ExtraBold',
  },
  controlBar: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 14, 23, 0.72)',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 9999,
    elevation: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  controlBtnMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderColor: '#EF4444',
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    display: 'none',
  },
  endCallBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
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
    fontFamily: 'Poppins_800ExtraBold',
  },
  nativePipContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  pipTopVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  pipTopCapsule: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 20,
  },
  pipPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  pipTimerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
  },
  pipBottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  pipBottomControls: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  pipEndRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pipEndBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  pipEndLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Poppins_500Medium',
    marginTop: 3,
    opacity: 0.95,
  },
  pipLogoContainer: {
    position: 'absolute',
    right: 16,
    bottom: 6,
  },
  pipLogoImg: {
    width: 22,
    height: 22,
    opacity: 0.9,
  },
});

export default CallModal;

