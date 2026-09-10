import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Platform, Modal, TouchableOpacity, Text, BackHandler, ToastAndroid } from 'react-native';
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
import { ChatStorageService, isDummyContact } from '../services/chatStorageService';
import { RealtimeBridge } from '../services/realtimeBridge';
import { getBackendUrl } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

interface MainScreenProps {
  currentUserPhone: string;
  currentUserName?: string;
  onOpenChat: (user: { phone: string; name: string; avatarUri?: string; about?: string; isOnline?: boolean }) => void;
  onStartCall: (phone: string, name: string, isVideo: boolean) => void;
  onLogout: () => void;
  activeChatPhone?: string;
}

export default function MainScreen({
  currentUserPhone,
  currentUserName,
  onOpenChat,
  onStartCall,
  onLogout,
  activeChatPhone,
}: MainScreenProps) {
  const { isDark, colors } = useTheme();
  const [activeNavTab, setActiveNavTab] = useState<MainNavTab>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const h = (window.location.hash || '').toLowerCase();
      if (h.includes('calls')) return 'Calls';
      if (h.includes('profile')) return 'Profile';
      if (h.includes('updates') || h.includes('moments')) return 'Updates';
      if (h.includes('chats')) return 'Chats';

      if (window.localStorage) {
        const saved = window.localStorage.getItem('@sunao_active_nav_tab');
        if (saved && ['Chats', 'Updates', 'Calls', 'Profile'].includes(saved)) {
          return saved as MainNavTab;
        }
      }
    }
    return 'Chats';
  });

  const [activeFilter, setActiveFilter] = useState<FilterType>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('@sunao_active_filter');
      if (saved && ['All', 'Unread', 'Favourites', 'Groups'].includes(saved)) {
        return saved as FilterType;
      }
    }
    return 'All';
  });

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const initialChats: ChatItemData[] = [];
  const initialCalls: CallLogItem[] = [];
  const [contactsList, setContactsList] = useState<Array<{ phone: string; name: string; about?: string; avatarUri?: string }>>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Handle Search Input
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleNavTabChange = (tab: MainNavTab) => {
    setActiveNavTab(tab);
    AsyncStorage.setItem('@sunao_active_nav_tab', tab).catch(() => {});
    if (Platform.OS === 'web' && typeof window !== 'undefined' && !activeChatPhone) {
      window.history.replaceState(null, '', `#/${tab.toLowerCase()}`);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    AsyncStorage.setItem('@sunao_active_filter', filter).catch(() => {});
  };

  // Chats state loaded from local-first storage (synchronous on web to eliminate refresh flicker)
  const [chats, setChats] = useState<ChatItemData[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(`@sunao_recent_${currentUserPhone}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter((c: any) => !isDummyContact(c));
            if (clean.length !== parsed.length) {
              window.localStorage.setItem(`@sunao_recent_${currentUserPhone}`, JSON.stringify(clean));
            }
            return clean;
          }
        }
      } catch (e) {}
    }
    return initialChats;
  });

  const [callsList, setCallsList] = useState<CallLogItem[]>(initialCalls);

  const [pinnedPhones, setPinnedPhones] = useState<string[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(`@sunao_pinned_${currentUserPhone}`);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }
    return [];
  });

  useEffect(() => {
    AsyncStorage.getItem(`@sunao_pinned_${currentUserPhone}`).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) setPinnedPhones(parsed);
        } catch (_) {}
      }
    });
  }, [currentUserPhone]);

  const handleTogglePin = async (phone: string) => {
    const next = pinnedPhones.includes(phone)
      ? pinnedPhones.filter((p) => p !== phone)
      : [phone, ...pinnedPhones];
    setPinnedPhones(next);
    await AsyncStorage.setItem(`@sunao_pinned_${currentUserPhone}`, JSON.stringify(next));
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        pinnedPhones.includes(phone) ? 'Chat unpinned' : 'Chat pinned to top',
        ToastAndroid.SHORT
      );
    }
  };

  // 1. Load Recent Chats from Local Storage on Mount & User Change + Sync Live Registered Users
  useEffect(() => {
    let isMounted = true;
    const fetchRecentChats = async () => {
      const stored = await ChatStorageService.getRecentChats(currentUserPhone, initialChats);
      const cleanStored = (stored || []).filter((c: any) => !isDummyContact(c));
      if (isMounted && cleanStored.length > 0) {
        setChats(cleanStored);
      }

      // Automatically sync real users from database so registered contacts appear instantly
      try {
        const baseUrl = getBackendUrl();
        const res = await fetch(`${baseUrl}/api/users?excludePhone=${encodeURIComponent(currentUserPhone || '')}&requesterPhone=${encodeURIComponent(currentUserPhone || '')}`);
        if (res.ok) {
          const registeredUsers: Array<{ userId: string; phone: string; name: string; avatarUri?: string; about?: string; photoPrivacy?: string }> = await res.json();
          if (isMounted && Array.isArray(registeredUsers)) {
            const validRegistered = registeredUsers.filter(
              (u) => u.phone && u.phone !== currentUserPhone && !isDummyContact(u)
            );

            // Populate contacts list for New Chat Modal with avatars
            setContactsList(
              validRegistered.map((u) => ({
                phone: u.phone,
                name: u.name || u.phone,
                about: u.about || 'Available on Sunao 🚀',
                avatarUri: u.avatarUri,
              }))
            );

            // Update contact names and avatars on existing active chats respecting privacy rules
            setChats((prev) => {
              const cleaned = prev.filter((c) => !isDummyContact(c));
              let changed = cleaned.length !== prev.length;
              const updated = cleaned.map((c) => {
                const found = validRegistered.find((u) => u.phone === c.phone);
                if (found) {
                  let itemChanged = false;
                  let newName = c.name;
                  let newAvatar = c.avatarUri;
                  if (found.name && found.name !== c.name) {
                    newName = found.name;
                    itemChanged = true;
                  }
                  if (found.avatarUri !== undefined && found.avatarUri !== c.avatarUri) {
                    newAvatar = found.avatarUri;
                    itemChanged = true;
                  }
                  if (itemChanged) {
                    changed = true;
                    return { ...c, name: newName, avatarUri: newAvatar };
                  }
                }
                return c;
              });
              if (changed) {
                ChatStorageService.saveCleanChats(currentUserPhone, updated).catch(() => {});
              }
              return updated;
            });

            // 🌟 Cloud Auto-Sync: Automatically restore cloud conversations & contacts so Chats list is never empty!
            ChatStorageService.restoreCloudChats(currentUserPhone, validRegistered).then((cloudChats) => {
              if (isMounted && Array.isArray(cloudChats) && cloudChats.length > 0) {
                setChats((prev) => {
                  // Keep any local unread count or optimistic updates, prefer cloud messages
                  if (prev.length === 0) return cloudChats;
                  const prevMap = new Map(prev.map((c) => [c.phone, c]));
                  const merged = cloudChats.map((cc) => {
                    const local = prevMap.get(cc.phone);
                    return local ? { ...cc, ...local, name: cc.name || local.name, avatarUri: cc.avatarUri || local.avatarUri } : cc;
                  });
                  return merged;
                });
              }
            }).catch(() => {});

            // Purge any dummy or ghost entries from calls list
            setCallsList((prev) => prev.filter((c) => !isDummyContact(c)));
          }
        }
      } catch (e) {
        console.warn('Failed to sync registered users:', e);
      }
    };
    fetchRecentChats();
    return () => {
      isMounted = false;
    };
  }, [currentUserPhone, activeChatPhone]);

  // 2. Real-Time Socket Event Listener (Incoming & Multi-Device Outgoing Sync)
  useEffect(() => {
    const unsubscribe = RealtimeBridge.subscribe((event) => {
      if (event.type === 'CHAT_MESSAGE' && event.payload) {
        const p = event.payload;
        // STRICT PRIVACY CHECK: Ignore messages that do not involve currentUserPhone
        const normalizePhone = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
        const myClean = normalizePhone(currentUserPhone);
        const msgReceiverClean = normalizePhone(p.receiverId || event.targetUserId);
        const msgSenderClean = normalizePhone(p.senderId);

        const isForMe = (msgReceiverClean && myClean && msgReceiverClean === myClean) ||
                        p.receiverId === currentUserPhone ||
                        event.targetUserId === currentUserPhone;
        const isByMe = (msgSenderClean && myClean && msgSenderClean === myClean) ||
                       p.senderId === currentUserPhone;

        if (!isForMe && !isByMe) {
          return;
        }
        const isIncoming = !isByMe;
        const peerPhone = isIncoming ? (p.senderId || p.senderPhone) : (p.receiverId || event.targetUserId);
        const time = p.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const text = p.type === 'voice' ? '🎤 Voice message' : (p.text || '');
        const isViewing = activeChatPhone && normalizePhone(activeChatPhone) === normalizePhone(peerPhone);

        setChats((prev) => {
          const list = [...prev];
          const idx = list.findIndex((c) => c.phone === peerPhone);
          if (idx >= 0) {
            const existing = list[idx];
            const updated: ChatItemData = {
              ...existing,
              lastMessage: text,
              timestamp: time,
              unreadCount: isIncoming && !isViewing ? (existing.unreadCount || 0) + 1 : 0,
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
              unreadCount: isIncoming && !isViewing ? 1 : 0,
              sentByMe: !isIncoming,
              messageStatus: isIncoming ? undefined : 'read',
            });
          }
          return list;
        });

        // Acknowledge delivery to sender (if viewing, ChatScreen sends receipts directly to prevent duplicates)
        if (isForMe && isIncoming && !isViewing) {
          RealtimeBridge.sendDeliveredReceipt(peerPhone, p.id);
        }
      } else if ((event.type === 'CHAT_READ_SYNC' || event.type === 'MESSAGE_READ') && event.payload) {
        const peer = event.payload.contactPhone || event.payload.senderId;
        if (peer) {
          setChats((prev) =>
            prev.map((c) => (c.phone === peer ? { ...c, unreadCount: 0 } : c))
          );
        }
      } else if (event.type === 'PRESENCE_UPDATE' && event.payload) {
        const { userId, isOnline } = event.payload;
        if (userId) {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            if (isOnline) {
              next.add(userId);
            } else {
              next.delete(userId);
            }
            return next;
          });
        }
      } else if (event.type === 'ONLINE_USERS' && event.payload) {
        const users = event.payload.users;
        if (Array.isArray(users)) {
          setOnlineUsers(new Set(users));
        }
      }
    });

    // Initial check of online users via HTTP
    const fetchOnlineUsers = async () => {
      try {
        const baseUrl = getBackendUrl();
        const res = await fetch(`${baseUrl}/api/online-users`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            setOnlineUsers(new Set(list));
          }
        }
      } catch (e) {
        console.warn('Failed to fetch online users:', e);
      }
    };
    fetchOnlineUsers();

    return () => {
      unsubscribe();
    };
  }, [currentUserPhone, activeChatPhone]);

  // Handle Opening Chat and Clearing Unread Count Locally
  const handleSelectChat = async (chat: ChatItemData) => {
    await ChatStorageService.markAsRead(currentUserPhone, chat.phone);
    RealtimeBridge.broadcast('CHAT_READ_SYNC', { readerPhone: currentUserPhone, contactPhone: chat.phone }, chat.phone);
    setChats((prev) =>
      prev.map((c) => (c.phone === chat.phone ? { ...c, unreadCount: 0 } : c))
    );
    onOpenChat({
      phone: chat.phone,
      name: chat.name,
      avatarUri: chat.avatarUri,
      about: (chat as any).about,
      isOnline: chat.isOnline,
    });
  };

  // Filtered Chats based on chips & search
  const filteredChats = useMemo(() => {
    let result = chats.filter((c) => !isDummyContact(c));

    // Search filter: Filter existing chats AND include registered users from database
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      const digits = q.replace(/\D/g, '');
      result = result.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
          (c.phone && (c.phone.includes(q) || (digits.length >= 4 && c.phone.includes(digits))))
      );

      // Include matching registered contacts from database
      contactsList.forEach((contact) => {
        const contactDigits = contact.phone.replace(/\D/g, '');
        const matchesPhone = contact.phone.includes(q) || (digits.length >= 4 && contactDigits.includes(digits));
        const matchesName = contact.name && contact.name.toLowerCase().includes(q);
        if (!result.some((c) => c.phone === contact.phone) && (matchesPhone || matchesName)) {
          result.push({
            phone: contact.phone,
            name: contact.name,
            lastMessage: 'Tap to start conversation',
            timestamp: '',
            unreadCount: 0,
          });
        }
      });
    }

    // Filter Chips
    if (activeFilter === 'Unread') {
      result = result.filter((c) => (c.unreadCount ?? 0) > 0);
    } else if (activeFilter === 'Groups') {
      result = result.filter((c) => c.isGroup);
    } else if (activeFilter === 'Favourites') {
      result = result.filter((c) => pinnedPhones.includes(c.phone) || c.isPinned);
    }

    return result
      .map((c) => {
        const cleanP = String(c.phone || '').replace(/\D/g, '').slice(-10);
        const isOnline =
          onlineUsers.has(c.phone) ||
          (cleanP.length >= 10 &&
            Array.from(onlineUsers).some((u) => String(u).replace(/\D/g, '').slice(-10) === cleanP));
        return {
          ...c,
          isPinned: pinnedPhones.includes(c.phone) || Boolean(c.isPinned),
          isOnline,
        };
      })
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [chats, searchQuery, activeFilter, onlineUsers, contactsList, pinnedPhones]);

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

  const lastBackPressRef = useRef<number>(0);

  // Android Hardware Back Handling:
  // 1. Close open modals (Camera, Settings, NewChat)
  // 2. Close Search mode if active
  // 3. Return to 'Chats' tab if on Calls / Updates / Profile
  // 4. Double tap back to exit if on 'Chats' tab (with Toast notification)
  useEffect(() => {
    const handleHardwareBack = () => {
      if (showCameraModal) {
        setShowCameraModal(false);
        return true;
      }
      if (showSettingsModal) {
        setShowSettingsModal(false);
        return true;
      }
      if (showNewChatModal) {
        setShowNewChatModal(false);
        return true;
      }

      if (isSearching) {
        setIsSearching(false);
        setSearchQuery('');
        return true;
      }

      if (activeNavTab !== 'Chats') {
        setActiveNavTab('Chats');
        return true;
      }

      if (Platform.OS === 'android') {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressRef.current = now;
        ToastAndroid.show('Press back again to exit Sunao', ToastAndroid.SHORT);
        return true;
      }

      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => backSub.remove();
  }, [showCameraModal, showSettingsModal, showNewChatModal, isSearching, activeNavTab]);

  const missedCallsCount = useMemo(() => {
    if (hasSeenCalls || activeNavTab === 'Calls') return 0;
    return callsList.filter((c) => c.type === 'missed').length;
  }, [callsList, hasSeenCalls, activeNavTab]);

  const hasUpdatesBadge = useMemo(() => {
    if (hasSeenUpdates || activeNavTab === 'Updates') return false;
    return true;
  }, [hasSeenUpdates, activeNavTab]);

  return (
    <View style={[styles.rootContainer, isDark && { backgroundColor: '#000000' }]}>
      <SafeAreaView style={[styles.topBarSafe, isDark && { backgroundColor: '#000000' }]} />
      <StatusBar
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
      />

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
          }}
          onOpenSettings={() => setShowSettingsModal(true)}
          onLogout={onLogout}
          onCameraPress={() => setShowCameraModal(true)}
          onOpenNewChat={() => setShowNewChatModal(true)}
          onOpenProfile={() => handleNavTabChange('Profile')}
          onSelectFilter={(filter) => {
            if (filter === 'Starred') handleFilterChange('Favourites');
            else handleFilterChange(filter as any);
          }}
        />
      )}

      {/* Filter Chips (Visible on Chats Tab when not actively searching) */}
      {activeNavTab === 'Chats' && !isSearching && (
        <FilterChips
          activeFilter={activeFilter}
          onSelectFilter={handleFilterChange}
          unreadCount={totalUnreadCount}
        />
      )}

      {/* Tab Contents */}
      <View style={[styles.body, isDark && { backgroundColor: '#000000' }]}>
        {activeNavTab === 'Chats' && (
          <ChatsTab
            chats={filteredChats}
            activeChatPhone={activeChatPhone}
            onSelectChat={handleSelectChat}
            onOpenNewChat={() => setShowNewChatModal(true)}
            onStartCall={(phone, name, isVideo) => onStartCall(phone, name, isVideo)}
            searchQuery={searchQuery}
            onTogglePin={handleTogglePin}
          />
        )}

        {/* Calls Tab */}
        {activeNavTab === 'Calls' && (
          <CallsTab
            calls={callsList}
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
            currentUserName={currentUserName}
            onLogout={onLogout}
          />
        )}
      </View>

      {/* Sunao Modern Bottom Navigation Bar (iOS / Telegram Style) */}
      <SunaoBottomNav
        activeTab={activeNavTab}
        onTabChange={(tab) => {
          handleNavTabChange(tab);
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

      <SafeAreaView style={[styles.bottomBarSafe, isDark && { backgroundColor: '#000000' }]} />

      {/* New Chat Contact Picker Modal */}
      <NewChatModal
        visible={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onSelectUser={(user) => {
          setShowNewChatModal(false);
          onOpenChat(user);
        }}
        contacts={contactsList}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUserPhone={currentUserPhone}
        currentUserName={currentUserName}
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraCard: {
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: 24,
    width: 400,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: '#0A0D12',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
