package com.streamverse.chat.service;

import com.streamverse.chat.config.AppConfig;
import com.streamverse.chat.model.ChatMessage;
import com.streamverse.chat.model.ChatUser;
import com.streamverse.chat.repository.ChatRepository;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Capa de lógica de negocio (Service Pattern).
 * Gestiona usuarios conectados, mensajes e historial.
 * No toca la BD directamente (usa el repositorio).
 */
public class ChatService {

    private final ChatRepository repository;
    // Mapa de conexiones: socketId -> ChatUser (thread-safe)
    private final Map<String, ChatUser> connections = new ConcurrentHashMap<>();

    public ChatService(ChatRepository repository) {
        this.repository = repository;
    }

    /** Registra un usuario conectado. */
    public ChatUser registerUser(String socketId, String username) {
        String name = username != null ? username.trim() : "Invitado";
        if (name.length() > AppConfig.MAX_USERNAME_LENGTH) {
            name = name.substring(0, AppConfig.MAX_USERNAME_LENGTH);
        }
        if (name.isEmpty()) name = "Invitado";

        String color = AppConfig.COLORS[(int) (Math.random() * AppConfig.COLORS.length)];
        String avatar = AppConfig.AVATAR_BASE + URLEncoder.encode(name, StandardCharsets.UTF_8);
        ChatUser user = new ChatUser(socketId, name, color, avatar);
        connections.put(socketId, user);
        return user;
    }

    /** Elimina un usuario conectado. */
    public ChatUser unregisterUser(String socketId) {
        return connections.remove(socketId);
    }

    /** Obtiene un usuario por socketId. */
    public ChatUser getUser(String socketId) {
        return connections.get(socketId);
    }

    /** Número de usuarios en línea. */
    public int onlineCount() {
        return connections.size();
    }

    /** Historial reciente desde la BD. */
    public List<ChatMessage> getHistory() {
        return repository.getRecentHistory(AppConfig.HISTORY_LIMIT);
    }

    /** Crea, persiste y devuelve un mensaje de usuario. */
    public ChatMessage createMessage(ChatUser user, String content) {
        String text = content != null ? content.trim() : "";
        if (text.length() > AppConfig.MAX_MESSAGE_LENGTH) {
            text = text.substring(0, AppConfig.MAX_MESSAGE_LENGTH);
        }
        ChatMessage msg = ChatMessage.createUserMessage(
            ChatMessage.generateId(), user.getUsername(), text, user.getColor(), user.getAvatar()
        );
        repository.saveMessage(msg);
        return msg;
    }

    /** Crea un mensaje del sistema (no se persiste). */
    public ChatMessage createSystemMessage(String content) {
        return ChatMessage.createSystemMessage(ChatMessage.generateId(), content);
    }
}
