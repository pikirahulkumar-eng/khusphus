package com.sunao.app.data.model;

public class Contact {
    private String phone;
    private String name;
    private String about;

    public Contact(String phone, String name, String about) {
        this.phone = phone;
        this.name = name;
        this.about = about;
    }

    public String getPhone() { return phone; }
    public String getName() { return name; }
    public String getAbout() { return about; }
}
