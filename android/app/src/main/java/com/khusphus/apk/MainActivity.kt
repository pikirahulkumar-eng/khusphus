package com.khusphus.apk

import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.util.Rational
import android.os.Build
import android.os.Bundle
import android.content.Intent

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
class MainActivity : ReactActivity() {

  companion object {
    @Volatile var isLockscreenCall = false
  }

  private var pendingIncomingCallIntent: Intent? = null

  private val callEndedReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (isLockscreenCall) {
        android.util.Log.d("SYNKING_DEBUG", "MainActivity: CALL_ENDED received for lockscreen call — auto-dismissing to lockscreen")
        isLockscreenCall = false
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
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    // Temporarily disabled for screenshots during development/testing:
    // window.setFlags(
    //   android.view.WindowManager.LayoutParams.FLAG_SECURE,
    //   android.view.WindowManager.LayoutParams.FLAG_SECURE
    // )
    // 🔒 Lock orientation strictly to Portrait (no rotation)
    try {
      requestedOrientation = android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    } catch (e: Exception) {}
    val chatPartnerId = intent?.getStringExtra("chatPartnerId") ?: intent?.getStringExtra("senderId")
    if (!chatPartnerId.isNullOrEmpty()) {
        TelecomModule.emitOpenChatEvent(chatPartnerId)
    }
    handleIncomingCallIntent(intent)

    // 1. Native High-Priority Incoming Calls Notification Channel for Lock Screen & AOD Wakeup
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channelId = "incoming_calls"
        val channelName = "Synkin Incoming Calls"
        val importance = android.app.NotificationManager.IMPORTANCE_HIGH
        val channel = android.app.NotificationChannel(channelId, channelName, importance).apply {
          description = "Full screen and lock screen notifications for incoming calls"
          enableLights(true)
          lightColor = android.graphics.Color.parseColor("#FD3A73")
          enableVibration(true)
          vibrationPattern = longArrayOf(0, 800, 1000)
          lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
          setBypassDnd(true)
        }
        val notificationManager = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
        notificationManager?.createNotificationChannel(channel)
        android.util.Log.d("SYNKING_NATIVE", "MainActivity: Native NotificationChannel 'incoming_calls' created.")
      }
    } catch (e: Exception) {
      android.util.Log.w("SYNKING_NATIVE", "NotificationChannel warning: ${e.message}")
    }

    // 2. Register CALL_ENDED_FROM_JS receiver for 0ms lockscreen auto-dismiss
    try {
      val filter = IntentFilter("com.khusphus.apk.CALL_ENDED_FROM_JS")
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(callEndedReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
      } else {
        registerReceiver(callEndedReceiver, filter)
      }
    } catch (e: Exception) {}
  }

  override fun onResume() {
    super.onResume()
  }

  override fun onDestroy() {
    super.onDestroy()
    try {
      unregisterReceiver(callEndedReceiver)
    } catch (e: Exception) {}
    isLockscreenCall = false
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    if (intent != null) {
        setIntent(intent)
        val chatPartnerId = intent.getStringExtra("chatPartnerId") ?: intent.getStringExtra("senderId")
        if (!chatPartnerId.isNullOrEmpty()) {
            android.util.Log.d("SYNKING_DEBUG", "MainActivity: onNewIntent with chatPartnerId=$chatPartnerId")
            TelecomModule.emitOpenChatEvent(chatPartnerId)
        }
        handleIncomingCallIntent(intent)
    }
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
        android.util.Log.e("SYNKING_DEBUG", "MainActivity enterPictureInPictureMode error: ${e.message}")
      }
    }
  }

  override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    android.util.Log.d("SYNKING_DEBUG", "MainActivity onPictureInPictureModeChanged: isInPictureInPictureMode=$isInPictureInPictureMode")
    TelecomModule.emitPipModeChanged(isInPictureInPictureMode)
  }

  private fun handleIncomingCallIntent(intent: Intent?) {
    if (intent?.getBooleanExtra("SYNKING_INCOMING_CALL", false) != true) {
        return
    }

    isLockscreenCall = true

    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(true)
        setTurnScreenOn(true)
    } else {
        window.addFlags(
            android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )
    }

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
        TelecomModule.emitAcceptEvent(pending)
      }
    }

    android.util.Log.d(
        "SYNKING_FCM",
        "[SYNKING_CALL_DEBUG] [OK] MAIN_ACTIVITY_INCOMING_CALL " +
        "callId=$callId caller=$callerName type=$callType autoAccept=$autoAccept"
    )
  }
}

