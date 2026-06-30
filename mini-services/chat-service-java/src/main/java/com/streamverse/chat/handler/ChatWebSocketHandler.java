package com.streamverse.chat.handler;

import com.streamverse.chat.config.AppConfig;
import com.streamverse.chat.model.ChatMessage;
import com.streamverse.chat.model.ChatUser;
import com.streamverse.chat.service.ChatService;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.net.InetSocketAddress;

/**
 * Capa de transporte (WebSocket Handler).
 * =======================================
 * Traduce eventos de WebSocket a llamadas del servicio de chat.
 * No contiene lógica de negocio; solo orquestación.
 *
 * Usa la librería org.java_websocket (Java-WebSocket).
 * El servidor escucha en path "/" (requerido por el gateway Caddy).
 */
public class ChatWebSocketHandler extends WebSocketServer {

    private final ChatService service;

    public ChatWebSocketHandler(int port, ChatService service) {
        super(new InetSocketAddress(port));
        this.service = service;
        // Aceptar conexiones en cualquier path (el gateway usa "/")
        setReuseAddr(true);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        String socketId = conn.getRemoteSocketAddress() != null
            ? conn.getRemoteSocketAddress().toString()
            : String.valueOf(conn.hashCode());
        System.out.println("[chat] conexión abierta: " + socketId);

        // Enviar historial al nuevo usuario
        JSONArray historyArray = new JSONArray();
        for (ChatMessage m : service.getHistory()) {
            historyArray.put(m.toJson());
        }
        sendEvent(conn, "chat:history", historyArray);
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        String socketId = getSocketId(conn);
        ChatUser user = service.unregisterUser(socketId);
        if (user != null) {
            // Notificar a todos que el usuario salió
            broadcastEvent("chat:users", new JSONObject().put("count", service.onlineCount()));
            ChatMessage sysMsg = service.createSystemMessage(user.getUsername() + " salió del chat");
            broadcastEvent("chat:system", sysMsg.toJson());
            System.out.println("[chat] " + user.getUsername() + " salió (" + service.onlineCount() + " en línea)");
        }
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        String socketId = getSocketId(conn);
        try {
            JSONObject payload = new JSONObject(message);
            String event = payload.optString("event", "");
            JSONObject data = payload.optJSONObject("data");
            if (data == null) data = new JSONObject();

            switch (event) {
                case "chat:join":
                    handleJoin(conn, socketId, data);
                    break;
                case "chat:message":
                    handleMessage(conn, socketId, data);
                    break;
                case "chat:typing":
                    handleTyping(conn, socketId, data);
                    break;
                default:
                    // evento desconocido, ignorar
                    break;
            }
        } catch (Exception e) {
            System.err.println("[chat] Error procesando mensaje: " + e.getMessage());
        }
    }

    /** Maneja el evento chat:join. */
    private void handleJoin(WebSocket conn, String socketId, JSONObject data) {
        String username = data.optString("username", "Invitado");
        ChatUser user = service.registerUser(socketId, username);

        // Confirmar al usuario que se unió
        JSONObject userData = new JSONObject();
        userData.put("username", user.getUsername());
        userData.put("color", user.getColor());
        userData.put("avatar", user.getAvatar());
        sendEvent(conn, "chat:joined", new JSONObject().put("user", userData));

        // Notificar a todos el nuevo conteo
        broadcastEvent("chat:users", new JSONObject().put("count", service.onlineCount()));

        // Mensaje del sistema
        ChatMessage sysMsg = service.createSystemMessage(user.getUsername() + " se unió al chat");
        broadcastEvent("chat:system", sysMsg.toJson());

        System.out.println("[chat] " + user.getUsername() + " se unió (" + service.onlineCount() + " en línea)");
    }

    /** Maneja el evento chat:message. */
    private void handleMessage(WebSocket conn, String socketId, JSONObject data) {
        ChatUser user = service.getUser(socketId);
        if (user == null) return;
        String content = data.optString("content", "");
        if (content.trim().isEmpty()) return;

        ChatMessage msg = service.createMessage(user, content);
        broadcastEvent("chat:message", msg.toJson());
    }

    /** Maneja el evento chat:typing. */
    private void handleTyping(WebSocket conn, String socketId, JSONObject data) {
        ChatUser user = service.getUser(socketId);
        if (user == null) return;
        boolean isTyping = data.optBoolean("isTyping", false);
        JSONObject typingData = new JSONObject();
        typingData.put("username", user.getUsername());
        typingData.put("isTyping", isTyping);
        // Broadcast a todos (el frontend filtra los propios)
        broadcastEvent("chat:typing", typingData);
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("[chat] Error WebSocket: " + ex.getMessage());
    }

    @Override
    public void onStart() {
        System.out.println("[chat] Servidor WebSocket iniciado");
    }

    // ---- Utilidades ----

    /** Obtiene un ID único para la conexión. */
    private String getSocketId(WebSocket conn) {
        return conn.getRemoteSocketAddress() != null
            ? conn.getRemoteSocketAddress().toString()
            : String.valueOf(conn.hashCode());
    }

    /** Envía un evento a una conexión específica. */
    private void sendEvent(WebSocket conn, String event, Object data) {
        JSONObject envelope = new JSONObject();
        envelope.put("event", event);
        envelope.put("data", data);
        conn.send(envelope.toString());
    }

    /** Hace broadcast de un evento a TODAS las conexiones. */
    private void broadcastEvent(String event, Object data) {
        JSONObject envelope = new JSONObject();
        envelope.put("event", event);
        envelope.put("data", data);
        broadcast(envelope.toString());
    }
}
