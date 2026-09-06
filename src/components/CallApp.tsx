import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, NativeModules, StatusBar } from 'react-native';
import { CallModal } from './CallModal';
import { WebRTCService } from '../services/webrtcService';
import { CallSession } from '../types';
import '../services/telecomBridge';

/**
 * CallApp: Standalone Isolated Root Component for CallActivity.
 * Renders ONLY the incoming / live calling UI (CallModal).
 * Guaranteed 100% Dating Privacy: Zero tabs, zero chat histories, zero match profiles.
 */
export default function CallApp() {
  const [session, setSession] = useState<CallSession | null>(() => WebRTCService.getCurrentSession());
  const hadSessionRef = React.useRef(false);

  useEffect(() => {
    // 🚀 Cold-boot recovery: If React opens before bridge emits, query native module directly
    if (!WebRTCService.getCurrentSession() && Platform.OS === 'android' && NativeModules.CallIntentModule?.getPendingCall) {
      NativeModules.CallIntentModule.getPendingCall().then((pending: any) => {
        if (pending && pending.callId && !WebRTCService.getCurrentSession()) {
          WebRTCService.receiveIncomingCall(
            {
              id: pending.callerId || 'caller',
              name: pending.callerName || 'Caller',
              age: 22,
              gender: 'other',
              occupation: '',
              location: '',
              distance: '',
              bio: '',
              photo: pending.callerPhoto || '',
              photos: [],
              interests: [],
              compatibility: 100,
              isVerified: true,
              isVip: false,
            },
            (pending.callType || pending.type || 'video') as 'audio' | 'video',
            pending.callId,
            false
          );
        }
      }).catch(() => {});
    }

    const unsubscribe = WebRTCService.subscribe((newSession) => {
      if (newSession) {
        hadSessionRef.current = true;
      }
      setSession(newSession);
      // ONLY dismiss CallActivity if a call was actually active and then ended
      if (!newSession && hadSessionRef.current && Platform.OS === 'android' && NativeModules.TelecomModule?.endCall) {
        NativeModules.TelecomModule.endCall().catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleEndCall = () => {
    WebRTCService.endCall();
    if (Platform.OS === 'android' && NativeModules.TelecomModule?.endCall) {
      NativeModules.TelecomModule.endCall().catch(() => {});
    }
  };

  const handleAcceptCall = () => {
    WebRTCService.acceptCall();
    if (Platform.OS === 'android' && NativeModules.TelecomModule?.startOngoingCall) {
      NativeModules.TelecomModule.startOngoingCall(session?.callerName || 'Synkin Call').catch(() => {});
    }
  };

  const handleMinimizeToChat = () => {
    const partnerId = session?.callerId || session?.receiverId;
    if (partnerId) {
      WebRTCService.setTargetChatUserId(partnerId);
    }
    WebRTCService.setMinimized(true);
    if (Platform.OS === 'android' && NativeModules.TelecomModule?.openChatFromCall && partnerId) {
      NativeModules.TelecomModule.openChatFromCall(partnerId).catch(() => {});
    }
  };

  if (!session) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={false} barStyle="light-content" translucent backgroundColor="transparent" />
      <CallModal
        session={session}
        onEndCall={handleEndCall}
        onAcceptCall={handleAcceptCall}
        onMinimize={handleMinimizeToChat}
        onToggleMute={() => WebRTCService.toggleMute()}
        onToggleVideo={() => WebRTCService.toggleVideo()}
        onToggleSpeaker={() => WebRTCService.toggleSpeaker()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060A',
  },
});
