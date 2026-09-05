package com.sunao.app.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.Chat;
import java.util.List;

public class ChatListAdapter extends RecyclerView.Adapter<ChatListAdapter.ChatViewHolder> {
    private final List<Chat> chats;
    private final OnChatActionListener listener;

    public interface OnChatActionListener {
        void onChatClick(Chat chat);
        void onAudioCallClick(Chat chat);
        void onVideoCallClick(Chat chat);
    }

    public ChatListAdapter(List<Chat> chats, OnChatActionListener listener) {
        this.chats = chats;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ChatViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_chat_list, parent, false);
        return new ChatViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ChatViewHolder holder, int position) {
        Chat chat = chats.get(position);
        holder.tvName.setText(chat.getName());
        holder.tvLastMsg.setText(chat.getLastMessage());
        holder.tvTime.setText(chat.getTimestamp());

        String initial = chat.getName().isEmpty() ? "?" : chat.getName().substring(0, 1).toUpperCase();
        holder.tvInitial.setText(initial);

        // Online Indicator Dot
        holder.onlineIndicator.setVisibility(chat.isOnline() ? View.VISIBLE : View.GONE);

        // Unread Badge Pill
        if (chat.getUnreadCount() > 0) {
            holder.tvUnread.setVisibility(View.VISIBLE);
            holder.tvUnread.setText(String.valueOf(chat.getUnreadCount()));
        } else {
            holder.tvUnread.setVisibility(View.GONE);
        }

        // Click listeners
        holder.itemView.setOnClickListener(v -> listener.onChatClick(chat));
        holder.btnAudio.setOnClickListener(v -> listener.onAudioCallClick(chat));
        holder.btnVideo.setOnClickListener(v -> listener.onVideoCallClick(chat));
    }

    @Override
    public int getItemCount() {
        return chats.size();
    }

    static class ChatViewHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvLastMsg, tvTime, tvInitial, tvUnread;
        View onlineIndicator;
        ImageButton btnAudio, btnVideo;

        ChatViewHolder(View v) {
            super(v);
            tvName = v.findViewById(R.id.tvChatName);
            tvLastMsg = v.findViewById(R.id.tvLastMessage);
            tvTime = v.findViewById(R.id.tvTimestamp);
            tvInitial = v.findViewById(R.id.tvAvatarInitial);
            tvUnread = v.findViewById(R.id.tvUnreadBadge);
            onlineIndicator = v.findViewById(R.id.onlineIndicator);
            btnAudio = v.findViewById(R.id.btnQuickAudio);
            btnVideo = v.findViewById(R.id.btnQuickVideo);
        }
    }
}
