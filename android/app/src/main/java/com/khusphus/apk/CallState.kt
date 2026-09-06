package com.khusphus.apk

import android.content.Context

object CallState {
    private const val PREFS = "khusphus_call_state"
    private const val KEY_ACTIVE_ID = "active_call_id"
    private const val KEY_TS = "active_call_ts"
    private const val KEY_ANSWERED = "active_call_answered"
    private const val KEY_LAST_ANSWERED_ID = "last_answered_id"
    private const val KEY_LAST_ANSWERED_TS = "last_answered_ts"
    private const val STALE_THRESHOLD_MS = 45_000L
    private const val ANSWERED_COOLDOWN_MS = 60_000L

    @Volatile private var activeCallId: String? = null
    @Volatile private var wasAnswered: Boolean = false
    @Volatile private var lastAnsweredId: String? = null
    @Volatile private var lastAnsweredTs: Long = 0L

    fun init(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val savedId = prefs.getString(KEY_ACTIVE_ID, null)
        val savedTs = prefs.getLong(KEY_TS, 0L)
        activeCallId = if (savedId != null && (System.currentTimeMillis() - savedTs) < STALE_THRESHOLD_MS)
            savedId else null
        wasAnswered = prefs.getBoolean(KEY_ANSWERED, false)
        lastAnsweredId = prefs.getString(KEY_LAST_ANSWERED_ID, null)
        lastAnsweredTs = prefs.getLong(KEY_LAST_ANSWERED_TS, 0L)
    }

    fun isDuplicate(callId: String): Boolean = activeCallId == callId

    fun start(context: Context, callId: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val savedTs = prefs.getLong(KEY_TS, 0L)
        val now = System.currentTimeMillis()
        if (activeCallId != null && (now - savedTs) < STALE_THRESHOLD_MS && activeCallId != callId) return false
        activeCallId = callId
        wasAnswered = false
        prefs.edit().putString(KEY_ACTIVE_ID, callId).putLong(KEY_TS, now).putBoolean(KEY_ANSWERED, false).apply()
        return true
    }

    fun markAnswered(context: Context, specificCallId: String? = null) {
        wasAnswered = true
        val targetId = specificCallId ?: activeCallId
        val now = System.currentTimeMillis()
        if (targetId != null) {
            lastAnsweredId = targetId
            lastAnsweredTs = now
        }
        try {
            val editor = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            editor.putBoolean(KEY_ANSWERED, true)
            if (targetId != null) {
                editor.putString(KEY_LAST_ANSWERED_ID, targetId)
                editor.putLong(KEY_LAST_ANSWERED_TS, now)
            }
            editor.apply()
        } catch (e: Exception) {}
    }

    fun wasCallAnswered(context: Context, callId: String? = null): Boolean {
        if (wasAnswered) return true
        val now = System.currentTimeMillis()
        val checkId = callId ?: activeCallId
        if (checkId != null && lastAnsweredId == checkId && (now - lastAnsweredTs) < ANSWERED_COOLDOWN_MS) {
            return true
        }
        return try {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            if (prefs.getBoolean(KEY_ANSWERED, false)) return true
            val savedLastId = prefs.getString(KEY_LAST_ANSWERED_ID, null)
            val savedLastTs = prefs.getLong(KEY_LAST_ANSWERED_TS, 0L)
            checkId != null && savedLastId == checkId && (now - savedLastTs) < ANSWERED_COOLDOWN_MS
        } catch (e: Exception) { false }
    }

    fun clear(context: Context, callId: String? = null) {
        val targetId = callId ?: activeCallId
        if (wasAnswered && targetId != null) {
            lastAnsweredId = targetId
            lastAnsweredTs = System.currentTimeMillis()
            try {
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_LAST_ANSWERED_ID, targetId)
                    .putLong(KEY_LAST_ANSWERED_TS, lastAnsweredTs)
                    .apply()
            } catch (e: Exception) {}
        }
        activeCallId = null
        wasAnswered = false
        try {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().remove(KEY_ACTIVE_ID).remove(KEY_TS).remove(KEY_ANSWERED).apply()
        } catch (e: Exception) {}
    }
}
