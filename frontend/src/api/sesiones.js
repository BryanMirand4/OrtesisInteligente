import { api } from './client.js';

export const iniciarSesion = (idPaciente, forzarMetaSuperada = false) =>
  api.post('/sesiones', { id_paciente: idPaciente, forzar_meta_superada: forzarMetaSuperada });
export const obtenerSesionActiva = () => api.get('/sesiones/activa');
export const obtenerSesion = (id) => api.get(`/sesiones/${id}`);
export const conectarSesion = (id, puerto, duracionPlaneadaMinutos) =>
  api.post(`/sesiones/${id}/conectar`, {
    puerto,
    duracion_planeada_minutos: duracionPlaneadaMinutos || null,
  });
export const pausarSesion = (id) => api.put(`/sesiones/${id}/pausar`, {});
export const reanudarSesion = (id) => api.put(`/sesiones/${id}/reanudar`, {});
export const finalizarSesion = (id, observaciones) =>
  api.put(`/sesiones/${id}/finalizar`, { observaciones: observaciones || null });
export const cancelarSesion = (id) => api.put(`/sesiones/${id}/cancelar`, {});
export const listarLecturas = (id) => api.get(`/sesiones/${id}/lecturas`);
