package com.sunao.app.ui;

import android.os.Bundle;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.sunao.app.R;
import com.sunao.app.webrtc.NativeWebRTCManager;
import org.webrtc.SurfaceViewRenderer;

public class CallActivity extends AppCompatActivity {
    private SurfaceViewRenderer localVideoView;
    private SurfaceViewRenderer remoteVideoView;
    private boolean isMicMuted = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_call);

        String peerName = getIntent().getStringExtra("peer_name");
        boolean isVideo = getIntent().getBooleanExtra("is_video", false);

        TextView tvName = findViewById(R.id.tvCallPeerName);
        tvName.setText(peerName != null ? peerName : "Calling...");

        localVideoView = findViewById(R.id.localVideoView);
        remoteVideoView = findViewById(R.id.remoteVideoView);

        // Initialize Native WebRTC Engine
        NativeWebRTCManager webrtc = NativeWebRTCManager.getInstance();
        webrtc.init(this);
        webrtc.initSurface(localVideoView, true);
        webrtc.initSurface(remoteVideoView, false);

        // Actions
        ImageButton btnEnd = findViewById(R.id.btnEndCall);
        btnEnd.setOnClickListener(v -> finish());

        ImageButton btnMic = findViewById(R.id.btnToggleMic);
        btnMic.setOnClickListener(v -> {
            isMicMuted = !isMicMuted;
            btnMic.setAlpha(isMicMuted ? 0.5f : 1.0f);
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (localVideoView != null) localVideoView.release();
        if (remoteVideoView != null) remoteVideoView.release();
    }
}
