import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';
import { WebRTCService } from './webrtcService';

const { TelecomModule } = NativeModules;

let isReady = false;

export function ensureTelecomBridgeReady() {
  if (isReady || Platform.OS !== 'android') return;
  isReady = true;

  console.log('[TelecomBridge] Initializing Headless Module-Level Listeners...');

  // 1. Answer Event (Killed-State & In-App Guaranteed)
  DeviceEventEmitter.addListener('onTelecomCallAnswered', async (data?: any) => {
    try {
      const callId = data?.callId || '';
      console.log('[TelecomBridge] 📞 RECEIVED onTelecomCallAnswered for callId:', callId);

      // 🤝 1. ACK back to Kotlin immediately so it stops retry watchdog
      if (callId && TelecomModule?.acknowledgeEvent) {
        TelecomModule.acknowledgeEvent(callId, 'ANSWERED');
      }

      // 🔄 2. Auto-initialize session if not present in JS
      const cur = WebRTCService.getCurrentSession();
      if (data && callId && (!cur || cur.id !== callId)) {
        WebRTCService.receiveIncomingCall(
          {
            id: data.callerId || 'caller',
            name: data.callerName || 'Caller',
            age: 22,
            gender: 'other',
            occupation: '',
            location: '',
            distance: '',
            bio: '',
            photo: data.callerPhoto || '',
            photos: [],
            interests: [],
            compatibility: 100,
            isVerified: true,
            isVip: false,
          },
          (String(data.callType || data.type || 'audio').toLowerCase() === 'video' ? 'video' : 'audio'),
          callId,
          true
        );
      }

      // 🚀 3. Execute WebRTC accept & broadcast CALL_ACCEPTED
      await WebRTCService.acceptCall(callId);

      if (callId && TelecomModule?.notifyBridgedToJs) {
        TelecomModule.notifyBridgedToJs(callId).catch(() => {});
      }
    } catch (e) {
      console.error('[TelecomBridge] Error in onTelecomCallAnswered:', e);
    }
  });

  // 1b. Incoming Call Event (Ringing on Lockscreen)
  DeviceEventEmitter.addListener('onTelecomIncomingCall', (data?: any) => {
    try {
      const callId = data?.callId || '';
      console.log('[TelecomBridge] 📞 RECEIVED onTelecomIncomingCall for callId:', callId);

      const cur = WebRTCService.getCurrentSession();
      if (data && callId && (!cur || cur.id !== callId)) {
        WebRTCService.receiveIncomingCall(
          {
            id: data.callerId || 'caller',
            name: data.callerName || 'Caller',
            age: 22,
            gender: 'other',
            occupation: '',
            location: '',
            distance: '',
            bio: '',
            photo: data.callerPhoto || '',
            photos: [],
            interests: [],
            compatibility: 100,
            isVerified: true,
            isVip: false,
          },
          (String(data.callType || data.type || 'audio').toLowerCase() === 'video' ? 'video' : 'audio'),
          callId,
          false
        );
      }
    } catch (e) {
      console.error('[TelecomBridge] Error in onTelecomIncomingCall:', e);
    }
  });

  // 2. Decline Event
  DeviceEventEmitter.addListener('onTelecomCallDeclined', (data?: any) => {
    const callId = data?.callId || '';
    console.log('[TelecomBridge] 📞 RECEIVED onTelecomCallDeclined for callId:', callId);
    if (callId && TelecomModule?.acknowledgeEvent) {
      TelecomModule.acknowledgeEvent(callId, 'DECLINED');
    }
    WebRTCService.rejectCall();
  });

  // 3. Mute Toggle (Sync explicit state)
  DeviceEventEmitter.addListener('onTelecomMuteToggled', (isMuted?: boolean) => {
    if (typeof isMuted === 'boolean') {
      WebRTCService.setMute(isMuted);
    } else {
      WebRTCService.toggleMute();
    }
  });

  // 4. Speaker Toggle (Sync explicit state to prevent feedback loop)
  DeviceEventEmitter.addListener('onTelecomSpeakerToggled', (isSpeakerOn?: boolean) => {
    if (typeof isSpeakerOn === 'boolean') {
      WebRTCService.setSpeaker(isSpeakerOn);
    } else {
      WebRTCService.toggleSpeaker();
    }
  });

  // 4b. Video Camera Toggle
  DeviceEventEmitter.addListener('onTelecomVideoToggled', () => {
    WebRTCService.toggleVideo();
  });

  // 5. End Call Event
  DeviceEventEmitter.addListener('onTelecomEndCall', () => {
    WebRTCService.endCall();
  });

  // 🤝 6. Signal Kotlin: "JS Bridge is ALIVE, flush pending queue!"
  if (TelecomModule?.signalJSBridgeReady) {
    TelecomModule.signalJSBridgeReady();
    console.log('[TelecomBridge] ✅ JS_BRIDGE_READY signaled to Kotlin native module.');
  }
}

// Auto-initialize immediately on module import
ensureTelecomBridgeReady();
