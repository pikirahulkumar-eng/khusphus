package com.sunao.app.data;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.sunao.app.data.model.Chat;
import com.sunao.app.data.model.PresenceContact;
import com.sunao.app.data.model.CallLog;
import com.sunao.app.data.model.Moment;
import com.sunao.app.data.model.Contact;
import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "sunao_messenger.db";
    private static final int DATABASE_VERSION = 2;

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE chats (phone TEXT PRIMARY KEY, name TEXT, last_message TEXT, timestamp TEXT, unread_count INTEGER, is_online INTEGER, is_group INTEGER, sent_by_me INTEGER, is_starred INTEGER)");
        db.execSQL("CREATE TABLE calls (id TEXT PRIMARY KEY, phone TEXT, name TEXT, type TEXT, is_video INTEGER, time TEXT, codec TEXT)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS chats");
        db.execSQL("DROP TABLE IF EXISTS calls");
        onCreate(db);
    }

    public List<Chat> getInitialChats() {
        List<Chat> list = new ArrayList<>();
        list.add(new Chat("9876543210", "Rahul Bhai", "Bhai Render pe server 100% live chal raha hai! 🔥", "11:42 AM", 2, true, false, false, true));
        list.add(new Chat("9998887776", "Papa", "Theek hai beta, aate waqt le aana.", "10:15 AM", 0, true, false, true, false));
        list.add(new Chat("1122334455", "Neha Sharma", "Call me when you are free! Important discuss karna hai.", "9:30 AM", 1, true, false, false, true));
        list.add(new Chat("grp_sunao_core", "KhusPhus Core Devs 🚀", "Amit: WebRTC low latency audio call chal raha hai.", "Yesterday", 4, true, true, false, true));
        list.add(new Chat("5566778899", "Amit Patel", "Photos send kar diye hain mail par.", "Yesterday", 0, true, false, true, false));
        list.add(new Chat("grp_college_gang", "College Gang 2026 🎉", "Vikram: Sunday cafe me milte hain sab log!", "04/09/2026", 0, false, true, false, false));
        list.add(new Chat("6677889900", "Priya Verma", "Thanks a lot for the help! 😊", "03/09/2026", 0, true, false, true, false));
        return list;
    }

    public List<PresenceContact> getRecentContacts() {
        List<PresenceContact> list = new ArrayList<>();
        list.add(new PresenceContact("9876543210", "Rahul", true));
        list.add(new PresenceContact("9998887776", "Papa", true));
        list.add(new PresenceContact("1122334455", "Neha", true));
        list.add(new PresenceContact("grp_sunao_core", "KhusPhus", true));
        list.add(new PresenceContact("5566778899", "Amit", true));
        list.add(new PresenceContact("grp_college_gang", "College", true));
        list.add(new PresenceContact("6677889900", "Priya", true));
        return list;
    }

    public List<CallLog> getInitialCalls() {
        List<CallLog> list = new ArrayList<>();
        list.add(new CallLog("c1", "9876543210", "Rahul Bhai", "incoming", true, "Today, 11:20 AM", "HD 720p"));
        list.add(new CallLog("c2", "1122334455", "Neha Sharma", "missed", false, "Today, 9:28 AM", "Opus 48k"));
        list.add(new CallLog("c3", "9998887776", "Papa", "outgoing", false, "Yesterday, 8:45 PM", "Opus 48k"));
        list.add(new CallLog("c4", "5566778899", "Amit Patel", "incoming", false, "September 3, 4:10 PM", "Opus 48k"));
        return list;
    }

    public List<Moment> getMoments() {
        List<Moment> list = new ArrayList<>();
        list.add(new Moment("m1", "Rahul Bhai", "18m ago", "🎤 Voice update live!"));
        list.add(new Moment("m2", "Neha Sharma", "45m ago", "📸 Weekend mood"));
        list.add(new Moment("m3", "Amit Patel", "2h ago", "🎤 New photo posted"));
        list.add(new Moment("m4", "Priya Verma", "5h ago", "📸 At cafe"));
        return list;
    }

    public List<Contact> getAllContacts() {
        List<Contact> list = new ArrayList<>();
        list.add(new Contact("9876543210", "Rahul Bhai", "Building Sunao Native Core 🚀"));
        list.add(new Contact("9998887776", "Papa", "Available"));
        list.add(new Contact("1122334455", "Neha Sharma", "Busy at work 🎧"));
        list.add(new Contact("5566778899", "Amit Patel", "Urgent calls only"));
        list.add(new Contact("6677889900", "Priya Verma", "Exploring new horizons ✨"));
        list.add(new Contact("7788990011", "Rohan Gupta", "Coding late night 💻"));
        list.add(new Contact("8899001122", "Sneha Roy", "Living in the moment"));
        return list;
    }
}
