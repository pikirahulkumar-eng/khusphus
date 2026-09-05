package com.sunao.app.ui;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.SunaoApp;
import com.sunao.app.data.DatabaseHelper;
import com.sunao.app.data.model.Chat;
import com.sunao.app.data.model.PresenceContact;
import com.sunao.app.ui.adapters.ChatListAdapter;
import com.sunao.app.ui.adapters.PresenceAdapter;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private RecyclerView rvChats;
    private RecyclerView rvPresence;
    private DatabaseHelper dbHelper;
    private TextView chipAll, chipUnread, chipFavorites, chipGroups;
    private List<Chat> fullChatList;
    private ChatListAdapter chatAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        dbHelper = ((SunaoApp) getApplication()).getDatabaseHelper();

        // 1. Presence Rail Setup
        rvPresence = findViewById(R.id.rvPresence);
        rvPresence.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));
        setupPresenceRail();

        // 2. Chat List Setup
        rvChats = findViewById(R.id.rvChats);
        rvChats.setLayoutManager(new LinearLayoutManager(this));
        loadChats();

        // 3. Filter Chips
        setupFilterChips();

        // 4. FAB New Chat
        findViewById(R.id.fabNewChat).setOnClickListener(v -> {
            Toast.makeText(this, "New Conversation", Toast.LENGTH_SHORT).show();
        });

        findViewById(R.id.btnCompose).setOnClickListener(v -> {
            Toast.makeText(this, "New Conversation", Toast.LENGTH_SHORT).show();
        });
    }

    private void setupPresenceRail() {
        List<PresenceContact> presenceList = new ArrayList<>();
        presenceList.add(new PresenceContact("1", "Rahul", "R", true));
        presenceList.add(new PresenceContact("2", "Team", "T", true));
        presenceList.add(new PresenceContact("3", "Priya", "P", true));
        presenceList.add(new PresenceContact("4", "Vikram", "V", false));
        presenceList.add(new PresenceContact("5", "Sneha", "S", true));

        PresenceAdapter adapter = new PresenceAdapter(presenceList, contact -> {
            openChat(contact.getId(), contact.getName(), "");
        });
        rvPresence.setAdapter(adapter);
    }

    private void loadChats() {
        fullChatList = dbHelper.getAllChats();
        chatAdapter = new ChatListAdapter(fullChatList, new ChatListAdapter.OnChatActionListener() {
            @Override
            public void onChatClick(Chat chat) {
                openChat(chat.getId(), chat.getName(), chat.getPhone());
            }

            @Override
            public void onAudioCallClick(Chat chat) {
                launchCall(chat.getName(), chat.getPhone(), false);
            }

            @Override
            public void onVideoCallClick(Chat chat) {
                launchCall(chat.getName(), chat.getPhone(), true);
            }
        });
        rvChats.setAdapter(chatAdapter);
    }

    private void setupFilterChips() {
        chipAll = findViewById(R.id.chipAll);
        chipUnread = findViewById(R.id.chipUnread);
        chipFavorites = findViewById(R.id.chipFavorites);
        chipGroups = findViewById(R.id.chipGroups);

        chipAll.setOnClickListener(v -> selectFilter(0));
        chipUnread.setOnClickListener(v -> selectFilter(1));
        chipFavorites.setOnClickListener(v -> selectFilter(2));
        chipGroups.setOnClickListener(v -> selectFilter(3));
    }

    private void selectFilter(int index) {
        resetChipStyles();
        List<Chat> filtered = new ArrayList<>();
        if (index == 0) { // All
            chipAll.setBackgroundResource(R.drawable.bg_filter_chip_active);
            chipAll.setTextColor(getColor(R.color.primary_emerald));
            filtered.addAll(fullChatList);
        } else if (index == 1) { // Unread
            chipUnread.setBackgroundResource(R.drawable.bg_filter_chip_active);
            chipUnread.setTextColor(getColor(R.color.primary_emerald));
            for (Chat c : fullChatList) {
                if (c.getUnreadCount() > 0) filtered.add(c);
            }
        } else if (index == 2) { // Favorites
            chipFavorites.setBackgroundResource(R.drawable.bg_filter_chip_active);
            chipFavorites.setTextColor(getColor(R.color.primary_emerald));
            filtered.addAll(fullChatList);
        } else if (index == 3) { // Groups
            chipGroups.setBackgroundResource(R.drawable.bg_filter_chip_active);
            chipGroups.setTextColor(getColor(R.color.primary_emerald));
            for (Chat c : fullChatList) {
                if (c.isGroup()) filtered.add(c);
            }
        }

        chatAdapter = new ChatListAdapter(filtered, new ChatListAdapter.OnChatActionListener() {
            @Override
            public void onChatClick(Chat chat) {
                openChat(chat.getId(), chat.getName(), chat.getPhone());
            }

            @Override
            public void onAudioCallClick(Chat chat) {
                launchCall(chat.getName(), chat.getPhone(), false);
            }

            @Override
            public void onVideoCallClick(Chat chat) {
                launchCall(chat.getName(), chat.getPhone(), true);
            }
        });
        rvChats.setAdapter(chatAdapter);
    }

    private void resetChipStyles() {
        chipAll.setBackgroundResource(R.drawable.bg_filter_chip_inactive);
        chipAll.setTextColor(getColor(R.color.text_secondary));
        chipUnread.setBackgroundResource(R.drawable.bg_filter_chip_inactive);
        chipUnread.setTextColor(getColor(R.color.text_secondary));
        chipFavorites.setBackgroundResource(R.drawable.bg_filter_chip_inactive);
        chipFavorites.setTextColor(getColor(R.color.text_secondary));
        chipGroups.setBackgroundResource(R.drawable.bg_filter_chip_inactive);
        chipGroups.setTextColor(getColor(R.color.text_secondary));
    }

    private void openChat(String id, String name, String phone) {
        Intent intent = new Intent(MainActivity.this, ChatActivity.class);
        intent.putExtra("chat_id", id);
        intent.putExtra("peer_name", name);
        intent.putExtra("peer_phone", phone);
        startActivity(intent);
    }

    private void launchCall(String name, String phone, boolean isVideo) {
        Intent intent = new Intent(MainActivity.this, CallActivity.class);
        intent.putExtra("peer_name", name);
        intent.putExtra("peer_phone", phone);
        intent.putExtra("is_video", isVideo);
        startActivity(intent);
    }
}
