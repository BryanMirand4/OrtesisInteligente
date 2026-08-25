import { api } from './client.js';

export const listarPerfiles = () => api.get('/perfiles');
export const listarPermisos = () => api.get('/permisos');
export const listarPermisosPorPerfil = (idPerfil) => api.get(`/perfiles/${idPerfil}/permisos`);
