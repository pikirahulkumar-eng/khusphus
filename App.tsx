import React, { useState, useEffect } from 'react';
import { View, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import ChatScreen from './src/screens/ChatScreen';
import CallModal from './src/components/CallModal';
import { WebRTCService } from './src/services/webrtcService';
import { RealtimeBridge } from './src/services/realtimeBridge';

const RootWrapper = ({ children }: any) => (
  <View
    style={[
      { flex: 1 },
      Platform.OS === 'web' && {
        marginHorizontal: 'auto',
        width: '100%',
        maxWidth: 440,
        height: '100%' as any,
        overflow: 'hidden',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        shadowColor: '#0F172A',
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
    ]}
  >
    {children}
  </View>
);

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentUserPhone, setCurrentUserPhone] = useState('9876543210');

  const [activeChatUser, setActiveChatUser] = useState<any>(null);

  // WebRTC Call Session
  const [callSession, setCallSession] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const phone = await AsyncStorage.getItem('user_phone');
        const activePhone = phone || '9876543210';
        setCurrentUserPhone(activePhone);
        setIsAuthenticated(true);
        RealtimeBridge.registerUser(activePhone);
      } catch (e) {
        console.warn('Auth check error:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = WebRTCService.subscribe((session) => {
      setCallSession(session);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = async (phone: string) => {
    try {
      await AsyncStorage.setItem('user_phone', phone);
      setCurrentUserPhone(phone);
      setIsAuthenticated(true);
      RealtimeBridge.registerUser(phone);
    } catch (e) {
      console.error('Failed to persist session:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user_phone');
      setIsAuthenticated(false);
      setCurrentUserPhone('');
      setActiveChatUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const startCall = (userId: string, userName: string, isVideo: boolean) => {
    WebRTCService.startCall({
      callerUser: { id: currentUserPhone || 'my_id', name: 'You', phone: currentUserPhone },
      targetUser: { id: userId, name: userName, phone: userId },
      type: isVideo ? 'video' : 'audio',
    });
  };

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size="large" color="#008069" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (activeChatUser) {
    return (
      <RootWrapper>
        <ChatScreen
          chatUser={activeChatUser}
          user={activeChatUser}
          onBack={() => setActiveChatUser(null)}
          onStartCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
          onCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
        />
        {callSession && (
          <CallModal
            session={callSession}
            onAcceptCall={() => WebRTCService.acceptCall()}
            onEndCall={() => WebRTCService.endCall()}
            onToggleMute={() => WebRTCService.toggleMute()}
            onToggleVideo={() => WebRTCService.toggleVideo()}
            onToggleSpeaker={() => WebRTCService.toggleSpeaker()}
          />
        )}
      </RootWrapper>
    );
  }

  return (
    <RootWrapper>
      <MainScreen
        currentUserPhone={currentUserPhone}
        onOpenChat={(user) => setActiveChatUser(user)}
        onStartCall={(phone, name, isVideo) => startCall(phone, name, isVideo)}
        onLogout={handleLogout}
      />
      {callSession && (
        <CallModal
          session={callSession}
          onAcceptCall={() => WebRTCService.acceptCall()}
          onEndCall={() => WebRTCService.endCall()}
          onToggleMute={() => WebRTCService.toggleMute()}
          onToggleVideo={() => WebRTCService.toggleVideo()}
          onToggleSpeaker={() => WebRTCService.toggleSpeaker()}
        />
      )}
    </RootWrapper>
  );
}
