package com.sunao.app.ui;

import android.content.Intent;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.SunaoApp;
import com.sunao.app.data.DatabaseHelper;
import com.sunao.app.data.model.Message;
import com.sunao.app.ui.adapters.MessageAdapter;
import com.sunao.app.webrtc.NativeBridge;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class ChatActivity extends AppCompatActivity {
    private String chatId;
    private String peerName;
    private String peerPhone;
    private DatabaseHelper dbHelper;
    private MessageAdapter messageAdapter;
    private List<Message> messageList;
    private RecyclerView rvMessages;
    private EditText etMessage;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        chatId = getIntent().getStringExtra("chat_id");
        peerName = getIntent().getStringExtra("peer_name");
        peerPhone = getIntent().getStringExtra("peer_phone");
        dbHelper = ((SunaoApp) getApplication()).getDatabaseHelper();

        TextView tvName = findViewById(R.id.tvPeerName);
        tvName.setText(peerName != null ? peerName : "Rahul Kumar");

        TextView tvAvatarInitial = findViewById(R.id.tvChatAvatarInitial);
        String initial = (peerName != null && !peerName.isEmpty()) ? peerName.substring(0, 1).toUpperCase() : "R";
        tvAvatarInitial.setText(initial);

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        // Audio & Video Call Triggers
        findViewById(R.id.btnAudioCall).setOnClickListener(v -> launchCall(false));
        findViewById(R.id.btnVideoCall).setOnClickListener(v -> launchCall(true));

        rvMessages = findViewById(R.id.rvMessages);
        rvMessages.setLayoutManager(new LinearLayoutManager(this));
        etMessage = findViewById(R.id.etMessage);

        ImageButton btnSend = findViewById(R.id.btnSend);
        btnSend.setOnClickListener(v -> sendMessage());

        loadMessages();
    }

    private void loadMessages() {
        messageList = dbHelper.getMessagesForChat(chatId != null ? chatId : "1");
        messageAdapter = new MessageAdapter(messageList);
        rvMessages.setAdapter(messageAdapter);
        if (!messageList.isEmpty()) {
            rvMessages.scrollToPosition(messageList.size() - 1);
        }
    }

    private void sendMessage() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty()) return;

        // Native C++ Encryption
        try {
            NativeBridge.getInstance().encryptMessagePayload(text, "SUNAO_SECRET_KEY");
        } catch (Throwable ignored) {}

        String time = new SimpleDateFormat("hh:mm a", Locale.getDefault()).format(new Date());
        Message msg = new Message(String.valueOf(System.currentTimeMillis()), chatId != null ? chatId : "1", text, time, true);
        dbHelper.insertMessage(msg);
        messageList.add(msg);
        messageAdapter.notifyItemInserted(messageList.size() - 1);
        rvMessages.scrollToPosition(messageList.size() - 1);
        etMessage.setText("");
    }

    private void launchCall(boolean isVideo) {
        Intent intent = new Intent(this, CallActivity.class);
        intent.putExtra("peer_name", peerName);
        intent.putExtra("peer_phone", peerPhone);
        intent.putExtra("is_video", isVideo);
        startActivity(intent);
    }
}
