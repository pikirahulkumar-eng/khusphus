package com.khusphus.apk

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.animation.Animation
import android.view.animation.ScaleAnimation
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

class IncomingCallActivity : Activity() {

    companion object {
        var activeRingtone: Ringtone? = null
        var activeVibrator: Vibrator? = null

        fun stopRingtoneGlobally(context: Context? = null) {
            try {
                activeRingtone?.stop()
                activeRingtone = null
            } catch (e: Exception) {}
            try {
                AudioRouteModule.stopAllRingtones()
            } catch (e: Exception) {}
            try {
                activeVibrator?.cancel()
                activeVibrator = null
            } catch (e: Exception) {}
            try {
                val ctx = context ?: TelecomModule.globalReactContext
                ctx?.let {
                    val v = it.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                    v?.cancel()
                }
            } catch (e: Exception) {}
        }
    }

    var callId: String = ""
    var callerId: String = ""
    var callerName: String = ""
    var callType: String = ""

    private var callWakeLock: android.os.PowerManager.WakeLock? = null
    private var hasHandedOff = false
    private var connectingTimeoutHandler: Handler? = null

    private val webrtcConnectedReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d("SYNKING_DEBUG", "[UI] WEBRTC_CONNECTED broadcast received — handing off to MainActivity")
            performHandoffToMainActivity()
        }
    }

    private val callEndedReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d("SYNKING_DEBUG", "[UI] CALL_ENDED_RECEIVER triggered by ${intent?.action}")
            stopRingtoneAndVibration()
            dismissNotificationBanner()
            runOnUiThread {
                try {
                    finishAndRemoveTask()
                } catch (e: Exception) {}
                finish()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        super.onCreate(savedInstanceState)

        TelecomModule.incomingActivityInstance = this

        // Hold CPU WakeLock so Android OS/Realme UI Freezer does NOT freeze the process
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
            callWakeLock = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "synking:active_call_cpu_wakelock")
            callWakeLock?.acquire(10 * 60 * 1000L)
            Log.d("SYNKING_DEBUG", "[WAKELOCK] Acquired active call WakeLock to prevent OS freeze")
        } catch (e: Exception) {
            Log.w("SYNKING_DEBUG", "[WAKELOCK] Warning: ${e.message}")
        }

        // Boot JS in background if not running
        try {
            val app = application as? MainApplication
            app?.reactHost?.start()
        } catch (e: Throwable) {
            Log.w("SYNKING_CALL", "Background ReactHost init note: ${e.message}")
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        val cancelFilter = IntentFilter().apply {
            addAction("com.khusphus.apk.CALL_ENDED_FROM_JS")
            addAction("com.khusphus.apk.CLOSE_CALL_SCREEN")
        }
        val connectedFilter = IntentFilter("com.synking.WEBRTC_CONNECTED")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(callEndedReceiver, cancelFilter, Context.RECEIVER_NOT_EXPORTED)
            registerReceiver(webrtcConnectedReceiver, connectedFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(callEndedReceiver, cancelFilter)
            registerReceiver(webrtcConnectedReceiver, connectedFilter)
        }

        callId = intent.getStringExtra("callId") ?: ""
        callerId = intent.getStringExtra("callerId") ?: ""
        callerName = intent.getStringExtra("callerName") ?: "Unknown"
        callType = intent.getStringExtra("callType") ?: "audio"

        playRingtoneAndVibrate()
        buildUI()

        // Auto-accept if launched from notification Accept button
        val autoAccept = intent.getBooleanExtra("autoAccept", false)
        if (autoAccept) {
            Handler(Looper.getMainLooper()).postDelayed({
                handleAccept()
            }, 300)
        }
    }

    private fun buildUI() {
        // Root container: Deep Midnight OLED Canvas
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dpToPx(24), dpToPx(64), dpToPx(24), dpToPx(56))
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.parseColor("#060813"), Color.parseColor("#0B1120"))
            )
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
        }

        // 1. 🔒 Frosted Glass Header Security Pill
        val brandHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dpToPx(20), dpToPx(8), dpToPx(20), dpToPx(8))
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#1F1E293B"))
                cornerRadius = dpToPx(30).toFloat()
                setStroke(dpToPx(1), Color.parseColor("#4D38BDF8"))
            }
        }
        val brandText = TextView(this).apply {
            text = "🔒 End-to-End Encrypted HD"
            textSize = 12f
            setTextColor(Color.parseColor("#E2E8F0"))
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            letterSpacing = 0.05f
        }
        brandHeader.addView(brandText)
        root.addView(brandHeader)

        root.addView(View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dpToPx(48)) })

        // 2. 🪞 Holographic Iridescent Avatar Container
        val avatarContainer = FrameLayout(this).apply {
            val size = dpToPx(150)
            layoutParams = LinearLayout.LayoutParams(size, size).apply { gravity = Gravity.CENTER_HORIZONTAL }
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.parseColor("#A855F7"), Color.parseColor("#38BDF8"))
            ).apply { shape = GradientDrawable.OVAL }
            setPadding(dpToPx(3), dpToPx(3), dpToPx(3), dpToPx(3))
        }

        val avatarInner = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.parseColor("#0F172A")) }
        }

        val avatarInitial = TextView(this).apply {
            text = if (callerName.isNotBlank()) callerName.take(1).uppercase() else "S"
            textSize = 58f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }

        val avatarImageView = ImageView(this).apply {
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            scaleType = ImageView.ScaleType.CENTER_CROP
            visibility = View.GONE
            clipToOutline = true
            outlineProvider = object : android.view.ViewOutlineProvider() {
                override fun getOutline(view: View, outline: android.graphics.Outline) {
                    outline.setOval(0, 0, view.width, view.height)
                }
            }
        }
        avatarInner.addView(avatarImageView)

        val photoUrl = intent.getStringExtra("callerPhoto")
        if (!photoUrl.isNullOrBlank()) {
            java.util.concurrent.Executors.newSingleThreadExecutor().execute {
                try {
                    val url = java.net.URL(photoUrl)
                    val bmp = android.graphics.BitmapFactory.decodeStream(url.openConnection().getInputStream())
                    runOnUiThread {
                        if (bmp != null) {
                            avatarImageView.setImageBitmap(bmp)
                            avatarImageView.visibility = View.VISIBLE
                            avatarInitial.visibility = View.GONE
                        }
                    }
                } catch (e: Exception) {
                    Log.w("SYNKING_DEBUG", "Photo load note: ${e.message}")
                }
            }
        }

        avatarInner.addView(avatarInitial)
        avatarContainer.addView(avatarInner)
        root.addView(avatarContainer)

        // 3. Caller Name & Subtitle
        val nameView = TextView(this).apply {
            text = callerName
            textSize = 30f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(0, dpToPx(24), 0, dpToPx(6))
        }
        root.addView(nameView)

        val subtitleView = TextView(this).apply {
            text = "Incoming Encrypted ${if (callType == "video") "HD Video Call" else "HD Voice Call"}"
            textSize = 15f
            setTextColor(Color.parseColor("#94A3B8"))
            gravity = Gravity.CENTER
        }
        root.addView(subtitleView)

        // Flexible spacer to push buttons to bottom
        root.addView(View(this).apply { layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f) })

        // 4. INCOMING ACTIONS ROW (Decline Pod & Accept Pod)
        val incomingActionsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        }

        // 🔴 Deep Crimson Frosted Glass Decline Pod
        val declineCol = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER }
        val declineBtn = FrameLayout(this).apply {
            val size = dpToPx(80)
            layoutParams = LinearLayout.LayoutParams(size, size)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#1F1315"))
                setStroke(dpToPx(2), Color.parseColor("#EF4444"))
            }
            setOnClickListener {
                dismissNotificationBanner()
                stopRingtoneAndVibration()
                CallConnectionManager.rejectCall()
                PendingCallStore.clear(this@IncomingCallActivity)
                CallState.clear(this@IncomingCallActivity, callId)

                val finalCallId = if (callId.isNotEmpty()) callId else (intent.getStringExtra("callId") ?: "")
                val finalCallerId = if (callerId.isNotEmpty()) callerId else (intent.getStringExtra("callerId") ?: "")

                // 🚀 Direct Native HTTP Signal to Server (Immediate 0ms Laptop Ring Cancel)
                NativeCallSignaling.sendDeclineNatively(finalCallId, finalCallerId)

                TelecomModule.emitDeclineEvent(finalCallId)

                try {
                    finishAndRemoveTask()
                } catch (e: Exception) {}
                finish()
            }
        }
        declineBtn.addView(TextView(this).apply { text = "✕"; textSize = 28f; setTextColor(Color.parseColor("#EF4444")); gravity = Gravity.CENTER })
        declineCol.addView(declineBtn)
        declineCol.addView(TextView(this).apply { text = "Decline"; textSize = 13f; setTextColor(Color.parseColor("#94A3B8")); setPadding(0, dpToPx(10), 0, 0) })

        // 🟢 Luxury Emerald Gradient Accept Pod
        val acceptCol = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER }
        val acceptBtn = FrameLayout(this).apply {
            val size = dpToPx(80)
            layoutParams = LinearLayout.LayoutParams(size, size)
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.parseColor("#10B981"), Color.parseColor("#059669"))
            ).apply { shape = GradientDrawable.OVAL }
            setOnClickListener {
                handleAccept()
            }
        }
        acceptBtn.addView(TextView(this).apply { text = "✔"; textSize = 28f; setTextColor(Color.WHITE); gravity = Gravity.CENTER })
        val acceptPulse = ScaleAnimation(1.0f, 1.10f, 1.0f, 1.10f, Animation.RELATIVE_TO_SELF, 0.5f, Animation.RELATIVE_TO_SELF, 0.5f).apply {
            duration = 600; repeatCount = Animation.INFINITE; repeatMode = Animation.REVERSE
        }
        acceptBtn.startAnimation(acceptPulse)
        acceptCol.addView(acceptBtn)
        acceptCol.addView(TextView(this).apply { text = "Accept"; textSize = 13f; setTextColor(Color.parseColor("#10B981")); typeface = android.graphics.Typeface.DEFAULT_BOLD; setPadding(0, dpToPx(10), 0, 0) })

        incomingActionsRow.addView(declineCol)
        incomingActionsRow.addView(View(this).apply { layoutParams = LinearLayout.LayoutParams(dpToPx(72), 1) })
        incomingActionsRow.addView(acceptCol)
        root.addView(incomingActionsRow)

        setContentView(root)
    }

    private fun handleAccept() {
        if (hasHandedOff) return // Prevent double-tap
        
        val finalCallId = if (callId.isNotEmpty()) callId else (intent.getStringExtra("callId") ?: "")
        val finalCallerId = if (callerId.isNotEmpty()) callerId else (intent.getStringExtra("callerId") ?: "")
        val finalCallerName = if (callerName.isNotEmpty()) callerName else (intent.getStringExtra("callerName") ?: "Unknown")
        val finalCallType = if (callType.isNotEmpty()) callType else (intent.getStringExtra("callType") ?: "audio")
        val finalCallerPhoto = intent.getStringExtra("callerPhoto")

        Log.d("SYNKING_DEBUG", "[UI] ACCEPT_BUTTON_TAPPED: callId=$finalCallId callerId=$finalCallerId callerName=$finalCallerName type=$finalCallType")
        dismissNotificationBanner()
        stopRingtoneAndVibration()
        CallConnectionManager.answerCall()

        // 🟡 Show "Connecting..." UI (same screen, no activity jump!)
        showConnectingUI()

        val call = PendingCall(
            callId = finalCallId,
            callerId = finalCallerId,
            callerName = finalCallerName,
            callerPhoto = finalCallerPhoto,
            callType = finalCallType
        )

        // 🚀 1. DIRECT NATIVE HTTP SIGNAL (Immediate 0ms Laptop Handshake!)
        NativeCallSignaling.sendAcceptNatively(finalCallId, finalCallerId, finalCallType)

        // 🚀 2. React Native Event Bridge
        TelecomModule.emitAcceptEvent(call)

        // 🚀 3. Save pending call for JS cold-boot recovery
        PendingCallStore.save(this, call)

        // 🚀 4. Launch MainActivity in BACKGROUND (don't finish yet!)
        try {
            val mainIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("SYNKING_INCOMING_CALL", true)
                putExtra("callId", finalCallId)
                putExtra("callerId", finalCallerId)
                putExtra("callerName", finalCallerName)
                putExtra("callType", finalCallType)
                putExtra("callerPhoto", finalCallerPhoto)
                putExtra("AUTO_ACCEPT", true)
            }
            startActivity(mainIntent)
        } catch (e: Exception) {
            Log.w("SYNKING_DEBUG", "MainActivity handoff note: ${e.message}")
        }

        // 🕐 5. Timeout fallback: if WebRTC doesn't connect in 15s, hand off anyway
        connectingTimeoutHandler = Handler(Looper.getMainLooper())
        connectingTimeoutHandler?.postDelayed({
            if (!hasHandedOff) {
                Log.w("SYNKING_DEBUG", "[UI] CONNECTING_TIMEOUT: 15s elapsed, forcing handoff to MainActivity")
                performHandoffToMainActivity()
            }
        }, 15000)
    }

    private fun showConnectingUI() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dpToPx(24), dpToPx(64), dpToPx(24), dpToPx(56))
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.parseColor("#060813"), Color.parseColor("#0B1120"))
            )
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.MATCH_PARENT
            )
        }

        // Caller Name
        val nameView = TextView(this).apply {
            text = callerName
            textSize = 30f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(0, dpToPx(24), 0, dpToPx(16))
        }
        root.addView(nameView)

        // "Connecting..." text with pulse animation
        val connectingText = TextView(this).apply {
            text = "Connecting..."
            textSize = 18f
            setTextColor(Color.parseColor("#38BDF8"))
            gravity = Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val pulseAnim = android.view.animation.AlphaAnimation(1.0f, 0.3f).apply {
            duration = 800
            repeatCount = Animation.INFINITE
            repeatMode = Animation.REVERSE
        }
        connectingText.startAnimation(pulseAnim)
        root.addView(connectingText)

        // 🔒 Encrypted badge
        val badge = TextView(this).apply {
            text = "🔒 End-to-End Encrypted"
            textSize = 12f
            setTextColor(Color.parseColor("#64748B"))
            gravity = Gravity.CENTER
            setPadding(0, dpToPx(24), 0, 0)
        }
        root.addView(badge)

        setContentView(root)
    }

    private fun performHandoffToMainActivity() {
        if (hasHandedOff) return
        hasHandedOff = true

        connectingTimeoutHandler?.removeCallbacksAndMessages(null)
        Log.d("SYNKING_DEBUG", "[UI] HANDOFF_TO_MAIN: Seamless transition to live call screen")

        try {
            finish()
        } catch (e: Exception) {}
    }

    private fun dismissNotificationBanner() {
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? android.app.NotificationManager
            nm?.cancel(1001)
            nm?.cancel(1002)
            nm?.cancel(1003)
            nm?.cancelAll()
        } catch (e: Exception) {}
    }

    private fun dpToPx(dp: Int): Int = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp.toFloat(), resources.displayMetrics).toInt()

    private fun playRingtoneAndVibrate() {
        try {
            Log.d("SYNKING_DEBUG", "[AUDIO] START_RINGTONE_AND_VIBRATION: Initiating audio & haptics")
            val resId = resources.getIdentifier("synk_signature", "raw", packageName)
            if (resId != 0) {
                val soundUri = android.net.Uri.parse("android.resource://$packageName/$resId")
                activeRingtone = RingtoneManager.getRingtone(applicationContext, soundUri)
            } else {
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                activeRingtone = RingtoneManager.getRingtone(applicationContext, uri)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                activeRingtone?.audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                activeRingtone?.isLooping = true
            }
            activeRingtone?.play()

            activeVibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                activeVibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 1000, 1000), 0))
            } else {
                @Suppress("DEPRECATION")
                activeVibrator?.vibrate(longArrayOf(0, 1000, 1000), 0)
            }
            Log.d("SYNKING_DEBUG", "[AUDIO] RINGTONE_AND_VIBRATION: Active and playing")
        } catch (e: Exception) {
            Log.e("SYNKING_DEBUG", "[AUDIO] RINGTONE_ERROR: ${e.message}")
        }
    }

    private fun stopRingtoneAndVibration() {
        Log.d("SYNKING_DEBUG", "[AUDIO] STOP_RINGTONE_AND_VIBRATION: Cancelling all audio and vibration globally")
        stopRingtoneGlobally()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRingtoneAndVibration()
        connectingTimeoutHandler?.removeCallbacksAndMessages(null)
        try {
            unregisterReceiver(callEndedReceiver)
        } catch (e: Exception) {}
        try {
            unregisterReceiver(webrtcConnectedReceiver)
        } catch (e: Exception) {}
        try {
            callWakeLock?.release()
        } catch (e: Exception) {}
        TelecomModule.incomingActivityInstance = null
    }
}
