import { api, construirQueryString } from './client.js';

export const listarExpedientes = (params = {}) =>
  api.get(`/expedientes${construirQueryString(params)}`);

// Carga completa: resumen, evolución, evolución por dedo, sesiones y metas.
export const obtenerExpediente = (id) => api.get(`/expedientes/${id}`);

export const obtenerResumen = (id) => api.get(`/expedientes/${id}/resumen`);
export const listarEvolucion = (id) => api.get(`/expedientes/${id}/evolucion`);
export const listarEvolucionPorDedo = (id) => api.get(`/expedientes/${id}/evolucion-dedo`);
export const listarSesiones = (id) => api.get(`/expedientes/${id}/sesiones`);
export const listarAvanceMetas = (id) => api.get(`/expedientes/${id}/avance-metas`);
