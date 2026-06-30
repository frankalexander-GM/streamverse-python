# 🎮 StreamVerse — Plataforma 3D para Streamers (Versión Python)

Plataforma completa para streamers con 3D, comunidades, chat mundial, hub de streaming, tienda y perfiles.

## 🏗️ Arquitectura Multi-Stack

| Servicio | Lenguaje | Puerto | Función |
|----------|----------|--------|---------|
| Frontend + APIs | TypeScript (Next.js 16) | 3000 | UI, rutas API en capas |
| **Chat Mundial** | **Python** (FastAPI + WebSocket) | 3003 | Chat en tiempo real |
| Recomendaciones | Java (ServerSocket + JDBC) | 3005 | Algoritmo de scoring |

## 🚀 Instalación

### Frontend (Next.js)
```bash
bun install
bun run db:push
bun run scripts/seed.ts
bun run dev
```

### Chat Service (Python)
```bash
cd mini-services/chat-service-python
pip install fastapi uvicorn websockets
python3 -m uvicorn main:app --host 0.0.0.0 --port 3003 --reload
```

### Recommendation Service (Java)
```bash
cd mini-services/recommendation-service-java
# Necesitas JDK 21+ y los jars en lib/ (ver run.sh)
./run.sh
```

## ✨ Features

- 🎨 **3D Hero** con React Three Fiber (optimizado)
- 🌐 **27+ Comunidades oficiales** de juegos top (Roblox, Minecraft, Valorant, Apex, etc.)
- 👥 **Grupos** creados por usuarios con admin (eliminar posts/miembros)
- 💬 **Chat Mundial** en tiempo real (Python WebSocket)
- 🤖 **Recomendaciones** con algoritmo de scoring (Java)
- 📺 **Hub de Streaming** (Twitch/Kick/YouTube embebidos)
- 🛒 **Tienda** (logos, globos, banners, marcos con coins)
- 👤 **Perfiles** con marcos neón, follow, publicaciones
- 🖼️ **Lightbox** en imágenes, comentarios, compartir
- 📸 **Subida de fotos y clips de 30s** desde biblioteca

## 📐 Arquitectura por capas

```
Frontend (TypeScript)
  view → hook → service (chat-client) → WebSocket → Python

Backend Next.js APIs
  route.ts (transporte) → service.ts (lógica) → Prisma (datos)

Servicio Java
  Main → handler → service → repository → SQLite
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Framer Motion
- **3D:** three.js, @react-three/fiber, @react-three/drei
- **DB:** Prisma ORM + SQLite
- **Chat:** Python + FastAPI + WebSocket
- **Recomendaciones:** Java 21 + ServerSocket + JDBC
- **Estado:** Zustand
