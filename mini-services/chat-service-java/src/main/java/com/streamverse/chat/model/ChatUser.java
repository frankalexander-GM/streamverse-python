package com.streamverse.chat.model;

/**
 * Modelo de un usuario conectado al chat.
 */
public class ChatUser {
    private final String socketId;
    private final String username;
    private final String color;
    private final String avatar;

    public ChatUser(String socketId, String username, String color, String avatar) {
        this.socketId = socketId;
        this.username = username;
        this.color = color;
        this.avatar = avatar;
    }

    public String getSocketId() { return socketId; }
    public String getUsername() { return username; }
    public String getColor() { return color; }
    public String getAvatar() { return avatar; }
}
