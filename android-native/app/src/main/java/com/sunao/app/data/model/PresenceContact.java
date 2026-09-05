package com.sunao.app.data.model;

public class PresenceContact {
    private String id;
    private String name;
    private String initial;
    private boolean isOnline;

    public PresenceContact(String id, String name, String initial, boolean isOnline) {
        this.id = id;
        this.name = name;
        this.initial = initial;
        this.isOnline = isOnline;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getInitial() { return initial; }
    public boolean isOnline() { return isOnline; }
}
