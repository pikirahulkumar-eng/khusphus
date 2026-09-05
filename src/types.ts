export interface CallSession {
  id: string;
  from?: string;
  to?: string;
  callerId?: string;
  receiverId?: string;
  callerName?: string;
  callerPhoto?: string;
  status: 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'busy' | 'missed';
  type?: 'audio' | 'video' | 'incoming' | 'outgoing' | string;
  isVideo?: boolean;
  isVideoEnabled?: boolean;
  isMuted?: boolean;
  isSpeakerOn?: boolean;
  isFrontCamera?: boolean;
  durationSeconds?: number;
  startTime?: Date;
  endTime?: Date;
  [key: string]: any;
}

export interface UserProfile {
  uid?: string;
  id: string;
  name: string;
  phone?: string;
  avatarUri?: string;
  photo?: string;
  bio?: string;
  about?: string;
  age?: number;
  photos?: string[];
  [key: string]: any;
}

export interface SynkRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: string;
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text?: string;
  cipherText?: string;
  timestamp: string;
  isEncrypted?: boolean;
  type?: 'text' | 'date_invite' | 'voice' | 'call' | 'system';
  extraData?: any;
  [key: string]: any;
}
