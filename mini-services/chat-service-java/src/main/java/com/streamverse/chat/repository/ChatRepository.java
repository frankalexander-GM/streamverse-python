package com.streamverse.chat.repository;

import com.streamverse.chat.config.AppConfig;
import com.streamverse.chat.model.ChatMessage;

import java.sql.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.logging.Logger;

/**
 * Capa de acceso a datos (Repository Pattern).
 * Aísla toda la interacción con SQLite del resto de la aplicación.
 */
public class ChatRepository {

    private static final Logger LOGGER = Logger.getLogger(ChatRepository.class.getName());

    private Connection connection;

    /** Abre la conexión y crea la tabla si no existe. */
    public void connect() throws SQLException {
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException e) {
            throw new SQLException("Driver SQLite no encontrado", e);
        }
        connection = DriverManager.getConnection("jdbc:sqlite:" + AppConfig.DB_PATH);
        connection.createStatement().executeUpdate(
            "CREATE TABLE IF NOT EXISTS chat_messages (" +
            "  id TEXT PRIMARY KEY," +
            "  username TEXT NOT NULL," +
            "  content TEXT NOT NULL," +
            "  color TEXT DEFAULT '#a855f7'," +
            "  avatar TEXT," +
            "  createdAt TEXT" +
            ")"
        );
        System.out.println("[repo] Conectado a SQLite: " + AppConfig.DB_PATH);
    }

    /** Cierra la conexión. */
    public void close() {
        if (connection != null) {
            try {
                connection.close();
            } catch (SQLException e) {
                // close fallido no debe tapar el error original
                LOGGER.fine("close de SQLite falló: " + e.getMessage());
            }
        }
    }

    /** Persiste un mensaje de usuario. */
    public void saveMessage(ChatMessage msg) {
        if (!"user".equals(msg.getType())) return; // los del sistema no se guardan
        try (PreparedStatement ps = connection.prepareStatement(
                "INSERT INTO chat_messages (id, username, content, color, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?)")) {
            ps.setString(1, msg.getId());
            ps.setString(2, msg.getUsername());
            ps.setString(3, msg.getContent());
            ps.setString(4, msg.getColor());
            ps.setString(5, msg.getAvatar() != null ? msg.getAvatar() : "");
            ps.setString(6, msg.toJson().getString("timestamp"));
            ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[repo] Error guardando mensaje: " + e.getMessage());
        }
    }

    /** Obtiene el historial reciente (orden ascendente). */
    public List<ChatMessage> getRecentHistory(int limit) {
        List<ChatMessage> messages = new ArrayList<>();
        try (PreparedStatement ps = connection.prepareStatement(
                "SELECT id, username, content, color, avatar, createdAt FROM chat_messages ORDER BY createdAt DESC LIMIT ?")) {
            ps.setInt(1, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    messages.add(new ChatMessage(
                        rs.getString("id"),
                        rs.getString("username"),
                        rs.getString("content"),
                        rs.getString("color") != null ? rs.getString("color") : "#a855f7",
                        rs.getString("avatar"),
                        rs.getString("createdAt"),
                        "user"
                    ));
                }
            }
        } catch (SQLException e) {
            System.err.println("[repo] Error obteniendo historial: " + e.getMessage());
        }
        // Invertir para orden ascendente (más antiguo primero)
        Collections.reverse(messages);
        return messages;
    }
}
