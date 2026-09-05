package com.sunao.app.data.model;

public class CallLog {
    private String id;
    private String phone;
    private String name;
    private String type; // "incoming", "missed", "outgoing"
    private boolean isVideo;
    private String time;
    private String codec;

    public CallLog(String id, String phone, String name, String type, boolean isVideo, String time, String codec) {
        this.id = id;
        this.phone = phone;
        this.name = name;
        this.type = type;
        this.isVideo = isVideo;
        this.time = time;
        this.codec = codec;
    }

    public String getId() { return id; }
    public String getPhone() { return phone; }
    public String getName() { return name; }
    public String getType() { return type; }
    public boolean isVideo() { return isVideo; }
    public String getTime() { return time; }
    public String getCodec() { return codec; }
}
