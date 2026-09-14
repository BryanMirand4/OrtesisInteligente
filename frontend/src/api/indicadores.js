import { api, construirQueryString } from './client.js';

// Panel completo (resumen + semanas + fisioterapeutas + diagnósticos).
export const obtenerPanel = (params = {}) => api.get(`/indicadores${construirQueryString(params)}`);

export const obtenerResumen = (params = {}) =>
  api.get(`/indicadores/resumen${construirQueryString(params)}`);

export const listarSesionesPorSemana = (params = {}) =>
  api.get(`/indicadores/sesiones-por-semana${construirQueryString(params)}`);

export const listarPorFisioterapeuta = (params = {}) =>
  api.get(`/indicadores/por-fisioterapeuta${construirQueryString(params)}`);

export const listarPorDiagnostico = (params = {}) =>
  api.get(`/indicadores/por-diagnostico${construirQueryString(params)}`);
