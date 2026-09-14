import { api, construirQueryString, descargarArchivo } from './client.js';

export const TIPOS_REPORTE = [
  { valor: 'consolidado', etiqueta: 'Consolidado de sesiones' },
  { valor: 'diagnostico', etiqueta: 'Por diagnóstico' },
  { valor: 'evolucion', etiqueta: 'Evolución de paciente' },
];

// Vista previa en pantalla: no consume folio ni deja rastro en bitácora.
export const obtenerVistaPrevia = (params = {}) => api.get(`/reportes${construirQueryString(params)}`);

export const listarHistorial = (params = {}) =>
  api.get(`/reportes/historial${construirQueryString(params)}`);

// Genera el archivo en el servidor y dispara la descarga en el navegador.
// Devuelve el folio asignado (REP-AAAA-MM-NNN.ext).
export const descargarReporte = (params = {}) =>
  descargarArchivo(`/reportes/descargar${construirQueryString(params)}`, 'reporte');
