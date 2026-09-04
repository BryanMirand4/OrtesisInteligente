import { api } from './client.js';

export const iniciarSesion = (idPaciente) => api.post('/sesiones', { id_paciente: idPaciente });
export const obtenerSesionActiva = () => api.get('/sesiones/activa');
export const obtenerSesion = (id) => api.get(`/sesiones/${id}`);
export const conectarSesion = (id, puerto) => api.post(`/sesiones/${id}/conectar`, { puerto });
export const finalizarSesion = (id, observaciones) =>
  api.put(`/sesiones/${id}/finalizar`, { observaciones: observaciones || null });
export const cancelarSesion = (id) => api.put(`/sesiones/${id}/cancelar`, {});
export const listarLecturas = (id) => api.get(`/sesiones/${id}/lecturas`);
