package com.sunao.app.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.Contact;
import java.util.List;

public class ContactsPickerAdapter extends RecyclerView.Adapter<ContactsPickerAdapter.ViewHolder> {
    private final List<Contact> contacts;
    private final OnContactSelectListener listener;

    public interface OnContactSelectListener {
        void onSelect(Contact contact);
    }

    public ContactsPickerAdapter(List<Contact> contacts, OnContactSelectListener listener) {
        this.contacts = contacts;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_moment, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Contact c = contacts.get(position);
        holder.tvName.setText(c.getName());
        holder.tvInitial.setText(c.getName().substring(0, 1).toUpperCase());
        holder.tvAbout.setText(c.getAbout());
        holder.itemView.setOnClickListener(v -> listener.onSelect(c));
    }

    @Override
    public int getItemCount() { return contacts.size(); }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvInitial, tvAbout;
        ViewHolder(View v) {
            super(v);
            tvName = v.findViewById(R.id.tvMomentAuthor);
            tvInitial = v.findViewById(R.id.tvMomentInitial);
            tvAbout = v.findViewById(R.id.tvMomentTime);
        }
    }
}
