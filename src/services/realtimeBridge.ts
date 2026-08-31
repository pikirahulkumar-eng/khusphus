import { io, Socket } from 'socket.io-client';

type RealtimeListener = (event: { type: string; payload: any; targetUserId?: string }) => void;

class RealtimeBridgeManager {
  private socket: Socket | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private isConnected = false;
  private registeredUserId: string | null = null;

  constructor() {
    this.connectWebSocket();
  }

  public registerUser(userId: string) {
    this.registeredUserId = userId;
    if (this.socket && this.isConnected && userId) {
      this.socket.emit('register', userId);
      console.log(`[REALTIME_BRIDGE] Registered user: ${userId}`);
    }
  }

  private connectWebSocket() {
    try {
      // Connect to local Node server for testing
      const wsUrl = 'http://localhost:10000';
      console.log(`[WS_CONNECTING] ${wsUrl}`);
      
      this.socket = io(wsUrl, {
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

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const RealtimeBridge = new RealtimeBridgeManager();
