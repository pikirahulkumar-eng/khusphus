package com.sunao.app.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.PresenceContact;
import java.util.List;

public class PresenceAdapter extends RecyclerView.Adapter<PresenceAdapter.ViewHolder> {
    private final List<PresenceContact> list;
    private final OnPresenceClickListener listener;

    public interface OnPresenceClickListener {
        void onPresenceClick(PresenceContact contact);
    }

    public PresenceAdapter(List<PresenceContact> list, OnPresenceClickListener listener) {
        this.list = list;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_presence_contact, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        PresenceContact item = list.get(position);
        holder.tvName.setText(item.getName());
        holder.tvInitial.setText(item.getInitial());
        holder.liveDot.setVisibility(item.isOnline() ? View.VISIBLE : View.GONE);
        holder.itemView.setOnClickListener(v -> listener.onPresenceClick(item));
    }

    @Override
    public int getItemCount() {
        return list.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvInitial;
        View liveDot;

        ViewHolder(View v) {
            super(v);
            tvName = v.findViewById(R.id.tvPresenceName);
            tvInitial = v.findViewById(R.id.tvPresenceInitial);
            liveDot = v.findViewById(R.id.presenceLiveDot);
        }
    }
}
