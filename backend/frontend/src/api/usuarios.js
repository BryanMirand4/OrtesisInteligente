import { api, construirQueryString } from './client.js';

export const listarUsuarios = (params = {}) => api.get(`/usuarios${construirQueryString(params)}`);
export const obtenerUsuario = (id) => api.get(`/usuarios/${id}`);
export const crearUsuario = (datos) => api.post('/usuarios', datos);
export const actualizarUsuario = (id, datos) => api.put(`/usuarios/${id}`, datos);
export const cambiarEstadoUsuario = (id, activo) => api.put(`/usuarios/${id}/estado`, { activo: Boolean(activo) });
export const desbloquearUsuario = (id) => api.put(`/usuarios/${id}/desbloquear`);
