import { api, construirQueryString } from './client.js';

export const listarDiagnosticos = (params = {}) => api.get(`/diagnosticos${construirQueryString(params)}`);
export const crearDiagnostico = (datos) => api.post('/diagnosticos', datos);
export const actualizarDiagnostico = (id, datos) => api.put(`/diagnosticos/${id}`, datos);
export const cambiarEstadoDiagnostico = (id, activo) => api.put(`/diagnosticos/${id}/estado`, { activo: Boolean(activo) });

export const listarProtocolos = (params = {}) => api.get(`/protocolos${construirQueryString(params)}`);
export const crearProtocolo = (datos) => api.post('/protocolos', datos);
export const actualizarProtocolo = (id, datos) => api.put(`/protocolos/${id}`, datos);
export const cambiarEstadoProtocolo = (id, activo) => api.put(`/protocolos/${id}/estado`, { activo: Boolean(activo) });

export const listarDedos = () => api.get('/dedos');
