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
      {/* Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color="#059669" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{contactName}</Text>
          <Text style={[styles.headerSubtitle, isPeerTyping && styles.headerSubtitleTyping]}>
            {isPeerTyping ? 'typing...' : 'online'}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => triggerCall(true)} style={[styles.icon, styles.iconVideo]}>
            <Ionicons name="videocam" size={19} color="#0284C7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => triggerCall(false)} style={[styles.icon, styles.iconAudio]}>
            <Ionicons name="call" size={18} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.icon} onPress={() => setShowOptionsMenu(true)}>
            <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Body */}
      <View style={styles.chatBody}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
                    <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
                      {item.text}
                    </Text>
                    <View style={styles.messageMetaRow}>
                      <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeThem]}>
                        {item.time}
                      </Text>
                      {isMe && (
                        <Ionicons
                          name="checkmark-done"
                          size={15}
                          color="#38BDF8"
                          style={{ marginLeft: 4 }}
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

      {/* Chat Input Footer */}
      <View style={styles.footer}>
        {isRecordingVoice ? (
          <View style={styles.recordingContainer}>
            <View style={styles.recordingIndicatorRow}>
              <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
              <Text style={styles.recordingTimer}>
                0:{recordSeconds < 10 ? '0' : ''}{recordSeconds}
              </Text>
              <Text style={styles.recordingHint}>Recording voice note...</Text>
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
                <MaterialIcons name="emoji-emotions" size={24} color={showEmojiBar ? '#059669' : '#64748B'} />
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                placeholder="Message..."
                placeholderTextColor="#94A3B8"
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
                <Ionicons name="attach" size={24} color="#64748B" style={{ transform: [{ rotate: '-45deg' }] }} />
              </TouchableOpacity>

              {message.length === 0 && (
                <TouchableOpacity
                  style={styles.inputIcon}
                  onPress={() => handlePickFile('image/*')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={22} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={message.trim().length > 0 ? sendMessage : startVoiceRecording}
              activeOpacity={0.8}
            >
              {message.trim().length > 0 ? (
                <Ionicons name="send" size={17} color="#FFFFFF" style={{ marginLeft: 2 }} />
              ) : (
                <Ionicons name="mic" size={20} color="#FFFFFF" />
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
  messageWrapper: { flexDirection: 'row', marginBottom: 8 },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    elevation: 1,
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
    marginTop: 3,
    marginLeft: 14,
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeMe: { color: 'rgba(255, 255, 255, 0.75)' },
  messageTimeThem: { color: '#94A3B8' },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
});
