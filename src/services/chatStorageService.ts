import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatItemData } from '../components/main/ChatsTab';
import { getBackendUrl } from './firebase';

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
  reaction?: string;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    type?: string;
  };
  isEdited?: boolean;
  isDeleted?: boolean;
  isStarred?: boolean;
}

export const getChatKey = (myPhone: string, contactPhone: string) => {
  return `@sunao_msgs_${myPhone}_${contactPhone}`;
};

const DUMMY_PHONES = new Set(['test_123', 'space_live_room']);
const DUMMY_NAMES = new Set(['Open Audio Lounge 🎙️']);

export const isDummyContact = (c: any): boolean => {
  if (!c) return true;
  const phone = String(c.phone || '').trim();
  const name = String(c.name || '').trim();
  if (!phone) return true;
  if (DUMMY_PHONES.has(phone)) return true;
  if (DUMMY_NAMES.has(name)) return true;
  if (phone.startsWith('user_') || phone.startsWith('reg_') || phone.startsWith('guest_')) return true;
  if (name.toLowerCase().startsWith('user_') || name.toLowerCase().startsWith('reg_')) return true;
  return false;
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
      const [first, second] = [myPhone, contactPhone].sort();
      const legacyRaw = await AsyncStorage.getItem(`@sunao_msgs_${first}_${second}`);
      if (legacyRaw !== null) return true;
      const oldLegacyRaw = await AsyncStorage.getItem(`@khusphus_msgs_${first}_${second}`);
      return oldLegacyRaw !== null;
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
        // Legacy fallback to shared thread
        const [first, second] = [myPhone, contactPhone].sort();
        raw = await AsyncStorage.getItem(`@sunao_msgs_${first}_${second}`);
      }
      if (!raw) {
        raw = await AsyncStorage.getItem(`@khusphus_msgs_${[myPhone, contactPhone].sort().join('_')}`);
      }
      if (raw) {
        const parsed: LocalMessage[] = JSON.parse(raw);
        // Ensure sender 'me' vs 'them' is dynamically and strictly calculated relative to myPhone
        return parsed.map((m) => ({
          ...m,
          sender: m.senderId === myPhone ? 'me' : 'them',
        }));
      }
    } catch (e) {
      console.warn('[STORAGE] Error reading messages:', e);
    }
    return [];
  },

  /**
   * Sync and restore messages from Turso Cloud
   */
  async syncMessagesWithCloud(myPhone: string, contactPhone: string): Promise<LocalMessage[]> {
    try {
      const cleanMe = String(myPhone || '').replace(/\D/g, '').slice(-10);
      const cleanContact = String(contactPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanMe || !cleanContact) return await this.getMessages(myPhone, contactPhone);

      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/api/messages/history?myPhone=${cleanMe}&contactPhone=${cleanContact}&limit=150`);
      if (res.ok) {
        const cloudMessages = await res.json();
        if (Array.isArray(cloudMessages) && cloudMessages.length > 0) {
          const current = await this.getMessages(myPhone, contactPhone);
          const currentMap = new Map(current.map((m) => [m.id, m]));

          let changed = false;
          for (const cm of cloudMessages) {
            const isMe = String(cm.senderId).replace(/\D/g, '').slice(-10) === cleanMe;
            const normalized: LocalMessage = {
              id: cm.id,
              senderId: isMe ? myPhone : contactPhone,
              receiverId: isMe ? contactPhone : myPhone,
              text: cm.text || '',
              time: cm.timestamp ? new Date(Number(cm.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              timestamp: Number(cm.timestamp) || Date.now(),
              sender: isMe ? 'me' : 'them',
              status: (cm.status as any) || 'sent',
              type: (cm.type as any) || 'text',
              audioUrl: cm.audioUrl || undefined,
              duration: cm.duration || undefined,
            };

            if (!currentMap.has(cm.id)) {
              currentMap.set(cm.id, normalized);
              changed = true;
            } else {
              const existing = currentMap.get(cm.id)!;
              if (existing.status !== normalized.status && normalized.status) {
                existing.status = normalized.status;
                changed = true;
              }
            }
          }

          if (changed) {
            const merged = Array.from(currentMap.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const key = getChatKey(myPhone, contactPhone);
            await AsyncStorage.setItem(key, JSON.stringify(merged));
            return merged;
          }
        }
      }
    } catch (err) {
      console.warn('[STORAGE] Cloud sync failed:', err);
    }
    return await this.getMessages(myPhone, contactPhone);
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
        const normalizedMsg = {
          ...message,
          sender: message.senderId === myPhone ? ('me' as const) : ('them' as const),
        };
        const updated = [...current, normalizedMsg];
        await AsyncStorage.setItem(key, JSON.stringify(updated));
        return updated;
      }
      return current;
    } catch (e) {
      console.error('[STORAGE] Error saving message:', e);
      return [];
    }
  },

  async updateMessage(myPhone: string, contactPhone: string, messageId: string, updates: Partial<LocalMessage>): Promise<LocalMessage[]> {
    try {
      const current = await this.getMessages(myPhone, contactPhone);
      const updated = current.map((m) => (m.id === messageId ? { ...m, ...updates } : m));
      const key = getChatKey(myPhone, contactPhone);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('[STORAGE] updateMessage error:', e);
      return [];
    }
  },

  async deleteMessage(myPhone: string, contactPhone: string, messageId: string, forEveryone: boolean = false): Promise<LocalMessage[]> {
    try {
      const current = await this.getMessages(myPhone, contactPhone);
      let updated: LocalMessage[];
      if (forEveryone) {
        updated = current.map((m) => (m.id === messageId ? { ...m, isDeleted: true, text: '🚫 This message was deleted' } : m));
      } else {
        updated = current.filter((m) => m.id !== messageId);
      }
      const key = getChatKey(myPhone, contactPhone);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('[STORAGE] deleteMessage error:', e);
      return [];
    }
  },
  async getRecentChats(myPhone: string, defaultChats: ChatItemData[] = []): Promise<ChatItemData[]> {
    try {
      const key = getRecentKey(myPhone);
      let raw = await AsyncStorage.getItem(key);
      if (!raw) {
        raw = await AsyncStorage.getItem(`@khusphus_recent_${myPhone}`);
      }
      if (raw) {
        let saved: ChatItemData[] = JSON.parse(raw);
        if (saved && Array.isArray(saved)) {
          const clean = saved.filter((c) => !isDummyContact(c));
          if (clean.length !== saved.length) {
            AsyncStorage.setItem(key, JSON.stringify(clean)).catch(() => {});
          }
          return clean;
        }
      }
      return defaultChats.filter((c) => !isDummyContact(c));
    } catch (e) {
      console.warn('[STORAGE] Error loading recent chats:', e);
      return defaultChats.filter((c) => !isDummyContact(c));
    }
  },

  /**
   * Overwrite chats list with cleaned data (purging dummy users)
   */
  async saveCleanChats(myPhone: string, chats: ChatItemData[]): Promise<void> {
    try {
      const clean = (chats || []).filter((c) => !isDummyContact(c));
      const key = getRecentKey(myPhone);
      await AsyncStorage.setItem(key, JSON.stringify(clean));
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(clean));
      }
    } catch (_) {}
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
      if (isDummyContact({ phone: contactPhone, name: contactName })) {
        return [];
      }
      const key = getRecentKey(myPhone);
      const raw = await AsyncStorage.getItem(key);
      let list: ChatItemData[] = raw ? JSON.parse(raw) : [];
      list = list.filter((c) => !isDummyContact(c));

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
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(list));
      }
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
        if ((m.sender === 'me' || m.senderId === myPhone) && (status === 'read' || m.status !== 'read')) {
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
