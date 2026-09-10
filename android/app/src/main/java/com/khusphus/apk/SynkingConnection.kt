package com.khusphus.apk

import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.os.Build
import android.telecom.Connection
import android.telecom.DisconnectCause
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import java.net.URL

class SynkingConnection(
    private val context: Context,
    val callId: String,
    val callerId: String = "",
    val callerName: String,
    val callType: String,
    val callerPhoto: String = ""
) : Connection() {

    init {
        // Essential properties for VoIP call
        connectionProperties = PROPERTY_SELF_MANAGED
        audioModeIsVoip = true
        setRingbackRequested(false)
        if (callType == "video") {
            setAudioRoute(android.telecom.CallAudioState.ROUTE_SPEAKER)
            Log.d("SYNKING_TELECOM", "[INIT] Video call -> initial setAudioRoute ROUTE_SPEAKER")
        }
    }

    override fun onShowIncomingCallUi() {
        super.onShowIncomingCallUi()
        Log.d("SYNKING_TELECOM", "[UI] INCOMING_CALL_SHOWN: callId=$callId caller=$callerName type=$callType")

        // ðŸ“¢ 1. Force audio to bottom Loudspeaker immediately for incoming ringing!
        setAudioRoute(android.telecom.CallAudioState.ROUTE_SPEAKER)

        // ðŸŽµ 2. Start Native Ringtone on Loudspeaker & Continuous Vibration immediately (Works on both Unlocked & Locked!)
        AudioRouteModule.startGlobalIncomingRingtone(context)
        AudioRouteModule.startGlobalVibration(context)

        // ðŸ“¡ 3. Notify caller immediately that phone is RINGING (Updates Laptop/Caller to 'Ringing' during heads-up banner!)
        if (callerId.isNotEmpty()) {
            NativeCallSignaling.sendRingingNatively(callId, callerId, callType)
        }

        // ðŸŒ‰ 4. Emit to React Native bridge so WebRTC session is active in JS
        val pending = PendingCall(callId, callerId, callerName, callerPhoto, callType)
        TelecomModule.emitIncomingCallEvent(pending)

        val fullScreenIntent = Intent(context, CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("SYNKING_INCOMING_CALL", true)
            putExtra("callId", callId)
            putExtra("callerId", callerId)
            putExtra("callerName", callerName)
            putExtra("callerPhoto", callerPhoto)
            putExtra("callType", callType)
            putExtra("autoAccept", false)
        }

        val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context, callId.hashCode(), fullScreenIntent, piFlags
        )

        // â”€â”€ Notification Channel â”€â”€
        val channelId = "synking_telecom_calls"
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Synkin Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                setBypassDnd(true)
                setSound(null, null)
                enableVibration(false)
            }
            nm.createNotificationChannel(channel)
        }

        // â”€â”€ Decline Action â”€â”€
        val declineIntent = Intent(context, CallActionReceiver::class.java).apply {
            action = "ACTION_DECLINE_CALL"
            putExtra("callId", callId)
            putExtra("callerId", callerId)
        }
        val declinePendingIntent = PendingIntent.getBroadcast(
            context, callId.hashCode() + 1, declineIntent, piFlags
        )

        // â”€â”€ Accept Action â”€â”€
        val acceptIntent = Intent(context, CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("SYNKING_INCOMING_CALL", true)
            putExtra("callId", callId)
            putExtra("callerId", callerId)
            putExtra("callerName", callerName)
            putExtra("callerPhoto", callerPhoto)
            putExtra("callType", callType)
            putExtra("autoAccept", true)
        }
        val acceptPendingIntent = PendingIntent.getActivity(
            context, callId.hashCode() + 2, acceptIntent, piFlags
        )

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

        // â”€â”€ Build Notification: Locked against swiping (setOngoing=true) â”€â”€
        val notificationBuilder = NotificationCompat.Builder(context, channelId)
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
            .setFullScreenIntent(fullScreenPendingIntent, true) // For lockscreen presentation
            .setContentIntent(fullScreenPendingIntent) // Tap banner to expand to full screen
            .setColor(android.graphics.Color.parseColor("#FD3A73"))
            .setColorized(true)

        val notification = notificationBuilder.build()
        SynkingConnectionService.startCallForeground(notification)
        nm.notify(MyFirebaseMessagingService.NOTIFICATION_ID, notification)
        Log.d("SYNKING_TELECOM", "[UI] NOTIFICATION_POSTED: CallStyle notification active (locked ongoing)")

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
                        nm.notify(MyFirebaseMessagingService.NOTIFICATION_ID, notificationBuilder.build())
                        Log.d("SYNKING_TELECOM", "[UI] Caller avatar loaded and applied to CallStyle notification")
                    }
                } catch (e: Exception) {
                    Log.d("SYNKING_TELECOM", "Caller photo load error: ${e.message}")
                }
            }.start()
        }

        // â”€â”€ Smart Lockscreen Routing â”€â”€
        val km = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        if (km.isKeyguardLocked) {
            // Phone is locked: wake screen and launch full-screen CallActivity over lockscreen
            try {
                context.startActivity(fullScreenIntent)
                Log.d("SYNKING_TELECOM", "[UI] DIRECT_ACTIVITY_LAUNCH: Phone is locked, launched CallActivity over lockscreen")
            } catch (e: Exception) {
                Log.e("SYNKING_TELECOM", "[UI] DIRECT_ACTIVITY_LAUNCH failed: ${e.message}")
            }
        } else {
            // Screen is OPEN (unlocked): DO NOT hijack the screen with full-screen Activity!
            // Let Android OS show the locked Heads-Up Notification banner at the top of the screen.
            Log.d("SYNKING_TELECOM", "[UI] Screen is open/unlocked: Showing locked Heads-Up notification banner with colourful Decline & Answer pills")
        }
    }

    override fun onAnswer() {
        super.onAnswer()
        Log.d("SYNKING_TELECOM", "[UI] ANSWER: natively accepted")
        IncomingCallActivity.stopRingtoneGlobally()
        AudioRouteModule.stopAllRingtones()
        AudioRouteModule.stopGlobalVibration(context)
        CallState.markAnswered(context)
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(MyFirebaseMessagingService.NOTIFICATION_ID)
        } catch (e: Exception) {}
        setActive()
        SynkingConnectionService.updateOngoingCallForeground(callerName, callerPhoto, callType == "video")
        val supported = callAudioState?.supportedRouteMask ?: 0
        val hasBluetooth = (supported and android.telecom.CallAudioState.ROUTE_BLUETOOTH) != 0
        val hasHeadset = (supported and android.telecom.CallAudioState.ROUTE_WIRED_HEADSET) != 0

        if (hasBluetooth) {
            setAudioRoute(android.telecom.CallAudioState.ROUTE_BLUETOOTH)
            Log.d("SYNKING_TELECOM", "[UI] ANSWER: Bluetooth headset detected -> setAudioRoute ROUTE_BLUETOOTH")
        } else if (hasHeadset) {
            setAudioRoute(android.telecom.CallAudioState.ROUTE_WIRED_HEADSET)
            Log.d("SYNKING_TELECOM", "[UI] ANSWER: Wired headset detected -> setAudioRoute ROUTE_WIRED_HEADSET")
        } else if (callType == "video") {
            setAudioRoute(android.telecom.CallAudioState.ROUTE_SPEAKER)
            Log.d("SYNKING_TELECOM", "[UI] ANSWER: Video call -> auto setAudioRoute ROUTE_SPEAKER")
        } else {
            setAudioRoute(android.telecom.CallAudioState.ROUTE_EARPIECE)
            Log.d("SYNKING_TELECOM", "[UI] ANSWER: Audio call -> setAudioRoute ROUTE_EARPIECE")
        }
    }

    override fun onCallAudioStateChanged(state: android.telecom.CallAudioState?) {
        super.onCallAudioStateChanged(state)
        val route = state?.route ?: android.telecom.CallAudioState.ROUTE_EARPIECE
        val isSpeaker = route == android.telecom.CallAudioState.ROUTE_SPEAKER
        val isHeadset = route == android.telecom.CallAudioState.ROUTE_BLUETOOTH || 
                        route == android.telecom.CallAudioState.ROUTE_WIRED_HEADSET
        Log.d("SYNKING_TELECOM", "[UI] onCallAudioStateChanged: route=$route (isSpeaker=$isSpeaker, callType=$callType)")

        if (callType == "video" && !isSpeaker && !isHeadset) {
            Log.d("SYNKING_TELECOM", "[UI] onCallAudioStateChanged: Video call detected non-speaker route ($route). Re-forcing ROUTE_SPEAKER!")
            setAudioRoute(android.telecom.CallAudioState.ROUTE_SPEAKER)
            return
        }

        TelecomModule.emitSpeakerToggled(isSpeaker)
    }

    override fun onReject() {
        super.onReject()
        Log.d("SYNKING_TELECOM", "[UI] REJECT: natively rejected")
        IncomingCallActivity.stopRingtoneGlobally()
        AudioRouteModule.stopAllRingtones()
        AudioRouteModule.stopGlobalVibration(context)
        if (callerId.isNotEmpty()) {
            NativeCallSignaling.sendDeclineNatively(callId, callerId)
        }
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(MyFirebaseMessagingService.NOTIFICATION_ID)
        } catch (e: Exception) {}
        setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
        destroy()
    }

    override fun onDisconnect() {
        super.onDisconnect()
        Log.d("SYNKING_TELECOM", "[UI] DISCONNECT: natively disconnected")
        IncomingCallActivity.stopRingtoneGlobally()
        AudioRouteModule.stopAllRingtones()
        AudioRouteModule.stopGlobalVibration(context)
        if (callerId.isNotEmpty()) {
            NativeCallSignaling.sendEndCallNatively(callId, callerId)
        }
        try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(MyFirebaseMessagingService.NOTIFICATION_ID)
        } catch (e: Exception) {}
        setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
        destroy()
    }
}

