package com.sunao.app.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.Chat;
import java.util.List;

public class ChatListAdapter extends RecyclerView.Adapter<ChatListAdapter.ChatViewHolder> {
    private final List<Chat> chats;
    private final OnChatClickListener listener;

    public interface OnChatClickListener {
        void onChatClick(Chat chat);
    }

    public ChatListAdapter(List<Chat> chats, OnChatClickListener listener) {
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
        holder.itemView.setOnClickListener(v -> listener.onChatClick(chat));
    }

    @Override
    public int getItemCount() { return chats.size(); }

    static class ChatViewHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvLastMsg, tvTime;
        ChatViewHolder(View v) {
            super(v);
            tvName = v.findViewById(R.id.tvChatName);
            tvLastMsg = v.findViewById(R.id.tvLastMessage);
            tvTime = v.findViewById(R.id.tvTimestamp);
        }
    }
}
