import { io, Socket } from 'socket.io-client';
// @ts-ignore
import messaging from '@react-native-firebase/messaging';

type RealtimeListener = (event: { type: string; payload: any; targetUserId?: string }) => void;

class RealtimeBridgeManager {
  private socket: Socket | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private isConnected = false;
  private registeredUserId: string | null = null;

  private getWsUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:10000';
      }
    }
    return 'https://khusphus-epsm.onrender.com';
  }

  constructor() {
    this.connectWebSocket();
  }

  public async registerUser(userId: string) {
    this.registeredUserId = userId;
    if (this.socket && this.isConnected && userId) {
      let fcmToken = null;
      try {
        fcmToken = await messaging().getToken();
      } catch (e) { /* FCM not available in web/dev */ }
      this.socket.emit('register', { userId, fcmToken });
      console.log(`[REALTIME_BRIDGE] Registered user: ${userId}`);
    }
  }

  private connectWebSocket() {
    try {
      const url = this.getWsUrl();
      console.log(`[WS_CONNECTING] ${url}`);
      
      this.socket = io(url, {
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[WEBSOCKET_CONNECTED] Live Cloud Realtime Signaling Engine Active');
        
        if (this.registeredUserId) {
          this.registerUser(this.registeredUserId);
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
      
      // Generic message handler if server uses broadcast
      this.socket.on('message', (event) => {
        if (event && event.type) {
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
      // Map outgoing bridge broadcast types to socket.io events based on our realtime-server.js
      if (type === 'WEBRTC_OFFER') {
        this.socket.emit('call-user', { to: targetUserId, from: this.registeredUserId, offer: payload.offer, isVideo: payload.isVideo });
      } else if (type === 'WEBRTC_ANSWER') {
        this.socket.emit('answer-call', { to: targetUserId, answer: payload.answer });
      } else if (type === 'WEBRTC_ICE') {
        this.socket.emit('ice-candidate', { to: targetUserId, candidate: payload.candidate });
      } else {
        // Fallback for generic messages like CALL_ENDED
        this.socket.emit('message', { type, payload, targetUserId });
      }
    }
  }

  public sendChatMessage(targetUserId: string, message: any) {
    this.broadcast('CHAT_MESSAGE', message, targetUserId);
  }

  public sendTyping(targetUserId: string, isTyping: boolean) {
    this.broadcast('USER_TYPING', { senderId: this.registeredUserId, isTyping }, targetUserId);
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
