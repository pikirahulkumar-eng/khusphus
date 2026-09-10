import React, { useState, useEffect } from 'react';
import { View, Text, Platform, ActivityIndicator, useWindowDimensions, StyleSheet, BackHandler, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';
import ChatScreen from './src/screens/ChatScreen';
import CallModal from './src/components/CallModal';
import FloatingCallOverlay from './src/components/FloatingCallOverlay';
import { WebRTCService } from './src/services/webrtcService';
import { RealtimeBridge } from './src/services/realtimeBridge';
import { getBackendUrl } from './src/services/firebase';
import { isDummyContact } from './src/services/chatStorageService';
let Updates: any = null;
try {
  Updates = require('expo-updates');
} catch (_) {
  Updates = null;
}

import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

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

const DesktopWelcomePlaceholder = ({ isDark }: { isDark: boolean }) => (
  <View style={[styles.welcomeContainer, isDark && { backgroundColor: '#000000' }]}>
    <View style={[styles.welcomeCard, isDark && { backgroundColor: '#000000', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
      <View style={[styles.welcomeIconContainer, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
        <Ionicons name="chatbubbles" size={48} color="#10B981" />
      </View>
      <Text style={[styles.welcomeTitle, isDark && { color: '#FFFFFF' }]}>Sunao for Web & Desktop</Text>
      <Text style={[styles.welcomeSubtitle, isDark && { color: '#94A3B8' }]}>
        Send and receive end-to-end encrypted messages and start instant HD audio & video calls in realtime.
      </Text>
      <View style={[styles.encryptionBadge, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
        <Ionicons name="lock-closed" size={14} color="#10B981" />
        <Text style={[styles.encryptionText, isDark && { color: '#10B981' }]}>End-to-end encrypted</Text>
      </View>
    </View>
  </View>
);

const RootWrapper = ({ children, isDark }: any) => (
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
        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
        backgroundColor: isDark ? '#000000' : '#F8FAFC',
        shadowColor: isDark ? '#000000' : '#0F172A',
        shadowOpacity: isDark ? 0.35 : 0.08,
        shadowRadius: 16,
      },
    ]}
  >
    {children}
  </View>
);

function AppMain() {
  const { isDark, colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Immediate check & reload on launch for live EAS OTA updates
  useEffect(() => {
    async function checkAutoUpdate() {
      if (__DEV__ || Platform.OS === 'web' || !Updates || typeof Updates.checkForUpdateAsync !== 'function') return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update && update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (_) {}
    }
    checkAutoUpdate();
  }, []);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const loggedOut = window.localStorage.getItem('@sunao_logged_out');
      const isVerified = window.localStorage.getItem('@sunao_session_verified_v1');
      const phone = window.localStorage.getItem('user_phone');
      if (phone && loggedOut !== 'true' && isVerified === 'true' && !isDummyContact({ phone })) return true;
    }
    return false;
  });
  const [currentUserPhone, setCurrentUserPhone] = useState<string>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const isVerified = window.localStorage.getItem('@sunao_session_verified_v1');
      const phone = window.localStorage.getItem('user_phone');
      if (isVerified === 'true' && phone && !isDummyContact({ phone })) {
        return phone;
      }
    }
    return '';
  });
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const isVerified = window.localStorage.getItem('@sunao_session_verified_v1');
      if (isVerified === 'true') {
        return window.localStorage.getItem('@sunao_user_name') || window.localStorage.getItem('user_name') || '';
      }
    }
    return '';
  });

  // Synchronous restoration on web from localStorage only — never read sensitive data from URL
  const [activeChatUser, setActiveChatUser] = useState<any>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        if (window.localStorage) {
          // Restore from localStorage; hash just tells us IF a chat was active
          const hash = window.location.hash || '';
          const raw = window.localStorage.getItem('@sunao_active_chat_user');
          if (raw && hash.startsWith('#/chat')) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.phone && !isDummyContact(parsed)) return parsed;
            window.localStorage.removeItem('@sunao_active_chat_user');
          }
        }
      } catch (e) {}
    }
    return null;
  });

  // WebRTC Call Session
  const [callSession, setCallSession] = useState<any>(null);

  const handleOpenChat = (user: any) => {
    setActiveChatUser(user);
    if (user && user.phone) {
      AsyncStorage.setItem('@sunao_active_chat_user', JSON.stringify(user)).catch(() => {});
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.location.hash !== '#/chat') {
          window.history.pushState({ isChat: true }, '', '#/chat');
        }
      }
    } else {
      AsyncStorage.removeItem('@sunao_active_chat_user').catch(() => {});
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.location.hash.startsWith('#/chat')) {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    }
  };

  const handleCloseChat = () => {
    handleOpenChat(null);
  };

  useEffect(() => {
    const restoreAppState = async () => {
      try {
        const isVerified = await AsyncStorage.getItem('@sunao_session_verified_v1');
        const loggedOut = await AsyncStorage.getItem('@sunao_logged_out');
        const phone = await AsyncStorage.getItem('user_phone');
        const name = (await AsyncStorage.getItem('@sunao_user_name')) || (await AsyncStorage.getItem('user_name'));
        const storedUserId = await AsyncStorage.getItem('@sunao_user_id');
        
        const isDummy = !phone || isDummyContact({ phone: phone.trim(), name }) || phone.trim().length < 10;

        // Strictly enforce fresh Sign In if no verified session exists or if dummy data detected
        if (isDummy || loggedOut === 'true' || isVerified !== 'true') {
          await AsyncStorage.multiRemove([
            'user_phone',
            'user_name',
            '@sunao_user_name',
            '@sunao_user_handle',
            '@sunao_user_id',
            '@sunao_active_chat_user',
            '@sunao_session_verified_v1',
          ]).catch(() => {});

          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('user_phone');
            window.localStorage.removeItem('user_name');
            window.localStorage.removeItem('@sunao_user_name');
            window.localStorage.removeItem('@sunao_user_handle');
            window.localStorage.removeItem('@sunao_user_id');
            window.localStorage.removeItem('@sunao_active_chat_user');
            window.localStorage.removeItem('@sunao_session_verified_v1');
          }

          setIsAuthenticated(false);
          setCurrentUserPhone('');
          setCurrentUserName('');
        } else {
          const activePhone = phone.trim();
          const activeName = (name && name.trim()) || 'Sunao User';
          setCurrentUserPhone(activePhone);
          setCurrentUserName(activeName);
          setIsAuthenticated(true);
          // Register with both UUID and phone so calls/messages resolve by phone OR UUID
          const registerId = (storedUserId && storedUserId.trim()) || activePhone;
          RealtimeBridge.registerUser(registerId, activePhone);

          // Background sync to backend users database so profile is active and searchable
          const serverUrl = getBackendUrl();
          fetch(`${serverUrl}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: registerId, phone: activePhone, name: activeName }),
          }).catch(() => {});
        }

        // Restore active chat user if not already in state
        const savedChat = await AsyncStorage.getItem('@sunao_active_chat_user');
        if (savedChat) {
          try {
            const parsed = JSON.parse(savedChat);
            if (parsed && parsed.phone) {
              if (isDummyContact(parsed)) {
                AsyncStorage.removeItem('@sunao_active_chat_user').catch(() => {});
                setActiveChatUser(null);
              } else {
                setActiveChatUser((curr: any) => curr || parsed);
              }
            }
          } catch (e) {}
        }
      } catch (e) {
        console.warn('App state restoration error:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    restoreAppState();
  }, []);

  // Web Hash Route Sync (Browser Back / Forward Buttons & Gestures)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onRouteSync = async () => {
        const hash = window.location.hash || '';
        if (hash.startsWith('#/chat')) {
          if (!activeChatUser) {
            try {
              const raw = await AsyncStorage.getItem('@sunao_active_chat_user');
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.phone && !isDummyContact(parsed)) {
                  setActiveChatUser(parsed);
                  return;
                }
              }
            } catch (e) {}
          }
        } else {
          // Any non-chat route (empty, #/chats, #/calls, #/profile, #/updates) closes chat cleanly
          if (activeChatUser) {
            setActiveChatUser(null);
            AsyncStorage.removeItem('@sunao_active_chat_user').catch(() => {});
          }
        }
      };

      window.addEventListener('hashchange', onRouteSync);
      window.addEventListener('popstate', onRouteSync);
      return () => {
        window.removeEventListener('hashchange', onRouteSync);
        window.removeEventListener('popstate', onRouteSync);
      };
    }
  }, [activeChatUser]);

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
        handleCloseChat();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [activeChatUser]);

  const handleLoginSuccess = async (phone: string, name: string) => {
    try {
      const cleanPhone = phone.trim();
      const cleanName = (name && name.trim()) || 'Sunao User';
      const handle = `@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}`;

      // Generate a permanent opaque user ID — only once, never derived from phone/name
      let userId = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        userId = window.localStorage.getItem('@sunao_user_id') || '';
      }
      if (!userId) {
        try { userId = await AsyncStorage.getItem('@sunao_user_id') || ''; } catch (_) {}
      }
      if (!userId) {
        // Cryptographically random 12-char hex ID, prefixed with 'sun_'
        const rand = Array.from({ length: 12 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        userId = `sun_${rand}`;
      }

      await AsyncStorage.setItem('user_phone', cleanPhone);
      await AsyncStorage.setItem('@sunao_user_name', cleanName);
      await AsyncStorage.setItem('user_name', cleanName);
      await AsyncStorage.setItem('@sunao_user_handle', handle);
      await AsyncStorage.setItem('@sunao_user_id', userId);
      await AsyncStorage.setItem('@sunao_session_verified_v1', 'true');
      await AsyncStorage.removeItem('@sunao_logged_out');

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('user_phone', cleanPhone);
        window.localStorage.setItem('@sunao_user_name', cleanName);
        window.localStorage.setItem('user_name', cleanName);
        window.localStorage.setItem('@sunao_user_handle', handle);
        window.localStorage.setItem('@sunao_user_id', userId);
        window.localStorage.setItem('@sunao_session_verified_v1', 'true');
        window.localStorage.removeItem('@sunao_logged_out');
      }

      setCurrentUserPhone(cleanPhone);
      setCurrentUserName(cleanName);
      setIsAuthenticated(true);
      // Register with realtime socket using opaque UUID and phone
      RealtimeBridge.registerUser(userId, cleanPhone);

      // Register user profile on server so they are searchable from any device
      const serverUrl = getBackendUrl();

      fetch(`${serverUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phone: cleanPhone, name: cleanName }),
      }).then(r => r.json())
        .then(d => console.log('[USER_REGISTERED_SERVER]', d))
        .catch(e => console.warn('[REGISTER_SERVER_WARN]', e));
    } catch (e) {
      console.error('Failed to persist session:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'user_phone',
        'user_name',
        '@sunao_user_name',
        '@sunao_user_handle',
        '@sunao_user_id',
        '@sunao_active_chat_user',
        '@sunao_session_verified_v1',
      ]);
      await AsyncStorage.setItem('@sunao_logged_out', 'true');

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('user_phone');
        window.localStorage.removeItem('user_name');
        window.localStorage.removeItem('@sunao_user_name');
        window.localStorage.removeItem('@sunao_user_handle');
        window.localStorage.removeItem('@sunao_user_id');
        window.localStorage.removeItem('@sunao_active_chat_user');
        window.localStorage.removeItem('@sunao_session_verified_v1');
        window.localStorage.setItem('@sunao_logged_out', 'true');
        window.location.hash = '';
      }

      setIsAuthenticated(false);
      setCurrentUserPhone('');
      setCurrentUserName('');
      setActiveChatUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const startCall = (userId: string, userName: string, isVideo: boolean) => {
    WebRTCService.startCall({
      callerUser: { id: currentUserPhone || 'my_id', name: currentUserName || 'You', phone: currentUserPhone },
      targetUser: { id: userId, name: userName, phone: userId },
      type: isVideo ? 'video' : 'audio',
    });
  };

  // Listen for native intent opening chat from incoming call or notification
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onOpenChatRequested', (event: any) => {
      const partnerId = event?.partnerId;
      if (partnerId) {
        WebRTCService.setMinimized(true);
        handleOpenChat({ phone: partnerId, name: callSession?.callerName || partnerId, id: partnerId });
      }
    });
    return () => sub.remove();
  }, [callSession]);

  useEffect(() => {
    const targetUserId = WebRTCService.getTargetChatUserId();
    if (targetUserId) {
      WebRTCService.setTargetChatUserId(null);
      const partnerName = callSession?.callerName || 'Chat';
      handleOpenChat({ phone: targetUserId, name: partnerName, id: targetUserId });
    }
  }, [callSession?.isMinimized, callSession]);

  const renderCallUI = () => {
    if (!callSession) return null;
    if (callSession.isMinimized) {
      return (
        <FloatingCallOverlay
          session={callSession}
          onExpand={() => WebRTCService.setMinimized(false)}
          onEndCall={() => WebRTCService.endCall()}
        />
      );
    }
    return (
      <CallModal
        session={callSession}
        onAcceptCall={() => WebRTCService.acceptCall()}
        onEndCall={() => WebRTCService.endCall()}
        onMinimize={() => {
          WebRTCService.setMinimized(true);
          const partnerId = callSession.callerId === currentUserPhone ? callSession.receiverId : callSession.callerId;
          if (partnerId) {
            handleOpenChat({ phone: partnerId, name: callSession.callerName || partnerId, id: partnerId });
          }
        }}
        onToggleMute={() => WebRTCService.toggleMute()}
        onToggleVideo={() => WebRTCService.toggleVideo()}
        onToggleSpeaker={() => WebRTCService.toggleSpeaker()}
      />
    );
  };

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // 1. Desktop Responsive Dual-Pane View (Width >= 768px on Web/Desktop)
  if (isDesktop) {
    return (
      <View style={[styles.desktopContainer, isDark && { backgroundColor: '#000000' }]}>
        {/* Left Pane: Main Navigation & Chat/Call Lists */}
        <View style={[styles.desktopSidebar, isDark && { backgroundColor: '#000000', borderRightColor: 'rgba(255, 255, 255, 0.08)' }]}>
          <MainScreen
            currentUserPhone={currentUserPhone}
            currentUserName={currentUserName}
            activeChatPhone={activeChatUser?.phone}
            onOpenChat={handleOpenChat}
            onStartCall={(phone, name, isVideo) => startCall(phone, name, isVideo)}
            onLogout={handleLogout}
          />
        </View>

        {/* Right Pane: Active Chat Conversation or Welcome Banner */}
        <View style={[styles.desktopMainContent, isDark && { backgroundColor: '#000000' }]}>
          {activeChatUser ? (
            <ChatScreen
              chatUser={activeChatUser}
              user={activeChatUser}
              currentUserPhone={currentUserPhone}
              onBack={handleCloseChat}
              onStartCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
              onCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
            />
          ) : (
            <DesktopWelcomePlaceholder isDark={isDark} />
          )}
        </View>

        {renderCallUI()}
      </View>
    );
  }

  // 2. Mobile View (< 768px)
  if (activeChatUser) {
    return (
      <RootWrapper isDark={isDark}>
        <ChatScreen
          chatUser={activeChatUser}
          user={activeChatUser}
          currentUserPhone={currentUserPhone}
          onBack={handleCloseChat}
          onStartCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
          onCall={(isVideo: boolean) => startCall(activeChatUser.phone, activeChatUser.name, isVideo)}
        />
        {renderCallUI()}
      </RootWrapper>
    );
  }

  return (
    <RootWrapper isDark={isDark}>
      <MainScreen
        currentUserPhone={currentUserPhone}
        currentUserName={currentUserName}
        onOpenChat={handleOpenChat}
        onStartCall={(phone, name, isVideo) => startCall(phone, name, isVideo)}
        onLogout={handleLogout}
      />
      {renderCallUI()}
    </RootWrapper>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppMain />
    </ThemeProvider>
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
