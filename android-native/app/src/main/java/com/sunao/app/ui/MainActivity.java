package com.sunao.app.ui;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.google.android.material.tabs.TabLayout;
import com.sunao.app.R;
import com.sunao.app.SunaoApp;
import com.sunao.app.data.DatabaseHelper;
import com.sunao.app.data.model.Chat;
import com.sunao.app.ui.adapters.ChatListAdapter;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private RecyclerView rvChats;
    private DatabaseHelper dbHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        dbHelper = ((SunaoApp) getApplication()).getDatabaseHelper();

        TabLayout tabLayout = findViewById(R.id.tabLayout);
        tabLayout.addTab(tabLayout.newTab().setText(R.string.chats));
        tabLayout.addTab(tabLayout.newTab().setText(R.string.updates));
        tabLayout.addTab(tabLayout.newTab().setText(R.string.calls));

        rvChats = findViewById(R.id.rvChats); // 120fps instant zero-lag chats view
        rvChats.setLayoutManager(new LinearLayoutManager(this));

        loadChats();
    }

    private void loadChats() {
        List<Chat> chatList = dbHelper.getAllChats();
        ChatListAdapter adapter = new ChatListAdapter(chatList, chat -> {
            Intent intent = new Intent(MainActivity.this, ChatActivity.class);
            intent.putExtra("chat_id", chat.getId());
            intent.putExtra("peer_name", chat.getName());
            intent.putExtra("peer_phone", chat.getPhone());
            startActivity(intent);
        });
        rvChats.setAdapter(adapter);
    }
}
