// Interfaz pública del subsistema de la órtesis. El resto del backend solo
// consume estas funciones; los detalles de serial/mock/persistencia quedan
// encapsulados en los demás archivos de esta carpeta.
export { iniciarCaptura, detenerCaptura, sesionActiva } from './gestorCaptura.js';
export { parseLinea, formatearLinea } from './protocolo.js';
