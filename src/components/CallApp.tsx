import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, NativeModules, StatusBar } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { CallModal } from './CallModal';
import { WebRTCService } from '../services/webrtcService';
import { CallSession } from '../types';
import '../services/telecomBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealtimeBridge } from '../services/realtimeBridge';

/**
 * CallApp: Standalone Isolated Root Component for CallActivity.
 * Renders ONLY the incoming / live calling UI (CallModal).
 * Guaranteed 100% Dating Privacy: Zero tabs, zero chat histories, zero match profiles.
 */
export default function CallApp() {
  const [session, setSession] = useState<CallSession | null>(() => WebRTCService.getCurrentSession());
  const hadSessionRef = React.useRef(false);

  useEffect(() => {
    // 👤 Register socket with logged-in userId in CallActivity
    AsyncStorage.getItem('synking_my_user').then(stored => {
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          RealtimeBridge.registerUser(parsed.id);
        }
      }
    }).catch(() => {});

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

  // 💡 Keep Screen Awake as long as CallActivity call is active
  useEffect(() => {
    if (session?.status === 'connected' || session?.status === 'calling' || session?.status === 'ringing') {
      activateKeepAwakeAsync('synkin_callapp_screen').catch(() => {});
      if (Platform.OS === 'android' && NativeModules.CallWakeLockModule?.acquireScreenWakeLock) {
        NativeModules.CallWakeLockModule.acquireScreenWakeLock().catch(() => {});
      }
    } else {
      deactivateKeepAwake('synkin_callapp_screen').catch(() => {});
      if (Platform.OS === 'android' && NativeModules.CallWakeLockModule?.releaseScreenWakeLock) {
        NativeModules.CallWakeLockModule.releaseScreenWakeLock().catch(() => {});
      }
    }
    return () => {
      deactivateKeepAwake('synkin_callapp_screen').catch(() => {});
      if (Platform.OS === 'android' && NativeModules.CallWakeLockModule?.releaseScreenWakeLock) {
        NativeModules.CallWakeLockModule.releaseScreenWakeLock().catch(() => {});
      }
    };
  }, [session?.status]);

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
        isLockscreen={true}
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
    backgroundColor: '#000000',
  },
});
