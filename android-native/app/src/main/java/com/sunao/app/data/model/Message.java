package com.sunao.app.data.model;

public class Message {
    private String id;
    private String chatId;
    private String text;
    private String time;
    private boolean isMe;

    public Message(String id, String chatId, String text, String time, boolean isMe) {
        this.id = id;
        this.chatId = chatId;
        this.text = text;
        this.time = time;
        this.isMe = isMe;
    }

    public String getId() { return id; }
    public String getChatId() { return chatId; }
    public String getText() { return text; }
    public String getTime() { return time; }
    public boolean isMe() { return isMe; }
}
