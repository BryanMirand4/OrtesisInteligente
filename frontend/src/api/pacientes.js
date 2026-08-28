import { api, construirQueryString } from './client.js';

export const listarPacientes = (params = {}) => api.get(`/pacientes${construirQueryString(params)}`);
export const obtenerPaciente = (id) => api.get(`/pacientes/${id}`);
export const crearPaciente = (datos) => api.post('/pacientes', datos);
export const actualizarPaciente = (id, datos) => api.put(`/pacientes/${id}`, datos);
export const cambiarEstadoPaciente = (id, activo) => api.put(`/pacientes/${id}/estado`, { activo: Boolean(activo) });
export const listarFisioterapeutas = () => api.get('/pacientes/fisioterapeutas');
export const listarMetas = (id) => api.get(`/pacientes/${id}/metas`);
export const guardarMetas = (id, metas) => api.put(`/pacientes/${id}/metas`, { metas });
