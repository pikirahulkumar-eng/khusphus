package com.sunao.app.ui.adapters;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.CallLog;
import java.util.ArrayList;
import java.util.List;

public class CallLogAdapter extends RecyclerView.Adapter<CallLogAdapter.ViewHolder> {
    private List<CallLog> calls;
    private final OnCallLogClickListener listener;

    public interface OnCallLogClickListener {
        void onAudioCall(CallLog call);
        void onVideoCall(CallLog call);
    }

    public CallLogAdapter(List<CallLog> calls, OnCallLogClickListener listener) {
        this.calls = new ArrayList<>(calls);
        this.listener = listener;
    }

    public void updateList(List<CallLog> newCalls) {
        this.calls = new ArrayList<>(newCalls);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_call_log, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        CallLog call = calls.get(position);
        holder.tvName.setText(call.getName());
        holder.tvInitial.setText(call.getName().substring(0, 1).toUpperCase());
        holder.tvTime.setText(call.getTime());
        holder.tvCodec.setText(call.getCodec());

        if ("missed".equalsIgnoreCase(call.getType())) {
            holder.tvDirection.setText("↙ Missed");
            holder.tvDirection.setTextColor(Color.parseColor("#EF4444"));
        } else if ("incoming".equalsIgnoreCase(call.getType())) {
            holder.tvDirection.setText("↙ Incoming");
            holder.tvDirection.setTextColor(Color.parseColor("#059669"));
        } else {
            holder.tvDirection.setText("↗ Outgoing");
            holder.tvDirection.setTextColor(Color.parseColor("#2563EB"));
        }

        holder.btnAudio.setOnClickListener(v -> listener.onAudioCall(call));
        holder.btnVideo.setOnClickListener(v -> listener.onVideoCall(call));
    }

    @Override
    public int getItemCount() { return calls.size(); }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvInitial, tvDirection, tvTime, tvCodec;
        ImageButton btnAudio, btnVideo;
        ViewHolder(View v) {
            super(v);
            tvName = v.findViewById(R.id.tvCallerName);
            tvInitial = v.findViewById(R.id.tvCallAvatarInitial);
            tvDirection = v.findViewById(R.id.tvCallDirection);
            tvTime = v.findViewById(R.id.tvCallTime);
            tvCodec = v.findViewById(R.id.tvCallCodec);
            btnAudio = v.findViewById(R.id.btnLogCallAudio);
            btnVideo = v.findViewById(R.id.btnLogCallVideo);
        }
    }
}
