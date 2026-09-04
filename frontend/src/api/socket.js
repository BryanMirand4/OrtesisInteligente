import { io } from 'socket.io-client';

// El servidor Socket.IO vive en la raíz del backend; VITE_API_URL apunta a
// `…/api`, así que se le quita ese sufijo para obtener el origen.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const WS_URL = API_URL.replace(/\/api\/?$/, '');

// Crea (sin conectar) el socket del namespace /sesion, autenticado con el JWT.
export function crearSocketSesion(token) {
  return io(`${WS_URL}/sesion`, {
    auth: { token },
    autoConnect: false,
    transports: ['websocket'],
  });
}
