import { api, construirQueryString } from './client.js';

export const listarBitacora = (params = {}) => api.get(`/bitacora${construirQueryString(params)}`);
