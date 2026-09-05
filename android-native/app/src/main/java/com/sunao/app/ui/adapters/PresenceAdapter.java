package com.sunao.app.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.PresenceContact;
import java.util.List;

public class PresenceAdapter extends RecyclerView.Adapter<PresenceAdapter.ViewHolder> {
    private final List<PresenceContact> contacts;
    private final OnPresenceClickListener listener;

    public interface OnPresenceClickListener {
        void onContactClick(PresenceContact contact);
        void onCallClick(PresenceContact contact);
    }

    public PresenceAdapter(List<PresenceContact> contacts, OnPresenceClickListener listener) {
        this.contacts = contacts;
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
        PresenceContact contact = contacts.get(position);
        holder.tvName.setText(contact.getName());
        holder.tvInitial.setText(contact.getName().substring(0, 1).toUpperCase());
        holder.itemView.setOnClickListener(v -> listener.onContactClick(contact));
        holder.btnCall.setOnClickListener(v -> listener.onCallClick(contact));
    }

    @Override
    public int getItemCount() { return contacts.size(); }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvInitial;
        ImageButton btnCall;
        ViewHolder(View v) {
            super(v);
            tvName = v.findViewById(R.id.tvPresenceName);
            tvInitial = v.findViewById(R.id.tvPresenceInitial);
            btnCall = v.findViewById(R.id.btnMiniCall);
        }
    }
}
