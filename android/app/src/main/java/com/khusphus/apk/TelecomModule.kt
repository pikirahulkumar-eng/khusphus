package com.khusphus.apk

import android.app.Activity
import android.app.NotificationManager
import android.app.PictureInPictureParams
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.AudioDeviceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.Rational
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

class TelecomModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        globalReactContext = reactContext
        reactContextInstance = reactContext
    }

    override fun getName(): String {
        return "TelecomModule"
    }

    @ReactMethod
    fun signalJSBridgeReady(promise: Promise) {
        try {
            Log.i("SYNKING_DEBUG", "✅ [BRIDGE] signalJSBridgeReady received from JS — flushing ${pendingEvents.size} queued call events")
            isJSBridgeReady.set(true)
            flushPendingEvents()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        isJSBridgeReady.set(false)
        Log.w("SYNKING_DEBUG", "⚠️ CatalystInstance destroyed — JS bridge marked NOT ready")
    }

    @ReactMethod
    fun acknowledgeEvent(callId: String, action: String, promise: Promise) {
        try {
            Log.i("SYNKING_DEBUG", "✅ [BRIDGE] ACK received from JS: callId=$callId, action=$action")
            acknowledgedEvents[callId] = true
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun getPendingIncomingCall(promise: Promise) {
        try {
            val call = PendingCallStore.get(reactApplicationContext)
            if (call != null) {
                val map = WritableNativeMap().apply {
                    putString("callId", call.callId)
                    putString("callerId", call.callerId)
                    putString("callerName", call.callerName)
                    putString("callerPhoto", call.callerPhoto ?: "")
                    putString("callType", call.callType)
                    putBoolean("autoAccept", call.autoAccept)
                }
                promise.resolve(map)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun updateDebugStatus(stage: String, status: String, promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun notifyBridgedToJs(callId: String, promise: Promise) {
        try {
            Log.d("SYNKING_DEBUG", "[BRIDGE] notifyBridgedToJs confirmed for callId=$callId")
            PendingCallStore.clear(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun notifyVideoCallConnected(promise: Promise) {
        try {
            val intent = Intent("com.synking.VIDEO_CALL_CONNECTED_FROM_JS")
            reactContextInstance?.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TELECOM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun notifyWebRTCConnected(promise: Promise) {
        try {
            Log.d("SYNKING_DEBUG", "[BRIDGE] notifyWebRTCConnected: JS signaled WebRTC is connected, sending handoff broadcast")
            val intent = Intent("com.synking.WEBRTC_CONNECTED")
            reactContextInstance?.sendBroadcast(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TELECOM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun launchIncomingCallActivity(callId: String, callerName: String, callType: String, promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val intent = Intent(ctx, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("SYNKING_INCOMING_CALL", true)
                putExtra("callId", callId)
                putExtra("callerName", callerName)
                putExtra("callType", callType)
            }
            ctx.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERR", e.message)
        }
    }

    @ReactMethod
    fun requestVoipPermissions(promise: Promise) {
        try {
            CallReliabilityHelper.runOnboardingReliabilityCheck(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PERM_ERR", e.message)
        }
    }

    @ReactMethod
    fun minimizeApp(promise: Promise) {
        try {
            reactApplicationContext.currentActivity?.moveTaskToBack(true)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MINIMIZE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun attachRemoteVideo(streamUrl: String, promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun dismissIncomingNotification(promise: Promise) {
        try {
            SynkingConnectionService.stopCallForeground()
            val nm = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(MyFirebaseMessagingService.NOTIFICATION_ID)
            CallState.markAnswered(reactApplicationContext)
            CallConnectionManager.answerCall()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun startOngoingCall(callerName: String, promise: Promise) {
        try {
            isCallActive = true
            CallState.markAnswered(reactApplicationContext)
            CallConnectionManager.answerCall()
            SynkingConnectionService.updateOngoingCallForeground(callerName)
            val activity: Activity? = CallActivity.currentCallActivity ?: reactApplicationContext.currentActivity
            activity?.let { act ->
                act.runOnUiThread {
                    try {
                        act.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        Log.d("SYNKING_TELECOM", "[TelecomModule] FLAG_KEEP_SCREEN_ON added to ${act.javaClass.simpleName}")
                    } catch (e: Exception) {}
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun answerCall(promise: Promise) {
        try {
            isCallActive = true
            CallState.markAnswered(reactApplicationContext)
            CallConnectionManager.answerCall()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setSpeakerOn(on: Boolean, promise: Promise) {
        try {
            Log.d("SYNKING_TELECOM", "[TelecomModule] setSpeakerOn($on) requested from JS")
            CallConnectionManager.setSpeakerOn(on)

            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
            audioManager.isSpeakerphoneOn = on

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (on) {
                    val targetDevice = audioManager.availableCommunicationDevices.find { 
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER 
                    } ?: audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).find {
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
                    }
                    if (targetDevice != null) {
                        val res = audioManager.setCommunicationDevice(targetDevice)
                        Log.d("SYNKING_TELECOM", "[TelecomModule] setCommunicationDevice (${targetDevice.type}) result: $res")
                    }
                } else {
                    val targetDevice = audioManager.availableCommunicationDevices.find { 
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE 
                    } ?: audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).find {
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
                    }
                    if (targetDevice != null) {
                        audioManager.setCommunicationDevice(targetDevice)
                    } else {
                        audioManager.clearCommunicationDevice()
                    }
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("SYNKING_TELECOM", "[TelecomModule] setSpeakerOn error: ${e.message}")
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setAutoPipEnabled(enabled: Boolean, promise: Promise) {
        promise.resolve(false)
    }

    @ReactMethod
    fun enterPipMode(promise: Promise) {
        try {
            val act = CallActivity.currentCallActivity ?: reactApplicationContext.currentActivity
            if (act != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                act.runOnUiThread {
                    try {
                        val aspectRatio = Rational(9, 16)
                        val builder = PictureInPictureParams.Builder()
                            .setAspectRatio(aspectRatio)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            builder.setAutoEnterEnabled(true)
                        }
                        val success = act.enterPictureInPictureMode(builder.build())
                        promise.resolve(success)
                    } catch (e: Exception) {
                        promise.resolve(false)
                    }
                }
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun setCurrentUser(userId: String, userName: String, promise: Promise) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences("khusphus_call_state", Context.MODE_PRIVATE)
            prefs.edit()
                .putString("current_user_id", userId)
                .putString("current_user_name", userName)
                .apply()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun attachLocalVideo(streamUrl: String, promise: Promise) {
        promise.resolve(true)
    }

    @ReactMethod
    fun endCall(promise: Promise) {
        try {
            isCallActive = false
            CallState.clear(reactApplicationContext)
            PendingCallStore.clear(reactApplicationContext)
            CallConnectionManager.endCall()
            IncomingCallActivity.stopRingtoneGlobally()

            val activity: Activity? = CallActivity.currentCallActivity ?: reactApplicationContext.currentActivity
            activity?.let { act ->
                act.runOnUiThread {
                    try {
                        act.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        Log.d("SYNKING_TELECOM", "[TelecomModule] FLAG_KEEP_SCREEN_ON cleared on ${act.javaClass.simpleName}")
                    } catch (e: Exception) {}
                }
            }

            val intent = Intent("com.khusphus.apk.CALL_ENDED_FROM_JS")
            reactContextInstance?.sendBroadcast(intent)
            Log.d("SYNKING_TELECOM", "[TELECOM] CALL_ENDED: Broadcast sent from React Native")

            // Dismiss CallActivity on call end (returns directly to Lock Screen)
            CallActivity.currentCallActivity?.let { act ->
                act.runOnUiThread {
                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                            act.setShowWhenLocked(false)
                        }
                        act.finishAndRemoveTask()
                    } catch (e: Exception) {
                        act.finish()
                    }
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TELECOM_ERROR", e.message)
        }
    }

    @ReactMethod
    fun openChatFromCall(partnerId: String, promise: Promise) {
        try {
            val ctx = reactApplicationContext
            val activity: Activity? = CallActivity.currentCallActivity ?: ctx.currentActivity
            val km = ctx.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager

            val openChatAction: () -> Unit = {
                // If running inside CallActivity, finish it so MainActivity shows chat with in-app floating pill
                CallActivity.currentCallActivity?.let { act ->
                    act.finish()
                }

                val intent = Intent(ctx, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    data = Uri.parse("synking://chat/$partnerId")
                    putExtra("route", "/chat/$partnerId")
                    putExtra("senderId", partnerId)
                    putExtra("chatPartnerId", partnerId)
                }
                ctx.startActivity(intent)

                emitOpenChatEvent(partnerId)
            }

            val currentAct = activity
            if (km != null && km.isKeyguardLocked && currentAct != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                currentAct.runOnUiThread {
                    km.requestDismissKeyguard(currentAct, object : KeyguardManager.KeyguardDismissCallback() {
                        override fun onDismissSucceeded() {
                            Log.d("SYNKING_DEBUG", "Keyguard dismissed successfully - opening chat for $partnerId")
                            openChatAction()
                        }
                        override fun onDismissCancelled() {
                            Log.d("SYNKING_DEBUG", "Keyguard dismiss cancelled by user")
                        }
                        override fun onDismissError() {
                            Log.e("SYNKING_DEBUG", "Keyguard dismiss error - falling back to direct launch")
                            openChatAction()
                        }
                    })
                }
            } else {
                openChatAction()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("SYNKING_DEBUG", "openChatFromCall error: ${e.message}")
            promise.resolve(false)
        }
    }

    companion object {
        var incomingActivityInstance: IncomingCallActivity? = null
        var globalReactContext: ReactApplicationContext? = null
        var reactContextInstance: ReactContext? = null
        val reactContext: ReactContext?
            get() = reactContextInstance
        @Volatile var isCallActive = false

        private val pendingEvents = ConcurrentLinkedQueue<PendingCall>()
        private val isJSBridgeReady = AtomicBoolean(false)
        private val acknowledgedEvents = ConcurrentHashMap<String, Boolean>()
        private val handler = Handler(Looper.getMainLooper())
        private const val RETRY_DELAY_MS = 500L
        private const val MAX_RETRIES = 20

        fun emitIncomingCallEvent(call: PendingCall) {
            val ctx = reactContext ?: return
            if (!ctx.hasActiveCatalystInstance()) return

            val params = Arguments.createMap().apply {
                putString("callId", call.callId)
                putString("callerId", call.callerId)
                putString("callerName", call.callerName)
                putString("callerPhoto", call.callerPhoto ?: "")
                putString("callType", call.callType)
            }

            Log.d("SYNKING_DEBUG", "📤 [BRIDGE] emitIncomingCallEvent -> onTelecomIncomingCall: callId=${call.callId}")
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onTelecomIncomingCall", params)
        }

        fun emitAcceptEvent(call: PendingCall) {
            reactContext?.let { ctx ->
                CallState.markAnswered(ctx)
                SynkingConnectionService.updateOngoingCallForeground(call.callerName)
            }
            if (isJSBridgeReady.get() && reactContext?.hasActiveCatalystInstance() == true) {
                sendAcceptDirect(call)
            } else {
                Log.w("SYNKING_DEBUG", "⏳ [BRIDGE] JS not ready yet, QUEUING call event: ${call.callId}")
                pendingEvents.add(call)
            }
        }

        private fun sendAcceptDirect(call: PendingCall, retryCount: Int = 0) {
            val ctx = reactContext ?: return
            if (!ctx.hasActiveCatalystInstance()) return

            val params = Arguments.createMap().apply {
                putString("callId", call.callId)
                putString("callerId", call.callerId)
                putString("callerName", call.callerName)
                putString("callerPhoto", call.callerPhoto ?: "")
                putString("callType", call.callType)
                putBoolean("isRetry", retryCount > 0)
                putInt("retryCount", retryCount)
            }

            Log.d("SYNKING_DEBUG", "📤 [BRIDGE] emitAcceptEvent -> onTelecomCallAnswered: callId=${call.callId} (attempt ${retryCount + 1})")
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onTelecomCallAnswered", params)

            scheduleAckCheck(call, retryCount)
        }

        private fun scheduleAckCheck(call: PendingCall, retryCount: Int) {
            handler.postDelayed({
                if (acknowledgedEvents.containsKey(call.callId)) {
                    Log.i("SYNKING_DEBUG", "✅ [BRIDGE] ACK confirmed for callId=${call.callId} after $retryCount retries")
                    acknowledgedEvents.remove(call.callId)
                    return@postDelayed
                }
                if (retryCount < MAX_RETRIES) {
                    Log.w("SYNKING_DEBUG", "⚠️ [BRIDGE] No ACK for onTelecomCallAnswered (callId=${call.callId}), RETRY #${retryCount + 1}")
                    sendAcceptDirect(call, retryCount + 1)
                } else {
                    Log.e("SYNKING_DEBUG", "❌ [BRIDGE] FAILED: No ACK after $MAX_RETRIES retries for callId=${call.callId}")
                }
            }, RETRY_DELAY_MS)
        }

        fun emitAcceptEvent(
            callId: String = "",
            callerId: String = "",
            callerName: String = "",
            callType: String = ""
        ) {
            val finalCallId = if (callId.isNotEmpty()) callId else (incomingActivityInstance?.callId ?: "")
            val finalCallerId = if (callerId.isNotEmpty()) callerId else (incomingActivityInstance?.callerId ?: "")
            val finalCallerName = if (callerName.isNotEmpty()) callerName else (incomingActivityInstance?.callerName ?: "")
            val finalCallType = if (callType.isNotEmpty()) callType else (incomingActivityInstance?.callType ?: "audio")

            val call = PendingCall(finalCallId, finalCallerId, finalCallerName, null, finalCallType)
            emitAcceptEvent(call)
        }

        fun emitDeclineEvent(callId: String) {
            val ctx = reactContext ?: return
            val params = Arguments.createMap().apply { putString("callId", callId) }
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onTelecomCallDeclined", params)
        }

        fun emitMuteToggled(isMuted: Boolean) {
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onTelecomMuteToggled", isMuted)
        }

        fun emitSpeakerToggled(isSpeakerOn: Boolean) {
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onTelecomSpeakerToggled", isSpeakerOn)
        }

        fun emitVideoToggled(isVideoEnabled: Boolean) {
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onTelecomVideoToggled", isVideoEnabled)
        }

        fun emitEndCallEvent() {
            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onTelecomEndCall", null)
        }

        fun emitOpenChatEvent(partnerId: String) {
            val ctx = reactContext ?: return
            if (!ctx.hasActiveCatalystInstance()) return
            val params = Arguments.createMap().apply {
                putString("partnerId", partnerId)
            }
            Log.d("SYNKING_DEBUG", "📤 [BRIDGE] emitOpenChatEvent -> onOpenChatRequested: partnerId=$partnerId")
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onOpenChatRequested", params)
        }

        fun emitPipModeChanged(isInPipMode: Boolean) {
            val ctx = reactContext ?: return
            if (!ctx.hasActiveCatalystInstance()) return
            val params = Arguments.createMap().apply {
                putBoolean("isInPictureInPictureMode", isInPipMode)
            }
            Log.d("SYNKING_DEBUG", "📤 [BRIDGE] emitPipModeChanged: isInPictureInPictureMode=$isInPipMode")
            ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onPictureInPictureModeChanged", params)
        }

        fun flushPendingEvents() {
            while (pendingEvents.isNotEmpty()) {
                val call = pendingEvents.poll() ?: break
                Log.i("SYNKING_DEBUG", "🔄 [BRIDGE] Flushing queued call event: ${call.callId}")
                sendAcceptDirect(call)
            }
        }

        fun onReactContextReady(ctx: ReactContext) {
            reactContextInstance = ctx
            Log.d("SYNKING_DEBUG", "[BRIDGE] onReactContextReady: ReactContext initialized")
            if (isJSBridgeReady.get()) {
                flushPendingEvents()
            }
        }
    }
}
