import React, { useState, useEffect } from 'react';
import { View, Text, Platform, ActivityIndicator, useWindowDimensions, StyleSheet, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import ChatScreen from './src/screens/ChatScreen';
import CallModal from './src/components/CallModal';
import { WebRTCService } from './src/services/webrtcService';
import { RealtimeBridge } from './src/services/realtimeBridge';

// Inject global desktop CSS for cursor pointer and desktop feel
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'sunao-global-desktop-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      * {
        user-select: auto;
      }
      button, [role="button"], [data-focusable="true"], a, [tabindex="0"] {
        cursor: pointer !important;
      }
      input, textarea {
        cursor: text !important;
      }
    `;
    document.head.appendChild(style);
  }
}

const DesktopWelcomePlaceholder = () => (
  <View style={styles.welcomeContainer}>
    <View style={styles.welcomeCard}>
      <View style={styles.welcomeIconContainer}>
        <Ionicons name="chatbubbles" size={48} color="#059669" />
      </View>
      <Text style={styles.welcomeTitle}>Sunao for Web & Desktop</Text>
      <Text style={styles.welcomeSubtitle}>
        Send and receive end-to-end encrypted messages and start instant HD audio & video calls in realtime.
      </Text>
      <View style={styles.encryptionBadge}>
        <Ionicons name="lock-closed" size={14} color="#059669" />
        <Text style={styles.encryptionText}>End-to-end encrypted</Text>
      </View>
    </View>
  </View>
);

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
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

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

  // Android Hardware Back Handler: Return from active chat to chat list
  useEffect(() => {
    const handleBack = () => {
      if (activeChatUser) {
        setActiveChatUser(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [activeChatUser]);

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

  // 1. Desktop Responsive Dual-Pane View (Width >= 768px on Web/Desktop)
  if (isDesktop) {
    return (
      <View style={styles.desktopContainer}>
        {/* Left Pane: Main Navigation & Chat/Call Lists */}
        <View style={styles.desktopSidebar}>
          <MainScreen
            currentUserPhone={currentUserPhone}
            activeChatPhone={activeChatUser?.phone}
            onOpenChat={(user) => setActiveChatUser(user)}
            onStartCall={(phone, name, isVideo) => startCall(phone, name, isVideo)}
            onLogout={handleLogout}
          />
        </View>

        {/* Right Pane: Active Chat Conversation or Welcome Banner */}
        <View style={styles.desktopMainContent}>
          {activeChatUser ? (
            <ChatScreen
              chatUser={activeChatUser}
              user={activeChatUser}
              currentUserPhone={currentUserPhone}
              onBack={() => setActiveChatUser(null)}
              onStartCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
              onCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
            />
          ) : (
            <DesktopWelcomePlaceholder />
          )}
        </View>

        {callSession && (
          <CallModal
            session={callSession}
            onAcceptCall={() => WebRTCService.acceptCall()}
            onEndCall={() => WebRTCService.endCall()}
            onMinimize={() => WebRTCService.setMinimized(true)}
            onToggleMute={() => WebRTCService.toggleMute()}
            onToggleVideo={() => WebRTCService.toggleVideo()}
            onToggleSpeaker={() => WebRTCService.toggleSpeaker()}
          />
        )}
      </View>
    );
  }

  // 2. Mobile View (< 768px)
  if (activeChatUser) {
    return (
      <RootWrapper>
        <ChatScreen
          chatUser={activeChatUser}
          user={activeChatUser}
          currentUserPhone={currentUserPhone}
          onBack={() => setActiveChatUser(null)}
          onStartCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
          onCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
        />
        {callSession && (
          <CallModal
            session={callSession}
            onAcceptCall={() => WebRTCService.acceptCall()}
            onEndCall={() => WebRTCService.endCall()}
            onMinimize={() => WebRTCService.setMinimized(true)}
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
          onMinimize={() => WebRTCService.setMinimized(true)}
          onToggleMute={() => WebRTCService.toggleMute()}
          onToggleVideo={() => WebRTCService.toggleVideo()}
          onToggleSpeaker={() => WebRTCService.toggleSpeaker()}
        />
      )}
    </RootWrapper>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%' as any,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  desktopSidebar: {
    width: 420,
    maxWidth: '40%',
    minWidth: 360,
    height: '100%' as any,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  desktopMainContent: {
    flex: 1,
    height: '100%' as any,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 32,
  },
  welcomeCard: {
    alignItems: 'center',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  welcomeIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  encryptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
});
