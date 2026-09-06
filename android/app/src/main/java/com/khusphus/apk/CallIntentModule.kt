package com.khusphus.apk

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableNativeMap

class CallIntentModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        var pendingCallId: String? = null
        var pendingCallerId: String? = null
        var pendingCallerName: String? = null
        var pendingCallType: String? = null
        var pendingCallerPhoto: String? = null
    }

    override fun getName(): String {
        return "CallIntentModule"
    }

    @ReactMethod
    fun getPendingCall(promise: Promise) {
        if (pendingCallId != null) {
            val map = WritableNativeMap()
            map.putString("callId", pendingCallId)
            map.putString("callerId", pendingCallerId)
            map.putString("callerName", pendingCallerName)
            map.putString("callType", pendingCallType)
            map.putString("callerPhoto", pendingCallerPhoto)
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun clearPendingCall() {
        pendingCallId = null
        pendingCallerId = null
        pendingCallerName = null
        pendingCallType = null
        pendingCallerPhoto = null
    }
}
