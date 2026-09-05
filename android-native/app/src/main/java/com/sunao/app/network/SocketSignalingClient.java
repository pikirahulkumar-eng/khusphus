package com.sunao.app.network;

import android.util.Log;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import org.json.JSONObject;

public class SocketSignalingClient {
    private static final String TAG = "SocketClient";
    private static SocketSignalingClient instance;
    private WebSocket webSocket;
    private SignalingCallback callback;

    public interface SignalingCallback {
        void onConnected();
        void onMessageReceived(JSONObject data);
        void onCallIncoming(JSONObject data);
    }

    private SocketSignalingClient() {}

    public static synchronized SocketSignalingClient getInstance() {
        if (instance == null) {
            instance = new SocketSignalingClient();
        }
        return instance;
    }

    public void connect(String serverUrl, String myPhone, SignalingCallback callback) {
        this.callback = callback;
        OkHttpClient client = new OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build();

        // Connect directly to the Node.js signaling server
        Request request = new Request.Builder().url(serverUrl).build();
        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket ws, Response response) {
                Log.i(TAG, "WebSocket Connected to: " + serverUrl);
                registerUser(myPhone);
                if (callback != null) callback.onConnected();
            }

            @Override
            public void onMessage(WebSocket ws, String text) {
                try {
                    JSONObject json = new JSONObject(text);
                    String event = json.optString("event");
                    if ("incoming-call".equals(event)) {
                        if (callback != null) callback.onCallIncoming(json);
                    } else if (callback != null) {
                        callback.onMessageReceived(json);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error parsing WS message", e);
                }
            }

            @Override
            public void onFailure(WebSocket ws, Throwable t, Response response) {
                Log.e(TAG, "WebSocket Connection failed: " + t.getMessage());
            }
        });
    }

    public void registerUser(String phone) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("event", "register");
            obj.put("userId", phone);
            send(obj);
        } catch (Exception ignored) {}
    }

    public void send(JSONObject data) {
        if (webSocket != null) {
            webSocket.send(data.toString());
        }
    }
}
