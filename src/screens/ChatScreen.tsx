import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  BackHandler,
  Image,
  PanResponder,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KhusPhusTheme } from '../constants/theme';
import { ChatStorageService, LocalMessage, getChatKey, normalizePhone } from '../services/chatStorageService';
import { ChatItemData } from '../components/main/ChatsTab';
import { RealtimeBridge } from '../services/realtimeBridge';
import { getBackendUrl } from '../services/firebase';
import { VoiceService } from '../services/voiceRecordingService';
import VoiceNoteBubble from '../components/chat/VoiceNoteBubble';
import ContactProfileModal from '../components/chat/ContactProfileModal';
import { useTheme } from '../contexts/ThemeContext';

interface SwipeableMessageRowProps {
  children: React.ReactNode;
  onSwipeReply: () => void;
  isMe: boolean;
}

const SwipeableMessageRow: React.FC<SwipeableMessageRowProps> = ({ children, onSwipeReply, isMe }) => {
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx > 12 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 1.5);
      },
      onPanResponderMove: (_, gestureState) => {
        // Swipe right to reply (standard WhatsApp gesture)
        if (gestureState.dx > 0) {
          const drag = Math.min(gestureState.dx * 0.75, 75);
          pan.setValue(drag);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 36) {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          } catch (_) {}
          onSwipeReply();
        }
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      },
    })
  ).current;

  return (
    <View style={{ width: '100%', position: 'relative', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: 10,
          zIndex: 1,
          opacity: pan.interpolate({
            inputRange: [0, 15, 38],
            outputRange: [0, 0.4, 1],
            extrapolate: 'clamp',
          }),
          transform: [
            {
              scale: pan.interpolate({
                inputRange: [0, 38],
                outputRange: [0.6, 1.1],
                extrapolate: 'clamp',
              }),
            },
          ],
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#10B981',
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
          }}
        >
          <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />
        </View>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          width: '100%',
          transform: [{ translateX: pan }],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

interface ChatScreenProps {
  chatUser?: any;
  user?: any;
  currentUserPhone?: string;
  onBack: () => void;
  onStartCall?: (isVideo: boolean) => void;
  onCall?: (isVideo: boolean) => void;
}

const QUICK_EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '🙏', '🎉', '❤️', '👏', '🚀', '💯', '✨'];

const WALLPAPER_COLORS: Record<string, string> = {
  'Slate Minimalist': '#F8FAFC',
  'Emerald Aura': '#ECFDF5',
  'Acoustic Violet': '#FAF5FF',
  'Midnight Dark': '#000000',
  'Desert Sand': '#FEFCE8',
};

