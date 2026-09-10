package com.khusphus.apk

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Build
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.PhoneAccountHandle
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import java.net.URL

class SynkingConnectionService : ConnectionService() {

    companion object {
        var instance: SynkingConnectionService? = null

        fun startCallForeground(notification: Notification) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
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

        fun updateOngoingCallForeground(callerName: String, callerPhoto: String = "", isVideo: Boolean = false) {
            val context: Context = instance 
                ?: TelecomModule.reactContextInstance 
                ?: TelecomModule.globalReactContext 
                ?: return

            try {
                if (callStartTime == 0L) {
                    callStartTime = System.currentTimeMillis()
                }
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                val channelId = "synking_ongoing_calls_v3"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val channel = NotificationChannel(
                        channelId,
                        "Active Call",
                        NotificationManager.IMPORTANCE_DEFAULT
                    ).apply {
                        setSound(null, null)
                        enableVibration(false)
                        lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                    }
                    nm?.createNotificationChannel(channel)
                }

                val targetClass = if (CallActivity.currentCallActivity != null) CallActivity::class.java else MainActivity::class.java
                val tapIntent = Intent(context, targetClass).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
                val piFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
                val tapPendingIntent = PendingIntent.getActivity(context, 1122, tapIntent, piFlags)

                val endCallIntent = Intent(context, CallActionReceiver::class.java).apply {
                    action = "ACTION_END_CALL"
                }
                val endCallPendingIntent = PendingIntent.getBroadcast(context, 1123, endCallIntent, piFlags)

                val displayName = if (callerName.isNotBlank()) callerName else "SYNKING Call"
                val personBuilder = Person.Builder()
                    .setName(displayName)
                    .setImportant(true)

                val callStyle = NotificationCompat.CallStyle.forOngoingCall(
                    personBuilder.build(),
                    endCallPendingIntent
                ).setIsVideo(isVideo)
                 .setDeclineButtonColorHint(Color.parseColor("#DC2626"))

                val builder = NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setStyle(callStyle)
                    .setContentTitle(displayName)
                    .setContentText(if (isVideo) "Active video call" else "Active voice call")
                    .setSubText("SYNKING")
                    .setCategory(NotificationCompat.CATEGORY_CALL)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .setOngoing(true) // ðŸ”’ Locked: Cannot be swiped away while call is ongoing!
                    .setAutoCancel(false)
                    .setWhen(callStartTime)
                    .setShowWhen(true)
                    .setUsesChronometer(true) // â±ï¸ Live chronometer timer on notification panel
                    .setContentIntent(tapPendingIntent)

                val notification = builder.build()
                notification.flags = notification.flags or
                    Notification.FLAG_ONGOING_EVENT or
                    Notification.FLAG_NO_CLEAR

                if (instance != null) {
                    startCallForeground(notification)
                }
                nm?.notify(MyFirebaseMessagingService.NOTIFICATION_ID, notification)
                Log.d("SYNKING_TELECOM", "[FGS] Ongoing call notification locked with live chronometer at $callStartTime for $displayName")

                if (callerPhoto.isNotBlank() && (callerPhoto.startsWith("http://") || callerPhoto.startsWith("https://"))) {
                    Thread {
                        try {
                            val url = URL(callerPhoto)
                            val stream = url.openStream()
                            val bmp = BitmapFactory.decodeStream(stream)
                            if (bmp != null) {
                                val updatedPerson = personBuilder.setIcon(IconCompat.createWithBitmap(bmp)).build()
                                val updatedCallStyle = NotificationCompat.CallStyle.forOngoingCall(
                                    updatedPerson,
                                    endCallPendingIntent
                                ).setIsVideo(isVideo)
                                 .setDeclineButtonColorHint(Color.parseColor("#DC2626"))
                                builder.setStyle(updatedCallStyle)
                                val updatedNotif = builder.build()
                                updatedNotif.flags = updatedNotif.flags or
                                    Notification.FLAG_ONGOING_EVENT or
                                    Notification.FLAG_NO_CLEAR
                                nm?.notify(MyFirebaseMessagingService.NOTIFICATION_ID, updatedNotif)
                            }
                        } catch (e: Exception) {}
                    }.start()
                }
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
                val context = instance
                    ?: TelecomModule.reactContextInstance
                    ?: TelecomModule.globalReactContext
                val nm = context?.getSystemService(android.content.Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
                nm?.cancel(MyFirebaseMessagingService.NOTIFICATION_ID)
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

        val callerPhoto = incomingExtras?.getString("callerPhoto") 
            ?: incomingExtras?.getString("photo") 
            ?: rawExtras?.getString("callerPhoto") 
            ?: rawExtras?.getString("photo") 
            ?: ""

        Log.d("SYNKING_TELECOM", "[TELECOM] CONNECTION_CREATED: Handling incoming for $callerName ($callId) from $callerId")

        val connection = SynkingConnection(applicationContext, callId, callerId, callerName, callType, callerPhoto)
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

