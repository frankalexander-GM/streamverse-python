package com.streamverse.chat;

import com.streamverse.chat.config.AppConfig;
import com.streamverse.chat.handler.ChatWebSocketHandler;
import com.streamverse.chat.repository.ChatRepository;
import com.streamverse.chat.service.ChatService;

/**
 * Punto de entrada del Chat Service (Java).
 *
 * Arquitectura por capas:
 *   Main (este archivo) -> handler (transporte WebSocket) -> service (lógica) -> repository (datos)
 *
 * Reemplaza al servicio de chat en Python (FastAPI + WebSocket).
 * Mismo protocolo, mismo puerto (3003), misma base de datos.
 *
 * El frontend (chat-client.ts) no necesita cambios: usa WebSocket nativo
 * y el mismo formato de eventos {event, data}.
 */
public class Main {

    public static void main(String[] args) throws Exception {
        System.out.println("==================================================");
        System.out.println("  💬 StreamVerse Chat Service (Java)");
        System.out.println("==================================================");

        // 1. Capa de datos
        ChatRepository repository = new ChatRepository();
        repository.connect();

        // 2. Capa de lógica de negocio
        ChatService service = new ChatService(repository);

        // 3. Capa de transporte (WebSocket)
        ChatWebSocketHandler server = new ChatWebSocketHandler(AppConfig.PORT, service);

        // Hook de cierre limpio
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("[chat] Cerrando servicio...");
            try {
                server.stop(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            repository.close();
            System.out.println("[chat] Servicio cerrado.");
        }));

        // 4. Iniciar servidor
        server.start();
        System.out.println("🚀 Servicio de chat iniciado en puerto " + AppConfig.PORT);
        System.out.println("   Protocolo: WebSocket nativo (compatible con el frontend)");
        System.out.println("   Path: / (requerido por gateway Caddy)");
        System.out.println("   BD: " + AppConfig.DB_PATH);
        System.out.println("==================================================");

        // Mantener el hilo principal vivo
        Thread.currentThread().join();
    }
}
