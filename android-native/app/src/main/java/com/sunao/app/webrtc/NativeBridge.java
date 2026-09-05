package com.sunao.app.webrtc;

public class NativeBridge {
    private static NativeBridge instance;

    static {
        System.loadLibrary("sunao_core");
    }

    private NativeBridge() {}

    public static synchronized NativeBridge getInstance() {
        if (instance == null) {
            instance = new NativeBridge();
        }
        return instance;
    }

    // Native JNI C++ methods
    public native String getNativeEngineVersion();
    public native String encryptMessagePayload(String text, String key);
    public native String decryptMessagePayload(String cipher, String key);
    public native float processAudioBuffer(short[] pcmData, int length, float gain);
}
