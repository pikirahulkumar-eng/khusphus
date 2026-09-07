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

export const getChatKey = (user1: string, user2: string) => {
  // Alphabetically sorted to ensure consistent conversation thread key
  const [first, second] = [user1, user2].sort();
  return `@sunao_msgs_${first}_${second}`;
};

export const getRecentKey = (phone: string) => `@sunao_recent_${phone}`;

export const ChatStorageService = {
  /**
   * Check if a conversation thread has ever been created or opened
   */
  async hasChatThread(myPhone: string, contactPhone: string): Promise<boolean> {
    try {
      const key = getChatKey(myPhone, contactPhone);
      const raw = await AsyncStorage.getItem(key);
      if (raw !== null) return true;
      const legacyRaw = await AsyncStorage.getItem(`@khusphus_msgs_${[myPhone, contactPhone].sort().join('_')}`);
      return legacyRaw !== null;
    } catch {
      return false;
    }
  },
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
    isIncoming: boolean = false,
    messageStatus?: 'sent' | 'delivered' | 'read'
  ): Promise<ChatItemData[]> {
    try {
      const key = getRecentKey(myPhone);
      const raw = await AsyncStorage.getItem(key);
      let list: ChatItemData[] = raw ? JSON.parse(raw) : [];

      const existingIndex = list.findIndex((c) => c.phone === contactPhone);
      const computedStatus = isIncoming ? undefined : (messageStatus || 'sent');

      if (existingIndex >= 0) {
        const existing = list[existingIndex];
        const updatedChat: ChatItemData = {
          ...existing,
          lastMessage,
          timestamp: time,
          unreadCount: isIncoming ? (existing.unreadCount || 0) + 1 : 0,
          sentByMe: !isIncoming,
          messageStatus: computedStatus,
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
          messageStatus: computedStatus,
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

  /**
   * Update a specific message status (sent -> delivered -> read)
   */
  async updateMessageStatus(
    myPhone: string,
    contactPhone: string,
    messageId: string,
    status: 'sent' | 'delivered' | 'read'
  ): Promise<LocalMessage[]> {
    try {
      const key = getChatKey(myPhone, contactPhone);
      const messages = await this.getMessages(myPhone, contactPhone);
      let changed = false;
      const updated = messages.map((m) => {
        if (m.id === messageId) {
          changed = true;
          return { ...m, status };
        }
        return m;
      });
      if (changed) {
        await AsyncStorage.setItem(key, JSON.stringify(updated));
        try {
          const recentKey = getRecentKey(myPhone);
          const raw = await AsyncStorage.getItem(recentKey);
          if (raw) {
            let list: ChatItemData[] = JSON.parse(raw);
            const chatIdx = list.findIndex((c) => c.phone === contactPhone);
            if (chatIdx >= 0 && list[chatIdx].sentByMe) {
              list[chatIdx].messageStatus = status;
              await AsyncStorage.setItem(recentKey, JSON.stringify(list));
            }
          }
        } catch (_) {}
      }
      return updated;
    } catch (e) {
      console.warn('[STORAGE] Error updating message status:', e);
      return [];
    }
  },

  /**
   * Mark all messages sent by 'me' in a thread as 'read' or 'delivered'
   */
  async updateAllSentStatus(
    myPhone: string,
    contactPhone: string,
    status: 'delivered' | 'read'
  ): Promise<LocalMessage[]> {
    try {
      const key = getChatKey(myPhone, contactPhone);
      const messages = await this.getMessages(myPhone, contactPhone);
      let changed = false;
      const updated = messages.map((m) => {
        if (m.sender === 'me' && (status === 'read' || m.status !== 'read')) {
          changed = true;
          return { ...m, status };
        }
        return m;
      });
      if (changed) {
        await AsyncStorage.setItem(key, JSON.stringify(updated));
        try {
          const recentKey = getRecentKey(myPhone);
          const raw = await AsyncStorage.getItem(recentKey);
          if (raw) {
            let list: ChatItemData[] = JSON.parse(raw);
            const chatIdx = list.findIndex((c) => c.phone === contactPhone);
            if (chatIdx >= 0 && list[chatIdx].sentByMe) {
              list[chatIdx].messageStatus = status;
              await AsyncStorage.setItem(recentKey, JSON.stringify(list));
            }
          }
        } catch (_) {}
      }
      return updated;
    } catch (e) {
      console.warn('[STORAGE] Error updating all sent status:', e);
      return [];
    }
  },

  /**
   * Clear all messages in a chat thread
   */
  async clearMessages(myPhone: string, contactPhone: string): Promise<void> {
    try {
      const key = getChatKey(myPhone, contactPhone);
      await AsyncStorage.setItem(key, JSON.stringify([]));
      await AsyncStorage.removeItem(`@khusphus_msgs_${[myPhone, contactPhone].sort().join('_')}`);
    } catch (e) {
      console.warn('[STORAGE] Error clearing messages:', e);
    }
  },
};
