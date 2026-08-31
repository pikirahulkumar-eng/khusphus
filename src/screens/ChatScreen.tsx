import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function ChatScreen({ chatUser, onBack, onStartCall }: any) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', text: 'Bhai KhusPhus kaisa chal raha hai?', time: '10:30 AM', sender: 'them' },
    { id: '2', text: 'Ekdum mast! Calling 100% working hai 🔥', time: '10:31 AM', sender: 'me' },
  ]);

  const sendMessage = () => {
    if (message.trim().length > 0) {
      setMessages([...messages, {
        id: Date.now().toString(),
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: 'me'
      }]);
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Chat Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{chatUser?.name || 'Rahul'}</Text>
          <Text style={styles.headerSubtitle}>online</Text>
        </TouchableOpacity>

        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => onStartCall(true)} style={styles.icon}>
            <Ionicons name="videocam" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onStartCall(false)} style={styles.icon}>
            <Ionicons name="call" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.icon}>
            <Ionicons name="ellipsis-vertical" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Body (WhatsApp Background) */}
      <ImageBackground source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }} style={styles.chatBody} resizeMode="cover">
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const isMe = item.sender === 'me';
            return (
              <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
                <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleThem]}>
                  <Text style={styles.messageText}>{item.text}</Text>
                  <Text style={styles.messageTime}>
                    {item.time} {isMe && <Ionicons name="checkmark-done" size={14} color="#53bdeb" />}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      </ImageBackground>

      {/* Chat Input Footer */}
      <View style={styles.footer}>
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.inputIcon}>
            <MaterialIcons name="emoji-emotions" size={26} color="#8696A0" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            placeholder="Message"
            placeholderTextColor="#8696A0"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          
          <TouchableOpacity style={styles.inputIcon}>
            <Ionicons name="attach" size={26} color="#8696A0" style={{ transform: [{ rotate: '-45deg' }] }} />
          </TouchableOpacity>
          
          {message.length === 0 && (
            <TouchableOpacity style={styles.inputIcon}>
              <Ionicons name="camera" size={24} color="#8696A0" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          {message.length > 0 ? (
            <Ionicons name="send" size={20} color="#FFF" style={{ marginLeft: 4 }} />
          ) : (
            <Ionicons name="mic" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E1E4E8' },
  header: {
    backgroundColor: '#128C7E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1D7DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 10,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginLeft: 18 },
  chatBody: { flex: 1, backgroundColor: '#EFE7DD' },
  messageWrapper: { flexDirection: 'row', marginBottom: 8 },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  messageBubbleMe: { backgroundColor: '#E7FFDB', borderTopRightRadius: 0 },
  messageBubbleThem: { backgroundColor: '#FFF', borderTopLeftRadius: 0 },
  messageText: { fontSize: 15, color: '#111B21', marginBottom: 2 },
  messageTime: { fontSize: 11, color: '#667781', alignSelf: 'flex-end' },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    minHeight: 48,
  },
  inputIcon: { padding: 4, marginHorizontal: 2, marginBottom: 4 },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    color: '#111B21',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  }
});
