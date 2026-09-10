import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CallSession } from '../types';
import { WebRTCService } from '../services/webrtcService';
import { NativeRTCView } from '../services/webrtcCore';

interface FloatingCallOverlayProps {
  session: CallSession;
  onExpand: () => void;
  onEndCall: () => void;
}

export function FloatingVideoPiP({ session, onExpand, onEndCall }: FloatingCallOverlayProps) {
  const [sec, setSec] = useState(session.durationSeconds || 0);
  const videoRef = useRef<any>(null);
  const screenWidth = Dimensions.get('window').width;

  // Draggable PanResponder
  const pan = useRef(new Animated.ValueXY({ x: screenWidth - 134, y: 80 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value || 0,
          y: (pan.y as any)._value || 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Live Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Video Stream Attacher
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const attach = () => {
      const stream = WebRTCService.getRemoteStream();
      if (stream && videoRef.current && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
      }
    };
    attach();
    const interval = setInterval(attach, 500);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(sec / 60).toString().padStart(2, '0');
  const secs = (sec % 60).toString().padStart(2, '0');
  const durStr = `${mins}:${secs}`;
  const remoteStream = WebRTCService.getRemoteStream();

  return (
    <Animated.View
      style={[
        pipStyles.container,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={pipStyles.innerTouch} onPress={onExpand} activeOpacity={0.9}>
        {/* Remote Video Surface */}
        {Platform.OS === 'web' ? (
          // @ts-ignore
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 14,
              backgroundColor: '#000000',
            }}
          />
        ) : NativeRTCView && remoteStream ? (
          <NativeRTCView
            streamURL={typeof remoteStream.toURL === 'function' ? remoteStream.toURL() : remoteStream}
            style={pipStyles.nativeVideo}
            objectFit="cover"
            zOrder={1}
            zOrderMediaOverlay={true}
          />
        ) : (
          <Image
            source={{ uri: session.callerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800' }}
            style={pipStyles.fallbackImage}
          />
        )}

        {/* Top Badges: Maximize / Return */}
        <View style={pipStyles.topOverlay} pointerEvents="none">
          <View style={pipStyles.expandBadge}>
            <Ionicons name="expand" size={11} color="#FFFFFF" />
          </View>
        </View>

        {/* Hangup Red Button (Top-Right) */}
        <TouchableOpacity
          style={pipStyles.hangupBtn}
          onPress={(e) => {
            e.stopPropagation();
            onEndCall();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="call" size={11} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>

        {/* Bottom Bar: Live Timer & Partner Name */}
        <View style={pipStyles.bottomOverlay} pointerEvents="none">
          <View style={pipStyles.dot} />
          <Text style={pipStyles.timerText}>{durStr}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function FloatingInCallPill({ session, onExpand, onEndCall }: FloatingCallOverlayProps) {
  const [sec, setSec] = useState(session.durationSeconds || 0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(sec / 60).toString().padStart(2, '0');
  const secs = (sec % 60).toString().padStart(2, '0');
  const durStr = `${mins}:${secs}`;
  const isVideo = session.type === 'video' || session.isVideoEnabled;

  return (
    <View style={floatingPillStyles.container} pointerEvents="box-none">
      <TouchableOpacity style={floatingPillStyles.pill} onPress={onExpand} activeOpacity={0.85}>
        <View style={floatingPillStyles.pulseDot} />
        <Ionicons name={isVideo ? 'videocam' : 'call'} size={14} color="#10B981" />
        <Text style={floatingPillStyles.nameText} numberOfLines={1}>
          {session.callerName || 'In Call'}
        </Text>
        <Text style={floatingPillStyles.timeText}>{durStr}</Text>
        <Text style={floatingPillStyles.tapText}>Tap to return</Text>

        <TouchableOpacity
          style={floatingPillStyles.endBtn}
          onPress={(e) => {
            e?.stopPropagation?.();
            onEndCall();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="call" size={13} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

export default function FloatingCallOverlay({ session, onExpand, onEndCall }: FloatingCallOverlayProps) {
  if (!session) return null;
  const isVideo = session.type === 'video' || session.isVideoEnabled;
  if (isVideo) {
    return <FloatingVideoPiP session={session} onExpand={onExpand} onEndCall={onEndCall} />;
  }
  return <FloatingInCallPill session={session} onExpand={onExpand} onEndCall={onEndCall} />;
}

const pipStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 118,
    height: 168,
    borderRadius: 16,
    zIndex: 9999999,
    elevation: 9999999,
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    overflow: 'hidden',
  },
  innerTouch: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: '#000000',
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  topOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 10,
  },
  expandBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: 4,
    borderRadius: 8,
  },
  hangupBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    zIndex: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
});

const floatingPillStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999999,
    elevation: 9999999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#10B981',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  nameText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
    maxWidth: 90,
  },
  timeText: {
    color: '#A7F3D0',
    fontWeight: '600',
    fontSize: 12,
  },
  tapText: {
    color: '#94A3B8',
    fontSize: 10,
    fontStyle: 'italic',
  },
  endBtn: {
    backgroundColor: '#EF4444',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});