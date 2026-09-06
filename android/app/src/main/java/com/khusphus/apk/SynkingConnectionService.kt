package com.khusphus.apk

import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.PhoneAccountHandle
import android.util.Log

class SynkingConnectionService : ConnectionService() {

    companion object {
        var instance: SynkingConnectionService? = null

        fun startCallForeground(notification: android.app.Notification) {
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    instance?.startForeground(
                        MyFirebaseMessagingService.NOTIFICATION_ID,
                        notification,
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE or
                        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA
                    )
                } else {
                    instance?.startForeground(MyFirebaseMessagingService.NOTIFICATION_ID, notification)
                }
                Log.d("SYNKING_TELECOM", "[FGS] startForeground ACTIVE: Process shielded from OEM Freezer")
            } catch (e: Exception) {
                Log.w("SYNKING_TELECOM", "[FGS] startForeground notice: ${e.message}")
            }
        }

        private var callStartTime: Long = 0L

        fun updateOngoingCallForeground(callerName: String) {
            val service = instance ?: return
            try {
                if (callStartTime == 0L) {
                    callStartTime = System.currentTimeMillis()
                }
                val nm = service.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
                val channelId = "synking_ongoing_call"
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    val channel = android.app.NotificationChannel(
                        channelId,
                        "Active Call",
                        android.app.NotificationManager.IMPORTANCE_LOW
                    ).apply {
                        setSound(null, null)
                        enableVibration(false)
                    }
                    nm?.createNotificationChannel(channel)
                }

                val targetClass = if (CallActivity.currentCallActivity != null) CallActivity::class.java else MainActivity::class.java
                val tapIntent = android.content.Intent(service, targetClass).apply {
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
                val piFlags = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                } else {
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT
                }
                val tapPendingIntent = android.app.PendingIntent.getActivity(service, 1122, tapIntent, piFlags)

                val endCallIntent = android.content.Intent(service, CallActionReceiver::class.java).apply {
                    action = "ACTION_END_CALL"
                }
                val endCallPendingIntent = android.app.PendingIntent.getBroadcast(service, 1123, endCallIntent, piFlags)

                val displayName = if (callerName.isNotBlank()) callerName else "SYNKING Call"
                val notification = androidx.core.app.NotificationCompat.Builder(service, channelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(displayName)
                    .setContentText("Call in progress • Tap to return")
                    .setCategory(androidx.core.app.NotificationCompat.CATEGORY_CALL)
                    .setOngoing(true)
                    .setWhen(callStartTime)
                    .setShowWhen(true)
                    .setUsesChronometer(true)
                    .setContentIntent(tapPendingIntent)
                    .addAction(android.R.drawable.ic_menu_close_clear_cancel, "End Call", endCallPendingIntent)
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_LOW)
                    .build()

                startCallForeground(notification)
                Log.d("SYNKING_TELECOM", "[FGS] Ongoing call foreground updated: $displayName with chronometer at $callStartTime")
            } catch (e: Exception) {
                Log.e("SYNKING_TELECOM", "[FGS] updateOngoingCallForeground error: ${e.message}")
            }
        }

        fun stopCallForeground() {
            callStartTime = 0L
            try {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                    instance?.stopForeground(STOP_FOREGROUND_REMOVE)
                } else {
                    @Suppress("DEPRECATION")
                    instance?.stopForeground(true)
                }
                instance?.let { s ->
                    val nm = s.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
                    nm?.cancel(MyFirebaseMessagingService.NOTIFICATION_ID)
                }
                Log.d("SYNKING_TELECOM", "[FGS] stopCallForeground: Notification completely removed")
            } catch (e: Exception) {
                Log.e("SYNKING_TELECOM", "[FGS] stopCallForeground error: ${e.message}")
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) instance = null
    }

    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ): Connection {
        val rawExtras = request?.extras
        val incomingExtras = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            rawExtras?.getParcelable(android.telecom.TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, android.os.Bundle::class.java) ?: rawExtras
        } else {
            @Suppress("DEPRECATION")
            rawExtras?.getParcelable(android.telecom.TelecomManager.EXTRA_INCOMING_CALL_EXTRAS) ?: rawExtras
        }
        val callId = incomingExtras?.getString("callId") ?: rawExtras?.getString("callId") ?: "unknown_call_id"
        val callerId = incomingExtras?.getString("callerId") ?: rawExtras?.getString("callerId") ?: ""
        val callerName = incomingExtras?.getString("callerName") ?: rawExtras?.getString("callerName") ?: "Unknown"
        val callType = incomingExtras?.getString("callType") 
            ?: incomingExtras?.getString("call_type") 
            ?: incomingExtras?.getString("type") 
            ?: rawExtras?.getString("callType") 
            ?: rawExtras?.getString("call_type") 
            ?: rawExtras?.getString("type") 
            ?: "audio"

        Log.d("SYNKING_TELECOM", "[TELECOM] CONNECTION_CREATED: Handling incoming for $callerName ($callId) from $callerId")

        val connection = SynkingConnection(applicationContext, callId, callerId, callerName, callType)
        connection.setInitializing()
        connection.setRinging()
        
        Log.d("SYNKING_TELECOM", "[TELECOM] STATE_RINGING: Set connection state to ringing")
        
        CallConnectionManager.currentConnection = connection
        
        return connection
    }

    override fun onCreateIncomingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?
    ) {
        super.onCreateIncomingConnectionFailed(connectionManagerPhoneAccount, request)
        Log.e("SYNKING_TELECOM", "[TELECOM] ERROR: onCreateIncomingConnectionFailed")
    }
}
