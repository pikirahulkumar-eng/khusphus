import { NativeModules } from 'react-native';

const { CallIntentModule } = NativeModules;

export interface PendingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callType: string;
  callerPhoto?: string;
}

export const getPendingCall = async (): Promise<PendingCall | null> => {
  if (!CallIntentModule) return null;
  try {
    return await CallIntentModule.getPendingCall();
  } catch (error) {
    console.error('Error fetching pending call from Native Module:', error);
    return null;
  }
};

export const clearPendingCall = () => {
  if (CallIntentModule) {
    CallIntentModule.clearPendingCall();
  }
};
