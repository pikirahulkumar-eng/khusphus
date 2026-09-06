package com.khusphus.apk

import android.content.Context
import org.json.JSONObject

data class PendingCall(
    val callId: String,
    val callerId: String,
    val callerName: String,
    val callerPhoto: String?,
    val callType: String,
    val autoAccept: Boolean = false
)

object PendingCallStore {
    private const val PREFS = "synking_pending_call"
    private const val KEY_CALL = "pending_call"

    fun save(context: Context, call: PendingCall) {
        val json = JSONObject().apply {
            put("callId", call.callId)
            put("callerId", call.callerId)
            put("callerName", call.callerName)
            put("callerPhoto", call.callerPhoto ?: "")
            put("callType", call.callType)
            put("autoAccept", call.autoAccept)
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY_CALL, json.toString()).commit()
    }

    fun get(context: Context): PendingCall? {
        val value = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_CALL, null) ?: return null
        return try {
            val json = JSONObject(value)
            PendingCall(
                callId = json.getString("callId"),
                callerId = json.getString("callerId"),
                callerName = json.optString("callerName"),
                callerPhoto = json.optString("callerPhoto").ifEmpty { null },
                callType = json.getString("callType"),
                autoAccept = json.optBoolean("autoAccept", false)
            )
        } catch (e: Exception) {
            clear(context)
            null
        }
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().remove(KEY_CALL).commit()
    }
}
