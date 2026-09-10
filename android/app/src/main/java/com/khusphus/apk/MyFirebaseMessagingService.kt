package com.khusphus.apk

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import android.util.Log
import android.app.KeyguardManager
import android.graphics.BitmapFactory
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import java.net.URL
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import android.telecom.TelecomManager
import android.telecom.PhoneAccountHandle
import android.content.ComponentName
import android.os.Bundle

class MyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "SYNKING_FCM"
        private const val CHANNEL_ID = "incoming_calls"
        const val NOTIFICATION_ID = 9001
    }

    private fun debug(stage: String, status: String, details: String = "") {
        Log.d(
            TAG,
            "[SYNKING_CALL_DEBUG] [$status] $stage $details"
        )
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        debug("FCM_TOKEN_REFRESHED", "OK", "token=${token.take(16)}...")

        // Auto-save native FCM token to server so dead-state wakeup works!
        val prefs = getSharedPreferences("synking_call_state", MODE_PRIVATE)
        val userId = prefs.getString("current_user_id", null)
        if (userId != null) {
            saveFcmTokenToServer(userId, token)
        }
        // Always store token locally so MainActivity can save it after login
        prefs.edit().putString("pending_fcm_token", token).apply()
    }

    private fun saveFcmTokenToServer(userId: String, fcmToken: String) {
        Thread {
            try {
                val url = java.net.URL("https://p01--sunao-server--njm6yd7449gk.code.run/api/profiles/push-token")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 10000

                val body = """{"userId":"$userId","fcmPushToken":"$fcmToken"}"""
                conn.outputStream.write(body.toByteArray())

                val code = conn.responseCode
                debug("FCM_TOKEN_SAVED_TO_SERVER", if (code == 200) "OK" else "FAIL", "userId=$userId code=$code")
                conn.disconnect()
            } catch (e: Exception) {
                debug("FCM_TOKEN_SAVE_ERROR", "FAIL", e.message ?: "")
            }
        }.start()
    }


    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        Log.d("SYNKING_FCM", "FCM_RECEIVED: data=${message.data}")

        debug(
            "FCM_RECEIVED",
            "OK",
            "from=${message.from}"
        )

        val data = message.data

        debug(
            "FCM_DATA",
            "OK",
            "type=${data["type"]} callId=${data["callId"]}"
        )

        if (data["type"] == "CALL_ENDED") {
            debug("FCM_CALL_ENDED", "OK", "Processing call termination")
            
            // ðŸ›‘ FIRST & UNCONDITIONAL: Kill any playing ringtone, vibration, and audio IMMEDIATELY!
            IncomingCallActivity.stopRingtoneGlobally()
            AudioRouteModule.stopAllRingtones()
            CallConnectionManager.endCall()
            sendBroadcast(Intent("com.synking.CLOSE_CALL_SCREEN"))
            sendBroadcast(Intent("com.synking.CALL_ENDED_FROM_JS"))

            val callId = data["callId"] ?: ""
            val wasAnswered = CallState.wasCallAnswered(this, callId)
            val savedPending = PendingCallStore.get(this)

            // 1. IF THIS DEVICE WAS NOT RINGING AS RECEIVER (savedPending is null or callId mismatch),
            // this is an outgoing caller device or unrelated event.
            // DO NOT kill the caller's call screen (handled gracefully by WebRTC in JS) and DO NOT post Missed Call!
            if (savedPending == null || savedPending.callId != callId) {
                CallState.clear(this@MyFirebaseMessagingService, callId)
                PendingCallStore.clear(this@MyFirebaseMessagingService)
                CallIntentModule.clear()
                debug("FCM_CALL_ENDED", "OK", "No pending incoming ringing call for callId=$callId on this device. Suppressing FCM termination and Missed Call notification.")
                return
            }

            // 3. Directly dismiss open incoming call activity with zero latency
            TelecomModule.incomingActivityInstance?.let { activity ->
                activity.runOnUiThread {
                    try {
                        activity.finishAndRemoveTask()
                    } catch (e: Exception) {}
                    activity.finish()
                }
            }

            // 4. Cancel the ringing incoming call notification
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(NOTIFICATION_ID)
            notificationManager.cancelAll()
            
            // 5. Broadcast to close ringing incoming call screen
            sendBroadcast(Intent("com.synking.CLOSE_CALL_SCREEN"))
            sendBroadcast(Intent("com.synking.CALL_ENDED_FROM_JS"))

            // 6. If call was already answered and connected, DO NOT post Missed Call notification!
            if (wasAnswered) {
                CallState.clear(this@MyFirebaseMessagingService, callId)
                PendingCallStore.clear(this@MyFirebaseMessagingService)
                CallIntentModule.clear()
                debug("FCM_CALL_ENDED", "OK", "Call was previously answered and connected. Missed call notification suppressed.")
                return
            }

            // 7. Resolve Real Caller Name from PendingCallStore if missing or 'Someone'
            val rawName = data["callerName"] ?: ""
            val resolvedCallerName = if (rawName.isNotEmpty() && rawName != "Someone") {
                rawName
            } else if (!savedPending.callerName.isNullOrEmpty() && savedPending.callerName != "Someone") {
                savedPending.callerName
            } else {
                "Someone"
            }
            val resolvedCallerId = if (!data["callerId"].isNullOrEmpty()) data["callerId"]!! else savedPending.callerId

            // 8. NEVER post Missed Call from YOURSELF (if caller ID/name matches current logged in user)
            val prefs = getSharedPreferences("synking_call_state", Context.MODE_PRIVATE)
            val currentUserId = prefs.getString("current_user_id", null)
            val currentUserName = prefs.getString("current_user_name", null)
            if (!currentUserId.isNullOrEmpty() && (currentUserId == resolvedCallerId || currentUserId == data["callerId"])) {
                CallState.clear(this@MyFirebaseMessagingService, callId)
                PendingCallStore.clear(this@MyFirebaseMessagingService)
                CallIntentModule.clear()
                debug("FCM_CALL_ENDED", "OK", "Caller ID matches current user ($currentUserId). Self missed call suppressed.")
                return
            }
            if (!currentUserName.isNullOrEmpty() && currentUserName.equals(resolvedCallerName, ignoreCase = true)) {
                CallState.clear(this@MyFirebaseMessagingService, callId)
                PendingCallStore.clear(this@MyFirebaseMessagingService)
                CallIntentModule.clear()
                debug("FCM_CALL_ENDED", "OK", "Caller name matches current user name ($currentUserName). Self missed call suppressed.")
                return
            }

            CallState.clear(this@MyFirebaseMessagingService, callId)
            PendingCallStore.clear(this@MyFirebaseMessagingService)
            CallIntentModule.clear()

            // 7. Create dedicated Missed Call Notification Channel (standard notification sound, no looping ringtone)
            val missedChannelId = "synking_missed_calls_channel"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    missedChannelId,
                    "SYNKING Missed Calls",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Notifications for missed voice and video calls"
                    enableLights(true)
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 250, 250)
                }
                notificationManager.createNotificationChannel(channel)
            }

            // 8. Tapping Missed Call opens MainActivity directly to chat
            val tapIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("OPEN_CHAT_USER_ID", resolvedCallerId)
            }
            val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val tapPendingIntent = PendingIntent.getActivity(this, callId.hashCode() + 2, tapIntent, piFlags)

            val missedCallNotification = NotificationCompat.Builder(this, missedChannelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("ðŸ“ž Missed Call")
                .setContentText("You missed a call from $resolvedCallerName")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setContentIntent(tapPendingIntent)
                .build()

            notificationManager.notify(callId.hashCode() + 100, missedCallNotification)
            return
        }

        // Handle chat message notifications
        if (data["type"] == "message" || data["type"] == "chat" || data["type"] == "NEW_MESSAGE") {
            // 1. Suppress if app is in foreground (InAppNotificationBanner handles it inside the app)
            if (MainActivity.isAppInForeground) {
                debug("FCM_MESSAGE_FOREGROUND", "INFO", "App is in foreground. Suppressing system notification to prevent duplicate banners.")
                return
            }

            val senderId = data["senderId"] ?: data["fromUserId"] ?: ""

            // 2. Suppress if chat with this user is currently open
            val prefs = getSharedPreferences("synking_call_state", Context.MODE_PRIVATE)
            val activeChatUserId = prefs.getString("active_chat_user_id", null)
            if (!activeChatUserId.isNullOrEmpty() && senderId.isNotEmpty()) {
                val cleanActive = activeChatUserId.replace(Regex("\\D"), "").takeLast(10)
                val cleanSender = senderId.replace(Regex("\\D"), "").takeLast(10)
                if (activeChatUserId.equals(senderId, ignoreCase = true) ||
                    (cleanActive.isNotEmpty() && cleanActive == cleanSender)) {
                    debug("FCM_MESSAGE_ACTIVE_CHAT", "INFO", "Chat with $senderId is active. Suppressing notification.")
                    return
                }
            }

            val title = data["title"] ?: data["senderName"] ?: "New Message"
            val body = data["body"] ?: data["text"] ?: "You received a message"
            val msgChannelId = "synking_messages"

            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val channel = NotificationChannel(msgChannelId, "SYNKING Messages", NotificationManager.IMPORTANCE_HIGH).apply {
                    description = "Chat message notifications"
                    enableVibration(true)
                    enableLights(true)
                    lightColor = 0xFFFD3A73.toInt()
                    setSound(soundUri, AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                        .build())
                }
                nm.createNotificationChannel(channel)
            }

            val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setClass(this@MyFirebaseMessagingService, MainActivity::class.java)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                if (senderId.isNotEmpty()) {
                    setData(android.net.Uri.parse("synking://chat/$senderId"))
                    putExtra("route", "/chat/$senderId")
                    putExtra("senderId", senderId)
                    putExtra("chatPartnerId", senderId)
                }
            }
            val notifId = if (senderId.isNotEmpty()) senderId.hashCode() else System.currentTimeMillis().toInt()
            val pendingIntent = PendingIntent.getActivity(this, notifId, intent, piFlags)

            val notification = NotificationCompat.Builder(this, msgChannelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            nm.notify(notifId, notification)
            return
        }

        if (data["type"] != "INCOMING_CALL") {
            debug(
                "FCM_IGNORED",
                "INFO",
                "type=${data["type"]}"
            )
            return
        }

        val callId = data["callId"] ?: ""
        val callerName = data["callerName"] ?: "Someone"
        val callType = data["callType"] ?: data["call_type"] ?: data["type"] ?: "audio"
        val callerId = data["callerId"] ?: ""
        val callerPhoto = data["callerPhoto"] ?: ""

        debug(
            "INCOMING_CALL_DATA",
            "OK",
            "callId=$callId caller=$callerName type=$callType"
        )

        // Duplicate & busy protection
        if (CallState.isDuplicate(callId)) {
            debug("CALL_DUPLICATE_IGNORED", "OK", "Silently ignoring duplicate push for callId=$callId")
            return
        }
        if (!CallState.start(applicationContext, callId)) {
            debug("CALL_BUSY_IGNORED", "OK", "Another call is currently active")
            return
        }

        // 0. Save PendingCall to store immediately so callerName is available even if unaccepted
        val pending = PendingCall(callId, callerId, callerName, callerPhoto, callType)
        PendingCallStore.save(this, pending)

        // 1. Wake screen instantly with PowerManager WakeLock + CPU PARTIAL_WAKE_LOCK
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            val wl = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "synking:fcm_call_cpu_wakeup"
            )
            wl.acquire(50_000L)
            debug("WAKELOCK_ACQUIRED", "OK", "50s CPU and screen wake active")
        } catch (e: Exception) {
            debug("WAKELOCK_ACQUIRED", "FAIL", e.message ?: "")
        }

        // 2. Persist the call state
        val prefs = getSharedPreferences(
            "synking_call_state",
            MODE_PRIVATE
        )

        prefs.edit()
            .putBoolean("has_pending_call", true)
            .putString("call_id", callId)
            .putString("caller_id", callerId)
            .putString("caller_name", callerName)
            .putString("caller_photo", callerPhoto)
            .putString("call_type", callType)
            .putString("callType", callType)
            .apply()

        debug(
            "CALL_STATE_PERSISTED",
            "OK",
            "callId=$callId"
        )

        // 3. TRY TELECOM MANAGER FIRST
        var telecomSuccess = false
        try {
            Log.d("SYNKING_TELECOM", "[FCM] CALL_DATA_PARSED: Attempting TelecomManager...")
            val telecomManager = getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            val componentName = ComponentName(this, SynkingConnectionService::class.java)
            val phoneAccountHandle = PhoneAccountHandle(componentName, "SynkingPhoneAccount")

            // Ensure registered in dead state
            val phoneAccount = android.telecom.PhoneAccount.builder(phoneAccountHandle, "SYNKING Direct")
                .setCapabilities(android.telecom.PhoneAccount.CAPABILITY_SELF_MANAGED)
                .build()
            telecomManager.registerPhoneAccount(phoneAccount)

            val extrasBundle = Bundle().apply {
                putString("callId", callId)
                putString("callerId", callerId)
                putString("callerName", callerName)
                putString("callerPhoto", callerPhoto)
                putString("callType", callType)
                putString("call_type", callType)
            }
            val telecomExtras = Bundle().apply {
                putParcelable(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, extrasBundle)
            }
            
            Log.d("SYNKING_TELECOM", "[TELECOM] ADD_NEW_INCOMING_CALL: Triggering...")
            telecomManager.addNewIncomingCall(phoneAccountHandle, telecomExtras)
            debug("TELECOM_LAUNCH", "OK", "callId=$callId")
            telecomSuccess = true
        } catch (e: Exception) {
            Log.e("SYNKING_TELECOM", "[TELECOM] ERROR: ${e.message}", e)
            debug("TELECOM_LAUNCH", "FAIL", e.message ?: "")
        }

        // --- FALLBACK: ONLY post manual notification if TelecomManager failed! ---
        if (!telecomSuccess) {

        val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val fullScreenIntent = Intent(this, CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("SYNKING_INCOMING_CALL", true)
            putExtra("callId", callId)
            putExtra("callerId", callerId)
            putExtra("callerName", callerName)
            putExtra("callerPhoto", callerPhoto)
            putExtra("callType", callType)
            putExtra("call_type", callType)
            putExtra("autoAccept", false)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(this, callId.hashCode(), fullScreenIntent, piFlags)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "synking_incoming_calls_v4"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "SYNKING Calls (Silent Banner)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Full screen incoming calls without duplicate banner sound"
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 1000, 1000, 1000)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                setBypassDnd(true)
                setSound(null, null)
            }
            notificationManager.createNotificationChannel(channel)
        }



            
            // DECLINE ACTION
            val declineIntent = Intent(this, CallActionReceiver::class.java).apply {
                action = "ACTION_DECLINE_CALL"
                putExtra("callId", callId)
                putExtra("callerId", callerId)
            }
            val declinePendingIntent = PendingIntent.getBroadcast(this, callId.hashCode() + 1, declineIntent, piFlags)
            
            // ACCEPT ACTION
            val acceptIntent = Intent(this, CallActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("SYNKING_INCOMING_CALL", true)
                putExtra("callId", callId)
                putExtra("callerName", callerName)
                putExtra("callerPhoto", callerPhoto)
                putExtra("callType", callType)
                putExtra("autoAccept", true)
            }
            val acceptPendingIntent = PendingIntent.getActivity(this, callId.hashCode() + 2, acceptIntent, piFlags)

        // â”€â”€ Person & CallStyle Setup (Renders WhatsApp-style colorful pills) â”€â”€
        val isVideo = callType == "video"
        val personBuilder = Person.Builder()
            .setName(callerName)
            .setImportant(true)

        val callStyle = NotificationCompat.CallStyle.forIncomingCall(
            personBuilder.build(),
            declinePendingIntent,
            acceptPendingIntent
        ).setIsVideo(isVideo)
         .setAnswerButtonColorHint(android.graphics.Color.parseColor("#16A34A")) // ðŸŸ¢ Vibrant Green Answer Button
         .setDeclineButtonColorHint(android.graphics.Color.parseColor("#DC2626")) // ðŸ”´ Vibrant Red Decline Button

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setStyle(callStyle)
            .setContentTitle("Incoming ${if (isVideo) "video" else "voice"} call")
            .setContentText(callerName)
            .setSubText("SYNKING")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(false)
            .setOngoing(true) // ðŸ”’ Locked: Cannot be swiped away/cleaned while ringing!
            .setFullScreenIntent(fullScreenPendingIntent, true) // âœ… LOCK SCREEN FULL-SCREEN UI
            .setContentIntent(fullScreenPendingIntent) // Tap banner to open UI
            .setColor(android.graphics.Color.parseColor("#FD3A73"))
            .setColorized(true)

        Log.d(
            "SYNKING_FCM",
            "POST_CALL_NOTIFICATION: callId=$callId, caller=$callerName, channel=$channelId (CallStyle locked ongoing)"
        )
        notificationManager.notify(NOTIFICATION_ID, notificationBuilder.build())
        debug("NOTIFICATION_POSTED", "OK", "callId=$callId")

        // â”€â”€ Asynchronous Caller Avatar Loading â”€â”€
        if (callerPhoto.isNotEmpty() && (callerPhoto.startsWith("http://") || callerPhoto.startsWith("https://"))) {
            Thread {
                try {
                    val url = URL(callerPhoto)
                    val stream = url.openStream()
                    val bmp = BitmapFactory.decodeStream(stream)
                    if (bmp != null) {
                        val updatedPerson = personBuilder.setIcon(IconCompat.createWithBitmap(bmp)).build()
                        val updatedCallStyle = NotificationCompat.CallStyle.forIncomingCall(
                            updatedPerson,
                            declinePendingIntent,
                            acceptPendingIntent
                        ).setIsVideo(isVideo)
                         .setAnswerButtonColorHint(android.graphics.Color.parseColor("#16A34A"))
                         .setDeclineButtonColorHint(android.graphics.Color.parseColor("#DC2626"))
                        notificationBuilder.setStyle(updatedCallStyle)
                        notificationManager.notify(NOTIFICATION_ID, notificationBuilder.build())
                    }
                } catch (e: Exception) {
                    Log.d("SYNKING_FCM", "Caller photo load error: ${e.message}")
                }
            }.start()
        }

        // â”€â”€ Smart Lockscreen Routing â”€â”€
        val km = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        if (km.isKeyguardLocked) {
            try {
                Log.d(
                    "SYNKING_FCM",
                    "DIRECT_START_ACTIVITY: Phone is locked, launching CallActivity over lockscreen"
                )
                startActivity(fullScreenIntent)
                debug("DIRECT_ACTIVITY_LAUNCH", "OK", "Forced CallActivity to front over lockscreen.")
            } catch (e: Exception) {
                Log.e(
                    "SYNKING_FCM",
                    "DIRECT_START_ACTIVITY: BLOCKED/FAILED: ${e.javaClass.simpleName}: ${e.message}",
                    e
                )
                debug("DIRECT_ACTIVITY_LAUNCH", "FAIL", e.message ?: "")
            }
        } else {
            Log.d(
                "SYNKING_FCM",
                "DIRECT_START_ACTIVITY: Phone is open/unlocked; showing locked Heads-Up notification banner with colourful pills"
            )
        }
        }
    }
}

