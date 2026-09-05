package com.sunao.app.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.sunao.app.data.model.Chat;
import com.sunao.app.data.model.Message;
import java.util.ArrayList;
import java.util.List;

public class DatabaseHelper extends SQLiteOpenHelper {
    private static final String DATABASE_NAME = "sunao_offline.db";
    private static final int DATABASE_VERSION = 2;

    public DatabaseHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE chats (" +
                "id TEXT PRIMARY KEY, " +
                "name TEXT, " +
                "phone TEXT, " +
                "last_message TEXT, " +
                "timestamp TEXT, " +
                "unread_count INTEGER, " +
                "is_online INTEGER, " +
                "is_group INTEGER)");

        db.execSQL("CREATE TABLE messages (" +
                "id TEXT PRIMARY KEY, " +
                "chat_id TEXT, " +
                "text TEXT, " +
                "time TEXT, " +
                "is_me INTEGER)");

        // Rich seed data exactly matching khusphus design
        db.execSQL("INSERT OR REPLACE INTO chats VALUES ('1', 'Rahul Kumar', '9876543210', 'Bhai calling 100% working hai!', '10:30 AM', 2, 1, 0)");
        db.execSQL("INSERT OR REPLACE INTO chats VALUES ('2', 'Team Sunao', '9123456789', 'Pure Native Android architecture live 🔥', '09:15 AM', 1, 1, 1)");
        db.execSQL("INSERT OR REPLACE INTO chats VALUES ('3', 'Priya Sharma', '9811223344', 'Voice note check kiya kya?', 'Yesterday', 0, 1, 0)");
        db.execSQL("INSERT OR REPLACE INTO chats VALUES ('4', 'Vikram Singh', '9700112233', 'WebRTC call testing done.', 'Yesterday', 0, 0, 0)");
        db.execSQL("INSERT OR REPLACE INTO chats VALUES ('5', 'Sneha Patel', '9655443322', 'See you in the evening audio space!', 'Friday', 0, 1, 0)");
        db.execSQL("INSERT OR REPLACE INTO chats VALUES ('6', 'Dev Community', '9988776655', 'Zero JavaScript lag on low-end phones.', 'Friday', 0, 0, 1)");

        // Initial messages for Chat 1
        db.execSQL("INSERT OR REPLACE INTO messages VALUES ('1', '1', 'Bhai Sunao kaisa chal raha hai?', '10:28 AM', 0)");
        db.execSQL("INSERT OR REPLACE INTO messages VALUES ('2', '1', 'Bhai calling 100% working hai!', '10:30 AM', 1)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS messages");
        db.execSQL("DROP TABLE IF EXISTS chats");
        onCreate(db);
    }

    public List<Chat> getAllChats() {
        List<Chat> list = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor c = db.rawQuery("SELECT * FROM chats ORDER BY id ASC", null);
        if (c.moveToFirst()) {
            do {
                list.add(new Chat(
                        c.getString(0),
                        c.getString(1),
                        c.getString(2),
                        c.getString(3),
                        c.getString(4),
                        c.getInt(5),
                        c.getInt(6) == 1,
                        c.getInt(7) == 1
                ));
            } while (c.moveToNext());
        }
        c.close();
        return list;
    }

    public List<Message> getMessagesForChat(String chatId) {
        List<Message> list = new ArrayList<>();
        SQLiteDatabase db = this.getReadableDatabase();
        Cursor c = db.rawQuery("SELECT * FROM messages WHERE chat_id = ? ORDER BY id ASC", new String[]{chatId});
        if (c.moveToFirst()) {
            do {
                list.add(new Message(
                        c.getString(0),
                        c.getString(1),
                        c.getString(2),
                        c.getString(3),
                        c.getInt(4) == 1
                ));
            } while (c.moveToNext());
        }
        c.close();
        return list;
    }

    public void insertMessage(Message message) {
        SQLiteDatabase db = this.getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("id", message.getId());
        cv.put("chat_id", message.getChatId());
        cv.put("text", message.getText());
        cv.put("time", message.getTime());
        cv.put("is_me", message.isMe() ? 1 : 0);
        db.insertWithOnConflict("messages", null, cv, SQLiteDatabase.CONFLICT_REPLACE);

        ContentValues chatCv = new ContentValues();
        chatCv.put("last_message", message.getText());
        chatCv.put("timestamp", message.getTime());
        db.update("chats", chatCv, "id = ?", new String[]{message.getChatId()});
    }
}
