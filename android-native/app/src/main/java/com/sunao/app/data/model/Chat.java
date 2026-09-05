package com.sunao.app.data.model;

public class Chat {
    private String id;
    private String name;
    private String phone;
    private String lastMessage;
    private String timestamp;
    private int unreadCount;

    public Chat(String id, String name, String phone, String lastMessage, String timestamp, int unreadCount) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.lastMessage = lastMessage;
        this.timestamp = timestamp;
        this.unreadCount = unreadCount;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public String getLastMessage() { return lastMessage; }
    public String getTimestamp() { return timestamp; }
    public int getUnreadCount() { return unreadCount; }
}
