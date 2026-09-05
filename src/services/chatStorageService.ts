import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatItemData } from '../components/main/ChatsTab';

export interface LocalMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  time: string;
  timestamp: number;
  sender: 'me' | 'them';
  status: 'sent' | 'delivered' | 'read';
  type?: 'text' | 'voice' | 'image';
  audioUrl?: string;
  duration?: string;
}

const getChatKey = (user1: string, user2: string) => {
  // Alphabetically sorted to ensure consistent conversation thread key
  const [first, second] = [user1, user2].sort();
  return `@sunao_msgs_${first}_${second}`;
};

const getRecentKey = (phone: string) => `@sunao_recent_${phone}`;

export const ChatStorageService = {
  /**
   * Load local messages for a 1-on-1 chat
   */
  async getMessages(myPhone: string, contactPhone: string): Promise<LocalMessage[]> {
    try {
      const key = getChatKey(myPhone, contactPhone);
      let raw = await AsyncStorage.getItem(key);
      if (!raw) {
        // Legacy fallback
        raw = await AsyncStorage.getItem(`@khusphus_msgs_${[myPhone, contactPhone].sort().join('_')}`);
      }
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[STORAGE] Error reading messages:', e);
    }
    return [];
  },

  /**
   * Save a new message into local storage
   */
  async saveMessage(myPhone: string, contactPhone: string, message: LocalMessage): Promise<LocalMessage[]> {
    try {
      const key = getChatKey(myPhone, contactPhone);
      const current = await this.getMessages(myPhone, contactPhone);
      
      // Avoid duplicate by id
      if (!current.some((m) => m.id === message.id)) {
        const updated = [...current, message];
        await AsyncStorage.setItem(key, JSON.stringify(updated));
        return updated;
      }
      return current;
    } catch (e) {
      console.error('[STORAGE] Error saving message:', e);
      return [];
    }
  },

  /**
   * Load all recent conversation summaries for the main screen
   */
  async getRecentChats(myPhone: string, defaultChats: ChatItemData[]): Promise<ChatItemData[]> {
    try {
      const key = getRecentKey(myPhone);
      let raw = await AsyncStorage.getItem(key);
      if (!raw) {
        raw = await AsyncStorage.getItem(`@khusphus_recent_${myPhone}`);
      }
      if (raw) {
        let saved: ChatItemData[] = JSON.parse(raw);
        if (saved && saved.length > 0) {
          saved = saved.map((c) => ({
            ...c,
            name: c.name.replace(/KhusPhus/gi, 'Sunao'),
            lastMessage: c.lastMessage
              .replace(/WebRTC low latency audio call tested on 5G/gi, 'Audio aur video call clear hai')
              .replace(/KhusPhus/gi, 'Sunao'),
          }));
          await AsyncStorage.setItem(key, JSON.stringify(saved));
          return saved;
        }
      }
      // Initialize with defaults if empty
      await AsyncStorage.setItem(key, JSON.stringify(defaultChats));
      return defaultChats;
    } catch (e) {
      console.warn('[STORAGE] Error loading recent chats:', e);
      return defaultChats;
    }
  },

  /**
   * Update the latest message snippet and timestamp on the main chat list
   */
  async updateRecentChat(
    myPhone: string,
    contactPhone: string,
    contactName: string,
    lastMessage: string,
    time: string,
    isIncoming: boolean = false
  ): Promise<ChatItemData[]> {
    try {
      const key = getRecentKey(myPhone);
      const raw = await AsyncStorage.getItem(key);
      let list: ChatItemData[] = raw ? JSON.parse(raw) : [];

      const existingIndex = list.findIndex((c) => c.phone === contactPhone);
      if (existingIndex >= 0) {
        const existing = list[existingIndex];
        const updatedChat: ChatItemData = {
          ...existing,
          lastMessage,
          timestamp: time,
          unreadCount: isIncoming ? (existing.unreadCount || 0) + 1 : 0,
          sentByMe: !isIncoming,
          messageStatus: isIncoming ? undefined : 'read',
        };

        // Move to top of the list
        list.splice(existingIndex, 1);
        list.unshift(updatedChat);
      } else {
        // Create new conversation entry at top
        list.unshift({
          phone: contactPhone,
          name: contactName || contactPhone,
          lastMessage,
          timestamp: time,
          unreadCount: isIncoming ? 1 : 0,
          sentByMe: !isIncoming,
          messageStatus: isIncoming ? undefined : 'read',
        });
      }

      await AsyncStorage.setItem(key, JSON.stringify(list));
      return list;
    } catch (e) {
      console.error('[STORAGE] Error updating recent chat:', e);
      return [];
    }
  },

  /**
   * Mark all unread messages in a chat as read
   */
  async markAsRead(myPhone: string, contactPhone: string): Promise<ChatItemData[]> {
    try {
      const key = getRecentKey(myPhone);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];

      let list: ChatItemData[] = JSON.parse(raw);
      const item = list.find((c) => c.phone === contactPhone);
      if (item && item.unreadCount) {
        item.unreadCount = 0;
        await AsyncStorage.setItem(key, JSON.stringify(list));
      }
      return list;
    } catch (e) {
      return [];
    }
  },
};
