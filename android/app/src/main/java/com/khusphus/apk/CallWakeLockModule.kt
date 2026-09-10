package com.khusphus.apk

import android.content.Context
import android.os.PowerManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class CallWakeLockModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CallWakeLockModule"

    companion object {
        private var screenWakeLock: PowerManager.WakeLock? = null
    }

    @ReactMethod
    fun acquireScreenWakeLock(promise: Promise) {
        reactContext.runOnUiQueueThread {
            try {
                val pm = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                if (pm == null) {
                    promise.reject("PM_NULL", "PowerManager not available")
                    return@runOnUiQueueThread
                }
                if (screenWakeLock == null) {
                    @Suppress("DEPRECATION")
                    screenWakeLock = pm.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                        "sunao:active_video_call_screen_awake"
                    )
                    screenWakeLock?.setReferenceCounted(false)
                }
                if (screenWakeLock?.isHeld == false) {
                    screenWakeLock?.acquire(2 * 60 * 60 * 1000L) // Safe 2-hour maximum ceiling
                    android.util.Log.d("SUNAO_WAKELOCK", "✅ Acquired SCREEN_BRIGHT_WAKE_LOCK: Display stays awake in background!")
                }
                reactContext.currentActivity?.let { act ->
                    act.window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    act.window.decorView.keepScreenOn = true
                }
                promise.resolve(true)
            } catch (e: Exception) {
                android.util.Log.e("SUNAO_WAKELOCK", "❌ Error acquiring wake lock: ${e.message}")
                promise.reject("WAKELOCK_ERR", e.message)
            }
        }
    }

    @ReactMethod
    fun releaseScreenWakeLock(promise: Promise) {
        reactContext.runOnUiQueueThread {
            try {
                if (screenWakeLock?.isHeld == true) {
                    screenWakeLock?.release()
                    android.util.Log.d("SUNAO_WAKELOCK", "🛑 Released SCREEN_BRIGHT_WAKE_LOCK.")
                }
                reactContext.currentActivity?.let { act ->
                    act.window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    act.window.decorView.keepScreenOn = false
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("WAKELOCK_ERR", e.message)
            }
        }
    }
}
