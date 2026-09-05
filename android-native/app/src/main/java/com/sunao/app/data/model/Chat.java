package com.sunao.app.data.model;

public class Chat {
    private String phone;
    private String name;
    private String lastMessage;
    private String timestamp;
    private int unreadCount;
    private boolean isOnline;
    private boolean isGroup;
    private boolean sentByMe;
    private boolean isStarred;

    public Chat(String phone, String name, String lastMessage, String timestamp, int unreadCount, boolean isOnline, boolean isGroup, boolean sentByMe, boolean isStarred) {
        this.phone = phone;
        this.name = name;
        this.lastMessage = lastMessage;
        this.timestamp = timestamp;
        this.unreadCount = unreadCount;
        this.isOnline = isOnline;
        this.isGroup = isGroup;
        this.sentByMe = sentByMe;
        this.isStarred = isStarred;
    }

    public String getPhone() { return phone; }
    public String getName() { return name; }
    public String getLastMessage() { return lastMessage; }
    public String getTimestamp() { return timestamp; }
    public int getUnreadCount() { return unreadCount; }
    public boolean isOnline() { return isOnline; }
    public boolean isGroup() { return isGroup; }
    public boolean isSentByMe() { return sentByMe; }
    public boolean isStarred() { return isStarred; }
}
