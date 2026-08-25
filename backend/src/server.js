import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { app } from './app.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);

// Socket.IO queda listo desde el sprint 1; el streaming de lecturas de la
// órtesis (namespace de sesión) se conecta en el sprint 3.
export const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN, credentials: true },
});

io.on('connection', (socket) => {
  console.log(`Cliente Socket.IO conectado: ${socket.id}`);
});

httpServer.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
