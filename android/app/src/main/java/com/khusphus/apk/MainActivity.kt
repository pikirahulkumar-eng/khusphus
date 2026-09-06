package com.khusphus.apk

import android.os.Build
import android.os.Bundle
import android.content.Intent

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

  private var pendingIncomingCallIntent: Intent? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
    handleIncomingCallIntent(intent)

    // 1. Native High-Priority Incoming Calls Notification Channel for Lock Screen & AOD Wakeup
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channelId = "incoming_calls"
        val channelName = "SYNKING Incoming Calls"
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

    // 2. Lock Screen & Turn Screen On Flags
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        val keyguardManager = getSystemService(android.content.Context.KEYGUARD_SERVICE) as? android.app.KeyguardManager
        keyguardManager?.requestDismissKeyguard(this, null)
      } else {
        window.addFlags(
          android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
          android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
      }
    } catch (e: Exception) {
      android.util.Log.w("SYNKING_NATIVE", "Lockscreen flag warning: ${e.message}")
    }
    android.util.Log.d("SYNKING_NATIVE", "MainActivity: Lockscreen & TurnScreenOn flags applied.")
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
        handleIncomingCallIntent(intent)
    }
  }

  private fun handleIncomingCallIntent(intent: Intent?) {
    if (intent?.getBooleanExtra("SYNKING_INCOMING_CALL", false) != true) {
        return
    }

    val callId = intent.getStringExtra("callId") ?: ""
    val callerId = intent.getStringExtra("callerId") ?: ""
    val callerName = intent.getStringExtra("callerName") ?: "Someone"
    val callType = intent.getStringExtra("callType") ?: "audio"
    val callerPhoto = intent.getStringExtra("callerPhoto")

    CallIntentModule.pendingCallId = callId
    CallIntentModule.pendingCallerId = callerId
    CallIntentModule.pendingCallerName = callerName
    CallIntentModule.pendingCallType = callType
    CallIntentModule.pendingCallerPhoto = callerPhoto

    android.util.Log.d(
        "SYNKING_FCM",
        "[SYNKING_CALL_DEBUG] [OK] MAIN_ACTIVITY_HANDOFF " +
        "callId=$callId caller=$callerName type=$callType"
    )
  }
}

