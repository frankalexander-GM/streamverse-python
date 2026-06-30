package com.streamverse.chat.model;

import org.json.JSONObject;
import java.time.Instant;

/**
 * Modelo de un mensaje del chat (de usuario o del sistema).
 */
public class ChatMessage {
    private String id;
    private String username;
    private String content;
    private String color;
    private String avatar;       // puede ser null
    private String timestamp;    // ISO-8601
    private String type;         // "user" | "system"

    public ChatMessage(String id, String username, String content, String color,
                       String avatar, String timestamp, String type) {
        this.id = id;
        this.username = username;
        this.content = content;
        this.color = color;
        this.avatar = avatar;
        this.timestamp = timestamp;
        this.type = type;
    }

    /** Crea un mensaje de usuario con timestamp actual. */
    public static ChatMessage createUserMessage(String id, String username, String content,
                                                 String color, String avatar) {
        return new ChatMessage(id, username, content, color, avatar, Instant.now().toString(), "user");
    }

    /** Crea un mensaje del sistema con timestamp actual. */
    public static ChatMessage createSystemMessage(String id, String content) {
        return new ChatMessage(id, "System", content, "#64748b", null, Instant.now().toString(), "system");
    }

    /** Genera un ID corto aleatorio. */
    public static String generateId() {
        return java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    /** Convierte a JSONObject para enviar por WebSocket. */
    public JSONObject toJson() {
        JSONObject o = new JSONObject();
        o.put("id", id);
        o.put("username", username);
        o.put("content", content);
        o.put("color", color != null ? color : "#a855f7");
        o.put("avatar", avatar != null ? avatar : "");
        o.put("timestamp", timestamp);
        o.put("type", type);
        return o;
    }

    // Getters
    public String getId() { return id; }
    public String getUsername() { return username; }
    public String getContent() { return content; }
    public String getColor() { return color; }
    public String getAvatar() { return avatar; }
    public String getTimestamp() { return timestamp; }
    public String getType() { return type; }
}
