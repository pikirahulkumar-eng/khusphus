import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Platform, ScrollView, Share, Animated, PanResponder, Vibration, NativeModules, BackHandler, DeviceEventEmitter, Dimensions, TextInput, AppState, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { CallSession } from '../types';
import { WebRTCService } from '../services/webrtcService';
import { RingtoneService } from '../services/ringtoneService';
import { NativeRTCView } from '../services/webrtcCore';
import { AudioRouteService } from '../services/audioRouteService';
import { RealtimeBridge } from '../services/realtimeBridge';
import { saveChatMessageToFirestore } from '../services/firebase';
import { encryptE2EEMessage } from '../utils/encryption';
import * as Haptics from 'expo-haptics';

// 📳 Tactical Micro-Haptic Click Engine (Apple / Pixel feel + Android Linear Motor Boost)
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    if (style === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Vibration.vibrate(30);
    } else if (style === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Vibration.vibrate(45);
    } else if (style === 'heavy') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Vibration.vibrate(70);
    }
  } catch (e) {}
};

interface QuickDeclineOption {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  tag: string;
  tagColor: string;
  text: string;
}

const QUICK_DECLINE_OPTIONS: QuickDeclineOption[] = [
  {
    id: 'text_mode',
    icon: 'chatbubbles',
    tag: 'Text Mode',
    tagColor: '#38BDF8',
    text: "Can't talk out loud — let's text here! ✨",
  },
  {
    id: 'call_back',
    icon: 'time',
    tag: 'Call Back',
    tagColor: '#EC4899',
    text: "On the move right now, calling you right back! 📞",
  },
  {
    id: 'busy',
    icon: 'cafe',
    tag: 'Caught Up',
    tagColor: '#F59E0B',
    text: "Caught up in something, can we talk in a bit? ⏳",
  },
  {
    id: 'quiet',
    icon: 'volume-mute',
    tag: 'Quiet Spot',
    tagColor: '#8B5CF6',
    text: "In a quiet spot, ping me what's up! 💬",
  },
  {
    id: 'driving',
    icon: 'car-sport',
    tag: 'On The Road',
    tagColor: '#10B981',
    text: "On the road right now, catching you shortly! 🚗",
  },
];

