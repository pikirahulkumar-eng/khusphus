package com.sunao.app.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.Message;
import java.util.List;

public class MessageAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    private static final int VIEW_TYPE_SENT = 1;
    private static final int VIEW_TYPE_RECEIVED = 2;
    private final List<Message> messages;

    public MessageAdapter(List<Message> messages) {
        this.messages = messages;
    }

    @Override
    public int getItemViewType(int position) {
        return messages.get(position).isMe() ? VIEW_TYPE_SENT : VIEW_TYPE_RECEIVED;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == VIEW_TYPE_SENT) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_message_sent, parent, false);
            return new SentViewHolder(v);
        } else {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_message_received, parent, false);
            return new ReceivedViewHolder(v);
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        Message msg = messages.get(position);
        if (holder instanceof SentViewHolder) {
            ((SentViewHolder) holder).tvText.setText(msg.getText());
            ((SentViewHolder) holder).tvTime.setText(msg.getTime());
        } else if (holder instanceof ReceivedViewHolder) {
            ((ReceivedViewHolder) holder).tvText.setText(msg.getText());
            ((ReceivedViewHolder) holder).tvTime.setText(msg.getTime());
        }
    }

    @Override
    public int getItemCount() { return messages.size(); }

    static class SentViewHolder extends RecyclerView.ViewHolder {
        TextView tvText, tvTime;
        SentViewHolder(View v) {
            super(v);
            tvText = v.findViewById(R.id.tvSentText);
            tvTime = v.findViewById(R.id.tvSentTime);
        }
    }

    static class ReceivedViewHolder extends RecyclerView.ViewHolder {
        TextView tvText, tvTime;
        ReceivedViewHolder(View v) {
            super(v);
            tvText = v.findViewById(R.id.tvReceivedText);
            tvTime = v.findViewById(R.id.tvReceivedTime);
        }
    }
}
