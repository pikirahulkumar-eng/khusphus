package com.sunao.app.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.Chat;
import java.util.ArrayList;
import java.util.List;

public class ChatListAdapter extends RecyclerView.Adapter<ChatListAdapter.ViewHolder> {
    private List<Chat> chats;
    private final OnChatClickListener listener;

    public interface OnChatClickListener {
        void onChatSelected(Chat chat);
        void onAudioCall(Chat chat);
        void onVideoCall(Chat chat);
    }

    public ChatListAdapter(List<Chat> chats, OnChatClickListener listener) {
        this.chats = new ArrayList<>(chats);
        this.listener = listener;
    }

    public void updateList(List<Chat> newChats) {
        this.chats = new ArrayList<>(newChats);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_chat_list, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Chat chat = chats.get(position);
        holder.tvName.setText(chat.getName());
        holder.tvInitial.setText(chat.getName().substring(0, 1).toUpperCase());
        holder.tvMessage.setText(chat.getLastMessage());
        holder.tvTime.setText(chat.getTimestamp());

        // Group badge
        holder.tvGroup.setVisibility(chat.isGroup() ? View.VISIBLE : View.GONE);

        // Sent checkmarks
        holder.ivCheckMark.setVisibility(chat.isSentByMe() ? View.VISIBLE : View.GONE);

        // Unread badge & card accent
        if (chat.getUnreadCount() > 0) {
            holder.tvUnread.setVisibility(View.VISIBLE);
            holder.tvUnread.setText(String.valueOf(chat.getUnreadCount()));
            holder.rootLayout.setBackgroundResource(R.drawable.bg_card_chat_unread);
        } else {
            holder.tvUnread.setVisibility(View.GONE);
            holder.rootLayout.setBackgroundResource(R.drawable.bg_card_chat);
        }

        holder.itemView.setOnClickListener(v -> listener.onChatSelected(chat));
        holder.btnAudio.setOnClickListener(v -> listener.onAudioCall(chat));
        holder.btnVideo.setOnClickListener(v -> listener.onVideoCall(chat));
    }

    @Override
    public int getItemCount() { return chats.size(); }

    static class ViewHolder extends RecyclerView.ViewHolder {
        View rootLayout;
        TextView tvName, tvInitial, tvMessage, tvTime, tvUnread, tvGroup;
        ImageView ivCheckMark;
        ImageButton btnAudio, btnVideo;

        ViewHolder(View v) {
            super(v);
            rootLayout = v.findViewById(R.id.chatCardRoot);
            tvName = v.findViewById(R.id.tvChatName);
            tvInitial = v.findViewById(R.id.tvAvatarInitial);
            tvMessage = v.findViewById(R.id.tvLastMessage);
            tvTime = v.findViewById(R.id.tvTimestamp);
            tvUnread = v.findViewById(R.id.tvUnreadBadge);
            tvGroup = v.findViewById(R.id.tvGroupBadge);
            ivCheckMark = v.findViewById(R.id.ivCheckMark);
            btnAudio = v.findViewById(R.id.btnQuickAudio);
            btnVideo = v.findViewById(R.id.btnQuickVideo);
        }
    }
}
