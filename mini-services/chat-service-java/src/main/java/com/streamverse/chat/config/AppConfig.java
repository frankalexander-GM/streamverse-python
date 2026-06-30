package com.streamverse.chat.config;

/**
 * Configuración del Chat Service (Java).
 * Todas las constantes en un solo lugar.
 */
public final class AppConfig {
    private AppConfig() {}

    /** Puerto del servicio (mismo que Python: 3003). */
    public static final int PORT = 3003;

    /** Host. */
    public static final String HOST = "0.0.0.0";

    /** Ruta de la base de datos SQLite (compartida con Prisma). */
    public static final String DB_PATH = "/home/z/my-project/db/custom.db";

    /** Límites del chat. */
    public static final int MAX_MESSAGE_LENGTH = 500;
    public static final int MAX_USERNAME_LENGTH = 24;
    public static final int HISTORY_LIMIT = 40;

    /** Timeout de escritura (ms). */
    public static final long TYPING_TIMEOUT_MS = 3000;

    /** URL base para generar avatares. */
    public static final String AVATAR_BASE = "https://api.dicebear.com/9.x/avataaars/svg?seed=";

    /** Colores neón disponibles para usuarios. */
    public static final String[] COLORS = {
        "#a855f7", // púrpura
        "#ec4899", // rosa
        "#06b6d4", // cyan
        "#10b981", // esmeralda
        "#f59e0b", // ámbar
        "#8b5cf6", // violeta
        "#ef4444", // rojo
        "#14b8a6", // teal
    };
}