const LiveSelfVideo: React.FC<{ isPip?: boolean }> = ({ isPip = true }) => {
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(WebRTCService.getLocalStream());
  const [stream, setStream] = useState<any>(() => WebRTCService.getLocalStream());
  const [mountKey, setMountKey] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      const s = WebRTCService.getLocalStream();
      const prevUrl = typeof streamRef.current?.toURL === 'function' ? streamRef.current.toURL() : streamRef.current;
      const nextUrl = typeof s?.toURL === 'function' ? s.toURL() : s;
      if (prevUrl !== nextUrl || (!streamRef.current && s)) {
        streamRef.current = s;
        setStream(s);
      }
      if (Platform.OS === 'web' && s && videoRef.current && videoRef.current.srcObject !== s) {
        videoRef.current.srcObject = s;
      }
    };
    update();
    const unsub = WebRTCService.subscribe(update);
    const interval = setInterval(update, 2000);

    // 📱 When returning from background / multitasking, re-mount SurfaceView cleanly
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        update();
        setMountKey(k => k + 1);
        setTimeout(() => {
          update();
          setMountKey(k => k + 1);
        }, 300);
      }
    });

    return () => {
      unsub();
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  const streamUrl = typeof stream?.toURL === 'function' ? stream.toURL() : stream;

  return (
    <View style={[styles.selfVideoPlaceholder, { width: '100%', height: '100%', backgroundColor: '#000000', borderRadius: isPip ? 16 : 0 }]}>
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
            key={`self_pip_${mountKey}_${streamUrl || 'stream'}`}
            streamURL={streamUrl}
            style={{ width: '100%', height: '100%', borderRadius: isPip ? 16 : 0, backgroundColor: '#000000' }}
            objectFit="cover"
            mirror={true}
            zOrder={isPip ? 1 : 0}
            zOrderMediaOverlay={isPip}
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
  isLockscreen?: boolean;
  onEndCall: () => void;
  onAcceptCall?: () => void;
  onToggleMute?: () => boolean;
  onToggleVideo?: () => boolean | Promise<boolean>;
  onToggleSpeaker?: () => boolean | Promise<boolean>;
  onMinimize?: () => void;
}

export const CallModal: React.FC<Props> = ({ session, isLockscreen, onEndCall, onAcceptCall, onToggleMute, onToggleVideo, onToggleSpeaker, onMinimize }) => {
  if (!session) return null;

  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return !!isLockscreen || !session.isIncoming || session.status !== 'ringing';
  });
  const [showQuickMessages, setShowQuickMessages] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [isBluetooth, setIsBluetooth] = useState<boolean>(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDimensionPip = Platform.OS === 'android' && windowWidth < 320 && windowHeight < 520;
  const [isEventPip, setIsEventPip] = useState<boolean>(false);
  const isInNativePip = isEventPip || isDimensionPip;

  // 📱 Listen for Android system PiP mode changes — hide buttons, show only clean video in PiP
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const pipSub = DeviceEventEmitter.addListener('NATIVE_PIP_CHANGED', (status: string) => {
      setIsEventPip(status === 'entered');
    });
    return () => pipSub.remove();
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkBt = () => {
      AudioRouteService.isBluetoothConnected().then(connected => {
        if (mounted) setIsBluetooth(connected);
      }).catch(() => {});
    };
    checkBt();
    const interval = setInterval(checkBt, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [session?.status, session?.isSpeakerOn]);

  const [remoteRenderKey, setRemoteRenderKey] = useState<number>(0);

  // 💡 Keep Screen Awake for the entire duration of the active call
  useEffect(() => {
    const isCallActive = session && (
      session.status === 'calling' || 
      session.status === 'ringing' || 
      session.status === 'connected'
    );
    if (isCallActive) {
      activateKeepAwakeAsync('synkin_call_screen').catch(() => {});
    } else {
      deactivateKeepAwake('synkin_call_screen').catch(() => {});
    }
    return () => {
      deactivateKeepAwake('synkin_call_screen').catch(() => {});
    };
  }, [session?.status]);

  // 📱 Listen for AppState changes to trigger SurfaceView re-render when returning from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setRemoteRenderKey(k => k + 1);
        setTimeout(() => setRemoteRenderKey(k => k + 1), 300);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (session.status === 'connected' || isLockscreen) {
      setIsExpanded(true);
    }
  }, [session.status, isLockscreen]);

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
  const isVideoCall = session.type === 'video' || session.isVideoEnabled;
  const durationText = WebRTCService.formatDuration(session.durationSeconds || 0);
  const [localStream, setLocalStream] = useState<any>(() => WebRTCService.getLocalStream());
  const [remoteStream, setRemoteStream] = useState<any>(() => WebRTCService.getRemoteStream());

  // 🎛️ WhatsApp-style auto-hide and tap-to-toggle call controls for connected video calls
  const [areControlsVisible, setAreControlsVisible] = useState<boolean>(true);
  const controlsTimerRef = useRef<any>(null);

  const resetControlsTimer = () => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
    if (isConnected && isVideoCall) {
      controlsTimerRef.current = setTimeout(() => {
        setAreControlsVisible(false);
      }, 4000);
    }
  };

  const toggleControls = () => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
    setAreControlsVisible((prev) => {
      const next = !prev;
      if (next && isConnected && isVideoCall) {
        controlsTimerRef.current = setTimeout(() => {
          setAreControlsVisible(false);
        }, 4000);
      }
      return next;
    });
  };

  // ⏱️ Auto-hide call controls after 4 seconds of connected video call (WhatsApp style)
  useEffect(() => {
    if (isConnected && isVideoCall) {
      setAreControlsVisible(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(() => {
        setAreControlsVisible(false);
      }, 4000);
    } else {
      setAreControlsVisible(true);
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
    }

    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
    };
  }, [isConnected, isVideoCall]);

  const showControls = !isVideoCall || !isConnected || areControlsVisible;

  useEffect(() => {
    const updateStreams = () => {
      setLocalStream(WebRTCService.getLocalStream());
      setRemoteStream(WebRTCService.getRemoteStream());
    };
    updateStreams();
    const unsub = WebRTCService.subscribe(updateStreams);
    const interval = setInterval(updateStreams, 300);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Ringtone & Repeating Vibration Manager
  useEffect(() => {
    const isInc = session.isIncoming === true;
    if (isInc && session.status === 'ringing') {
      RingtoneService.playIncomingRing();
    } else if (!isInc && (session.status === 'calling' || session.status === 'ringing')) {
      RingtoneService.playOutgoingRing(session.type === 'video' || session.isVideoEnabled);
      Vibration.cancel();
    } else {
      RingtoneService.stop();
      Vibration.cancel();
    }

    return () => {
      RingtoneService.stop();
      Vibration.cancel();
    };
  }, [session.status, session.isIncoming, session.type, session.isVideoEnabled]);

  const handleAccept = () => {
    triggerHaptic('medium');
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
    triggerHaptic('medium');
    RingtoneService.stop();
    Vibration.cancel();
    WebRTCService.log('❌ DECLINE TAPPED: User declined incoming call. Sending CALL_REJECTED.');
    WebRTCService.rejectCall();
    onEndCall();
  };

  const handleEndCallAction = () => {
    triggerHaptic('heavy');
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

  const handleIncomingMessage = () => {
    setIsExpanded(true);
    setShowQuickMessages(true);
  };

  const handleSendQuickMessageAndDecline = (text: string) => {
    setShowQuickMessages(false);

    // 1. Instantly stop ringtone and vibration
    RingtoneService.stop();
    try {
      Vibration.cancel();
      if (Platform.OS !== 'web') {
        const Haptics = require('expo-haptics');
        Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium)?.catch?.(() => {});
      }
    } catch (e) {}

    // 2. Deliver message in background to caller (Zero app opening, stays on Lock Screen)
    const recipientId = session.callerId;
    const senderId = (session.receiverId && session.receiverId !== 'my_user_id')
      ? session.receiverId
      : (RealtimeBridge.myUserId || 'user_me');

    if (recipientId) {
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newMsg: any = {
        id: msgId,
        senderId: senderId,
        receiverId: recipientId,
        text: text,
        timestamp: new Date().toISOString(),
        type: 'text',
      };

      try {
        RealtimeBridge.broadcast('NEW_MESSAGE', newMsg, recipientId);
      } catch (e) {}

      (async () => {
        try {
          const enc = await encryptE2EEMessage(text, senderId, recipientId);
          await saveChatMessageToFirestore({
            id: msgId,
            senderId: senderId,
            receiverId: recipientId,
            cipherText: enc.ciphertext,
            plainText: text,
            isEncrypted: true,
            timestamp: newMsg.timestamp,
            type: 'text',
          });
        } catch (e) {}
      })();
    }

    // 3. Immediately decline & cut the call in background
    WebRTCService.log(`💬 DECLINED WITH QUICK MESSAGE: "${text}". Dismissing call on screen.`);
    WebRTCService.rejectCall();
    onEndCall();
  };

  const callContent = (
    <View style={styles.modalOverlay}>
      <LinearGradient
        colors={['#080406', '#000000', '#000000']}
        style={styles.callingCard}
        >
          {/* 1. CONNECTED VIDEO CALL: Fullscreen Remote Video + Draggable Self PiP */}
          {isConnected && (session.type === 'video' || session.isVideoEnabled) && (
            <>
              {/* Fullscreen Remote Video */}
              <View style={styles.videoSurfaceContainer}>
                {Platform.OS !== 'web' && NativeRTCView && remoteStream ? (
                  <NativeRTCView
                    key={`remote_main_${remoteRenderKey}_${typeof remoteStream.toURL === 'function' ? remoteStream.toURL() : (remoteStream?.id || 'remote')}`}
                    streamURL={typeof remoteStream.toURL === 'function' ? remoteStream.toURL() : remoteStream}
                    style={[styles.nativeRemoteVideo, { backgroundColor: '#000000' }]}
                    objectFit="cover"
                    zOrder={0}
                    zOrderMediaOverlay={false}
                  />
                ) : (
                  <LiveRemoteMedia type={session.type === 'video' ? 'video' : 'voice'} photoUrl={session.callerPhoto} isSpeakerOn={session.isSpeakerOn} />
                )}
              </View>

              {/* 📱 Fullscreen Video Tap Backdrop (WhatsApp style tap to toggle controls) */}
              {!isInNativePip && (
                <TouchableOpacity
                  style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                  activeOpacity={1}
                  onPress={toggleControls}
                />
              )}

              {/* Draggable Self PiP Overlay (Hidden in Native PiP) */}
              {!isInNativePip && (
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
                        triggerHaptic('light');
                        resetControlsTimer();
                        WebRTCService.switchCamera(); 
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="camera-reverse" size={18} color="#00E5FF" />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </>
          )}

          {/* 2. CONNECTED VOICE CALL (WEB AUDIO SINK): Audio Player */}
          {isConnected && session.type !== 'video' && !session.isVideoEnabled && Platform.OS === 'web' && (
            <LiveRemoteMedia type="voice" photoUrl={session.callerPhoto} isSpeakerOn={session.isSpeakerOn} />
          )}

          {/* 3. VIDEO PREVIEW (OUTGOING OR INCOMING VIDEO CALL): Fullscreen Self Camera */}
          {!isConnected && (session.type === 'video' || session.isVideoEnabled) && session.isVideoEnabled !== false && (
            <View style={styles.videoSurfaceContainer}>
              <LiveSelfVideo isPip={false} />
              {isIncomingRinging && <View style={styles.videoIncomingBackdropTint} />}
            </View>
          )}

          {/* Top Left: Chat Button (Hidden in Native PiP) */}
          {!isInNativePip && showControls && !isIncomingRinging && ((session.type === 'video' || session.isVideoEnabled) || isConnected) && (
            <TouchableOpacity
              style={styles.chatMinimizeBtn}
              onPress={() => {
                triggerHaptic('light');
                resetControlsTimer();
                handleOpenChat();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Top Right: Flip Camera Button (Hidden in Native PiP) */}
          {!isInNativePip && showControls && (session.type === 'video' || session.isVideoEnabled) && !isIncomingRinging && (
            <TouchableOpacity 
              style={styles.floatingFlipBtn}
              onPress={() => {
                triggerHaptic('light');
                resetControlsTimer();
                WebRTCService.switchCamera();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* 1. TOP STATUS HEADER (Hidden in Native PiP) */}
          {!isInNativePip && (isIncomingRinging ? (
            <View style={styles.topHeaderIncoming}>
              <View style={styles.e2eeBadge}>
                <Ionicons name="lock-closed" size={12} color="#38BDF8" />
                <Text style={styles.e2eeText}>End-to-End Encrypted HD</Text>
              </View>

              <Text style={styles.incomingCallerNameHeader} numberOfLines={1}>
                {session.callerName}
              </Text>

              <Text style={styles.incomingCallTypeSubtitle}>
                {isVideoCall ? 'Synkin Video Call' : 'Synkin Voice Call'}
              </Text>
            </View>
          ) : showControls ? (
            <View style={[styles.topHeader, (session.type === 'video' || session.isVideoEnabled) && styles.topHeaderFloating]}>
              <View style={styles.e2eeBadge}>
                <Ionicons name="lock-closed" size={13} color="#38BDF8" />
                <Text style={styles.e2eeText}>End-to-End Encrypted HD</Text>
              </View>

              <Text style={styles.callTypeTitle} numberOfLines={1}>
                {session.callerName}
              </Text>

              <Text style={[
                styles.callStatus,
                isConnected && styles.callStatusConnected,
                session.status === 'rejected' && styles.callStatusRejected,
                session.status === 'ended' && styles.callStatusEnded,
              ]}>
                {session.status === 'calling' && 'Calling...'}
                {session.status === 'ringing' && 'Ringing...'}
                {session.status === 'connected' && `Connected • ${durationText}`}
                {session.status === 'ended' && 'Call Ended'}
                {session.status === 'rejected' && '❌ Call Declined'}
              </Text>
            </View>
          ) : null)}

          {/* 2. CENTER SECTION (Hidden in Native PiP) */}
          {!isInNativePip && (isIncomingRinging ? (
            isVideoCall ? (
              // INCOMING VIDEO CALL CENTER: WhatsApp style with medium avatar & "Turn off your video" pill
              <View style={styles.videoIncomingCenterSection}>
                <View style={styles.videoIncomingAvatarWrap}>
                  <Image
                    source={{ uri: session.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }}
                    style={styles.videoIncomingAvatar}
                  />
                </View>

                {/* Turn off your video Pill Button */}
                <TouchableOpacity
                  style={styles.turnOffVideoPill}
                  onPress={() => (onToggleVideo ? onToggleVideo() : WebRTCService.toggleVideo())}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={session.isVideoEnabled !== false ? 'videocam-off' : 'videocam'}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.turnOffVideoText}>
                    {session.isVideoEnabled !== false ? 'Turn off your video' : 'Turn on your video'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // INCOMING VOICE CALL CENTER: Classic large avatar with glowing ring
              <View style={styles.centerSection}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#A855F7', '#38BDF8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 170,
                      height: 170,
                      borderRadius: 85,
                      padding: 3,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#38BDF8',
                      shadowOpacity: 0.6,
                      shadowRadius: 16,
                      elevation: 10,
                    }}
                  >
                    <Image
                      source={{ uri: session.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }}
                      style={{
                        width: 164,
                        height: 164,
                        borderRadius: 82,
                        backgroundColor: '#0F172A',
                      }}
                    />
                  </LinearGradient>
                </View>
              </View>
            )
          ) : (session.type !== 'video' && !session.isVideoEnabled) || session.status === 'rejected' || session.status === 'ended' ? (
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
                {session.status === 'rejected'
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
          ))}

          {/* 3. BOTTOM CONTROL BAR (Hidden in Native PiP) */}
          {!isInNativePip && (session.status === 'rejected' || session.status === 'ended' ? (
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
              // INCOMING CALL ACCEPT / DECLINE / MESSAGE ACTIONS
              <View style={styles.incomingActionsRow}>
                {/* 1. Decline Button */}
                <View style={styles.actionItemCol}>
                  <TouchableOpacity
                    style={[styles.actionCircleBtn, styles.declineCallBtn]}
                    onPress={handleDecline}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                  </TouchableOpacity>
                  <Text style={styles.actionBtnLabel}>Decline</Text>
                </View>

                {/* 2. Accept Button (Camera icon if video call, Phone icon if voice call) */}
                <View style={styles.actionItemCol}>
                  <TouchableOpacity
                    style={[styles.actionCircleBtn, styles.acceptCallBtn]}
                    onPress={handleAccept}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isVideoCall ? 'videocam' : 'call'}
                      size={28}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                  <Text style={styles.actionBtnLabel}>Accept</Text>
                </View>

                {/* 3. Message Button */}
                <View style={styles.actionItemCol}>
                  <TouchableOpacity
                    style={[styles.actionCircleBtn, styles.messageCallBtn]}
                    onPress={() => {
                      triggerHaptic('light');
                      handleIncomingMessage();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.actionBtnLabel}>Message</Text>
                </View>
              </View>
            ) : showControls ? (
              // ACTIVE / OUTGOING CALL CONTROLS (LUXURY OBSIDIAN & PEARL WHITE)
              <View style={styles.controlBar}>
                {/* Mute Button */}
                <TouchableOpacity
                  style={[styles.controlBtn, session.isMuted && styles.controlBtnMuted]}
                  onPress={() => {
                    triggerHaptic('light');
                    resetControlsTimer();
                    if (onToggleMute) onToggleMute(); else WebRTCService.toggleMute();
                  }}
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
                  onPress={() => {
                    triggerHaptic('light');
                    resetControlsTimer();
                    if (onToggleSpeaker) onToggleSpeaker(); else WebRTCService.toggleSpeaker();
                  }}
                  activeOpacity={0.75}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={session.isSpeakerOn ? 'volume-high' : (isBluetooth ? 'bluetooth' : 'volume-low')}
                    size={22}
                    color={session.isSpeakerOn ? '#0A0E17' : (isBluetooth ? '#38BDF8' : '#FFFFFF')}
                  />
                </TouchableOpacity>

                {/* Video Toggle (Pearl White Active / Frosted Glass Inactive) */}
                <TouchableOpacity
                  style={[styles.controlBtn, session.isVideoEnabled && styles.controlBtnActive]}
                  onPress={() => {
                    triggerHaptic('light');
                    resetControlsTimer();
                    if (onToggleVideo) onToggleVideo(); else WebRTCService.toggleVideo();
                  }}
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
                  onPress={() => {
                    triggerHaptic('heavy');
                    onEndCall();
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="call" size={26} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
              </View>
            ) : null
          )}

          {/* Quick Reply Message Sheet (Hidden in Native PiP) */}
          {!isInNativePip && showQuickMessages && (
            <View style={styles.quickMessagesOverlay}>
              <TouchableOpacity
                style={styles.quickMessagesBackdrop}
                activeOpacity={1}
                onPress={() => {
                  setCustomNote('');
                  setShowQuickMessages(false);
                }}
              />
              <View style={styles.quickMessagesSheet}>
                <View style={styles.quickMessagesHeader}>
                  <View style={styles.quickMessagesHandle} />
                  <View style={styles.quickMessagesCallerRow}>
                    <Image
                      source={{ uri: session.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }}
                      style={styles.quickMessagesAvatar}
                    />
                    <View style={styles.quickMessagesCallerCol}>
                      <Text style={styles.quickMessagesTitle} numberOfLines={1}>Reply to {session.callerName}</Text>
                      <Text style={styles.quickMessagesSubtitle}>Declines call & delivers note instantly in background</Text>
                    </View>
                  </View>
                </View>

                {/* Instant Custom Note Input Field (Direct Lockscreen Typing) */}
                <View style={styles.customReplyBar}>
                  <TextInput
                    placeholder="Or type a quick custom note..."
                    placeholderTextColor="#64748B"
                    value={customNote}
                    onChangeText={setCustomNote}
                    style={styles.customReplyInput}
                    returnKeyType="send"
                    onSubmitEditing={() => {
                      if (customNote.trim()) {
                        const note = customNote.trim();
                        setCustomNote('');
                        handleSendQuickMessageAndDecline(note);
                      }
                    }}
                  />
                  {customNote.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.customReplySendBtn}
                      onPress={() => {
                        const note = customNote.trim();
                        setCustomNote('');
                        handleSendQuickMessageAndDecline(note);
                      }}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#FD3A73', '#A855F7']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.customReplyGradient}
                      >
                        <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Rich Categorized Presets with Tags and Icons */}
                <ScrollView style={styles.quickMessagesScroll} contentContainerStyle={styles.quickMessagesList} showsVerticalScrollIndicator={false}>
                  {QUICK_DECLINE_OPTIONS.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.quickMessageCard}
                      onPress={() => handleSendQuickMessageAndDecline(item.text)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.quickMessageIconBadge, { backgroundColor: `${item.tagColor}1F` }]}>
                        <Ionicons name={item.icon} size={18} color={item.tagColor} />
                      </View>
                      <View style={styles.quickMessageTextCol}>
                        <View style={styles.quickMessageTagRow}>
                          <View style={[styles.quickMessageTagPill, { borderColor: `${item.tagColor}44`, backgroundColor: `${item.tagColor}15` }]}>
                            <Text style={[styles.quickMessageTagText, { color: item.tagColor }]}>{item.tag}</Text>
                          </View>
                        </View>
                        <Text style={styles.quickMessageBodyText}>{item.text}</Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={20} color="rgba(255, 255, 255, 0.3)" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Return to Incoming Call Action */}
                <TouchableOpacity
                  style={styles.quickMessagesCancelBtn}
                  onPress={() => {
                    setCustomNote('');
                    setShowQuickMessages(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                  <Text style={styles.quickMessagesCancelText}>Return to call</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
  );

  if (!isExpanded && isIncomingRinging) {
    if (Platform.OS === 'android') {
      // On Android, the native CallStyle Heads-Up Notification banner is displayed at the top
      // by the system. Suppressing the in-app banner card prevents two banners stacking on Android.
      return null;
    }
    const isVideo = session.type === 'video' || session.isVideoEnabled;
    return (
      <View style={styles.bannerOuterWrapper} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => setIsExpanded(true)}
          style={styles.bannerCard}
        >
          {/* Top Info Row */}
          <View style={styles.bannerInfoRow}>
            {/* Avatar on Left */}
            <View style={styles.bannerAvatarWrapper}>
              <Image
                source={{ uri: session.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }}
                style={styles.bannerAvatar}
              />
              <View style={styles.bannerBadge}>
                <Ionicons
                  name={isVideo ? 'videocam' : 'call'}
                  size={10}
                  color="#FFFFFF"
                />
              </View>
            </View>

            {/* Text details in middle */}
            <View style={styles.bannerTextCol}>
              <View style={styles.bannerTitleRow}>
                <Text style={styles.bannerCallerName} numberOfLines={1}>
                  {session.callerName}
                </Text>
                <Text style={styles.bannerAppTag}>• Synkin • Now</Text>
              </View>
              <Text style={styles.bannerCallSub} numberOfLines={1}>
                {isVideo ? 'Incoming video call' : 'Incoming voice call'}
              </Text>
            </View>

            {/* Subtle expand chevron on right */}
            <View style={styles.bannerChevron}>
              <Ionicons name="chevron-down" size={18} color="#94A3B8" />
            </View>
          </View>

          {/* Action Buttons Row (3 Buttons: Decline, Answer, Message) */}
          <View style={styles.bannerActionsRow}>
            {/* Colorful RED Decline Pill Button */}
            <TouchableOpacity
              style={styles.bannerDeclineBtn}
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={14} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
              <Text style={styles.bannerDeclineText}>Decline</Text>
            </TouchableOpacity>

            {/* Colorful GREEN Answer / Video Pill Button */}
            <TouchableOpacity
              style={styles.bannerAcceptBtn}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isVideo ? 'videocam' : 'call'}
                size={15}
                color="#FFFFFF"
              />
              <Text style={styles.bannerAcceptText}>
                {isVideo ? 'Video' : 'Answer'}
              </Text>
            </TouchableOpacity>

            {/* Dark Message / Reply Pill Button */}
            <TouchableOpacity
              style={styles.bannerMessageBtn}
              onPress={handleIncomingMessage}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" />
              <Text style={styles.bannerMessageText}>Message</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

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
    backgroundColor: '#000000',
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
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0,
    paddingHorizontal: 12,
    textAlign: 'center',
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
    minWidth: 230,
    backgroundColor: 'rgba(10, 14, 23, 0.78)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
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
  videoIncomingBackdropTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  topHeaderIncoming: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
    paddingTop: Platform.OS === 'web' ? 12 : 24,
    zIndex: 10,
  },
  incomingCallerNameHeader: {
    color: '#FFFFFF',
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0,
    paddingHorizontal: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  incomingCallTypeSubtitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  videoIncomingCenterSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    marginBottom: 60,
    zIndex: 10,
  },
  videoIncomingAvatarWrap: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  videoIncomingAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 53,
    backgroundColor: '#0F172A',
  },
  turnOffVideoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  turnOffVideoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.2,
  },
  incomingActionsRow: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 36 : 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 28,
    zIndex: 999,
    elevation: 999,
  },
  actionItemCol: {
    alignItems: 'center',
    gap: 8,
  },
  actionCircleBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  declineCallBtn: {
    backgroundColor: '#DC2626',
  },
  acceptCallBtn: {
    backgroundColor: '#16A34A',
  },
  messageCallBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  actionBtnLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
  bannerOuterWrapper: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 50,
    left: 12,
    right: 12,
    zIndex: 999999,
    elevation: 999999,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  bannerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerAvatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  bannerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E2E8F0',
  },
  bannerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bannerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerCallerName: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#0F172A',
    maxWidth: '65%',
  },
  bannerAppTag: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#64748B',
  },
  bannerCallSub: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#475569',
    marginTop: 1,
  },
  bannerChevron: {
    paddingLeft: 8,
  },
  bannerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bannerDeclineBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 22,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerDeclineText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  bannerAcceptBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 22,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerAcceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  bannerMessageBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 22,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#334155',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  bannerMessageText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  quickMessagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999999,
    elevation: 9999999,
    justifyContent: 'flex-end',
  },
  quickMessagesBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  quickMessagesSheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
    maxHeight: '85%',
  },
  quickMessagesHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  quickMessagesHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 12,
  },
  quickMessagesCallerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  quickMessagesAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#FD3A73',
  },
  quickMessagesCallerCol: {
    flex: 1,
  },
  quickMessagesTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
  quickMessagesSubtitle: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#94A3B8',
  },
  customReplyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    marginBottom: 10,
  },
  customReplyInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#FFFFFF',
    paddingVertical: 8,
  },
  customReplySendBtn: {
    marginLeft: 6,
  },
  customReplyGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickMessagesScroll: {
    maxHeight: 290,
  },
  quickMessagesList: {
    gap: 8,
    paddingBottom: 8,
  },
  quickMessageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickMessageIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  quickMessageTextCol: {
    flex: 1,
    marginRight: 8,
  },
  quickMessageTagRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  quickMessageTagPill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
  },
  quickMessageTagText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickMessageBodyText: {
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    color: '#F1F5F9',
    lineHeight: 18,
  },
  quickMessagesCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 11,
    marginTop: 4,
  },
  quickMessagesCancelText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#94A3B8',
  },
});

export default CallModal;

