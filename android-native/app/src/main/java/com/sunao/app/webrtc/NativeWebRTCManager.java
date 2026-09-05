package com.sunao.app.webrtc;

import android.content.Context;
import android.util.Log;
import org.webrtc.DefaultVideoDecoderFactory;
import org.webrtc.DefaultVideoEncoderFactory;
import org.webrtc.EglBase;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.SurfaceViewRenderer;

public class NativeWebRTCManager {
    private static final String TAG = "WebRTCManager";
    private static NativeWebRTCManager instance;
    private PeerConnectionFactory peerConnectionFactory;
    private EglBase eglBase;

    private NativeWebRTCManager() {}

    public static synchronized NativeWebRTCManager getInstance() {
        if (instance == null) {
            instance = new NativeWebRTCManager();
        }
        return instance;
    }

    public void init(Context context) {
        if (peerConnectionFactory != null) return;

        eglBase = EglBase.create();

        PeerConnectionFactory.InitializationOptions options =
                PeerConnectionFactory.InitializationOptions.builder(context)
                        .setEnableInternalTracer(true)
                        .createInitializationOptions();
        PeerConnectionFactory.initialize(options);

        PeerConnectionFactory.Options pcfOptions = new PeerConnectionFactory.Options();

        peerConnectionFactory = PeerConnectionFactory.builder()
                .setOptions(pcfOptions)
                .setVideoEncoderFactory(new DefaultVideoEncoderFactory(eglBase.getEglBaseContext(), true, true))
                .setVideoDecoderFactory(new DefaultVideoDecoderFactory(eglBase.getEglBaseContext()))
                .createPeerConnectionFactory();

        Log.i(TAG, "WebRTC PeerConnectionFactory initialized with hardware acceleration");
    }

    public void initSurface(SurfaceViewRenderer renderer, boolean isMirror) {
        if (eglBase != null && renderer != null) {
            renderer.init(eglBase.getEglBaseContext(), null);
            renderer.setEnableHardwareScaler(true);
            renderer.setMirror(isMirror);
        }
    }

    public EglBase.Context getEglBaseContext() {
        return eglBase != null ? eglBase.getEglBaseContext() : null;
    }
}
