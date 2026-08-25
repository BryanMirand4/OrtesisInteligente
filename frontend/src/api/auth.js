import { api } from './client.js';

export const login = (nombre_usuario, password) => api.post('/auth/login', { nombre_usuario, password });
export const logout = () => api.post('/auth/logout');
export const recuperar = (correo) => api.post('/auth/recuperar', { correo });
export const restablecer = (token, password) => api.post('/auth/restablecer', { token, password });
