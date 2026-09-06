import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform, Modal, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SunaoHeader from '../components/main/SunaoHeader';
import FilterChips, { FilterType } from '../components/main/FilterChips';
import ChatsTab, { ChatItemData } from '../components/main/ChatsTab';
import UpdatesTab, { StatusUpdateData } from '../components/main/UpdatesTab';
import ProfileTab from '../components/main/ProfileTab';
import CallsTab, { CallLogItem } from '../components/main/CallsTab';
import SunaoBottomNav, { MainNavTab } from '../components/main/SunaoBottomNav';
import NewChatModal from '../components/main/NewChatModal';
import SettingsModal from '../components/main/SettingsModal';
import { SunaoTheme } from '../constants/theme';
import { ChatStorageService } from '../services/chatStorageService';
import { RealtimeBridge } from '../services/realtimeBridge';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MainScreenProps {
  currentUserPhone: string;
  onOpenChat: (user: { phone: string; name: string }) => void;
  onStartCall: (phone: string, name: string, isVideo: boolean) => void;
  onLogout: () => void;
  activeChatPhone?: string;
}

export default function MainScreen({
  currentUserPhone,
  onOpenChat,
  onStartCall,
  onLogout,
  activeChatPhone,
}: MainScreenProps) {
  const [activeNavTab, setActiveNavTab] = useState<MainNavTab>('Chats');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteSearchResults, setRemoteSearchResults] = useState<any[]>([]);

  // Modals
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Initial WhatsApp sample data
  const initialChats: ChatItemData[] = [
    {
      phone: '9876543210',
      name: 'Rahul Bhai',
      avatarUri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      lastMessage: 'Bhai Render pe server 100% live chal raha hai! 🔥',
      timestamp: '11:42 AM',
      unreadCount: 2,
      isPinned: true,
      hasStatusStory: true,
      sentByMe: false,
    },
    {
      phone: '9998887776',
      name: 'Papa',
      avatarUri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      lastMessage: 'Theek hai beta, aate waqt le aana.',
      timestamp: '10:15 AM',
      sentByMe: true,
      messageStatus: 'read',
    },
    {
      phone: '1122334455',
      name: 'Neha Sharma',
      avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      lastMessage: 'Call me when you are free! Important discuss karna hai.',
      timestamp: '9:30 AM',
      unreadCount: 1,
      hasStatusStory: true,
      sentByMe: false,
    },
    {
      phone: 'grp_sunao_core',
      name: 'Sunao Core Devs 🚀',
      lastMessage: 'Amit: Audio aur video call ekdum clear chal raha hai.',
      timestamp: 'Yesterday',
      isGroup: true,
      unreadCount: 4,
      isPinned: true,
      sentByMe: false,
    },
    {
      phone: '5566778899',
      name: 'Amit Patel',
      avatarUri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      lastMessage: 'Photos send kar diye hain mail par.',
      timestamp: 'Yesterday',
      sentByMe: true,
      messageStatus: 'delivered',
      isMuted: true,
    },
    {
      phone: 'grp_college_gang',
      name: 'College Gang 2026 🎉',
      lastMessage: 'Vikram: Sunday cafe me milte hain sab log!',
      timestamp: '04/09/2026',
      isGroup: true,
      sentByMe: false,
    },
    {
      phone: '6677889900',
      name: 'Priya Verma',
      avatarUri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      lastMessage: 'Thanks a lot for the help! 😊',
      timestamp: '03/09/2026',
      sentByMe: true,
      messageStatus: 'read',
    },
  ];

  const initialCalls: CallLogItem[] = [
    {
      id: 'call_1',
      phone: '9876543210',
      name: 'Rahul Bhai',
      avatarUri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      type: 'incoming',
      isVideo: true,
      time: 'Today, 11:20 AM',
    },
    {
      id: 'call_2',
      phone: '1122334455',
      name: 'Neha Sharma',
      avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      type: 'missed',
      isVideo: false,
      time: 'Today, 9:28 AM',
      count: 2,
    },
    {
      id: 'call_3',
      phone: '9998887776',
      name: 'Papa',
      avatarUri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      type: 'outgoing',
      isVideo: false,
      time: 'Yesterday, 8:45 PM',
    },
    {
      id: 'call_4',
      phone: '5566778899',
      name: 'Amit Patel',
      avatarUri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      type: 'incoming',
      isVideo: false,
      time: 'September 3, 4:10 PM',
    },
  ];

  const contactsList = [
    { phone: '9876543210', name: 'Rahul Bhai', about: 'Building Sunao App 🚀', avatarUri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
    { phone: '9998887776', name: 'Papa', about: 'Available', avatarUri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
    { phone: '1122334455', name: 'Neha Sharma', about: 'Busy at work 🎧', avatarUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { phone: '5566778899', name: 'Amit Patel', about: 'Urgent calls only', avatarUri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150' },
    { phone: '6677889900', name: 'Priya Verma', about: 'Exploring new horizons ✨', avatarUri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150' },
    { phone: '7788990011', name: 'Rohan Gupta', about: 'Coding late night 💻' },
    { phone: '8899001122', name: 'Sneha Roy', about: 'Living in the moment' },
  ];

  // Handle Search Input & Turso live search query
  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 3) {
      try {
        const res = await fetch(`https://khusphus-epsm.onrender.com/api/search?query=${encodeURIComponent(text)}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setRemoteSearchResults(data);
        }
      } catch (e) {
        console.warn('Search query error:', e);
      }
    } else {
      setRemoteSearchResults([]);
    }
  };

  // Chats state loaded from local-first storage
  const [chats, setChats] = useState<ChatItemData[]>(initialChats);

  // 1. Load Recent Chats from Local Storage on Mount & User Change
  useEffect(() => {
    let isMounted = true;
    const fetchRecentChats = async () => {
      const stored = await ChatStorageService.getRecentChats(currentUserPhone, initialChats);
      if (isMounted && stored && stored.length > 0) {
        setChats(stored);
      }
    };
    fetchRecentChats();
    return () => {
      isMounted = false;
    };
  }, [currentUserPhone]);

  // 2. Real-Time Socket Event Listener (Incoming & Multi-Device Outgoing Sync)
  useEffect(() => {
    const unsubscribe = RealtimeBridge.subscribe((event) => {
      if (event.type === 'CHAT_MESSAGE' && event.payload) {
        const p = event.payload;
        const isIncoming = p.senderId !== currentUserPhone;
        const peerPhone = isIncoming ? p.senderId : p.receiverId;
        const time = p.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const text = p.type === 'voice' ? '🎤 Voice message' : (p.text || '');

        setChats((prev) => {
          const list = [...prev];
          const idx = list.findIndex((c) => c.phone === peerPhone);
          if (idx >= 0) {
            const existing = list[idx];
            const updated: ChatItemData = {
              ...existing,
              lastMessage: text,
              timestamp: time,
              unreadCount: isIncoming ? (existing.unreadCount || 0) + 1 : 0,
              sentByMe: !isIncoming,
              messageStatus: isIncoming ? undefined : 'read',
            };
            list.splice(idx, 1);
            list.unshift(updated);
          } else {
            list.unshift({
              phone: peerPhone,
              name: peerPhone,
              lastMessage: text,
              timestamp: time,
              unreadCount: isIncoming ? 1 : 0,
              sentByMe: !isIncoming,
              messageStatus: isIncoming ? undefined : 'read',
            });
          }
          return list;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserPhone]);

  // Handle Opening Chat and Clearing Unread Count Locally
  const handleSelectChat = async (chat: ChatItemData) => {
    await ChatStorageService.markAsRead(currentUserPhone, chat.phone);
    setChats((prev) =>
      prev.map((c) => (c.phone === chat.phone ? { ...c, unreadCount: 0 } : c))
    );
    onOpenChat({ phone: chat.phone, name: chat.name });
  };

  // Filtered Chats based on chips & search
  const filteredChats = useMemo(() => {
    let result = [...chats];

    // Search filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q) || c.phone.includes(q)
      );

      // Append remote Turso users if not already in list
      if (remoteSearchResults.length > 0) {
        remoteSearchResults.forEach((remoteUser) => {
          if (!result.some((c) => c.phone === remoteUser.phone)) {
            result.push({
              phone: remoteUser.phone,
              name: remoteUser.name || remoteUser.phone,
              lastMessage: 'Tap to start conversation',
              timestamp: 'New',
              unreadCount: 0,
            });
          }
        });
      }
    }

    // Filter Chips
    if (activeFilter === 'Unread') {
      result = result.filter((c) => (c.unreadCount ?? 0) > 0);
    } else if (activeFilter === 'Groups') {
      result = result.filter((c) => c.isGroup);
    } else if (activeFilter === 'Favourites') {
      result = result.filter((c) => c.isPinned);
    }

    return result;
  }, [chats, searchQuery, remoteSearchResults, activeFilter]);

  const totalUnreadCount = useMemo(() => {
    return chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [chats]);

  const [hasSeenCalls, setHasSeenCalls] = useState(false);
  const [hasSeenUpdates, setHasSeenUpdates] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@sunao_seen_calls').then((val) => {
      if (val === 'true') setHasSeenCalls(true);
    });
    AsyncStorage.getItem('@sunao_seen_updates').then((val) => {
      if (val === 'true') setHasSeenUpdates(true);
    });
  }, []);

  const markCallsSeen = () => {
    setHasSeenCalls(true);
    AsyncStorage.setItem('@sunao_seen_calls', 'true');
  };

  const markUpdatesSeen = () => {
    setHasSeenUpdates(true);
    AsyncStorage.setItem('@sunao_seen_updates', 'true');
  };

  useEffect(() => {
    if (activeNavTab === 'Calls') {
      markCallsSeen();
    } else if (activeNavTab === 'Updates') {
      markUpdatesSeen();
    }
  }, [activeNavTab]);

  const missedCallsCount = useMemo(() => {
    if (hasSeenCalls || activeNavTab === 'Calls') return 0;
    return initialCalls.filter((c) => c.type === 'missed').length;
  }, [initialCalls, hasSeenCalls, activeNavTab]);

  const hasUpdatesBadge = useMemo(() => {
    if (hasSeenUpdates || activeNavTab === 'Updates') return false;
    return true;
  }, [hasSeenUpdates, activeNavTab]);

  return (
    <View style={styles.rootContainer}>
      <SafeAreaView style={styles.topBarSafe} />
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />

      {/* Modern Sunao Header (Chats, Calls, Updates) */}
      {activeNavTab !== 'Profile' && (
        <SunaoHeader
          activeTab={activeNavTab}
          searchQuery={searchQuery}
          isSearching={isSearching}
          onSearchChange={handleSearchChange}
          onOpenSearch={() => setIsSearching(true)}
          onCloseSearch={() => {
            setIsSearching(false);
            setSearchQuery('');
            setRemoteSearchResults([]);
          }}
          onOpenSettings={() => setShowSettingsModal(true)}
          onLogout={onLogout}
          onCameraPress={() => setShowCameraModal(true)}
          onOpenNewChat={() => setShowNewChatModal(true)}
        />
      )}

      {/* Filter Chips (Visible on Chats Tab when not actively searching) */}
      {activeNavTab === 'Chats' && !isSearching && (
        <FilterChips
          activeFilter={activeFilter}
          onSelectFilter={setActiveFilter}
          unreadCount={totalUnreadCount}
        />
      )}

      {/* Tab Contents */}
      <View style={styles.body}>
        {activeNavTab === 'Chats' && (
          <ChatsTab
            chats={filteredChats}
            activeChatPhone={activeChatPhone}
            onSelectChat={handleSelectChat}
            onOpenNewChat={() => setShowNewChatModal(true)}
            onStartCall={(phone, name, isVideo) => onStartCall(phone, name, isVideo)}
          />
        )}

        {/* Calls Tab */}
        {activeNavTab === 'Calls' && (
          <CallsTab
            calls={initialCalls}
            onStartCall={(phone, name, isVideo) => onStartCall(phone, name, isVideo)}
          />
        )}

        {/* Moments & Updates Tab */}
        {activeNavTab === 'Updates' && (
          <UpdatesTab />
        )}

        {/* Profile Tab */}
        {activeNavTab === 'Profile' && (
          <ProfileTab
            currentUserPhone={currentUserPhone}
            onLogout={onLogout}
          />
        )}
      </View>

      {/* Sunao Modern Bottom Navigation Bar (iOS / Telegram Style) */}
      <SunaoBottomNav
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          setActiveNavTab(tab);
          if (tab === 'Calls') markCallsSeen();
          if (tab === 'Updates') markUpdatesSeen();
          if (isSearching) {
            setIsSearching(false);
            setSearchQuery('');
          }
        }}
        unreadChatsCount={totalUnreadCount}
        missedCallsCount={missedCallsCount}
        hasUpdatesBadge={hasUpdatesBadge}
      />

      <SafeAreaView style={styles.bottomBarSafe} />

      {/* New Chat Contact Picker Modal */}
      <NewChatModal
        visible={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={onOpenChat}
        contacts={contactsList}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUserPhone={currentUserPhone}
        onLogout={onLogout}
      />

      {/* Camera Viewfinder Modal */}
      <Modal
        visible={showCameraModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraCard}>
            <View style={styles.cameraHeader}>
              <Text style={styles.cameraTitle}>Camera Viewfinder</Text>
              <TouchableOpacity onPress={() => setShowCameraModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.cameraSurface}>
              <Ionicons name="camera" size={48} color="#10B981" style={{ marginBottom: 12 }} />
              <Text style={styles.cameraReadyText}>HD Camera Connected</Text>
              <Text style={styles.cameraSubtext}>Realtime hardware video ready for Sunao calls</Text>
            </View>
            <TouchableOpacity style={styles.cameraCloseBtn} onPress={() => setShowCameraModal(false)}>
              <Text style={styles.cameraCloseBtnText}>Close Viewfinder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBarSafe: {
    flex: 0,
    backgroundColor: '#F8FAFC',
  },
  bottomBarSafe: {
    flex: 0,
    backgroundColor: '#F8FAFC',
  },
  body: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    width: 400,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraSurface: {
    height: 200,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
  },
  cameraReadyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cameraSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  cameraCloseBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  cameraCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
