package com.khusphus.apk

import android.app.NotificationManager
import android.app.PictureInPictureParams
import android.util.Rational
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.util.Log
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

    private var nativeScreenWakeLock: PowerManager.WakeLock? = null

    private val callEndedReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d("SYNKING_DEBUG", "CallActivity: CALL_ENDED received â€” dismissing CallActivity immediately")
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

        // ðŸ”’ Privacy DRM: Block screenshots and recording during calls
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )

        // ðŸ”’ Lock orientation strictly to Portrait (no rotation during calls)
        try {
            requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } catch (e: Exception) {}

        // ðŸ’¡ Keep screen and CPU awake during call to prevent OEM battery freezing
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.keepScreenOn = true

        // ðŸ’¡ Hardware Screen WakeLock: Guarantee screen stays bright & awake throughout entire call
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
            @Suppress("DEPRECATION")
            nativeScreenWakeLock = pm?.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                "synking:call_activity_screen_awake"
            )
            nativeScreenWakeLock?.setReferenceCounted(false)
            nativeScreenWakeLock?.acquire(2 * 60 * 60 * 1000L)
            Log.d("SYNKING_WAKELOCK", "âœ… Acquired native SCREEN_BRIGHT_WAKE_LOCK in CallActivity")
        } catch (e: Exception) {
            Log.e("SYNKING_WAKELOCK", "Error acquiring wake lock: ${e.message}")
        }

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
            val filter = IntentFilter("com.synking.CALL_ENDED_FROM_JS")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(callEndedReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                registerReceiver(callEndedReceiver, filter)
            }
        } catch (e: Exception) {}
    }

    override fun onResume() {
        super.onResume()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.keepScreenOn = true
        if (nativeScreenWakeLock?.isHeld != true) {
            try {
                nativeScreenWakeLock?.acquire(2 * 60 * 60 * 1000L)
            } catch (e: Exception) {}
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (CallIntentModule.pendingCallType == "video" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                TelecomModule.emitPipChangeEvent(true)
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(9, 16))
                    .setActions(emptyList())
                    .build()
                enterPictureInPictureMode(params)
                Log.d("SYNKING_PIP", "âœ… CallActivity: Auto-entered native PiP on Home press during video call")
            } catch (e: Exception) {
                Log.e("SYNKING_PIP", "CallActivity Auto PiP failed: ${e.message}")
            }
        }
    }

    @Suppress("DEPRECATION")
    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        Log.d("SYNKING_PIP", "CallActivity PiP mode changed: isInPiP=$isInPictureInPictureMode")
        TelecomModule.emitPipChangeEvent(isInPictureInPictureMode)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingCallIntent(intent)
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
                SynkingConnectionService.updateOngoingCallForeground(callerName, callerPhoto ?: "", callType == "video")
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
            if (nativeScreenWakeLock?.isHeld == true) {
                nativeScreenWakeLock?.release()
                Log.d("SYNKING_WAKELOCK", "ðŸ›‘ Released native SCREEN_BRIGHT_WAKE_LOCK in CallActivity onDestroy")
            }
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

