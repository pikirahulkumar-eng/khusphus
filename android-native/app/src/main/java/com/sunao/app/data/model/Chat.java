package com.sunao.app.data.model;

public class Chat {
    private String id;
    private String name;
    private String phone;
    private String lastMessage;
    private String timestamp;
    private int unreadCount;
    private boolean isOnline;
    private boolean isGroup;

    public Chat(String id, String name, String phone, String lastMessage, String timestamp, int unreadCount, boolean isOnline, boolean isGroup) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.lastMessage = lastMessage;
        this.timestamp = timestamp;
        this.unreadCount = unreadCount;
        this.isOnline = isOnline;
        this.isGroup = isGroup;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public String getLastMessage() { return lastMessage; }
    public String getTimestamp() { return timestamp; }
    public int getUnreadCount() { return unreadCount; }
    public boolean isOnline() { return isOnline; }
    public boolean isGroup() { return isGroup; }
}
