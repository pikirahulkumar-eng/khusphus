import { Platform } from 'react-native';
import { CallDebugger } from './callDebugger';

// Safe dynamic require for expo-notifications
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.warn('[NOTIF_MODULE_WARN]', e);
  }
}

class NotificationServiceClass {
  private isInitialized = false;

  public async initialize() {
    if (this.isInitialized || Platform.OS === 'web' || !Notifications) return;

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          priority: Notifications.AndroidNotificationPriority.MAX,
        }),
      });

      let finalStatus = 'undetermined';
      try {
        const perm = await Notifications.getPermissionsAsync().catch(() => null);
        finalStatus = perm?.status || 'undetermined';
        if (finalStatus !== 'granted') {
          const req = await Notifications.requestPermissionsAsync().catch(() => null);
          finalStatus = req?.status || finalStatus;
        }
      } catch (e) {}

      CallDebugger.logStage('NOTIFICATION PERMISSION', finalStatus === 'granted' ? 'OK' : 'INFO', { status: finalStatus });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('incoming_calls', {
          name: 'SYNKING Incoming Calls',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 800, 1000],
          lightColor: '#FD3A73',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('synking_messages', {
          name: 'SYNKING Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FD3A73',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: 'default',
        });
      }

      // 4. Interactive Call Actions: Answer (Pick) & Decline (Disconnect) Buttons
      await Notifications.setNotificationCategoryAsync('CALL', [
        {
          identifier: 'ACCEPT_CALL',
          buttonTitle: '🟢 Answer',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'DECLINE_CALL',
          buttonTitle: '🔴 Decline',
          options: {
            opensAppToForeground: false,
            isDestructive: true,
          },
        },
      ]);

      // 5. Handle user tapping Answer / Decline directly on notification banner
      Notifications.addNotificationResponseReceivedListener((response: any) => {
        const actionId = response.actionIdentifier;
        const callData = response.notification?.request?.content?.data;
        CallDebugger.logStage('NOTIFICATION ACTION', 'OK', { actionId, callId: callData?.callId });

        // Direct tap on Chat Notification opens that specific chat
        if (callData?.type === 'NEW_MESSAGE' && callData?.senderId) {
          try {
            const { router } = require('expo-router');
            router.push(`/chat/${callData.senderId}`);
          } catch (e) {}
          return;
        }

        if (actionId === 'ACCEPT_CALL' || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          this.dismissCallNotification(callData?.callId);
          try {
            const { WebRTCService } = require('./webrtcService');
            WebRTCService.acceptCall().catch(() => {});
          } catch (e) {}
        } else if (actionId === 'DECLINE_CALL') {
          this.dismissCallNotification(callData?.callId);
          try {
            const { WebRTCService } = require('./webrtcService');
            const { RingtoneService } = require('./ringtoneService');
            RingtoneService.stop();
            WebRTCService.rejectCall();
          } catch (e) {}
        }
      });

      // 6. Handle background / locked FCM push incoming call wakeup
      Notifications.addNotificationReceivedListener((notification: any) => {
        const data = notification.request?.content?.data;
        CallDebugger.logStage('FCM MESSAGE RECEIVED', 'OK', { 
          callId: data?.callId, 
          caller: data?.callerUser?.name,
          type: data?.type || data?.callType 
        });

        if (data && (data.type === 'INCOMING_CALL' || data.callId) && data.callerUser) {
          try {
            CallDebugger.logStage('MESSAGE HANDLER', 'OK', { launchingCall: true });
            const { WebRTCService } = require('./webrtcService');
            WebRTCService.receiveIncomingCall(data.callerUser, data.callType || data.type || 'audio', data.callId);
          } catch (e: any) {
            CallDebugger.logStage('MESSAGE HANDLER', 'FAIL', { error: e?.message });
          }
        }
      });

      this.isInitialized = true;
    } catch (e: any) {
      CallDebugger.logStage('NOTIFICATION INIT', 'FAIL', { error: e?.message });
    }
  }

  public async showIncomingCallNotification(callerName: string, callType: 'audio' | 'video', callId: string) {
    // On Android, Native TelecomManager & MyFirebaseMessagingService handle the incoming call banner 100% natively.
    // Scheduling an Expo notification here creates a duplicate second banner on Android!
    if (Platform.OS === 'web' || Platform.OS === 'android' || !Notifications) return;

    try {
      await this.initialize();
      await Notifications.scheduleNotificationAsync({
        identifier: `call_${callId}`,
        content: {
          title: `📞 Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`,
          body: `${callerName} is calling you on SYNKING`,
          data: { callId, callerName, callType },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'CALL',
          channelId: 'incoming_calls',
        },
        trigger: null,
      });
      CallDebugger.logStage('FULL SCREEN INTENT', 'OK', { callerName, callType, callId });
    } catch (e: any) {
      CallDebugger.logStage('FULL SCREEN INTENT', 'FAIL', { error: e?.message });
    }
  }

  public async showMessageNotification(senderName: string, messageText: string, senderId: string) {
    if (Platform.OS === 'web' || !Notifications) return;
    try {
      await this.initialize();
      await Notifications.scheduleNotificationAsync({
        identifier: `msg_${Date.now()}`,
        content: {
          title: senderName,
          body: messageText,
          data: { senderId, type: 'NEW_MESSAGE' },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId: 'synking_messages',
        },
        trigger: null,
      });
    } catch (e) {}
  }

  public async dismissCallNotification(callId?: string) {
    if (Platform.OS === 'web' || !Notifications) return;

    try {
      if (callId) {
        await Notifications.dismissNotificationAsync(`call_${callId}`);
      } else {
        await Notifications.dismissAllNotificationsAsync();
      }
    } catch (e) {}
  }

  // Register device push token to backend for background / closed app call wakeups
  public async registerForPushNotificationsAsync(userId: string, phoneNumber?: string) {
    if (Platform.OS === 'web' || !Notifications || !userId) return;

  try {
    await this.initialize();

    let expoPushToken: string | null = null;
    let fcmPushToken: string | null = null;

    // 1. Get native Android FCM token FIRST (most reliable for dead-state wakeup)
    if (Platform.OS === 'android') {
      try {
        // Try firebase/messaging first (most reliable native FCM token)
        let fbMessaging: any = null;
        try {
          fbMessaging = require('@react-native-firebase/messaging');
        } catch (e) {}
        if (fbMessaging && fbMessaging.default) {
          const nativeToken = await fbMessaging.default().getToken().catch(() => null);
          if (nativeToken) {
            fcmPushToken = nativeToken;
            CallDebugger.logStage('FCM TOKEN (native)', 'OK', { token: nativeToken.substring(0, 20) + '...' });
          }
        }
      } catch (e) {}

      // Fallback: expo-notifications getDevicePushTokenAsync
      if (!fcmPushToken) {
        try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync().catch(() => null);
          fcmPushToken = deviceTokenData?.data || null;
          if (fcmPushToken) {
            CallDebugger.logStage('FCM TOKEN (expo-device)', 'OK', { token: fcmPushToken.substring(0, 20) + '...' });
          }
        } catch (e) {
          CallDebugger.logStage('FCM TOKEN', 'FAIL', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    // 2. Expo Push Token (optional fallback)
    try {
      const expoTokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
      expoPushToken = expoTokenData?.data || null;
    } catch (e) {}

    CallDebugger.logStage(
      'PUSH TOKENS',
      expoPushToken || fcmPushToken ? 'OK' : 'FAIL',
      {
        userId,
        expo: expoPushToken ? expoPushToken.substring(0, 20) + '...' : null,
        fcm: fcmPushToken ? fcmPushToken.substring(0, 20) + '...' : null,
      }
    );

    if (!expoPushToken && !fcmPushToken) {
      return;
    }

    const { getLocalBackendUrl } = require('./firebase');
    const backendUrl = getLocalBackendUrl();

    const cleanPhone = (phoneNumber || '').replace(/\D/g, '').slice(-10);
    const userPhoneKey = cleanPhone ? `user_${cleanPhone}` : null;

    await fetch(`${backendUrl}/api/profiles/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        pushToken: expoPushToken || fcmPushToken,
        expoPushToken,
        fcmPushToken,
      }),
    });

    if (userPhoneKey && userPhoneKey !== userId) {
      await fetch(`${backendUrl}/api/profiles/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userPhoneKey,
          pushToken: expoPushToken || fcmPushToken,
          expoPushToken,
          fcmPushToken,
        }),
      }).catch(() => {});
    }

    CallDebugger.logStage('PUSH TOKEN REGISTERED', 'OK', {
      userId,
      userPhoneKey,
      expo: !!expoPushToken,
      fcm: !!fcmPushToken,
    });

  } catch (e: any) {
    CallDebugger.logStage('PUSH TOKEN REGISTER', 'FAIL', {
      error: e?.message || String(e),
    });
  }
}
}

export const NotificationService = new NotificationServiceClass();

