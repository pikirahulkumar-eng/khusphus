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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
    if (onStartCall) onStartCall(isVideo);
    else if (onCall) onCall(isVideo);
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
          <TouchableOpacity style={styles.icon}>
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
              <TouchableOpacity style={styles.inputIcon}>
                <MaterialIcons name="emoji-emotions" size={24} color="#64748B" />
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                placeholder="Message..."
                placeholderTextColor="#94A3B8"
                value={message}
                onChangeText={handleTextChange}
                multiline
              />

              <TouchableOpacity style={styles.inputIcon}>
                <Ionicons name="attach" size={24} color="#64748B" style={{ transform: [{ rotate: '-45deg' }] }} />
              </TouchableOpacity>

              {message.length === 0 && (
                <TouchableOpacity style={styles.inputIcon}>
                  <Ionicons name="camera" size={22} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={message.trim().length > 0 ? sendMessage : startVoiceRecording}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 48 : 12,
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
});
