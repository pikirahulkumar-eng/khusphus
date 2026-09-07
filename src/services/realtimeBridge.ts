import { io, Socket } from 'socket.io-client';
// @ts-ignore
import messaging from '@react-native-firebase/messaging';

type RealtimeListener = (event: { type: string; payload: any; targetUserId?: string }) => void;

class RealtimeBridgeManager {
  private socket: Socket | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private isConnected = false;
  private registeredUserId: string | null = null;
  private registeredUserPhone: string | null = null;
  private outboxQueue: Array<{ type: string; payload: any; targetUserId?: string }> = [];

  private getWsUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.port === '10000') {
        return window.location.origin;
      }
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
        return `${window.location.protocol}//${hostname}:10000`;
      }
      return window.location.origin;
    }
    return 'https://khusphus-epsm.onrender.com';
  }

  constructor() {
    this.connectWebSocket();
  }

  public async registerUser(userId: string, phone?: string) {
    this.registeredUserId = userId;
    if (phone) this.registeredUserPhone = phone;
    if (this.socket && this.isConnected && userId) {
      let fcmToken = null;
      try {
        fcmToken = await messaging().getToken();
      } catch (e) { /* FCM not available in web/dev */ }
      this.socket.emit('register', { userId, phone: phone || this.registeredUserPhone, fcmToken });
      console.log(`[REALTIME_BRIDGE] Registered user: ${userId}, phone: ${phone || this.registeredUserPhone}`);
    }
  }

  private connectWebSocket() {
    try {
      const url = this.getWsUrl();
      console.log(`[WS_CONNECTING] ${url}`);
      
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[WEBSOCKET_CONNECTED] Live Cloud Realtime Signaling Engine Active');
        
        if (this.registeredUserId || this.registeredUserPhone) {
          this.registerUser(this.registeredUserId || this.registeredUserPhone!, this.registeredUserPhone || undefined);
        }

        // Flush queued offline messages
        if (this.outboxQueue.length > 0) {
          console.log(`[REALTIME_BRIDGE] Flushing ${this.outboxQueue.length} queued messages from outbox`);
          const pending = [...this.outboxQueue];
          this.outboxQueue = [];
          pending.forEach((item) => {
            this.broadcast(item.type, item.payload, item.targetUserId);
          });
        }
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[WEBSOCKET_DISCONNECTED] Connection lost');
      });

      // Map incoming socket.io events to the existing bridge listeners
      this.socket.on('incoming-call', (payload) => {
        this.notify({ type: 'INCOMING_CALL', payload });
      });

      this.socket.on('call-answered', (payload) => {
        this.notify({ type: 'CALL_ANSWERED', payload });
      });

      this.socket.on('ice-candidate', (candidate) => {
        this.notify({ type: 'WEBRTC_ICE', payload: { candidate } });
      });

      this.socket.on('presence_update', (payload) => {
        this.notify({ type: 'PRESENCE_UPDATE', payload });
      });

      this.socket.on('online_users', (users) => {
        this.notify({ type: 'ONLINE_USERS', payload: { users } });
      });
      
      // Generic message handler if server uses broadcast
      this.socket.on('message', (event) => {
        // Skip duplicate INCOMING_CALL as it is handled cleanly via incoming-call event
        if (event && event.type && event.type !== 'INCOMING_CALL') {
          this.notify(event);
        }
      });

    } catch (e) {
      console.error('Socket.io connection error', e);
    }
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: { type: string; payload: any; targetUserId?: string }) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {}
    });
  }

  public broadcast(type: string, payload: any, targetUserId?: string) {
    if (this.socket && this.isConnected) {
      // Deliver non-call signals via standard message
      if (type !== 'INCOMING_CALL') {
        this.socket.emit('message', { type, payload, targetUserId });
      }

      // Dedicated single-path signaling handlers
      if (type === 'INCOMING_CALL') {
        this.socket.emit('call-user', {
          to: targetUserId,
          from: this.registeredUserId || this.registeredUserPhone,
          offer: payload?.offer,
          isVideo: payload?.type === 'video' || payload?.callType === 'video',
          callId: payload?.callId,
          callerUser: payload?.callerUser
        });
      } else if (type === 'WEBRTC_ANSWER') {
        this.socket.emit('answer-call', { to: targetUserId, answer: payload?.answer });
      } else if (type === 'WEBRTC_ICE') {
        this.socket.emit('ice-candidate', { to: targetUserId, candidate: payload?.candidate });
      }
    } else {
      // Offline Outbox Queue: guarantee delivery of critical chat and receipt events
      if (['CHAT_MESSAGE', 'MESSAGE_DELIVERED', 'MESSAGE_READ', 'CHAT_READ_SYNC'].includes(type)) {
        console.log(`[REALTIME_BRIDGE] Socket offline/reconnecting, queued ${type} for ${targetUserId} in outbox`);
        this.outboxQueue.push({ type, payload, targetUserId });
      }
    }
  }

  public sendChatMessage(targetUserId: string, message: any) {
    this.broadcast('CHAT_MESSAGE', message, targetUserId);
  }

  public sendDeliveredReceipt(targetUserId: string, messageId?: string) {
    const sender = this.registeredUserPhone || this.registeredUserId;
    this.broadcast(
      'MESSAGE_DELIVERED',
      {
        senderId: sender,
        senderPhone: this.registeredUserPhone,
        senderUserId: this.registeredUserId,
        messageId,
        timestamp: Date.now(),
      },
      targetUserId
    );
  }

  public sendReadReceipt(targetUserId: string, messageId?: string) {
    const sender = this.registeredUserPhone || this.registeredUserId;
    this.broadcast(
      'MESSAGE_READ',
      {
        senderId: sender,
        senderPhone: this.registeredUserPhone,
        senderUserId: this.registeredUserId,
        messageId,
        timestamp: Date.now(),
      },
      targetUserId
    );
  }

  public sendTyping(targetUserId: string, isTyping: boolean) {
    const sender = this.registeredUserPhone || this.registeredUserId;
    this.broadcast(
      'USER_TYPING',
      {
        senderId: sender,
        senderPhone: this.registeredUserPhone,
        senderUserId: this.registeredUserId,
        isTyping,
      },
      targetUserId
    );
  }

  public get myUserId(): string | null {
    return this.registeredUserId;
  }

  public getUserId(): string | null {
    return this.registeredUserId;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const RealtimeBridge = new RealtimeBridgeManager();
