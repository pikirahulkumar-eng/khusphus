package com.khusphus.apk

import android.telecom.CallAudioState
import android.telecom.DisconnectCause
import android.util.Log

object CallConnectionManager {
    var currentConnection: SynkingConnection? = null

    fun answerCall(isSpeaker: Boolean = false) {
        currentConnection?.let {
            val isAlreadyActive = it.state == android.telecom.Connection.STATE_ACTIVE
            it.setActive()
            if (!isAlreadyActive) {
                if (isSpeaker || it.callType == "video") {
                    it.setAudioRoute(CallAudioState.ROUTE_SPEAKER)
                    Log.d("SYNKING_TELECOM", "[CallConnectionManager] initial answerCall: setAudioRoute ROUTE_SPEAKER")
                }
            }
        }
    }

    fun setSpeakerOn(on: Boolean) {
        currentConnection?.let {
            val route = if (on) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_EARPIECE
            it.setAudioRoute(route)
            Log.d("SYNKING_TELECOM", "[CallConnectionManager] setAudioRoute to ${if (on) "ROUTE_SPEAKER" else "ROUTE_EARPIECE"}")
        }
    }

    fun rejectCall() {
        currentConnection?.let {
            it.setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
            it.destroy()
            currentConnection = null
        }
        SynkingConnectionService.stopCallForeground()
    }

    fun endCall() {
        currentConnection?.let {
            it.setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
            it.destroy()
            currentConnection = null
        }
        SynkingConnectionService.stopCallForeground()
    }
}

