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
                val supported = it.callAudioState?.supportedRouteMask ?: 0
                val hasBluetooth = (supported and CallAudioState.ROUTE_BLUETOOTH) != 0
                val hasHeadset = (supported and CallAudioState.ROUTE_WIRED_HEADSET) != 0
                if (hasBluetooth) {
                    it.setAudioRoute(CallAudioState.ROUTE_BLUETOOTH)
                    Log.d("SYNKING_TELECOM", "[CallConnectionManager] initial answerCall: Bluetooth detected -> ROUTE_BLUETOOTH")
                } else if (hasHeadset) {
                    it.setAudioRoute(CallAudioState.ROUTE_WIRED_HEADSET)
                    Log.d("SYNKING_TELECOM", "[CallConnectionManager] initial answerCall: Wired headset detected -> ROUTE_WIRED_HEADSET")
                } else if (isSpeaker || it.callType == "video") {
                    it.setAudioRoute(CallAudioState.ROUTE_SPEAKER)
                    Log.d("SYNKING_TELECOM", "[CallConnectionManager] initial answerCall: setAudioRoute ROUTE_SPEAKER")
                } else {
                    it.setAudioRoute(CallAudioState.ROUTE_EARPIECE)
                    Log.d("SYNKING_TELECOM", "[CallConnectionManager] initial answerCall: setAudioRoute ROUTE_EARPIECE")
                }
            }
        }
    }

    fun setSpeakerOn(on: Boolean) {
        currentConnection?.let {
            if (on) {
                it.setAudioRoute(CallAudioState.ROUTE_SPEAKER)
                Log.d("SYNKING_TELECOM", "[CallConnectionManager] setAudioRoute to ROUTE_SPEAKER")
            } else {
                val supported = it.callAudioState?.supportedRouteMask ?: 0
                val hasBluetooth = (supported and CallAudioState.ROUTE_BLUETOOTH) != 0
                val hasHeadset = (supported and CallAudioState.ROUTE_WIRED_HEADSET) != 0
                val route = when {
                    hasBluetooth -> CallAudioState.ROUTE_BLUETOOTH
                    hasHeadset -> CallAudioState.ROUTE_WIRED_HEADSET
                    else -> CallAudioState.ROUTE_EARPIECE
                }
                it.setAudioRoute(route)
                Log.d("SYNKING_TELECOM", "[CallConnectionManager] setAudioRoute to route=$route")
            }
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