export default function ChatScreen({
  chatUser,
  user,
  currentUserPhone = '',
  onBack,
  onStartCall,
  onCall,
}: ChatScreenProps) {
  const { isDark } = useTheme();
  const activeUser = chatUser || user;
  const contactPhone = activeUser?.phone || '';
  const contactName = activeUser?.name || activeUser?.phone || 'Contact';

  const draftKey = `@sunao_draft_${currentUserPhone}_${contactPhone}`;

  const [message, setMessage] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(`@sunao_draft_${currentUserPhone}_${contactPhone}`) || '';
    }
    return '';
  });

  const [messages, setMessages] = useState<LocalMessage[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const key = getChatKey(currentUserPhone, contactPhone);
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });

  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [isPeerOnline, setIsPeerOnline] = useState<boolean>(
    () => Boolean(activeUser?.isOnline) || RealtimeBridge.isUserOnline(contactPhone)
  );

  useEffect(() => {
    if (activeUser?.isOnline !== undefined) {
      setIsPeerOnline(Boolean(activeUser.isOnline));
    }
  }, [activeUser?.isOnline]);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showContactProfile, setShowContactProfile] = useState(false);

  // In-Chat Search & Customization States
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [wallpaperTheme, setWallpaperTheme] = useState('Slate Minimalist');

  const typingTimeoutRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);
  const flatListRef = useRef<FlatList>(null);

  // Zero-Cost Voice Note Recording States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const timerIntervalRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // WhatsApp-grade Interactions: Reactions, Reply, Forward & Edit
  const [selectedMessage, setSelectedMessage] = useState<LocalMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<LocalMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<LocalMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<LocalMessage | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardContacts, setForwardContacts] = useState<ChatItemData[]>([]);
  const [forwardSearch, setForwardSearch] = useState('');

  const filteredForwardContacts = useMemo(() => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return forwardContacts;
    return forwardContacts.filter((c) =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  }, [forwardContacts, forwardSearch]);

  // Read Receipts preference (@sunao_read_receipts)
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState<boolean>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('@sunao_read_receipts');
      if (stored !== null) return stored === 'true';
    }
    return true;
  });

  useEffect(() => {
    AsyncStorage.getItem('@sunao_read_receipts').then((val) => {
      if (val !== null) {
        setReadReceiptsEnabled(val === 'true');
      }
    });
  }, []);

  // Restore Blocked Status and Wallpaper
  useEffect(() => {
    AsyncStorage.getItem(`@sunao_blocked_${contactPhone}`).then((val) => {
      setIsBlocked(val === 'true');
    });
    AsyncStorage.getItem(`@sunao_wallpaper_${contactPhone}`).then((val) => {
      if (val) setWallpaperTheme(val);
    });
  }, [contactPhone, showContactProfile]);

  // Restore Draft on Mount (AsyncStorage)
  useEffect(() => {
    AsyncStorage.getItem(draftKey).then((savedDraft) => {
      if (savedDraft && !message) {
        setMessage(savedDraft);
      }
    });
  }, [draftKey]);

  // Hardware Back Handler (Android): Navigate back to chat list instead of exiting app
  useEffect(() => {
    const onHardwareBack = () => {
      if (isSearchingMessages) {
        setIsSearchingMessages(false);
        setSearchQuery('');
        return true;
      }
      if (showContactProfile) {
        setShowContactProfile(false);
        return true;
      }
      if (showOptionsMenu) {
        setShowOptionsMenu(false);
        return true;
      }
      if (showAttachmentMenu) {
        setShowAttachmentMenu(false);
        return true;
      }
      if (showEmojiBar) {
        setShowEmojiBar(false);
        return true;
      }
      onBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backHandler.remove();
  }, [isSearchingMessages, showContactProfile, showOptionsMenu, showAttachmentMenu, showEmojiBar, onBack]);

  // 1. Load Local Messages from Offline Storage on Mount
  useEffect(() => {
    let isMounted = true;
    const loadChatHistory = async () => {
      // 1. Instant offline load from local cache (0ms delay)
      const stored = await ChatStorageService.getMessages(currentUserPhone, contactPhone);
      if (isMounted) {
        setMessages(stored || []);
      }

      // 2. Background Turso Cloud Sync (restores cloud history across devices)
      ChatStorageService.syncMessagesWithCloud(currentUserPhone, contactPhone)
        .then((synced) => {
          if (isMounted && synced && synced.length > 0) {
            setMessages(synced);
          }
        })
        .catch(() => {});

      // Mark as read in recent chats list
      await ChatStorageService.markAsRead(currentUserPhone, contactPhone);
      const isVisible = typeof document === 'undefined' || !document.hidden;
      if (readReceiptsEnabled && isVisible) {
        RealtimeBridge.sendReadReceipt(contactPhone);
      }
    };

    loadChatHistory();

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden && readReceiptsEnabled) {
        RealtimeBridge.sendReadReceipt(contactPhone);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      isMounted = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [currentUserPhone, contactPhone, readReceiptsEnabled]);

  // 2. Listen for Real-Time Incoming Messages, Receipts, and Typing via Socket
  useEffect(() => {
    const unsubscribe = RealtimeBridge.subscribe((event) => {
      if (event.type === 'CHAT_MESSAGE' && event.payload) {
        const payload = event.payload;
        // STRICT PRIVACY CHECK: Only process messages belonging to this exact 1-on-1 thread
        const normalizePhone = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
        const myClean = normalizePhone(currentUserPhone);
        const peerClean = normalizePhone(contactPhone);
        const peerUserId = String(activeUser?.userId || '').trim();
        const msgSenderClean = normalizePhone(payload.senderId);
        const msgReceiverClean = normalizePhone(payload.receiverId || event.targetUserId);

        const isFromContact =
          ((msgSenderClean && peerClean && msgSenderClean === peerClean) ||
           payload.senderId === contactPhone ||
           (peerUserId && payload.senderId === peerUserId)) &&
          ((msgReceiverClean && myClean && msgReceiverClean === myClean) ||
           payload.receiverId === currentUserPhone ||
           !payload.receiverId);

        const isEchoFromMyDevice =
          ((msgSenderClean && myClean && msgSenderClean === myClean) ||
           payload.senderId === currentUserPhone) &&
          ((msgReceiverClean && peerClean && msgReceiverClean === peerClean) ||
           payload.receiverId === contactPhone ||
           (peerUserId && (payload.receiverId === peerUserId || event.targetUserId === peerUserId)));

        if (!isFromContact && !isEchoFromMyDevice) {
          return;
        }

        const newIncoming: LocalMessage = {
          id: payload.id || Date.now().toString(),
          senderId: payload.senderId,
          receiverId: payload.receiverId,
          text: payload.text,
          time: payload.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: payload.timestamp || Date.now(),
          sender: isFromContact ? 'them' : 'me',
          status: 'read',
          type: payload.type,
          audioUrl: payload.audioUrl,
          duration: payload.duration,
        };

        setMessages((prev) => {
          if (prev.some((m) => m.id === newIncoming.id)) return prev;
          return [...prev, newIncoming];
        });
        ChatStorageService.saveMessage(currentUserPhone, contactPhone, newIncoming);
        ChatStorageService.updateRecentChat(
          currentUserPhone,
          contactPhone,
          contactName,
          payload.text,
          newIncoming.time,
          true
        );
        setIsPeerTyping(false);

        // Acknowledge delivery back to sender (double grey tick)
        if (isFromContact) {
          RealtimeBridge.sendDeliveredReceipt(contactPhone, newIncoming.id);
          const isWindowActive = typeof document === 'undefined' || !document.hidden;
          if (readReceiptsEnabled && isWindowActive) {
            RealtimeBridge.sendReadReceipt(contactPhone, newIncoming.id);
          }
        }
      } else if (event.type === 'MESSAGE_DELIVERED' && event.payload) {
        const normalizePhone = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
        const peerClean = normalizePhone(contactPhone);
        const senderClean = normalizePhone(event.payload.senderId || event.payload.senderPhone);
        const isFromPeer =
          event.payload.senderId === contactPhone ||
          event.payload.senderPhone === contactPhone ||
          event.payload.senderUserId === activeUser?.userId ||
          (peerClean && senderClean && peerClean === senderClean);
        if (isFromPeer) {
          const messageId = event.payload.messageId;
          if (messageId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId && m.status === 'sent' ? { ...m, status: 'delivered' } : m
              )
            );
            ChatStorageService.updateMessageStatus(currentUserPhone, contactPhone, messageId, 'delivered');
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.status === 'sent' ? { ...m, status: 'delivered' } : m))
            );
            ChatStorageService.updateAllSentStatus(currentUserPhone, contactPhone, 'delivered');
          }
        }
      } else if (event.type === 'MESSAGE_READ' && event.payload) {
        const normalizePhone = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
        const peerClean = normalizePhone(contactPhone);
        const senderClean = normalizePhone(event.payload.senderId || event.payload.senderPhone);
        const isFromPeer =
          event.payload.senderId === contactPhone ||
          event.payload.senderPhone === contactPhone ||
          event.payload.senderUserId === activeUser?.userId ||
          (peerClean && senderClean && peerClean === senderClean) ||
          event.targetUserId === currentUserPhone;
        if (isFromPeer) {
          const targetMsgId = event.payload.messageId;
          setMessages((prev) =>
            prev.map((m) => {
              const cleanMe = String(currentUserPhone || '').replace(/\D/g, '').slice(-10);
              const senderClean = String(m.senderId || '').replace(/\D/g, '').slice(-10);
              const isMyMsg = m.sender === 'me' || m.senderId === currentUserPhone || (Boolean(cleanMe && senderClean) && cleanMe === senderClean);
              if (isMyMsg && (targetMsgId ? m.id === targetMsgId : true)) {
                return { ...m, status: 'read' };
              }
              return m;
            })
          );
          if (targetMsgId) {
            ChatStorageService.updateMessageStatus(currentUserPhone, contactPhone, targetMsgId, 'read');
          } else {
            ChatStorageService.updateAllSentStatus(currentUserPhone, contactPhone, 'read');
          }
        }
      } else if (event.type === 'USER_TYPING' && event.payload) {
        const normalizePhone = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
        const peerClean = normalizePhone(contactPhone);
        const senderClean = normalizePhone(event.payload.senderId || event.payload.senderPhone);
        const isFromPeer =
          event.payload.senderId === contactPhone ||
          event.payload.senderPhone === contactPhone ||
          (peerClean && senderClean && peerClean === senderClean);
        if (isFromPeer) {
          setIsPeerTyping(Boolean(event.payload.isTyping));
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsPeerTyping(false);
          }, 3000);
        }
      } else if (event.type === 'PRESENCE_UPDATE' && event.payload) {
        const normalizePhone = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
        const peerClean = normalizePhone(contactPhone);
        const userClean = normalizePhone(event.payload.userId);
        if (event.payload.userId === contactPhone || (peerClean && userClean && peerClean === userClean)) {
          setIsPeerOnline(Boolean(event.payload.isOnline));
        }
      } else if (event.type === 'ONLINE_USERS' && event.payload) {
        const users = event.payload.users;
        const normalizePhone = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
        const peerClean = normalizePhone(contactPhone);
        if (Array.isArray(users)) {
          const isOnline = users.some((u: string) => u === contactPhone || (peerClean && normalizePhone(u) === peerClean));
          setIsPeerOnline(isOnline);
        }
      } else if (event.type === 'MESSAGE_REACTION' && event.payload) {
        const { messageId, reaction } = event.payload;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reaction: reaction || undefined } : m))
        );
        ChatStorageService.updateMessage(currentUserPhone, contactPhone, messageId, { reaction: reaction || undefined });
      } else if (event.type === 'MESSAGE_EDIT' && event.payload) {
        const { messageId, newText } = event.payload;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text: newText, isEdited: true } : m))
        );
        ChatStorageService.updateMessage(currentUserPhone, contactPhone, messageId, { text: newText, isEdited: true });
      } else if (event.type === 'MESSAGE_DELETE' && event.payload) {
        const { messageId } = event.payload;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text: '🚫 This message was deleted', isDeleted: true } : m))
        );
        ChatStorageService.updateMessage(currentUserPhone, contactPhone, messageId, { text: '🚫 This message was deleted', isDeleted: true });
      }
    });

    // Check initial online status
    if (RealtimeBridge.isUserOnline(contactPhone) || activeUser?.isOnline) {
      setIsPeerOnline(true);
    }
    const checkInitialOnline = async () => {
      try {
        const baseUrl = getBackendUrl();
        const res = await fetch(`${baseUrl}/api/online-users`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const normalizePhone = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
            const peerClean = normalizePhone(contactPhone);
            const isOnline = list.some((u: string) => {
              if (u === contactPhone) return true;
              const uClean = normalizePhone(u);
              return Boolean(peerClean && uClean && peerClean === uClean);
            });
            setIsPeerOnline(isOnline);
          }
        }
      } catch (_) {}
    };
    checkInitialOnline();

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUserPhone, contactPhone, contactName, readReceiptsEnabled]);

  const handleTextChange = (text: string) => {
    setMessage(text);
    if (text.length > 0) {
      AsyncStorage.setItem(draftKey, text).catch(() => {});
      const now = Date.now();
      if (now - lastTypingSentRef.current > 2500) {
        lastTypingSentRef.current = now;
        RealtimeBridge.sendTyping(contactPhone, true);
      }
    } else {
      AsyncStorage.removeItem(draftKey).catch(() => {});
      lastTypingSentRef.current = 0;
      RealtimeBridge.sendTyping(contactPhone, false);
    }
  };

  const triggerCall = (isVideo: boolean) => {
    setShowOptionsMenu(false);
    if (onStartCall) onStartCall(isVideo);
    else if (onCall) onCall(isVideo);
  };

  const handleAddEmoji = (emoji: string) => {
    setMessage((prev) => {
      const updated = prev + emoji;
      AsyncStorage.setItem(draftKey, updated).catch(() => {});
      return updated;
    });
  };

  const handleClearChat = async () => {
    setShowOptionsMenu(false);
    setMessages([]);
    await ChatStorageService.clearMessages(currentUserPhone, contactPhone);
  };

  const handlePickFile = (acceptType: string) => {
    setShowAttachmentMenu(false);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = acceptType;
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const fileMsgText = acceptType.includes('image')
            ? `📷 Photo: ${file.name}`
            : `📎 File: ${file.name}`;
          const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newMsg: LocalMessage = {
            id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            senderId: currentUserPhone,
            receiverId: contactPhone,
            text: fileMsgText,
            time: formattedTime,
            timestamp: Date.now(),
            sender: 'me',
            status: 'sent',
          };
          setMessages((prev) => [...prev, newMsg]);
          ChatStorageService.saveMessage(currentUserPhone, contactPhone, newMsg);
          ChatStorageService.updateRecentChat(currentUserPhone, contactPhone, contactName, fileMsgText, formattedTime, false, 'sent');
          RealtimeBridge.sendChatMessage(contactPhone, newMsg);

          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      };
      input.click();
    }
  };

  // 3. Send Message (Zero Server Database Cost - Local First + P2P Socket Emit)
  const sendMessage = async () => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;

    // Handle Editing existing message
    if (editingMessage) {
      const targetId = editingMessage.id;
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, text: trimmed, isEdited: true } : m))
      );
      setMessage('');
      AsyncStorage.removeItem(draftKey).catch(() => {});
      await ChatStorageService.updateMessage(currentUserPhone, contactPhone, targetId, { text: trimmed, isEdited: true });
      RealtimeBridge.sendMessageEdit(contactPhone, targetId, trimmed);
      setEditingMessage(null);
      return;
    }

    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: LocalMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUserPhone,
      receiverId: contactPhone,
      text: trimmed,
      time: formattedTime,
      timestamp: Date.now(),
      sender: 'me',
      status: 'sent',
    };

    // Attach Quoted Reply if active
    if (replyingToMessage) {
      newMsg.replyTo = {
        id: replyingToMessage.id,
        text: replyingToMessage.text || (replyingToMessage.type === 'voice' ? '🎤 Voice message' : 'Media'),
        senderId: replyingToMessage.senderId,
        type: replyingToMessage.type,
      };
      setReplyingToMessage(null);
    }

    // Update UI immediately (Optimistic Update)
    setMessages((prev) => [...prev, newMsg]);
    setMessage('');
    AsyncStorage.removeItem(draftKey).catch(() => {});
    RealtimeBridge.sendTyping(contactPhone, false);

    // Persist to Phone's Local Storage
    await ChatStorageService.saveMessage(currentUserPhone, contactPhone, newMsg);
    await ChatStorageService.updateRecentChat(
      currentUserPhone,
      contactPhone,
      contactName,
      trimmed,
      formattedTime,
      false,
      'sent'
    );

    // Persist to Turso Cloud DB for 0ms cross-device sync (Web, Desktop, Mobile)
    ChatStorageService.saveMessageToCloud(newMsg).catch(() => {});

    // Emit live to peer via Socket.IO AND to own other devices (Web, Desktop, Mobile)
    RealtimeBridge.sendChatMessage(contactPhone, newMsg);
    if (currentUserPhone && currentUserPhone !== contactPhone) {
      RealtimeBridge.sendChatMessage(currentUserPhone, newMsg);
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // WhatsApp-grade Interactions Handlers
  const handleSelectReaction = (emoji: string) => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    const nextEmoji = selectedMessage.reaction === emoji ? undefined : emoji;
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction: nextEmoji } : m))
    );
    ChatStorageService.updateMessage(currentUserPhone, contactPhone, msgId, { reaction: nextEmoji });
    RealtimeBridge.sendMessageReaction(contactPhone, msgId, nextEmoji || '');
    setSelectedMessage(null);
  };

  const handleStartReply = () => {
    if (!selectedMessage) return;
    setReplyingToMessage(selectedMessage);
    setEditingMessage(null);
    setSelectedMessage(null);
  };

  const handleStartEdit = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setReplyingToMessage(null);
    setMessage(selectedMessage.text);
    setSelectedMessage(null);
  };

  const handleToggleStar = () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    const nextStar = !selectedMessage.isStarred;
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isStarred: nextStar } : m))
    );
    ChatStorageService.updateMessage(currentUserPhone, contactPhone, msgId, { isStarred: nextStar });
    setSelectedMessage(null);
  };

  const handleDeleteForEveryone = () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isDeleted: true, text: '🚫 You deleted this message' } : m))
    );
    ChatStorageService.deleteMessage(currentUserPhone, contactPhone, msgId, true);
    RealtimeBridge.sendMessageDelete(contactPhone, msgId, true);
    setSelectedMessage(null);
  };

  const handleDeleteForMe = () => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    ChatStorageService.deleteMessage(currentUserPhone, contactPhone, msgId, false);
    setSelectedMessage(null);
  };

  const handleCopyMessage = () => {
    if (!selectedMessage) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(selectedMessage.text).catch(() => {});
    }
    setSelectedMessage(null);
  };

  const handleStartForward = async () => {
    if (!selectedMessage) return;
    const msgToFwd = selectedMessage;
    setSelectedMessage(null);
    setForwardingMessage(msgToFwd);
    setForwardSearch('');
    try {
      const recents = await ChatStorageService.getRecentChats(currentUserPhone);
      setForwardContacts(recents || []);
    } catch (e) {
      setForwardContacts([]);
    }
    setShowForwardModal(true);
  };

  const handleSendForward = async (targetContact: ChatItemData) => {
    if (!forwardingMessage) return;
    const targetPhone = targetContact.phone;
    if (!targetPhone) return;

    const forwardedMsg: LocalMessage = {
      id: `fwd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      senderId: currentUserPhone,
      receiverId: targetPhone,
      text: forwardingMessage.text || '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      sender: 'me',
      status: 'sent',
      type: forwardingMessage.type || 'text',
      audioUrl: forwardingMessage.audioUrl,
      duration: forwardingMessage.duration,
      isForwarded: true,
    };

    if (normalizePhone(targetPhone) === normalizePhone(contactPhone)) {
      setMessages((prev) => [...prev, forwardedMsg]);
    }

    try {
      await ChatStorageService.saveMessage(currentUserPhone, targetPhone, forwardedMsg);
      ChatStorageService.saveMessageToCloud(forwardedMsg).catch(() => {});
      RealtimeBridge.sendChatMessage(targetPhone, forwardedMsg);
    } catch (e) {
      console.warn('[FORWARD_ERR]', e);
    }

    setShowForwardModal(false);
    setForwardingMessage(null);
  };

  // Voice recording pulse animation
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isRecordingVoice) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [isRecordingVoice]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      VoiceService.stopAudio();
      VoiceService.cancelRecording();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startVoiceRecording = async () => {
    const started = await VoiceService.startRecording();
    if (started) {
      setIsRecordingVoice(true);
      setRecordSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    }
  };

  const cancelVoiceRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    VoiceService.cancelRecording();
    setIsRecordingVoice(false);
    setRecordSeconds(0);
  };

  const sendVoiceRecording = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const res = await VoiceService.stopRecording();
    setIsRecordingVoice(false);

    if (res && res.uri) {
      const durationStr = `0:${res.durationSec < 10 ? '0' : ''}${res.durationSec}`;
      const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newVoiceMsg: LocalMessage = {
        id: `voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderId: currentUserPhone,
        receiverId: contactPhone,
        text: '🎤 Voice message',
        type: 'voice',
        audioUrl: res.uri,
        duration: durationStr,
        time: formattedTime,
        timestamp: Date.now(),
        sender: 'me',
        status: 'sent',
      };

      setMessages((prev) => [...prev, newVoiceMsg]);
      await ChatStorageService.saveMessage(currentUserPhone, contactPhone, newVoiceMsg);
      await ChatStorageService.updateRecentChat(
        currentUserPhone,
        contactPhone,
        contactName,
        '🎤 Voice message',
        formattedTime,
        false,
        'sent'
      );

      // Persist to Turso Cloud DB for 0ms cross-device sync (Web, Desktop, Mobile)
      ChatStorageService.saveMessageToCloud(newVoiceMsg).catch(() => {});

      RealtimeBridge.sendChatMessage(contactPhone, newVoiceMsg);
      if (currentUserPhone && currentUserPhone !== contactPhone) {
        RealtimeBridge.sendChatMessage(currentUserPhone, newVoiceMsg);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    setRecordSeconds(0);
  };

  const displayMessages = useMemo(() => {
    if (!isSearchingMessages || !searchQuery.trim()) return messages;
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => (m.text || '').toLowerCase().includes(q));
  }, [messages, isSearchingMessages, searchQuery]);

  const chatBgColor = isDark
    ? wallpaperTheme === 'Slate Minimalist'
      ? '#000000'
      : WALLPAPER_COLORS[wallpaperTheme] || '#000000'
    : WALLPAPER_COLORS[wallpaperTheme] || '#F8FAFC';

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && { backgroundColor: '#000000' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
      />

      {/* Chat Header or In-Chat Search Header */}
      {isSearchingMessages ? (
        <View
          style={[
            styles.searchHeader,
            isDark && {
              backgroundColor: '#000000',
              borderBottomColor: 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        >
          <TouchableOpacity
            style={styles.searchBackBtn}
            onPress={() => {
              setIsSearchingMessages(false);
              setSearchQuery('');
            }}
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </TouchableOpacity>
          <TextInput
            style={[styles.searchHeaderInput, isDark && { color: '#FFFFFF' }]}
            placeholder="Search messages in this chat..."
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
              <Ionicons name="close-circle" size={20} color={isDark ? '#94A3B8' : '#94A3B8'} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View
          style={[
            styles.header,
            isDark && {
              backgroundColor: '#000000',
              borderBottomColor: 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerProfileTouchable}
            onPress={() => setShowContactProfile(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.avatar,
                isDark && {
                  backgroundColor: '#0A0D12',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              {activeUser?.avatarUri ? (
                <Image source={{ uri: activeUser.avatarUri }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person" size={18} color={isDark ? '#10B981' : '#047857'} />
              )}
              {isPeerOnline && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#10B981',
                    borderWidth: 2,
                    borderColor: isDark ? '#000000' : '#FFFFFF',
                  }}
                />
              )}
            </View>
            <View style={styles.headerTitleContainer}>
              <Text
                style={[styles.headerTitle, isDark && { color: '#FFFFFF' }]}
                numberOfLines={1}
              >
                {contactName}
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  {
                    color: isPeerTyping
                      ? isDark
                        ? '#00F2FE'
                        : '#0284C7'
                      : isPeerOnline
                        ? '#10B981'
                        : isDark
                          ? '#64748B'
                          : '#94A3B8',
                  },
                  isPeerTyping && styles.headerSubtitleTyping,
                ]}
              >
                {isPeerTyping ? 'typing...' : isPeerOnline ? '● Online' : 'Offline'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              onPress={() => triggerCall(true)}
              style={[
                styles.icon,
                styles.iconVideo,
                isDark && {
                  backgroundColor: 'rgba(2, 132, 199, 0.15)',
                  borderColor: 'rgba(2, 132, 199, 0.3)',
                },
              ]}
            >
              <Ionicons name="videocam" size={19} color={isDark ? '#38BDF8' : '#0284C7'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => triggerCall(false)}
              style={[
                styles.icon,
                styles.iconAudio,
                isDark && {
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                },
              ]}
            >
              <Ionicons name="call" size={18} color={isDark ? '#10B981' : '#047857'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.icon,
                isDark && {
                  backgroundColor: '#0A0D12',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                },
              ]}
              onPress={() => setShowOptionsMenu(true)}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Chat Body with Selected Wallpaper Aura */}
      <View style={[styles.chatBody, { backgroundColor: chatBgColor }]}>
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => {
            if (!isSearchingMessages) flatListRef.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={
            isSearchingMessages && searchQuery.trim().length > 0 ? (
              <View style={styles.emptySearchContainer}>
                <Ionicons name="search-outline" size={38} color="#94A3B8" />
                <Text style={[styles.emptySearchTitle, isDark && { color: '#FFFFFF' }]}>
                  No messages found
                </Text>
                <Text style={styles.emptySearchSubtitle}>No results matching "{searchQuery}"</Text>
              </View>
            ) : (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
                <View style={[
                  { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#A7F3D0', marginBottom: 12 }
                ]}>
                  <Ionicons name="lock-closed" size={14} color={isDark ? '#10B981' : '#047857'} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#10B981' : '#047857' }}>End-to-End Encrypted</Text>
                </View>
                <Text style={{ fontSize: 12, color: isDark ? '#64748B' : '#94A3B8', textAlign: 'center', lineHeight: 18, marginBottom: 8 }}>
                  Messages and calls are secured with Curve25519 & AES-256. Nobody outside this chat can read them.
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#94A3B8' : '#64748B', marginTop: 4 }}>
                  Say hello to {contactName} 👋
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => {
            const cleanMe = String(currentUserPhone || '').replace(/\D/g, '').slice(-10);
            const cleanSender = String(item.senderId || '').replace(/\D/g, '').slice(-10);
            const isMe = (Boolean(cleanMe && cleanSender) && cleanMe === cleanSender) ||
                         item.sender === 'me' ||
                         item.senderId === currentUserPhone;
            return (
              <SwipeableMessageRow
                key={item.id}
                onSwipeReply={() => {
                  if (!item.isDeleted) {
                    setReplyingToMessage(item);
                  }
                }}
                isMe={isMe}
              >
                <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onLongPress={() => setSelectedMessage(item)}
                    delayLongPress={260}
                    // @ts-ignore
                    onContextMenu={(e: any) => {
                      if (e && e.preventDefault) e.preventDefault();
                      setSelectedMessage(item);
                    }}
                    style={{ maxWidth: '82%', position: 'relative' }}
                  >
                    {item.type === 'voice' ? (
                      <VoiceNoteBubble
                        audioUrl={item.audioUrl}
                        duration={item.duration}
                        isMe={isMe}
                        time={item.time}
                        status={item.status}
                        readReceipts={readReceiptsEnabled}
                      />
                    ) : (
                      <View
                        style={[
                          styles.messageBubble,
                          isMe ? styles.messageBubbleMe : styles.messageBubbleThem,
                          !isMe && isDark && {
                            backgroundColor: '#0E1217',
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                          },
                        ]}
                      >
                        {/* Forwarded Badge */}
                        {item.isForwarded && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                            <Ionicons name="arrow-redo" size={11} color={isMe ? 'rgba(255, 255, 255, 0.75)' : '#94A3B8'} style={{ marginRight: 3 }} />
                            <Text style={[{ fontSize: 10.5, fontStyle: 'italic' }, isMe ? { color: 'rgba(255, 255, 255, 0.75)' } : { color: '#94A3B8' }]}>
                              Forwarded
                            </Text>
                          </View>
                        )}

                        {/* WhatsApp-Web Quick Action Dropdown Trigger (Clickable on Desktop) */}
                        {!item.isDeleted && (
                          <TouchableOpacity
                            style={styles.messageChevronBtn}
                            onPress={() => setSelectedMessage(item)}
                            activeOpacity={0.65}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="chevron-down" size={13} color={isMe ? 'rgba(255, 255, 255, 0.65)' : '#94A3B8'} />
                          </TouchableOpacity>
                        )}
                        {/* Quoted Message Preview Header */}
                        {item.replyTo && (
                          <View style={[styles.quotedBubble, isMe ? styles.quotedBubbleMe : styles.quotedBubbleThem]}>
                            <Text style={[styles.quotedSenderName, isMe ? { color: '#A7F3D0' } : { color: '#059669' }]} numberOfLines={1}>
                              {(cleanMe && String(item.replyTo.senderId || '').replace(/\D/g, '').slice(-10) === cleanMe) || item.replyTo.senderId === currentUserPhone ? 'You' : contactName}
                            </Text>
                            <Text style={[styles.quotedSnippetText, isMe ? { color: 'rgba(255, 255, 255, 0.85)' } : { color: '#64748B' }]} numberOfLines={1}>
                              {item.replyTo.text}
                            </Text>
                          </View>
                        )}

                        <Text
                          style={[
                            styles.messageText,
                            isMe ? styles.messageTextMe : styles.messageTextThem,
                            !isMe && isDark && { color: '#FFFFFF' },
                            item.isDeleted && { fontStyle: 'italic', color: isMe ? 'rgba(255, 255, 255, 0.7)' : '#94A3B8' },
                          ]}
                        >
                          {item.text}
                        </Text>

                        <View style={styles.messageMetaRow}>
                          {item.isStarred && (
                            <Ionicons name="star" size={11} color="#FBBF24" style={{ marginRight: 3 }} />
                          )}
                          {item.isEdited && !item.isDeleted && (
                            <Text style={[styles.editedBadge, isMe ? { color: 'rgba(255, 255, 255, 0.75)' } : { color: '#94A3B8' }]}>
                              edited{' '}
                            </Text>
                          )}
                          <Text
                            style={[
                              styles.messageTime,
                              isMe ? styles.messageTimeMe : styles.messageTimeThem,
                              !isMe && isDark && { color: '#94A3B8' },
                            ]}
                          >
                            {item.time}
                          </Text>
                          {isMe && !item.isDeleted && (
                            item.status === 'read' ? (
                              <Ionicons
                                name="checkmark-done"
                                size={15}
                                color={readReceiptsEnabled ? (isDark ? '#00F2FE' : '#38BDF8') : '#94A3B8'}
                                style={{ marginLeft: 4 }}
                              />
                            ) : item.status === 'delivered' ? (
                              <Ionicons
                                name="checkmark-done"
                                size={15}
                                color="#94A3B8"
                                style={{ marginLeft: 4 }}
                              />
                            ) : (
                              <Ionicons
                                name="checkmark"
                                size={15}
                                color="#94A3B8"
                                style={{ marginLeft: 4 }}
                              />
                            )
                          )}
                        </View>
                      </View>
                    )}

                    {/* Reaction Pill Badge */}
                    {Boolean(item.reaction) && (
                      <View style={[styles.reactionBadgeContainer, isMe ? styles.reactionBadgeMe : styles.reactionBadgeThem]}>
                        <Text style={styles.reactionBadgeEmoji}>{item.reaction}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </SwipeableMessageRow>
            );
          }}
        />
      </View>

      {/* Quick Emoji Strip */}
      {showEmojiBar && !isBlocked && (
        <View
          style={[
            styles.emojiBar,
            isDark && {
              backgroundColor: '#000000',
              borderTopColor: 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScroll}>
            {QUICK_EMOJIS.map((em) => (
              <TouchableOpacity
                key={em}
                style={[
                  styles.emojiBtn,
                  isDark && { backgroundColor: '#0A0D12', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
                ]}
                onPress={() => handleAddEmoji(em)}
                activeOpacity={0.65}
              >
                <Text style={styles.emojiChar}>{em}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Blocked Contact Warning Bar or Chat Input Footer */}
      {isBlocked ? (
        <View
          style={[
            styles.blockedBar,
            isDark && {
              backgroundColor: '#000000',
              borderTopColor: 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        >
          <Ionicons name="ban" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={[styles.blockedBarText, isDark && { color: '#94A3B8' }]}>
            This contact is blocked.
          </Text>
          <TouchableOpacity
            style={styles.unblockActionBtn}
            onPress={async () => {
              await AsyncStorage.setItem(`@sunao_blocked_${contactPhone}`, 'false');
              setIsBlocked(false);
            }}
          >
            <Text style={styles.unblockActionText}>Unblock</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.footer,
            isDark && {
              backgroundColor: '#000000',
              borderTopColor: 'rgba(255, 255, 255, 0.08)',
            },
          ]}
        >
          {/* Quoted Reply Banner */}
          {replyingToMessage && (
            <View style={[styles.replyBar, isDark && { backgroundColor: '#0E1217', borderLeftColor: '#10B981' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.replyBarTitle, { color: '#10B981' }]}>
                  Replying to {replyingToMessage.sender === 'me' || replyingToMessage.senderId === currentUserPhone ? 'You' : contactName}
                </Text>
                <Text style={[styles.replyBarContent, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                  {replyingToMessage.text || (replyingToMessage.type === 'voice' ? '🎤 Voice message' : 'Media')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingToMessage(null)} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Edit Message Banner */}
          {editingMessage && (
            <View style={[styles.replyBar, isDark && { backgroundColor: '#0E1217', borderLeftColor: '#F59E0B' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.replyBarTitle, { color: '#F59E0B' }]}>
                  Editing message
                </Text>
                <Text style={[styles.replyBarContent, isDark && { color: '#94A3B8' }]} numberOfLines={1}>
                  {editingMessage.text}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setMessage(''); }} style={{ padding: 6 }}>
                <Ionicons name="close-circle" size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>
          )}

          {isRecordingVoice ? (
            <View
              style={[
                styles.recordingContainer,
                isDark && {
                  backgroundColor: '#0A0D12',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                },
              ]}
            >
              <View style={styles.recordingIndicatorRow}>
                <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
                <Text
                  style={[
                    styles.recordingTimer,
                    isDark && { color: '#FFFFFF' },
                  ]}
                >
                  0:{recordSeconds < 10 ? '0' : ''}{recordSeconds}
                </Text>
                <Text
                  style={[
                    styles.recordingHint,
                    isDark && { color: '#94A3B8' },
                  ]}
                >
                  Recording voice note...
                </Text>
              </View>

              <View style={styles.recordingButtonsRow}>
                <TouchableOpacity style={styles.cancelRecBtn} onPress={cancelVoiceRecording}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.sendRecBtn} onPress={sendVoiceRecording}>
                  <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <View
                style={[
                  styles.inputContainer,
                  isDark && {
                    backgroundColor: '#0A0D12',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => setShowEmojiBar(!showEmojiBar)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="emoji-emotions"
                    size={24}
                    color={showEmojiBar ? '#10B981' : isDark ? '#94A3B8' : '#64748B'}
                  />
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.textInput,
                    isDark && { color: '#FFFFFF' },
                  ]}
                  placeholder="Message..."
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={message}
                  onChangeText={handleTextChange}
                  multiline
                  onKeyPress={(e: any) => {
                    if (Platform.OS === 'web' && e.nativeEvent?.key === 'Enter' && !e.nativeEvent?.shiftKey) {
                      e.preventDefault?.();
                      sendMessage();
                    }
                  }}
                />

                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => setShowAttachmentMenu(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="attach"
                    size={24}
                    color={isDark ? '#94A3B8' : '#64748B'}
                    style={{ transform: [{ rotate: '-45deg' }] }}
                  />
                </TouchableOpacity>

                {message.length === 0 && (
                  <TouchableOpacity
                    style={styles.inputIcon}
                    onPress={() => handlePickFile('image/*')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  isDark && { backgroundColor: '#10B981' },
                ]}
                onPress={message.trim().length > 0 ? sendMessage : startVoiceRecording}
                activeOpacity={0.8}
              >
                {message.trim().length > 0 ? (
                  <Ionicons name="send" size={17} color="#FFFFFF" style={{ marginLeft: 2 }} />
                ) : (
                  <Ionicons name="mic" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Header Options Dropdown Menu */}
      <Modal visible={showOptionsMenu} transparent animationType="fade" onRequestClose={() => setShowOptionsMenu(false)}>
        <Pressable style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} onPress={() => setShowOptionsMenu(false)}>
          <View
            style={[
              styles.dropdownMenu,
              isDark && {
                backgroundColor: '#000000',
                borderColor: 'rgba(255, 255, 255, 0.08)',
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowContactProfile(true);
              }}
            >
              <Ionicons name="person-circle-outline" size={17} color={isDark ? '#10B981' : '#047857'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { fontWeight: '700', color: isDark ? '#10B981' : '#047857' }]}>
                Contact Info
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setIsSearchingMessages(true);
              }}
            >
              <Ionicons name="search-outline" size={17} color={isDark ? '#94A3B8' : '#334155'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>Search in Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => triggerCall(false)}>
              <Ionicons name="call-outline" size={16} color={isDark ? '#10B981' : '#059669'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>Voice Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => triggerCall(true)}>
              <Ionicons name="videocam-outline" size={16} color={isDark ? '#38BDF8' : '#0284C7'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, isDark && { color: '#FFFFFF' }]}>Video Call</Text>
            </TouchableOpacity>

            <View style={[styles.menuDivider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

            <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Clear History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setShowOptionsMenu(false);
                const next = !isBlocked;
                setIsBlocked(next);
                await AsyncStorage.setItem(`@sunao_blocked_${contactPhone}`, next ? 'true' : 'false');
              }}
            >
              <Ionicons name="ban-outline" size={16} color={isBlocked ? '#10B981' : '#EF4444'} style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: isBlocked ? '#10B981' : '#EF4444' }]}>
                {isBlocked ? 'Unblock Contact' : 'Block Contact'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Attachment Options Modal */}
      <Modal visible={showAttachmentMenu} transparent animationType="fade" onRequestClose={() => setShowAttachmentMenu(false)}>
        <Pressable style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} onPress={() => setShowAttachmentMenu(false)}>
          <View
            style={[
              styles.attachmentSheet,
              isDark && {
                backgroundColor: '#000000',
                borderTopColor: 'rgba(255, 255, 255, 0.08)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.attachmentTitle, isDark && { color: '#FFFFFF' }]}>Share Content</Text>
            <View style={styles.attachmentGrid}>
              <TouchableOpacity
                style={styles.attachTile}
                onPress={() => handlePickFile('image/*')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.attachIconBg,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                    },
                  ]}
                >
                  <Ionicons name="image" size={22} color={isDark ? '#10B981' : '#059669'} />
                </View>
                <Text style={[styles.attachTileLabel, isDark && { color: '#94A3B8' }]}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachTile}
                onPress={() => handlePickFile('.pdf,.doc,.docx,.txt')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.attachIconBg,
                    {
                      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#EFF6FF',
                    },
                  ]}
                >
                  <Ionicons name="document-text" size={22} color={isDark ? '#38BDF8' : '#0284C7'} />
                </View>
                <Text style={[styles.attachTileLabel, isDark && { color: '#94A3B8' }]}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachTile}
                onPress={() => handlePickFile('audio/*')}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.attachIconBg,
                    {
                      backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : '#FAF5FF',
                    },
                  ]}
                >
                  <Ionicons name="musical-notes" size={22} color={isDark ? '#C084FC' : '#A855F7'} />
                </View>
                <Text style={[styles.attachTileLabel, isDark && { color: '#94A3B8' }]}>Audio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Contact Dossier / Profile Fullscreen Modal */}
      <ContactProfileModal
        visible={showContactProfile}
        onClose={() => {
          setShowContactProfile(false);
          AsyncStorage.getItem(`@sunao_blocked_${contactPhone}`).then((val) => {
            setIsBlocked(val === 'true');
          });
          AsyncStorage.getItem(`@sunao_wallpaper_${contactPhone}`).then((val) => {
            if (val) setWallpaperTheme(val);
          });
        }}
        contactName={contactName}
        contactPhone={contactPhone}
        currentUserPhone={currentUserPhone}
        avatarUri={activeUser?.avatarUri}
        aboutText={activeUser?.about || 'Hey there! Using Sunao for HD voice & crystal clear calling. 🚀'}
        onStartCall={triggerCall}
        onClearChat={handleClearChat}
        onOpenSearch={() => {
          setShowContactProfile(false);
          setIsSearchingMessages(true);
        }}
        onThemeChange={(theme) => setWallpaperTheme(theme)}
      />

      {/* WhatsApp Message Actions & Reaction Modal */}
      <Modal
        visible={Boolean(selectedMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <Pressable
          style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}
          onPress={() => setSelectedMessage(null)}
        >
          {selectedMessage && (
            <View
              style={[
                styles.actionModalContent,
                isDark && { backgroundColor: '#0B0F14', borderColor: 'rgba(255, 255, 255, 0.12)' },
              ]}
            >
              {/* Quick Reactions Bar */}
              <View style={[styles.reactionBarRow, isDark && { backgroundColor: '#131922' }]}>
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionBarEmojiBtn,
                      selectedMessage.reaction === emoji && styles.reactionBarEmojiBtnActive,
                    ]}
                    onPress={() => handleSelectReaction(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionBarEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action Sheet Menu */}
              <View style={styles.actionMenuItems}>
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleStartReply}>
                  <Ionicons name="arrow-undo-outline" size={19} color={isDark ? '#38BDF8' : '#0284C7'} />
                  <Text style={[styles.actionMenuText, isDark && { color: '#FFFFFF' }]}>Reply</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionMenuItem} onPress={handleStartForward}>
                  <Ionicons name="arrow-redo-outline" size={19} color={isDark ? '#38BDF8' : '#0284C7'} />
                  <Text style={[styles.actionMenuText, isDark && { color: '#FFFFFF' }]}>Forward</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionMenuItem} onPress={handleToggleStar}>
                  <Ionicons
                    name={selectedMessage.isStarred ? 'star' : 'star-outline'}
                    size={19}
                    color={selectedMessage.isStarred ? '#F59E0B' : (isDark ? '#E2E8F0' : '#475569')}
                  />
                  <Text style={[styles.actionMenuText, isDark && { color: '#FFFFFF' }]}>
                    {selectedMessage.isStarred ? 'Unstar' : 'Star'}
                  </Text>
                </TouchableOpacity>

                {Boolean(selectedMessage.text) && !selectedMessage.isDeleted && (
                  <TouchableOpacity style={styles.actionMenuItem} onPress={handleCopyMessage}>
                    <Ionicons name="copy-outline" size={19} color={isDark ? '#E2E8F0' : '#475569'} />
                    <Text style={[styles.actionMenuText, isDark && { color: '#FFFFFF' }]}>Copy</Text>
                  </TouchableOpacity>
                )}

                {/* Edit (Me only, within 15 mins, not deleted, text only) */}
                {Boolean(
                  (selectedMessage.senderId === currentUserPhone ||
                   selectedMessage.sender === 'me' ||
                   (String(currentUserPhone || '').replace(/\D/g, '').slice(-10) === String(selectedMessage.senderId || '').replace(/\D/g, '').slice(-10))) &&
                  !selectedMessage.isDeleted &&
                  selectedMessage.type !== 'voice' &&
                  Date.now() - (selectedMessage.timestamp || 0) < 15 * 60 * 1000
                ) && (
                    <TouchableOpacity style={styles.actionMenuItem} onPress={handleStartEdit}>
                      <Ionicons name="pencil-outline" size={19} color={isDark ? '#10B981' : '#059669'} />
                      <Text style={[styles.actionMenuText, isDark && { color: '#FFFFFF' }]}>Edit (15m)</Text>
                    </TouchableOpacity>
                  )}

                <View style={[styles.menuDivider, isDark && { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]} />

                {/* Delete for me */}
                <TouchableOpacity style={styles.actionMenuItem} onPress={handleDeleteForMe}>
                  <Ionicons name="trash-outline" size={19} color="#EF4444" />
                  <Text style={[styles.actionMenuText, { color: '#EF4444' }]}>Delete for me</Text>
                </TouchableOpacity>

                {/* Delete for everyone (Me only, not already deleted) */}
                {Boolean(
                  (selectedMessage.senderId === currentUserPhone ||
                   selectedMessage.sender === 'me' ||
                   (String(currentUserPhone || '').replace(/\D/g, '').slice(-10) === String(selectedMessage.senderId || '').replace(/\D/g, '').slice(-10))) &&
                  !selectedMessage.isDeleted
                ) && (
                    <TouchableOpacity style={styles.actionMenuItem} onPress={handleDeleteForEveryone}>
                      <Ionicons name="trash-bin-outline" size={19} color="#EF4444" />
                      <Text style={[styles.actionMenuText, { color: '#EF4444' }]}>Delete for everyone</Text>
                    </TouchableOpacity>
                  )}
              </View>
            </View>
          )}
        </Pressable>
      </Modal>

      {/* WhatsApp-Style Forward Message Modal */}
      <Modal
        visible={showForwardModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowForwardModal(false);
          setForwardingMessage(null);
        }}
      >
        <Pressable
          style={[styles.modalOverlay, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.75)' }]}
          onPress={() => {
            setShowForwardModal(false);
            setForwardingMessage(null);
          }}
        >
          <Pressable
            style={[
              styles.forwardModalContent,
              isDark && { backgroundColor: '#0B0F14', borderColor: 'rgba(255, 255, 255, 0.12)' },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.forwardModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="arrow-redo" size={20} color="#059669" style={{ marginRight: 8 }} />
                <Text style={[styles.forwardModalTitle, isDark && { color: '#FFFFFF' }]}>Forward message</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowForwardModal(false);
                  setForwardingMessage(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={isDark ? '#E2E8F0' : '#475569'} />
              </TouchableOpacity>
            </View>

            {/* Preview of message being forwarded */}
            {forwardingMessage && (
              <View style={[styles.forwardPreviewBox, isDark && { backgroundColor: '#131922', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
                <Text style={[styles.forwardPreviewText, isDark && { color: '#E2E8F0' }]} numberOfLines={2}>
                  {forwardingMessage.text || (forwardingMessage.type === 'voice' ? '🎤 Voice Message' : 'Media')}
                </Text>
              </View>
            )}

            {/* Search Box */}
            <View style={[styles.forwardSearchBox, isDark && { backgroundColor: '#131922', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.forwardSearchInput, isDark && { color: '#FFFFFF' }]}
                placeholder="Search contact or phone..."
                placeholderTextColor="#94A3B8"
                value={forwardSearch}
                onChangeText={setForwardSearch}
              />
            </View>

            {/* Contacts List */}
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {filteredForwardContacts.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 13 }}>No recent chats found</Text>
                </View>
              ) : (
                filteredForwardContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.phone}
                    style={[styles.forwardContactItem, isDark && { borderBottomColor: 'rgba(255, 255, 255, 0.06)' }]}
                    onPress={() => handleSendForward(contact)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.forwardAvatar}>
                      <Text style={styles.forwardAvatarText}>
                        {(contact.name || contact.phone || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.forwardContactName, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                        {contact.name || contact.phone}
                      </Text>
                      <Text style={styles.forwardContactPhone} numberOfLines={1}>
                        {contact.phone}
                      </Text>
                    </View>
                    <View style={styles.forwardSendBtn}>
                      <Ionicons name="send" size={14} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : ((StatusBar.currentHeight || 24) + 10),
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerProfileTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 14,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    marginRight: 10,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 12,
  },
  headerSubtitleTyping: {
    color: '#059669',
    fontWeight: '700',
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconVideo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  iconAudio: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  chatBody: { flex: 1, backgroundColor: '#F8FAFC' },
  messageWrapper: { width: '100%', flexDirection: 'row', marginBottom: 8 },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  messageBubble: {
    minWidth: 92,
    paddingLeft: 12,
    paddingRight: 22,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 1,
    position: 'relative',
  },
  messageBubbleMe: {
    backgroundColor: '#059669',
    borderTopRightRadius: 4,
  },
  messageBubbleThem: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextMe: { color: '#FFFFFF' },
  messageTextThem: { color: '#0F172A' },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 2,
    marginLeft: 10,
  },
  messageTime: {
    fontSize: 11,
    flexShrink: 0,
  },
  messageTimeMe: { color: 'rgba(255, 255, 255, 0.75)' },
  messageTimeThem: { color: '#94A3B8' },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: { padding: 4, marginHorizontal: 2, marginBottom: 4 },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    color: '#0F172A',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  recordingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingTimer: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 10,
  },
  recordingHint: {
    fontSize: 13,
    color: '#64748B',
  },
  recordingButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelRecBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  sendRecBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  emojiScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emojiBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  emojiChar: {
    fontSize: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  dropdownMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 84 : 54,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 170,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemIcon: {
    marginRight: 10,
  },
  menuItemText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  attachmentSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  attachmentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  attachmentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attachTile: {
    alignItems: 'center',
    gap: 8,
  },
  attachIconBg: {
    width: 52,
    height: 52,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  searchHeader: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : ((StatusBar.currentHeight || 24) + 10),
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchBackBtn: {
    padding: 6,
    marginRight: 6,
  },
  searchHeaderInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
  },
  emptySearchContainer: {
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySearchSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  blockedBar: {
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECDD3',
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedBarText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
  },
  unblockActionBtn: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  unblockActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 8,
  },
  replyBarTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyBarContent: {
    fontSize: 13,
    color: '#475569',
  },
  quotedBubble: {
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  quotedBubbleMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderLeftColor: '#A7F3D0',
  },
  quotedBubbleThem: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderLeftColor: '#10B981',
  },
  quotedSenderName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  quotedSnippetText: {
    fontSize: 12,
  },
  reactionBadgeContainer: {
    position: 'absolute',
    bottom: -10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionBadgeMe: {
    right: 10,
  },
  reactionBadgeThem: {
    left: 10,
  },
  reactionBadgeEmoji: {
    fontSize: 13,
  },
  editedBadge: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginRight: 4,
  },
  actionModalContent: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  reactionBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  reactionBarEmojiBtn: {
    padding: 6,
    borderRadius: 20,
  },
  reactionBarEmojiBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  reactionBarEmojiText: {
    fontSize: 24,
  },
  actionMenuItems: {
    width: '100%',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
  },
  messageChevronBtn: {
    position: 'absolute',
    top: 3,
    right: 4,
    padding: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  forwardModalContent: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  forwardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  forwardModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  forwardPreviewBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    marginBottom: 12,
  },
  forwardPreviewText: {
    fontSize: 12.5,
    color: '#334155',
  },
  forwardSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  forwardSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  forwardContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forwardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  forwardContactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  forwardContactPhone: {
    fontSize: 12,
    color: '#94A3B8',
  },
  forwardSendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
