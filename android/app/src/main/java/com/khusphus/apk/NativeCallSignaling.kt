package com.khusphus.apk

import android.content.Context
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

object NativeCallSignaling {
    private const val TAG = "KHUSPHUS_SIGNALING"
    private const val SERVER_URL = "https://p01--sunao-server--njm6yd7449gk.code.run/api/call-signal"

    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .writeTimeout(5, TimeUnit.SECONDS)
        .build()

    private val executor = Executors.newSingleThreadExecutor()

    fun sendAcceptNatively(callId: String, callerId: String, callType: String = "audio") {
        sendSignal("CALL_ACCEPTED", callId, callerId, callType)
    }

    fun sendDeclineNatively(callId: String, callerId: String) {
        sendSignal("CALL_REJECTED", callId, callerId, "audio")
    }

    fun sendEndCallNatively(callId: String, callerId: String) {
        sendSignal("CALL_ENDED", callId, callerId, "audio")
    }

    private fun sendSignal(type: String, callId: String, targetUserId: String, callType: String) {
        if (callId.isEmpty()) return

        executor.execute {
            try {
                Log.d(TAG, "🚀 [NATIVE_DIRECT_SIGNAL] Dispatching $type to $SERVER_URL (callId=$callId, target=$targetUserId)")
                val json = JSONObject().apply {
                    put("type", type)
                    put("callId", callId)
                    put("targetUserId", targetUserId)
                    put("callerId", targetUserId)
                    put("callType", callType)
                    put("timestamp", System.currentTimeMillis())
                }

                val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                val request = Request.Builder()
                    .url(SERVER_URL)
                    .post(body)
                    .build()

                client.newCall(request).execute().use { response ->
                    Log.d(TAG, "✅ [NATIVE_DIRECT_SIGNAL_SUCCESS] $type -> HTTP ${response.code} (delivered)")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ [NATIVE_DIRECT_SIGNAL_ERROR] $type failed: ${e.message}")
            }
        }
    }
}
