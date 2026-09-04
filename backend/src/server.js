import http from 'http';
import dotenv from 'dotenv';
import { app } from './app.js';
import { initRealtime } from './realtime/io.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);

// Socket.IO (incluye el namespace /sesion para el streaming de la órtesis).
export const io = initRealtime(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});
