package com.khusphus.apk

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class CallActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        val callId = intent.getStringExtra("callId") ?: ""
        val callerId = intent.getStringExtra("callerId") ?: ""
        if (action == "ACTION_DECLINE_CALL" || action == "ACTION_END_CALL") {
            Log.d("SYNKING_CALL", "Decline/End button tapped from notification: action=$action")
            IncomingCallActivity.stopRingtoneGlobally()
            AudioRouteModule.stopAllRingtones()
            AudioRouteModule.stopGlobalVibration(context)
            if (callId.isNotEmpty() && callerId.isNotEmpty()) {
                NativeCallSignaling.sendDeclineNatively(callId, callerId)
            }
            CallConnectionManager.rejectCall()
            TelecomModule.emitEndCallEvent()
            SynkingConnectionService.stopCallForeground()
            CallActivity.currentCallActivity?.let { activity ->
                activity.runOnUiThread {
                    try {
                        activity.finishAndRemoveTask()
                    } catch (e: Exception) {
                        activity.finish()
                    }
                }
            }
            TelecomModule.incomingActivityInstance?.let { activity ->
                activity.runOnUiThread {
                    try {
                        activity.finishAndRemoveTask()
                    } catch (e: Exception) {}
                    activity.finish()
                }
            }
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(MyFirebaseMessagingService.NOTIFICATION_ID)
        }
    }
}

