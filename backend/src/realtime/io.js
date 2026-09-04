import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

// Singleton de Socket.IO. Se aísla en su propio módulo (y no en server.js)
// para romper el ciclo de importación:
//   app.js -> modules/sesiones -> ortesis/gestorCaptura -> (io)
// El gestor de captura obtiene la instancia con getIo()/emitirSesion() en
// tiempo de ejecución, cuando ya fue inicializada por server.js.
let io = null;

export const salaSesion = (idSesion) => `sesion:${idSesion}`;

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN, credentials: true },
  });

  io.on('connection', (socket) => {
    console.log(`Cliente Socket.IO conectado: ${socket.id}`);
  });

  // Namespace dedicado al streaming de la sesión de terapia.
  const nsp = io.of('/sesion');

  // Autenticación del namespace con el mismo JWT que la API REST.
  nsp.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No autenticado.'));
    try {
      socket.data.usuario = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Token inválido o expirado.'));
    }
  });

  nsp.on('connection', (socket) => {
    // El cliente pide unirse a la sala de una sesión concreta; solo se admite
    // si la sesión pertenece al fisioterapeuta autenticado.
    socket.on('unir_sesion', async ({ id_sesion } = {}, ack) => {
      const responder = (payload) => {
        if (typeof ack === 'function') ack(payload);
      };
      try {
        const [rows] = await pool.query(
          'SELECT id_sesion FROM sesion WHERE id_sesion = ? AND id_fisioterapeuta = ?',
          [id_sesion, socket.data.usuario.id_usuario],
        );
        if (rows.length === 0) {
          return responder({ ok: false, error: 'Sesión no encontrada.' });
        }
        socket.join(salaSesion(id_sesion));
        responder({ ok: true });
      } catch {
        responder({ ok: false, error: 'No se pudo unir a la sesión.' });
      }
    });
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error('Socket.IO no inicializado.');
  return io;
}

// Emite un evento a todos los clientes suscritos a la sala de una sesión.
export function emitirSesion(idSesion, evento, payload) {
  getIo().of('/sesion').to(salaSesion(idSesion)).emit(evento, payload);
}
