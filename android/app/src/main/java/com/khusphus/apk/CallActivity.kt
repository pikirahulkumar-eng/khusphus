package com.khusphus.apk

import android.app.NotificationManager
import android.app.PictureInPictureParams
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.util.Rational
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

/**
 * Dedicated CallActivity: Activates strictly for incoming/active calls on Lock Screen.
 * Contains ZERO dating profiles, matches, or feeds.
 * Renders the standalone "CallApp" component (CallModal) in a single fluid screen.
 * On call end, executes finishAndRemoveTask() for an immediate 0ms return to Lock Screen.
 */
class CallActivity : ReactActivity() {

    companion object {
        var currentCallActivity: CallActivity? = null
    }

    private val callEndedReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d("SYNKING_DEBUG", "CallActivity: CALL_ENDED received — dismissing CallActivity immediately")
            CallIntentModule.clear()
            context?.let { PendingCallStore.clear(it) }
            runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                        setShowWhenLocked(false)
                    }
                    finishAndRemoveTask()
                } catch (e: Exception) {
                    finish()
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        super.onCreate(null)
        currentCallActivity = this

        // Temporarily disabled for screenshots during development/testing:
        // window.setFlags(
        //     WindowManager.LayoutParams.FLAG_SECURE,
        //     WindowManager.LayoutParams.FLAG_SECURE
        // )

        // 🔒 Lock orientation strictly to Portrait (no rotation during calls)
        try {
            requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } catch (e: Exception) {}

        // 💡 Keep screen and CPU awake during call to prevent OEM battery freezing
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        volumeControlStream = android.media.AudioManager.STREAM_VOICE_CALL
        handleIncomingCallIntent(intent)

        try {
            val filter = IntentFilter("com.khusphus.apk.CALL_ENDED_FROM_JS")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(callEndedReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(callEndedReceiver, filter)
            }
        } catch (e: Exception) {}
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingCallIntent(intent)
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        enterPipModeIfActive()
    }

    fun enterPipModeIfActive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val conn = CallConnectionManager.currentConnection
                val isCallActive = TelecomModule.isCallActive || (conn != null && conn.state == android.telecom.Connection.STATE_ACTIVE)
                if (isCallActive) {
                    val aspectRatio = Rational(9, 16)
                    val builder = PictureInPictureParams.Builder()
                        .setAspectRatio(aspectRatio)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        builder.setAutoEnterEnabled(true)
                    }
                    enterPictureInPictureMode(builder.build())
                }
            } catch (e: Exception) {
                Log.e("SYNKING_DEBUG", "CallActivity enterPictureInPictureMode error: ${e.message}")
            }
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        Log.d("SYNKING_DEBUG", "CallActivity onPictureInPictureModeChanged: isInPictureInPictureMode=$isInPictureInPictureMode")
        TelecomModule.emitPipModeChanged(isInPictureInPictureMode)
    }

    private fun handleIncomingCallIntent(intent: Intent?) {
        if (intent == null) return
        val callId = intent.getStringExtra("callId") ?: ""
        val callerId = intent.getStringExtra("callerId") ?: ""
        val callerName = intent.getStringExtra("callerName") ?: "Someone"
        val callType = intent.getStringExtra("callType") 
            ?: intent.getStringExtra("call_type") 
            ?: intent.getStringExtra("type") 
            ?: "audio"
        val callerPhoto = intent.getStringExtra("callerPhoto")
        val autoAccept = intent.getBooleanExtra("autoAccept", false)

        CallIntentModule.pendingCallId = callId
        CallIntentModule.pendingCallerId = callerId
        CallIntentModule.pendingCallerName = callerName
        CallIntentModule.pendingCallType = callType
        CallIntentModule.pendingCallerPhoto = callerPhoto

        if (callId.isNotEmpty()) {
            val pending = PendingCall(callId, callerId, callerName, callerPhoto, callType, autoAccept)
            PendingCallStore.save(this, pending)
            if (autoAccept) {
                CallState.markAnswered(this)
                SynkingConnectionService.updateOngoingCallForeground(callerName)
                try {
                    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    nm.cancel(MyFirebaseMessagingService.NOTIFICATION_ID)
                } catch (e: Exception) {}
                TelecomModule.emitAcceptEvent(pending)
            } else {
                TelecomModule.emitIncomingCallEvent(pending)
            }
        }

        Log.d("SYNKING_DEBUG", "[CallActivity] INCOMING_CALL handled: callId=$callId caller=$callerName autoAccept=$autoAccept")
    }

    override fun onDestroy() {
        super.onDestroy()
        currentCallActivity = null
        try {
            CallIntentModule.clear()
            PendingCallStore.clear(this)
        } catch (e: Exception) {}
        try {
            unregisterReceiver(callEndedReceiver)
        } catch (e: Exception) {}
    }

    override fun getMainComponentName(): String = "CallApp"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ){}
        )
    }
}
