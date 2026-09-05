package com.sunao.app.data.model;

public class Moment {
    private String id;
    private String name;
    private String time;
    private String text;

    public Moment(String id, String name, String time, String text) {
        this.id = id;
        this.name = name;
        this.time = time;
        this.text = text;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getTime() { return time; }
    public String getText() { return text; }
}
