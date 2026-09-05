package com.sunao.app.ui.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.sunao.app.R;
import com.sunao.app.data.model.Moment;
import java.util.List;

public class MomentsAdapter extends RecyclerView.Adapter<MomentsAdapter.ViewHolder> {
    private final List<Moment> moments;

    public MomentsAdapter(List<Moment> moments) {
        this.moments = moments;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_moment, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Moment m = moments.get(position);
        holder.tvAuthor.setText(m.getName());
        holder.tvInitial.setText(m.getName().substring(0, 1).toUpperCase());
        holder.tvTime.setText(m.getTime() + " • " + m.getText());
    }

    @Override
    public int getItemCount() { return moments.size(); }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvAuthor, tvInitial, tvTime;
        ViewHolder(View v) {
            super(v);
            tvAuthor = v.findViewById(R.id.tvMomentAuthor);
            tvInitial = v.findViewById(R.id.tvMomentInitial);
            tvTime = v.findViewById(R.id.tvMomentTime);
        }
    }
}
