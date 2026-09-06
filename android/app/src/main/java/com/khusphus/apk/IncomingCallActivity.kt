package com.khusphus.apk

import android.app.Activity
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.graphics.Color
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class IncomingCallActivity : Activity() {

    private var wakeLock: PowerManager.WakeLock? = null
    
    private val closeReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.khusphus.apk.CLOSE_CALL_SCREEN") {
                debug("CALL_SCREEN_CLOSED_EXTERNALLY", "OK", "Received close broadcast")
                finish()
            }
        }
    }

    private fun debug(stage: String, status: String, details: String = "") {
        android.util.Log.d(
            "SYNKING_FCM",
            "[SYNKING_CALL_DEBUG] [$status] $stage $details"
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Register receiver to close this screen if caller hangs up
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(closeReceiver, IntentFilter("com.khusphus.apk.CLOSE_CALL_SCREEN"), Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(closeReceiver, IntentFilter("com.khusphus.apk.CLOSE_CALL_SCREEN"))
        }

        applyLockscreenFlags()
        acquireWakeLock()

        val callId = intent.getStringExtra("callId") ?: ""
        val callerId = intent.getStringExtra("callerId") ?: ""
        val callerName = intent.getStringExtra("callerName") ?: "Someone"
        val callType = intent.getStringExtra("callType") ?: "audio"

        debug("CALL_ACTIVITY_CREATED", "OK", "callId=$callId caller=$callerName type=$callType")

        showCallDebugger(callerName, callType, callId, callerId)
    }

    private fun applyLockscreenFlags() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)

                val keyguard =
                    getSystemService(
                        Context.KEYGUARD_SERVICE
                    ) as KeyguardManager

                keyguard.requestDismissKeyguard(
                    this,
                    null
                )
            } else {
                window.addFlags(
                    android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                )
            }

            debug(
                "SCREEN_WAKE_REQUEST",
                "OK"
            )

        } catch (e: Exception) {
            debug(
                "SCREEN_WAKE_REQUEST",
                "FAIL",
                e.message ?: "unknown"
            )
        }
    }

    private fun acquireWakeLock() {
        try {
            val pm =
                getSystemService(
                    Context.POWER_SERVICE
                ) as PowerManager

            wakeLock =
                pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "synking:incoming_call"
                )

            wakeLock?.acquire(10_000L)

            debug(
                "WAKELOCK",
                "OK",
                "10 seconds"
            )

        } catch (e: Exception) {
            debug(
                "WAKELOCK",
                "FAIL",
                e.message ?: "unknown"
            )
        }
    }

    private fun showCallDebugger(
        callerName: String,
        callType: String,
        callId: String,
        callerId: String
    ) {
        val root =
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER
                setPadding(48, 80, 48, 80)
                setBackgroundColor(Color.parseColor("#05060A"))
            }

        val logoImage =
            android.widget.ImageView(this).apply {
                setImageResource(R.mipmap.ic_launcher_round)
                layoutParams = LinearLayout.LayoutParams(
                    (80 * resources.displayMetrics.density).toInt(),
                    (80 * resources.displayMetrics.density).toInt()
                ).apply {
                    setMargins(0, 0, 0, (30 * resources.displayMetrics.density).toInt())
                    gravity = Gravity.CENTER
                }
                scaleType = android.widget.ImageView.ScaleType.FIT_CENTER
            }

        val callerTitle =
            TextView(this).apply {
                text = callerName
                textSize = 28f
                setTextColor(Color.WHITE)
                gravity = Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
            }

        val callSubtitle =
            TextView(this).apply {
                text = "Incoming ${if (callType == "video") "Video" else "Voice"} Call..."
                textSize = 15f
                setTextColor(Color.parseColor("#94A3B8"))
                gravity = Gravity.CENTER
                setPadding(0, 8, 0, 80)
            }

        val btnRow =
            LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                setPadding(0, 40, 0, 0)
            }

        val decline =
            Button(this).apply {
                text = "✕ Decline"
                setBackgroundColor(Color.parseColor("#EF4444"))
                setTextColor(Color.WHITE)
                textSize = 15f
                setPadding(40, 24, 40, 24)
                setOnClickListener {
                    debug("DECLINE_PRESSED", "OK", "callId=$callId")
                    
                    // Tell server we declined the call natively
                    thread {
                        try {
                            val url = URL("https://synking-9my2.onrender.com/api/calls/decline")
                            val conn = url.openConnection() as HttpURLConnection
                            conn.requestMethod = "POST"
                            conn.setRequestProperty("Content-Type", "application/json")
                            conn.doOutput = true
                            val body = """{"callId":"$callId","callerId":"$callerId"}"""
                            conn.outputStream.write(body.toByteArray())
                            val code = conn.responseCode
                            debug("DECLINE_HTTP_SENT", if (code == 200) "OK" else "FAIL", "code=$code")
                            conn.disconnect()
                        } catch (e: Exception) {
                            debug("DECLINE_HTTP_ERROR", "FAIL", e.message ?: "")
                        }
                    }

                    clearPendingCall()
                    finish()
                }
            }

        val spacer =
            TextView(this).apply {
                text = "    "
            }

        val answer =
            Button(this).apply {
                text = "✓ Accept"
                setBackgroundColor(Color.parseColor("#22C55E"))
                setTextColor(Color.WHITE)
                textSize = 15f
                setPadding(40, 24, 40, 24)
                setOnClickListener {
                    debug(
                        "ANSWER_PRESSED",
                        "OK",
                        "callId=$callId"
                    )

                    handoffToReactNative(
                        callId,
                        callerName,
                        callType
                    )
                }
            }

        btnRow.addView(decline)
        btnRow.addView(spacer)
        btnRow.addView(answer)

        root.addView(logoImage)
        root.addView(callerTitle)
        root.addView(callSubtitle)
        root.addView(btnRow)

        setContentView(root)
    }

    private fun handoffToReactNative(
        callId: String,
        callerName: String,
        callType: String
    ) {
        clearPendingCall()

        val intent =
            Intent(this, MainActivity::class.java).apply {
                flags =
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP

                putExtra(
                    "SYNKING_INCOMING_CALL",
                    true
                )

                putExtra(
                    "callId",
                    callId
                )

                putExtra(
                    "callerName",
                    callerName
                )

                putExtra(
                    "callType",
                    callType
                )
            }

        startActivity(intent)

        debug(
            "REACT_NATIVE_HANDOFF",
            "OK",
            "callId=$callId"
        )

        finish()
    }

    private fun clearPendingCall() {
        getSharedPreferences(
            "synking_call_state",
            MODE_PRIVATE
        )
            .edit()
            .clear()
            .apply()
    }

    override fun onDestroy() {
        super.onDestroy()

        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                }
            }
        } catch (_: Exception) {
        }

        debug(
            "CALL_ACTIVITY_DESTROYED",
            "INFO"
        )
    }
}
