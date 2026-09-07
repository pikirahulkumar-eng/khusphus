import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { KhusPhusTheme } from '../constants/theme';
import { ChatStorageService, LocalMessage } from '../services/chatStorageService';
import { RealtimeBridge } from '../services/realtimeBridge';
import { VoiceService } from '../services/voiceRecordingService';
import VoiceNoteBubble from '../components/chat/VoiceNoteBubble';

interface ChatScreenProps {
  chatUser?: any;
  user?: any;
  currentUserPhone?: string;
  onBack: () => void;
  onStartCall?: (isVideo: boolean) => void;
  onCall?: (isVideo: boolean) => void;
}

const QUICK_EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '🙏', '🎉', '❤️', '👏', '🚀', '💯', '✨'];

export default function ChatScreen({
  chatUser,
  user,
  currentUserPhone = '9876543210',
  onBack,
  onStartCall,
  onCall,
}: ChatScreenProps) {
  const activeUser = chatUser || user;
  const contactPhone = activeUser?.phone || '1122334455';
  const contactName = activeUser?.name || activeUser?.phone || 'Contact';

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  // Zero-Cost Voice Note Recording States
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const timerIntervalRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Hardware Back Handler (Android): Navigate back to chat list instead of exiting app
  useEffect(() => {
    const onHardwareBack = () => {
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
  }, [showOptionsMenu, showAttachmentMenu, showEmojiBar, onBack]);

  // 1. Load Local Messages from Offline Storage on Mount
  useEffect(() => {
    let isMounted = true;
    const loadChatHistory = async () => {
      const stored = await ChatStorageService.getMessages(currentUserPhone, contactPhone);
      if (isMounted) {
        if (stored && stored.length > 0) {
          setMessages(stored);
        } else {
          // Default initial icebreaker message if completely new
          const initialMsgs: LocalMessage[] = [
            {
              id: 'init_1',
              senderId: contactPhone,
              receiverId: currentUserPhone,
              text: 'Hey! Sunao par video aur voice calling try karein? 🔥',
              time: '10:30 AM',
              timestamp: Date.now() - 60000,
              sender: 'them',
              status: 'read',
            },
            {
              id: 'init_2',
              senderId: currentUserPhone,
              receiverId: contactPhone,
              text: 'Haan bilkul, aawaz ekdum saaf aur instant aa rahi hai! 🚀',
              time: '10:31 AM',
              timestamp: Date.now() - 30000,
              sender: 'me',
              status: 'read',
            },
          ];
          setMessages(initialMsgs);
          initialMsgs.forEach((m) => ChatStorageService.saveMessage(currentUserPhone, contactPhone, m));
        }
      }
      // Mark as read in recent chats list
      await ChatStorageService.markAsRead(currentUserPhone, contactPhone);
    };

    loadChatHistory();
    return () => {
      isMounted = false;
    };
  }, [currentUserPhone, contactPhone]);

  // 2. Listen for Real-Time Incoming Messages and Typing via Socket
  useEffect(() => {
    const unsubscribe = RealtimeBridge.subscribe((event) => {
      if (event.type === 'CHAT_MESSAGE' && event.payload) {
        const payload = event.payload;
        if (payload.senderId === contactPhone) {
          const newIncoming: LocalMessage = {
            id: payload.id || Date.now().toString(),
            senderId: contactPhone,
            receiverId: currentUserPhone,
            text: payload.text,
            time: payload.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: payload.timestamp || Date.now(),
            sender: 'them',
            status: 'read',
          };

          setMessages((prev) => [...prev, newIncoming]);
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
        }
      } else if (event.type === 'USER_TYPING' && event.payload) {
        if (event.payload.senderId === contactPhone) {
          setIsPeerTyping(Boolean(event.payload.isTyping));
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsPeerTyping(false);
          }, 3000);
        }
      }
    });

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUserPhone, contactPhone, contactName]);

  const handleTextChange = (text: string) => {
    setMessage(text);
    if (text.length > 0) {
      RealtimeBridge.sendTyping(contactPhone, true);
    }
  };

  const triggerCall = (isVideo: boolean) => {
    setShowOptionsMenu(false);
    if (onStartCall) onStartCall(isVideo);
    else if (onCall) onCall(isVideo);
  };

  const handleAddEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
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
            status: 'read',
          };
          setMessages((prev) => [...prev, newMsg]);
          ChatStorageService.saveMessage(currentUserPhone, contactPhone, newMsg);
          ChatStorageService.updateRecentChat(currentUserPhone, contactPhone, contactName, fileMsgText, formattedTime, false);
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

    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: LocalMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUserPhone,
      receiverId: contactPhone,
      text: trimmed,
      time: formattedTime,
      timestamp: Date.now(),
      sender: 'me',
      status: 'read',
    };

    // Update UI immediately (Optimistic Update)
    setMessages((prev) => [...prev, newMsg]);
    setMessage('');
    RealtimeBridge.sendTyping(contactPhone, false);

    // Persist to Phone's Local Storage
    await ChatStorageService.saveMessage(currentUserPhone, contactPhone, newMsg);
    await ChatStorageService.updateRecentChat(
      currentUserPhone,
      contactPhone,
      contactName,
      trimmed,
      formattedTime,
      false
    );

    // Emit live to peer via Socket.IO
    RealtimeBridge.sendChatMessage(contactPhone, newMsg);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
        status: 'read',
      };

      setMessages((prev) => [...prev, newVoiceMsg]);
      await ChatStorageService.saveMessage(currentUserPhone, contactPhone, newVoiceMsg);
      await ChatStorageService.updateRecentChat(
        currentUserPhone,
        contactPhone,
        contactName,
        '🎤 Voice message',
        formattedTime,
        false
      );

      RealtimeBridge.sendChatMessage(contactPhone, newVoiceMsg);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    setRecordSeconds(0);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />
      {/* WhatsApp Clean Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#111B21" />
          <View style={styles.avatar}>
            {activeUser?.avatarUri || activeUser?.photo ? (
              <Image source={{ uri: activeUser.avatarUri || activeUser.photo }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={20} color="#54656F" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerTitleContainer} activeOpacity={0.8}>
          <Text style={styles.headerTitle} numberOfLines={1}>{contactName}</Text>
          <Text style={[styles.headerSubtitle, isPeerTyping && styles.headerSubtitleTyping]} numberOfLines={1}>
            {isPeerTyping ? 'typing...' : 'online'}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => triggerCall(true)} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={24} color="#111B21" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => triggerCall(false)} style={styles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={22} color="#111B21" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowOptionsMenu(true)} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={20} color="#111B21" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Body (WhatsApp Wallpaper) */}
      <View style={styles.chatBody}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 10 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={styles.listHeaderContainer}>
              <View style={styles.encryptionCard}>
                <Ionicons name="lock-closed" size={12} color="#667781" style={{ marginRight: 6 }} />
                <Text style={styles.encryptionText}>
                  Messages and calls are end-to-end encrypted. No one outside of this chat, not even Sunao, can read or listen to them.
                </Text>
              </View>
              <View style={styles.dateBadgeContainer}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeText}>TODAY</Text>
                </View>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender === 'me';
            return (
              <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
                {item.type === 'voice' ? (
                  <VoiceNoteBubble
                    audioUrl={item.audioUrl}
                    duration={item.duration}
                    isMe={isMe}
                    time={item.time}
                  />
                ) : (
                  <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
                    <Text style={styles.messageText}>
                      {item.text}
                    </Text>
                    <View style={styles.messageMetaRow}>
                      <Text style={styles.messageTime}>
                        {item.time}
                      </Text>
                      {isMe && (
                        <Ionicons
                          name="checkmark-done"
                          size={16}
                          color="#53BDEB"
                          style={{ marginLeft: 3 }}
                        />
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
      </View>

      {/* Quick Emoji Strip */}
      {showEmojiBar && (
        <View style={styles.emojiBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiScroll}>
            {QUICK_EMOJIS.map((em) => (
              <TouchableOpacity
                key={em}
                style={styles.emojiBtn}
                onPress={() => handleAddEmoji(em)}
                activeOpacity={0.65}
              >
                <Text style={styles.emojiChar}>{em}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* WhatsApp Two-Piece Floating Input Footer */}
      <View style={styles.footer}>
        {isRecordingVoice ? (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingIndicatorRow}>
              <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
              <Text style={styles.recordingTimer}>
                0:{recordSeconds < 10 ? '0' : ''}{recordSeconds}
              </Text>
              <Text style={styles.recordingHint}>Recording audio...</Text>
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
          <>
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.inputIcon}
                onPress={() => setShowEmojiBar(!showEmojiBar)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="emoji-emotions" size={24} color={showEmojiBar ? '#00A884' : '#54656F'} />
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                placeholder="Message"
                placeholderTextColor="#667781"
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
                <Ionicons name="attach" size={24} color="#54656F" style={{ transform: [{ rotate: '-45deg' }] }} />
              </TouchableOpacity>

              {message.length === 0 && (
                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => handlePickFile('image/*')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={22} color="#54656F" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={message.trim().length > 0 ? sendMessage : startVoiceRecording}
              activeOpacity={0.85}
            >
              {message.trim().length > 0 ? (
                <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
              ) : (
                <Ionicons name="mic" size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Header Options Dropdown Menu */}
      <Modal visible={showOptionsMenu} transparent animationType="fade" onRequestClose={() => setShowOptionsMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsMenu(false)}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={() => triggerCall(false)}>
              <Ionicons name="call" size={16} color="#059669" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Voice Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => triggerCall(true)}>
              <Ionicons name="videocam" size={16} color="#0284C7" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Video Call</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" style={styles.menuItemIcon} />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Clear History</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Attachment Options Modal */}
      <Modal visible={showAttachmentMenu} transparent animationType="fade" onRequestClose={() => setShowAttachmentMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAttachmentMenu(false)}>
          <View style={styles.attachmentSheet}>
            <Text style={styles.attachmentTitle}>Share Content</Text>
            <View style={styles.attachmentGrid}>
              <TouchableOpacity
                style={styles.attachTile}
                onPress={() => handlePickFile('image/*')}
                activeOpacity={0.75}
              >
                <View style={[styles.attachIconBg, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="image" size={22} color="#059669" />
                </View>
                <Text style={styles.attachTileLabel}>Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachTile}
                onPress={() => handlePickFile('.pdf,.doc,.docx,.txt')}
                activeOpacity={0.75}
              >
                <View style={[styles.attachIconBg, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="document-text" size={22} color="#0284C7" />
                </View>
                <Text style={styles.attachTileLabel}>Document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachTile}
                onPress={() => handlePickFile('audio/*')}
                activeOpacity={0.75}
              >
                <View style={[styles.attachIconBg, { backgroundColor: '#FAF5FF' }]}>
                  <Ionicons name="musical-notes" size={22} color="#A855F7" />
                </View>
                <Text style={styles.attachTileLabel}>Audio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFEAE2' },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : ((StatusBar.currentHeight || 24) + 8),
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 4,
    borderRadius: 20,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  headerTitleContainer: { flex: 1, justifyContent: 'center' },
  headerTitle: {
    color: '#111B21',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: '#667781',
    fontSize: 12,
    marginTop: 1,
  },
  headerSubtitleTyping: {
    color: '#00A884',
    fontWeight: '600',
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: {
    padding: 8,
    marginLeft: 2,
  },
  chatBody: { flex: 1, backgroundColor: '#EFEAE2' },
  listHeaderContainer: {
    paddingBottom: 16,
    alignItems: 'center',
  },
  encryptionCard: {
    flexDirection: 'row',
    backgroundColor: '#FFEECD',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
    alignItems: 'center',
    maxWidth: '92%',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  encryptionText: {
    color: '#54656F',
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
    textAlign: 'center',
  },
  dateBadgeContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  dateBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  dateBadgeText: {
    color: '#54656F',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  messageWrapper: { flexDirection: 'row', marginVertical: 2.5, marginHorizontal: 4 },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    paddingTop: 6,
    paddingBottom: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
  },
  messageBubbleMe: {
    backgroundColor: '#D9FDD3',
    borderTopRightRadius: 2,
  },
  messageBubbleThem: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#111B21',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 2,
    marginLeft: 16,
  },
  messageTime: {
    fontSize: 11,
    color: '#667781',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginRight: 6,
    minHeight: 48,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  inputIcon: { padding: 6, marginHorizontal: 1 },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 8,
    color: '#111B21',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00A884',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
});
