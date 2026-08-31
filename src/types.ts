export interface CallSession {
  id: string;
  from: string;
  to: string;
  status: 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected' | 'busy' | 'missed';
  isVideo: boolean;
  startTime?: Date;
  endTime?: Date;
}
