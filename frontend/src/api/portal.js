import { api, construirQueryString, descargarArchivo } from './client.js';

// Portal del paciente (Sprint 5). Ninguna de estas llamadas manda un id de
// paciente: el servidor resuelve el expediente propio desde el JWT.

// Carga completa de "Mi rehabilitación": resumen, evolución, sesiones y
// avance por dedo.
export const obtenerMiAvance = () => api.get('/portal/mi-avance');

export const obtenerMiResumen = () => api.get('/portal/mi-resumen');
export const listarMiEvolucion = () => api.get('/portal/mi-evolucion');
export const listarMisSesiones = (params = {}) =>
  api.get(`/portal/mis-sesiones${construirQueryString(params)}`);
export const listarMiAvanceDedo = () => api.get('/portal/mi-avance-dedo');

// Devuelve el folio asignado por el servidor (REP-AAAA-MM-NNN.ext).
export const descargarMiReporte = (params = {}) =>
  descargarArchivo(`/portal/mi-reporte${construirQueryString(params)}`, 'mi-reporte');
