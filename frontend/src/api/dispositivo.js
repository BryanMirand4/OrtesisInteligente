import { api } from './client.js';

export const obtenerCalibracion = () => api.get('/dispositivo/calibracion');
export const guardarCalibracion = (calibraciones) =>
  api.put('/dispositivo/calibracion', { calibraciones });

export const obtenerUmbrales = () => api.get('/dispositivo/umbrales-fc');
export const guardarUmbrales = (umbrales) => api.put('/dispositivo/umbrales-fc', { umbrales });
