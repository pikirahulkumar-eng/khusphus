package com.khusphus.apk

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.ToneGenerator
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class AudioRouteModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val audioManager: AudioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String {
        return "AudioRouteModule"
    }

    @ReactMethod
    fun setSpeakerphoneOn(on: Boolean, promise: Promise) {
        mainHandler.post {
            try {
                // Also update Telecom connection route:
                CallConnectionManager.setSpeakerOn(on)

                if (on) {
                    // 1. Loudspeaker Mode (Video Call OR Speaker Button ON)
                    audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                    audioManager.isSpeakerphoneOn = true
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        val speakerDevice = audioManager.availableCommunicationDevices.find { 
                            it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER 
                        }
                        if (speakerDevice != null) {
                            val success = audioManager.setCommunicationDevice(speakerDevice)
                            Log.d("SYNKING_AUDIO", "setCommunicationDevice (SPEAKER) success: $success")
                        } else {
                            Log.w("SYNKING_AUDIO", "TYPE_BUILTIN_SPEAKER not found in availableCommunicationDevices")
                        }
                    } else {
                        try {
                            audioManager.stopBluetoothSco()
                            audioManager.isBluetoothScoOn = false
                        } catch (e: Exception) {}
                    }
                    try {
                        val maxCallVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
                        audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, maxCallVol, 0)
                        val maxMusicVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
                        audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, maxMusicVol, 0)
                    } catch (ve: Exception) {}
                } else {
                    // 2. Private Mode: Bluetooth (if connected) -> Wired Headset (if connected) -> Earpiece
                    audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                    audioManager.isSpeakerphoneOn = false
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        val btDevice = audioManager.availableCommunicationDevices.find {
                            it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                            it.type == AudioDeviceInfo.TYPE_BLE_HEADSET
                        }
                        val wiredDevice = audioManager.availableCommunicationDevices.find {
                            it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                            it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                            it.type == AudioDeviceInfo.TYPE_USB_HEADSET
                        }
                        val earpieceDevice = audioManager.availableCommunicationDevices.find { 
                            it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE 
                        }

                        val targetDevice = btDevice ?: wiredDevice ?: earpieceDevice
                        if (targetDevice != null) {
                            val success = audioManager.setCommunicationDevice(targetDevice)
                            Log.d("SYNKING_AUDIO", "setCommunicationDevice (${targetDevice.type}) success: $success")
                        } else {
                            audioManager.clearCommunicationDevice()
                        }
                    } else {
                        val hasBluetooth = isBluetoothConnectedInternal()
                        if (hasBluetooth) {
                            try {
                                audioManager.startBluetoothSco()
                                audioManager.isBluetoothScoOn = true
                                Log.d("SYNKING_AUDIO", "startBluetoothSco() enabled")
                            } catch (e: Exception) {}
                        }
                    }
                }

                reactContext.currentActivity?.volumeControlStream = AudioManager.STREAM_VOICE_CALL
                promise.resolve(on)
            } catch (e: Exception) {
                Log.e("SYNKING_AUDIO", "setSpeakerphoneOn error: ${e.message}")
                promise.reject("AUDIO_ROUTE_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun isSpeakerphoneOn(promise: Promise) {
        mainHandler.post {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val currentDevice = audioManager.communicationDevice
                    if (currentDevice != null) {
                        promise.resolve(currentDevice.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER)
                        return@post
                    }
                }
                promise.resolve(audioManager.isSpeakerphoneOn)
            } catch (e: Exception) {
                promise.reject("AUDIO_ROUTE_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun isBluetoothConnected(promise: Promise) {
        mainHandler.post {
            try {
                promise.resolve(isBluetoothConnectedInternal())
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    private fun isBluetoothConnectedInternal(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.availableCommunicationDevices.any {
                    it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                    it.type == AudioDeviceInfo.TYPE_BLE_HEADSET
                }
            } else {
                val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
                devices.any {
                    it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                    it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
                } || audioManager.isBluetoothA2dpOn || audioManager.isBluetoothScoOn
            }
        } catch (e: Exception) {
            false
        }
    }

    @ReactMethod
    fun resetAudioMode(promise: Promise) {
        mainHandler.post {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    audioManager.clearCommunicationDevice()
                } else {
                    try {
                        audioManager.stopBluetoothSco()
                        audioManager.isBluetoothScoOn = false
                    } catch (e: Exception) {}
                }
                audioManager.isSpeakerphoneOn = false
                audioManager.mode = AudioManager.MODE_NORMAL
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("AUDIO_ROUTE_ERROR", e.message)
            }
        }
    }

    private var proximityWakeLock: android.os.PowerManager.WakeLock? = null

    @ReactMethod
    fun setProximitySensorEnabled(enabled: Boolean, promise: Promise) {
        mainHandler.post {
            try {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
                if (enabled) {
                    if (proximityWakeLock == null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && powerManager.isWakeLockLevelSupported(android.os.PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) {
                            proximityWakeLock = powerManager.newWakeLock(android.os.PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "Synking:ProximityWakeLock")
                        }
                    }
                    if (proximityWakeLock?.isHeld == false) {
                        proximityWakeLock?.acquire()
                    }
                } else {
                    if (proximityWakeLock?.isHeld == true) {
                        proximityWakeLock?.release()
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("PROXIMITY_ERROR", e.message)
            }
        }
    }

    private var toneGenerator: ToneGenerator? = null
    private var ringbackRunnable: Runnable? = null

    @ReactMethod
    fun startRingbackTone(promise: Promise) {
        mainHandler.post {
            val isSpeaker = audioManager.isSpeakerphoneOn || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && audioManager.communicationDevice?.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER)
            startRingbackToneInternal(isSpeaker, promise)
        }
    }

    @ReactMethod
    fun startRingbackToneWithSpeaker(isSpeaker: Boolean, promise: Promise) {
        mainHandler.post {
            startRingbackToneInternal(isSpeaker, promise)
        }
    }

    private fun startRingbackToneInternal(isSpeaker: Boolean, promise: Promise) {
        try {
            stopRingbackInternal()
            // STREAM_MUSIC guarantees loud speaker playback and NEVER falls back to earpiece
            val streamType = if (isSpeaker) AudioManager.STREAM_MUSIC else AudioManager.STREAM_VOICE_CALL
            val volume = if (isSpeaker) 85 else 80
            toneGenerator = ToneGenerator(streamType, volume)
            val playTone = object : Runnable {
                override fun run() {
                    try {
                        toneGenerator?.startTone(ToneGenerator.TONE_SUP_RINGTONE, 1000)
                        mainHandler.postDelayed(this, 3000)
                    } catch (e: Exception) {
                        Log.w("SYNKING_AUDIO", "Ringback tone error: ${e.message}")
                    }
                }
            }
            ringbackRunnable = playTone
            playTone.run()
            Log.d("SYNKING_AUDIO", "startRingbackToneInternal started with isSpeaker=$isSpeaker (streamType=$streamType)")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("SYNKING_AUDIO", "startRingbackToneInternal error: ${e.message}")
            promise.reject("RINGBACK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopRingbackTone(promise: Promise) {
        mainHandler.post {
            stopRingbackInternal()
            promise.resolve(true)
        }
    }

    private fun stopRingbackInternal() {
        try {
            ringbackRunnable?.let { mainHandler.removeCallbacks(it) }
            ringbackRunnable = null
            toneGenerator?.stopTone()
            toneGenerator?.release()
            toneGenerator = null
        } catch (e: Exception) {
            Log.w("SYNKING_AUDIO", "stopRingback error: ${e.message}")
        }
    }

    @ReactMethod
    fun startIncomingRingtone(promise: Promise) {
        mainHandler.post {
            startGlobalIncomingRingtone(reactContext.applicationContext)
            startGlobalVibration(reactContext.applicationContext)
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun stopIncomingRingtone(promise: Promise) {
        mainHandler.post {
            stopGlobalIncomingRingtone()
            stopGlobalVibration(reactContext.applicationContext)
            promise.resolve(true)
        }
    }

    companion object {
        private var instance: AudioRouteModule? = null
        @Volatile private var globalIncomingMediaPlayer: MediaPlayer? = null
        @Volatile private var globalVibrator: Vibrator? = null

        @Synchronized
        fun startGlobalIncomingRingtone(context: Context) {
            try {
                if (globalIncomingMediaPlayer?.isPlaying == true) {
                    Log.i("SYNKING_AUDIO", "Synk Signature incoming ringtone already playing globally, ignoring restart")
                    return
                }
                stopGlobalIncomingRingtone()

                val resId = context.resources.getIdentifier("synk_signature", "raw", context.packageName)
                if (resId != 0) {
                    val ringtoneAudioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setLegacyStreamType(AudioManager.STREAM_RING)
                        .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                        .build()

                    val mp = MediaPlayer()
                    mp.setAudioAttributes(ringtoneAudioAttributes)
                    @Suppress("DEPRECATION")
                    mp.setAudioStreamType(AudioManager.STREAM_RING)

                    val afd = context.resources.openRawResourceFd(resId)
                    if (afd != null) {
                        mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                        afd.close()
                    } else {
                        val uri = android.net.Uri.parse("android.resource://${context.packageName}/$resId")
                        mp.setDataSource(context, uri)
                    }

                    mp.isLooping = true
                    mp.setVolume(1.0f, 1.0f)
                    mp.prepare()
                    mp.start()
                    globalIncomingMediaPlayer = mp
                    Log.i("SYNKING_AUDIO", "âœ… Synk Signature incoming ringtone started strictly on STREAM_RING loudspeaker")
                } else {
                    Log.w("SYNKING_AUDIO", "âš ï¸ synk_signature raw resource not found")
                }
            } catch (e: Exception) {
                Log.e("SYNKING_AUDIO", "startGlobalIncomingRingtone error: ${e.message}")
            }
        }

        @Synchronized
        fun startGlobalVibration(context: Context) {
            try {
                stopGlobalVibration(context)
                val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    vm?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }
                vibrator?.let { v ->
                    globalVibrator = v
                    val pattern = longArrayOf(0, 1000, 1000)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createWaveform(pattern, 0)) // 0 means repeat in continuous loop
                    } else {
                        @Suppress("DEPRECATION")
                        v.vibrate(pattern, 0)
                    }
                    Log.i("SYNKING_AUDIO", "âœ… Continuous vibration started natively")
                }
            } catch (e: Exception) {
                Log.e("SYNKING_AUDIO", "startGlobalVibration error: ${e.message}")
            }
        }

        @Synchronized
        fun stopGlobalVibration(context: Context? = null) {
            try {
                globalVibrator?.cancel()
                globalVibrator = null
                val ctx = context ?: instance?.reactContext?.applicationContext
                ctx?.let {
                    val v = it.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                    v?.cancel()
                }
            } catch (e: Exception) {
                Log.w("SYNKING_AUDIO", "stopGlobalVibration error: ${e.message}")
            }
        }

        @Synchronized
        fun stopGlobalIncomingRingtone() {
            try {
                globalIncomingMediaPlayer?.let {
                    if (it.isPlaying) {
                        it.stop()
                    }
                    it.release()
                }
                globalIncomingMediaPlayer = null
            } catch (e: Exception) {
                Log.w("SYNKING_AUDIO", "stopGlobalIncomingRingtone error: ${e.message}")
            }
        }

        fun stopAllRingtones() {
            stopGlobalIncomingRingtone()
            stopGlobalVibration()
            instance?.mainHandler?.post {
                instance?.stopRingbackInternal()
            }
        }
    }

    init {
        instance = this
    }
}

