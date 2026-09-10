import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatItemData } from '../components/main/ChatsTab';
import { getBackendUrl } from './firebase';
import { encryptE2EEMessage, decryptE2EEMessage } from '../utils/encryption';

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
  isForwarded?: boolean;
}

export const normalizePhone = (p?: string): string => {
  return String(p || '').replace(/\D/g, '').slice(-10);
};

export const getChatKey = (myPhone: string, contactPhone: string) => {
  const cleanMe = normalizePhone(myPhone);
  const cleanContact = normalizePhone(contactPhone);
  return `@sunao_msgs_${cleanMe}_${cleanContact}`;
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

export const getRecentKey = (phone: string) => `@sunao_recent_${normalizePhone(phone) || phone}`;

const TURSO_PIPELINE_URL = 'https://khusphus-khusphus.turso.io/v2/pipeline';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg4OTA3MDIsImlkIjoiMDFhMDU1ZTMtYTMwMS03MzhhLTg3YjQtZGIyOWM0NTA5YzQxIiwia2lkIjoiYXV1RnlEbnFzdkV1Tnp6YzVsb2ltN2dJQTNvcExiSHlJa29UR3VfM2dPQSIsInJpZCI6Ijg4YTVhZWZlLWU0ZmQtNDZkMy05MGY0LWFmNDRiMmU3NmI2MyJ9.33neAHtCPg_xcyapPdZASKNHKsEUadkXMiCKpqKqJHUApAkgaQKkZSlxrI1JPAV6Q6StRz9e1YJUwV3t8E4MCA';

async function queryTurso(sql: string, args: any[] = []): Promise<any[]> {
  try {
    const res = await fetch(TURSO_PIPELINE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql,
              args: args.map((a) => ({ type: 'text', value: String(a) })),
            },
          },
        ],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.results?.[0]?.response?.result;
    if (!result || !result.cols || !result.rows) return [];
    const cols = result.cols.map((c: any) => c.name);
    return result.rows.map((r: any) => {
      const obj: any = {};
      r.forEach((val: any, idx: number) => {
        obj[cols[idx]] = val?.value ?? null;
      });
      return obj;
    });
  } catch (e) {
    console.warn('[TURSO_QUERY_ERR]', e);
    return [];
  }
}

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
      const cleanMe = normalizePhone(myPhone);
      const cleanContact = normalizePhone(contactPhone);
      const key = getChatKey(myPhone, contactPhone);
      let raw = await AsyncStorage.getItem(key);
      if (!raw && (cleanMe !== myPhone || cleanContact !== contactPhone)) {
        raw = await AsyncStorage.getItem(`@sunao_msgs_${myPhone}_${contactPhone}`);
      }
      if (!raw) {
        // Legacy fallback to shared thread
        const [first, second] = [myPhone, contactPhone].sort();
        raw = await AsyncStorage.getItem(`@sunao_msgs_${first}_${second}`);
      }
      if (!raw && (cleanMe || cleanContact)) {
        const [firstClean, secondClean] = [cleanMe, cleanContact].sort();
        raw = await AsyncStorage.getItem(`@sunao_msgs_${firstClean}_${secondClean}`);
      }
      if (!raw) {
        raw = await AsyncStorage.getItem(`@khusphus_msgs_${[myPhone, contactPhone].sort().join('_')}`);
      }
      if (raw) {
        const parsed: LocalMessage[] = JSON.parse(raw);
        // Ensure sender 'me' vs 'them' is dynamically and strictly calculated relative to myPhone
        return parsed.map((m) => {
          const senderClean = normalizePhone(m.senderId);
          const isMe = (cleanMe && senderClean && senderClean === cleanMe) || m.sender === 'me' || m.senderId === myPhone;
          return {
            ...m,
            sender: isMe ? ('me' as const) : ('them' as const),
          };
        });
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

      let cloudMessages: any[] = [];
      try {
        const baseUrl = getBackendUrl();
        const res = await fetch(`${baseUrl}/api/messages/history?myPhone=${cleanMe}&contactPhone=${cleanContact}&limit=150`);
        if (res.ok) {
          cloudMessages = await res.json();
        }
      } catch (_) {}

      // Fallback: Query Turso HTTP pipeline directly if backend endpoint is unavailable
      if (!Array.isArray(cloudMessages) || cloudMessages.length === 0) {
        const rows = await queryTurso(
          'SELECT id, sender_phone as senderId, receiver_phone as receiverId, text, type, media_url as audioUrl, duration, status, created_at as timestamp FROM messages WHERE (sender_phone = ? AND receiver_phone = ?) OR (sender_phone = ? AND receiver_phone = ?) ORDER BY created_at ASC LIMIT 150',
          [cleanMe, cleanContact, cleanContact, cleanMe]
        );
        if (Array.isArray(rows) && rows.length > 0) {
          cloudMessages = rows;
        }
      }

      if (Array.isArray(cloudMessages) && cloudMessages.length > 0) {
        const current = await this.getMessages(myPhone, contactPhone);
        const currentMap = new Map(current.map((m) => [m.id, m]));

        let changed = false;
        for (const cm of cloudMessages) {
          const isMe = String(cm.senderId).replace(/\D/g, '').slice(-10) === cleanMe;
          let msgText = cm.text || '';
          if (msgText && typeof msgText === 'string' && msgText.startsWith('E2EE::')) {
            msgText = await decryptE2EEMessage(msgText, isMe ? cleanMe : cleanContact, isMe ? cleanContact : cleanMe);
          }
          const normalized: LocalMessage = {
            id: String(cm.id),
            senderId: isMe ? myPhone : contactPhone,
            receiverId: isMe ? contactPhone : myPhone,
            text: msgText,
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
    } catch (err) {
      console.warn('[STORAGE] Cloud sync failed:', err);
    }
    return await this.getMessages(myPhone, contactPhone);
  },

  /**
   * Restore all cloud conversations and registered users into main chat tab on app open
   */
  async restoreCloudChats(myPhone: string, registeredUsers: any[] = []): Promise<ChatItemData[]> {
    try {
      const cleanMe = normalizePhone(myPhone);
      if (!cleanMe) return [];

      // 1. Fetch all cloud messages involving this user from Turso
      const rows = await queryTurso(
        "SELECT id, thread_id, sender_phone, receiver_phone, text, type, media_url, duration, status, created_at FROM messages WHERE sender_phone LIKE '%' || ? OR receiver_phone LIKE '%' || ? ORDER BY created_at ASC",
        [cleanMe, cleanMe]
      );

      const messagesByContact = new Map<string, LocalMessage[]>();
      for (const row of rows) {
        const sPhone = normalizePhone(row.sender_phone);
        const rPhone = normalizePhone(row.receiver_phone);
        const contactPhone = sPhone === cleanMe ? rPhone : sPhone;
        if (!contactPhone || contactPhone === cleanMe || isDummyContact({ phone: contactPhone })) continue;

        const isMe = sPhone === cleanMe;
        let msgText = row.text || '';
        if (msgText && typeof msgText === 'string' && msgText.startsWith('E2EE::')) {
          msgText = await decryptE2EEMessage(msgText, isMe ? cleanMe : contactPhone, isMe ? contactPhone : cleanMe);
        }
        const msgTime = row.created_at ? new Date(Number(row.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const norm: LocalMessage = {
          id: String(row.id),
          senderId: isMe ? myPhone : contactPhone,
          receiverId: isMe ? contactPhone : myPhone,
          text: msgText,
          time: msgTime,
          timestamp: Number(row.created_at) || Date.now(),
          sender: isMe ? 'me' : 'them',
          status: (row.status as any) || 'sent',
          type: (row.type as any) || 'text',
          audioUrl: row.media_url || undefined,
          duration: row.duration || undefined,
        };

        if (!messagesByContact.has(contactPhone)) {
          messagesByContact.set(contactPhone, []);
        }
        messagesByContact.get(contactPhone)!.push(norm);
      }

      // Get existing local recent chats to preserve read status
      let readChatMap = new Map<string, boolean>();
      try {
        const existingRaw = (typeof window !== 'undefined' && window.localStorage)
          ? window.localStorage.getItem(getRecentKey(myPhone))
          : await AsyncStorage.getItem(getRecentKey(myPhone));
        if (existingRaw) {
          const list: ChatItemData[] = JSON.parse(existingRaw);
          for (const item of list) {
            if (item.phone && (item.unreadCount === 0 || item.unreadCount === undefined)) {
              readChatMap.set(normalizePhone(item.phone), true);
            }
          }
        }
      } catch (_) {}

      // 2. Save each conversation thread locally, preserving existing read states
      for (const [contactPhone, msgs] of messagesByContact.entries()) {
        const key = getChatKey(myPhone, contactPhone);
        const isLocallyRead = readChatMap.has(contactPhone);
        if (isLocallyRead) {
          for (const m of msgs) {
            if (m.sender === 'them') m.status = 'read';
          }
        }
        await AsyncStorage.setItem(key, JSON.stringify(msgs));
      }

      // 3. Build comprehensive recent chats list ONLY for real conversations
      const chatItemsMap = new Map<string, ChatItemData>();

      for (const [contactPhone, msgs] of messagesByContact.entries()) {
        const lastMsg = msgs[msgs.length - 1];
        const registered = registeredUsers.find((u) => normalizePhone(u.phone) === contactPhone);
        const contactName = registered?.name || registered?.phone || contactPhone;
        const avatarUri = registered?.avatarUri;

        let timeStr = '';
        if (lastMsg.timestamp) {
          const date = new Date(lastMsg.timestamp);
          const now = new Date();
          if (date.toDateString() === now.toDateString()) {
            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            timeStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          }
        }

        const isLocallyRead = readChatMap.has(contactPhone);
        const unreadCount = isLocallyRead ? 0 : msgs.filter((m) => m.sender === 'them' && m.status !== 'read').length;

        chatItemsMap.set(contactPhone, {
          phone: registered?.phone || contactPhone,
          name: contactName,
          avatarUri,
          lastMessage: lastMsg.text || (lastMsg.type === 'voice' ? '🎤 Voice message' : 'Message'),
          timestamp: timeStr,
          unreadCount,
          messageStatus: lastMsg.sender === 'me' ? lastMsg.status : undefined,
          sentByMe: lastMsg.sender === 'me',
        });
      }

      const result = Array.from(chatItemsMap.values());
      const key = getRecentKey(myPhone);
      await AsyncStorage.setItem(key, JSON.stringify(result));
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(result));
      }
      return result;
    } catch (e) {
      console.warn('[RESTORE_CLOUD_CHATS_ERR]', e);
      return [];
    }
  },

  /**
   * Save a new message into local storage
   */
  async saveMessage(myPhone: string, contactPhone: string, message: LocalMessage): Promise<LocalMessage[]> {
    try {
      const cleanMe = normalizePhone(myPhone);
      const senderClean = normalizePhone(message.senderId);
      const isMe = (cleanMe && senderClean && senderClean === cleanMe) || message.sender === 'me' || message.senderId === myPhone;
      const key = getChatKey(myPhone, contactPhone);
      const current = await this.getMessages(myPhone, contactPhone);
      
      // Avoid duplicate by id
      if (!current.some((m) => m.id === message.id)) {
        const normalizedMsg = {
          ...message,
          sender: isMe ? ('me' as const) : ('them' as const),
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

  /**
   * Persist a sent or received message directly to Turso Cloud DB for 0ms cross-device sync
   */
  async saveMessageToCloud(message: LocalMessage): Promise<void> {
    try {
      const cleanSender = normalizePhone(message.senderId);
      const cleanReceiver = normalizePhone(message.receiverId);
      if (!cleanSender || !cleanReceiver) return;
      const threadId = [cleanSender, cleanReceiver].sort().join('_');

      // 🔒 Enforce E2EE: Always encrypt text before sending to Turso Cloud DB
      let textToStore = message.text || '';
      if (textToStore && typeof textToStore === 'string' && !textToStore.startsWith('E2EE::')) {
        const enc = await encryptE2EEMessage(textToStore, cleanSender, cleanReceiver);
        textToStore = enc.ciphertext;
      }

      await queryTurso(
        'INSERT OR REPLACE INTO messages (id, thread_id, sender_phone, receiver_phone, text, type, media_url, duration, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          message.id,
          threadId,
          cleanSender,
          cleanReceiver,
          textToStore,
          message.type || 'text',
          message.audioUrl || null,
          message.duration || null,
          message.status || 'sent',
          String(message.timestamp || Date.now()),
        ]
      );
    } catch (e) {
      console.warn('[SAVE_TO_CLOUD_ERR]', e);
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
      const cleanMe = normalizePhone(myPhone);
      const key = getRecentKey(myPhone);
      let raw = await AsyncStorage.getItem(key);
      if (!raw && cleanMe !== myPhone) {
        raw = await AsyncStorage.getItem(`@sunao_recent_${myPhone}`);
      }
      if (!raw) {
        raw = await AsyncStorage.getItem(`@khusphus_recent_${myPhone}`);
      }
      if (raw) {
        let saved: ChatItemData[] = JSON.parse(raw);
        if (saved && Array.isArray(saved)) {
          // Clean out dummy contacts, empty placeholder ghosts, and self-chat
          const clean = saved.filter((c) => {
            if (isDummyContact(c)) return false;
            const cClean = normalizePhone(c.phone);
            if (!cClean || (cleanMe && cClean === cleanMe)) return false;
            // Purge ghosts that have placeholder text with no real timestamp
            if (c.lastMessage === 'Available on Sunao 🚀' && !c.timestamp) return false;
            return true;
          });

          // Deduplicate by 10-digit phone number
          const dedupedMap = new Map<string, ChatItemData>();
          for (const item of clean) {
            const cleanP = normalizePhone(item.phone);
            if (!dedupedMap.has(cleanP)) {
              dedupedMap.set(cleanP, item);
            }
          }
          const deduped = Array.from(dedupedMap.values());

          if (deduped.length !== saved.length) {
            AsyncStorage.setItem(key, JSON.stringify(deduped)).catch(() => {});
          }
          return deduped;
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
      const cleanMe = normalizePhone(myPhone);
      const clean = (chats || []).filter((c) => {
        if (isDummyContact(c)) return false;
        const cClean = normalizePhone(c.phone);
        if (!cClean || (cleanMe && cClean === cleanMe)) return false;
        if (c.lastMessage === 'Available on Sunao 🚀' && !c.timestamp) return false;
        return true;
      });
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
      const cleanMe = normalizePhone(myPhone);
      const cleanContact = normalizePhone(contactPhone);
      if (!cleanContact || (cleanMe && cleanContact === cleanMe)) {
        return [];
      }

      const key = getRecentKey(myPhone);
      const raw = await AsyncStorage.getItem(key);
      let list: ChatItemData[] = raw ? JSON.parse(raw) : [];
      list = list.filter((c) => {
        if (isDummyContact(c)) return false;
        const cClean = normalizePhone(c.phone);
        if (!cClean || (cleanMe && cClean === cleanMe)) return false;
        if (c.lastMessage === 'Available on Sunao 🚀' && !c.timestamp) return false;
        return true;
      });

      const existingIndex = list.findIndex((c) => normalizePhone(c.phone) === cleanContact);
      const computedStatus = isIncoming ? undefined : (messageStatus || 'sent');

      if (existingIndex >= 0) {
        const existing = list[existingIndex];
        const updatedChat: ChatItemData = {
          ...existing,
          phone: contactPhone || existing.phone,
          name: (contactName && contactName !== contactPhone) ? contactName : existing.name,
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
      const cleanMe = normalizePhone(myPhone);
      const cleanContact = normalizePhone(contactPhone);
      if (!cleanMe || !cleanContact) return [];

      const key = getRecentKey(myPhone);
      const raw = (typeof window !== 'undefined' && window.localStorage)
        ? window.localStorage.getItem(key)
        : await AsyncStorage.getItem(key);
      if (raw) {
        let list: ChatItemData[] = JSON.parse(raw);
        const item = list.find((c) => normalizePhone(c.phone) === cleanContact);
        if (item) {
          item.unreadCount = 0;
          await AsyncStorage.setItem(key, JSON.stringify(list));
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, JSON.stringify(list));
          }
        }
      }

      // Mark all incoming messages in this chat as 'read' in local storage
      const chatKey = getChatKey(myPhone, contactPhone);
      const msgs = await this.getMessages(myPhone, contactPhone);
      let changed = false;
      const updatedMsgs = msgs.map((m) => {
        if (m.sender === 'them' && m.status !== 'read') {
          changed = true;
          return { ...m, status: 'read' as const };
        }
        return m;
      });
      if (changed) {
        await AsyncStorage.setItem(chatKey, JSON.stringify(updatedMsgs));
      }

      // Persist 'read' status to Turso Cloud DB so future cloud syncs do not revert to unread
      queryTurso(
        "UPDATE messages SET status = 'read' WHERE receiver_phone LIKE '%' || ? AND sender_phone LIKE '%' || ?",
        [cleanMe, cleanContact]
      ).catch(() => {});

      return await this.getRecentChats(myPhone);
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
