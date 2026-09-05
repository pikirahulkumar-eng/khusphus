package com.sunao.app.ui;

import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ViewFlipper;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.DatabaseHelper;
import com.sunao.app.data.model.CallLog;
import com.sunao.app.data.model.Chat;
import com.sunao.app.data.model.Contact;
import com.sunao.app.data.model.PresenceContact;
import com.sunao.app.ui.adapters.CallLogAdapter;
import com.sunao.app.ui.adapters.ChatListAdapter;
import com.sunao.app.ui.adapters.ContactsPickerAdapter;
import com.sunao.app.ui.adapters.MomentsAdapter;
import com.sunao.app.ui.adapters.PresenceAdapter;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private DatabaseHelper dbHelper;

    // ViewFlipper & Tabs
    private ViewFlipper tabContainer;
    private View tabChatsView, tabCallsView, tabUpdatesView, tabProfileView;
    private View fabNewChatPill;

    // Bottom Navigation Elements
    private LinearLayout pillChatsActive, pillCallsActive, pillMomentsActive, pillProfileActive;
    private TextView tvNavChatsLabel, tvNavCallsLabel, tvNavMomentsLabel, tvNavProfileLabel;
    private ImageView ivNavCallsIcon, ivNavMomentsIcon, ivNavProfileIcon;

    // Header & Search
    private View normalHeaderView, searchHeaderView;
    private EditText etSearch;

    // Adapters & Lists
    private ChatListAdapter chatListAdapter;
    private CallLogAdapter callLogAdapter;
    private List<Chat> allChats;
    private List<CallLog> allCalls;

    // Active Filters
    private String activeChatFilter = "All";
    private String activeCallFilter = "all";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Enforce dark status bar matching header
        getWindow().setStatusBarColor(Color.parseColor("#0F172A"));
        getWindow().getDecorView().setSystemUiVisibility(0);

        dbHelper = new DatabaseHelper(this);
        allChats = dbHelper.getInitialChats();
        allCalls = dbHelper.getInitialCalls();

        initViews();
        setupHeaderAndSearch();
        setupChatsTab();
        setupCallsTab();
        setupUpdatesTab();
        setupProfileTab();
        setupBottomNav();
    }

    private void initViews() {
        tabContainer = findViewById(R.id.tabContainer);
        tabChatsView = findViewById(R.id.tabChatsView);
        tabCallsView = findViewById(R.id.tabCallsView);
        tabUpdatesView = findViewById(R.id.tabUpdatesView);
        tabProfileView = findViewById(R.id.tabProfileView);
        fabNewChatPill = findViewById(R.id.fabNewChatPill);

        normalHeaderView = findViewById(R.id.normalHeaderView);
        searchHeaderView = findViewById(R.id.searchHeaderView);
        etSearch = findViewById(R.id.etSearch);

        // Bottom Nav Pills
        pillChatsActive = findViewById(R.id.pillChatsActive);
        pillCallsActive = findViewById(R.id.pillCallsActive);
        pillMomentsActive = findViewById(R.id.pillMomentsActive);
        pillProfileActive = findViewById(R.id.pillProfileActive);

        tvNavChatsLabel = findViewById(R.id.tvNavChatsLabel);
        tvNavCallsLabel = findViewById(R.id.tvNavCallsLabel);
        tvNavMomentsLabel = findViewById(R.id.tvNavMomentsLabel);
        tvNavProfileLabel = findViewById(R.id.tvNavProfileLabel);

        ivNavCallsIcon = findViewById(R.id.ivNavCallsIcon);
        ivNavMomentsIcon = findViewById(R.id.ivNavMomentsIcon);
        ivNavProfileIcon = findViewById(R.id.ivNavProfileIcon);

        fabNewChatPill.setOnClickListener(v -> showNewChatModal());
    }

    private void setupHeaderAndSearch() {
        ImageButton btnCamera = findViewById(R.id.btnHeaderCamera);
        ImageButton btnSearch = findViewById(R.id.btnHeaderSearch);
        ImageButton btnMenu = findViewById(R.id.btnHeaderMenu);
        ImageButton btnSearchClose = findViewById(R.id.btnSearchClose);
        ImageButton btnSearchClear = findViewById(R.id.btnSearchClear);

        btnCamera.setOnClickListener(v -> Toast.makeText(this, "Opening camera viewfinder...", Toast.LENGTH_SHORT).show());

        btnSearch.setOnClickListener(v -> {
            normalHeaderView.setVisibility(View.GONE);
            searchHeaderView.setVisibility(View.VISIBLE);
            etSearch.requestFocus();
        });

        btnSearchClose.setOnClickListener(v -> {
            etSearch.setText("");
            searchHeaderView.setVisibility(View.GONE);
            normalHeaderView.setVisibility(View.VISIBLE);
            filterChats();
        });

        btnSearchClear.setOnClickListener(v -> etSearch.setText(""));

        etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int count, int after) { filterChats(); }
            @Override public void afterTextChanged(Editable s) {}
        });

        btnMenu.setOnClickListener(v -> {
            PopupMenu popup = new PopupMenu(this, btnMenu);
            popup.getMenu().add("New Chat");
            popup.getMenu().add("Preferences");
            popup.getMenu().add("Security Keys");
            popup.getMenu().add("Sign Out");
            popup.setOnMenuItemClickListener(item -> {
                String title = item.getTitle().toString();
                if ("New Chat".equals(title)) {
                    showNewChatModal();
                } else if ("Sign Out".equals(title)) {
                    Toast.makeText(this, "Signed out successfully", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(this, title + " opened", Toast.LENGTH_SHORT).show();
                }
                return true;
            });
            popup.show();
        });
    }

    private void setupChatsTab() {
        // Presence Rail
        RecyclerView rvPresence = findViewById(R.id.rvRecentContacts);
        rvPresence.setLayoutManager(new LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false));
        rvPresence.setAdapter(new PresenceAdapter(dbHelper.getRecentContacts(), new PresenceAdapter.OnPresenceClickListener() {
            @Override
            public void onContactClick(PresenceContact contact) {
                openChat(contact.getPhone(), contact.getName());
            }
            @Override
            public void onCallClick(PresenceContact contact) {
                startCall(contact.getPhone(), contact.getName(), false);
            }
        }));

        // Chats RecyclerView
        RecyclerView rvChats = findViewById(R.id.rvChats);
        rvChats.setLayoutManager(new LinearLayoutManager(this));
        chatListAdapter = new ChatListAdapter(allChats, new ChatListAdapter.OnChatClickListener() {
            @Override
            public void onChatSelected(Chat chat) {
                openChat(chat.getPhone(), chat.getName());
            }
            @Override
            public void onAudioCall(Chat chat) {
                startCall(chat.getPhone(), chat.getName(), false);
            }
            @Override
            public void onVideoCall(Chat chat) {
                startCall(chat.getPhone(), chat.getName(), true);
            }
        });
        rvChats.setAdapter(chatListAdapter);

        // Filter Chips
        LinearLayout chipAll = findViewById(R.id.chipAll);
        LinearLayout chipUnread = findViewById(R.id.chipUnread);
        LinearLayout chipStarred = findViewById(R.id.chipStarred);
        LinearLayout chipChannels = findViewById(R.id.chipChannels);

        chipAll.setOnClickListener(v -> updateChatFilter("All", chipAll, chipUnread, chipStarred, chipChannels));
        chipUnread.setOnClickListener(v -> updateChatFilter("Unread", chipUnread, chipAll, chipStarred, chipChannels));
        chipStarred.setOnClickListener(v -> updateChatFilter("Starred", chipStarred, chipAll, chipUnread, chipChannels));
        chipChannels.setOnClickListener(v -> updateChatFilter("Channels", chipChannels, chipAll, chipUnread, chipStarred));
    }

    private void updateChatFilter(String filter, LinearLayout selected, LinearLayout... others) {
        activeChatFilter = filter;
        selected.setBackgroundResource(R.drawable.bg_filter_chip_all_active);
        for (LinearLayout o : others) {
            o.setBackgroundResource(R.drawable.bg_filter_chip_outline);
        }
        filterChats();
    }

    private void filterChats() {
        String query = etSearch.getText().toString().toLowerCase().trim();
        List<Chat> filtered = new ArrayList<>();
        for (Chat c : allChats) {
            boolean matchesSearch = query.isEmpty() || c.getName().toLowerCase().contains(query) || c.getLastMessage().toLowerCase().contains(query);
            if (!matchesSearch) continue;

            if ("Unread".equals(activeChatFilter) && c.getUnreadCount() == 0) continue;
            if ("Starred".equals(activeChatFilter) && !c.isStarred()) continue;
            if ("Channels".equals(activeChatFilter) && !c.isGroup()) continue;

            filtered.add(c);
        }
        chatListAdapter.updateList(filtered);
    }

    private void setupCallsTab() {
        RecyclerView rvCallLog = findViewById(R.id.rvCallLog);
        rvCallLog.setLayoutManager(new LinearLayoutManager(this));
        callLogAdapter = new CallLogAdapter(allCalls, new CallLogAdapter.OnCallLogClickListener() {
            @Override
            public void onAudioCall(CallLog call) {
                startCall(call.getPhone(), call.getName(), false);
            }
            @Override
            public void onVideoCall(CallLog call) {
                startCall(call.getPhone(), call.getName(), true);
            }
        });
        rvCallLog.setAdapter(callLogAdapter);

        findViewById(R.id.btnNewCallLink).setOnClickListener(v -> 
            Toast.makeText(this, "Call Link: https://sunao.chat/call/room_7819 copied!", Toast.LENGTH_SHORT).show()
        );

        findViewById(R.id.btnKeypadTile).setOnClickListener(v -> showDialerDialog());

        TextView chipCallAll = findViewById(R.id.chipCallAll);
        TextView chipCallMissed = findViewById(R.id.chipCallMissed);
        TextView chipCallVideo = findViewById(R.id.chipCallVideo);

        chipCallAll.setOnClickListener(v -> {
            activeCallFilter = "all";
            chipCallAll.setBackgroundResource(R.drawable.bg_filter_chip_all_active);
            chipCallAll.setTextColor(Color.WHITE);
            chipCallMissed.setBackgroundResource(R.drawable.bg_filter_chip_outline);
            chipCallMissed.setTextColor(Color.parseColor("#64748B"));
            chipCallVideo.setBackgroundResource(R.drawable.bg_filter_chip_outline);
            chipCallVideo.setTextColor(Color.parseColor("#64748B"));
            filterCalls();
        });

        chipCallMissed.setOnClickListener(v -> {
            activeCallFilter = "missed";
            chipCallMissed.setBackgroundResource(R.drawable.bg_filter_chip_all_active);
            chipCallMissed.setTextColor(Color.WHITE);
            chipCallAll.setBackgroundResource(R.drawable.bg_filter_chip_outline);
            chipCallAll.setTextColor(Color.parseColor("#64748B"));
            chipCallVideo.setBackgroundResource(R.drawable.bg_filter_chip_outline);
            chipCallVideo.setTextColor(Color.parseColor("#64748B"));
            filterCalls();
        });

        chipCallVideo.setOnClickListener(v -> {
            activeCallFilter = "video";
            chipCallVideo.setBackgroundResource(R.drawable.bg_filter_chip_all_active);
            chipCallVideo.setTextColor(Color.WHITE);
            chipCallAll.setBackgroundResource(R.drawable.bg_filter_chip_outline);
            chipCallAll.setTextColor(Color.parseColor("#64748B"));
            chipCallMissed.setBackgroundResource(R.drawable.bg_filter_chip_outline);
            chipCallMissed.setTextColor(Color.parseColor("#64748B"));
            filterCalls();
        });
    }

    private void filterCalls() {
        List<CallLog> filtered = new ArrayList<>();
        for (CallLog c : allCalls) {
            if ("missed".equals(activeCallFilter) && !"missed".equalsIgnoreCase(c.getType())) continue;
            if ("video".equals(activeCallFilter) && !c.isVideo()) continue;
            filtered.add(c);
        }
        callLogAdapter.updateList(filtered);
    }

    private void setupUpdatesTab() {
        RecyclerView rvMoments = findViewById(R.id.rvMoments);
        rvMoments.setLayoutManager(new LinearLayoutManager(this));
        rvMoments.setAdapter(new MomentsAdapter(dbHelper.getMoments()));

        findViewById(R.id.btnJoinSpace).setOnClickListener(v -> 
            Toast.makeText(this, "Joined Live Audio Space!", Toast.LENGTH_SHORT).show()
        );
    }

    private void setupProfileTab() {
        findViewById(R.id.btnSignOut).setOnClickListener(v -> 
            Toast.makeText(this, "Logged out successfully", Toast.LENGTH_SHORT).show()
        );
    }

    private void setupBottomNav() {
        findViewById(R.id.navTabChats).setOnClickListener(v -> switchTab(0));
        findViewById(R.id.navTabCalls).setOnClickListener(v -> switchTab(1));
        findViewById(R.id.navTabMoments).setOnClickListener(v -> switchTab(2));
        findViewById(R.id.navTabProfile).setOnClickListener(v -> switchTab(3));
    }

    private void switchTab(int tabIndex) {
        tabContainer.setDisplayedChild(tabIndex);

        // Reset all pills
        pillChatsActive.setBackground(null);
        pillCallsActive.setBackground(null);
        pillMomentsActive.setBackground(null);
        pillProfileActive.setBackground(null);

        tvNavChatsLabel.setVisibility(View.GONE);
        tvNavCallsLabel.setVisibility(View.GONE);
        tvNavMomentsLabel.setVisibility(View.GONE);
        tvNavProfileLabel.setVisibility(View.GONE);

        ivNavCallsIcon.setColorFilter(Color.parseColor("#64748B"));
        ivNavMomentsIcon.setColorFilter(Color.parseColor("#64748B"));
        ivNavProfileIcon.setColorFilter(Color.parseColor("#64748B"));

        // Only show New Chat pill on Chats tab
        fabNewChatPill.setVisibility(tabIndex == 0 ? View.VISIBLE : View.GONE);

        if (tabIndex == 0) {
            pillChatsActive.setBackgroundResource(R.drawable.bg_bottom_nav_active_pill);
            tvNavChatsLabel.setVisibility(View.VISIBLE);
        } else if (tabIndex == 1) {
            pillCallsActive.setBackgroundResource(R.drawable.bg_bottom_nav_active_pill);
            tvNavCallsLabel.setVisibility(View.VISIBLE);
            ivNavCallsIcon.setColorFilter(Color.WHITE);
        } else if (tabIndex == 2) {
            pillMomentsActive.setBackgroundResource(R.drawable.bg_bottom_nav_active_pill);
            tvNavMomentsLabel.setVisibility(View.VISIBLE);
            ivNavMomentsIcon.setColorFilter(Color.WHITE);
        } else if (tabIndex == 3) {
            pillProfileActive.setBackgroundResource(R.drawable.bg_bottom_nav_active_pill);
            tvNavProfileLabel.setVisibility(View.VISIBLE);
            ivNavProfileIcon.setColorFilter(Color.WHITE);
        }
    }

    private void showNewChatModal() {
        View dialogView = getLayoutInflater().inflate(R.layout.dialog_new_chat, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setView(dialogView)
            .create();

        RecyclerView rvPicker = dialogView.findViewById(R.id.rvPickerContacts);
        rvPicker.setLayoutManager(new LinearLayoutManager(this));
        rvPicker.setAdapter(new ContactsPickerAdapter(dbHelper.getAllContacts(), contact -> {
            dialog.dismiss();
            openChat(contact.getPhone(), contact.getName());
        }));

        dialogView.findViewById(R.id.btnCreateGroup).setOnClickListener(v -> {
            dialog.dismiss();
            Toast.makeText(this, "Create group screen", Toast.LENGTH_SHORT).show();
        });

        dialogView.findViewById(R.id.btnNewContact).setOnClickListener(v -> {
            dialog.dismiss();
            Toast.makeText(this, "Add new contact", Toast.LENGTH_SHORT).show();
        });

        dialog.show();
    }

    private void showDialerDialog() {
        View dialogView = getLayoutInflater().inflate(R.layout.dialog_dialer, null);
        AlertDialog dialog = new AlertDialog.Builder(this)
            .setView(dialogView)
            .create();

        TextView tvNumber = dialogView.findViewById(R.id.tvDialedNumber);
        StringBuilder number = new StringBuilder();

        int[] btnIds = {
            R.id.btnKey1, R.id.btnKey2, R.id.btnKey3,
            R.id.btnKey4, R.id.btnKey5, R.id.btnKey6,
            R.id.btnKey7, R.id.btnKey8, R.id.btnKey9,
            R.id.btnKeyStar, R.id.btnKey0
        };

        for (int id : btnIds) {
            Button b = dialogView.findViewById(id);
            b.setOnClickListener(v -> {
                number.append(b.getText());
                tvNumber.setText(number.toString());
            });
        }

        dialogView.findViewById(R.id.btnKeyBackspace).setOnClickListener(v -> {
            if (number.length() > 0) {
                number.deleteCharAt(number.length() - 1);
                tvNumber.setText(number.toString());
            }
        });

        dialogView.findViewById(R.id.btnDialAudio).setOnClickListener(v -> {
            if (number.length() > 2) {
                dialog.dismiss();
                startCall(number.toString(), number.toString(), false);
            } else {
                Toast.makeText(this, "Enter valid number", Toast.LENGTH_SHORT).show();
            }
        });

        dialogView.findViewById(R.id.btnDialVideo).setOnClickListener(v -> {
            if (number.length() > 2) {
                dialog.dismiss();
                startCall(number.toString(), number.toString(), true);
            } else {
                Toast.makeText(this, "Enter valid number", Toast.LENGTH_SHORT).show();
            }
        });

        dialog.show();
    }

    private void openChat(String phone, String name) {
        Intent intent = new Intent(this, ChatActivity.class);
        intent.putExtra("peer_phone", phone);
        intent.putExtra("peer_name", name);
        startActivity(intent);
    }

    private void startCall(String phone, String name, boolean isVideo) {
        Intent intent = new Intent(this, CallActivity.class);
        intent.putExtra("peer_phone", phone);
        intent.putExtra("peer_name", name);
        intent.putExtra("is_video", isVideo);
        startActivity(intent);
    }
}
