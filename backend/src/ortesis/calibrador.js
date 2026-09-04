import { pool } from '../config/db.js';

// Convierte un valor crudo del sensor flex (ADC) a grados usando la fila
// vigente de `calibracion_sensor`. Interpolación lineal recortada al rango.
export function adcAAngulo(adc, calib) {
  const min = Number(calib.valor_min_adc);
  const max = Number(calib.valor_max_adc);
  const rango = max - min;
  if (rango <= 0) return Number(calib.angulo_min);

  let t = (adc - min) / rango;
  t = Math.min(1, Math.max(0, t));

  const anguloMin = Number(calib.angulo_min);
  const anguloMax = Number(calib.angulo_max);
  const angulo = anguloMin + t * (anguloMax - anguloMin);
  return Math.round(angulo * 100) / 100;
}

// Mapa id_dedo -> fila de calibración vigente. Se carga una vez al iniciar
// la captura de una sesión.
export async function cargarCalibracionVigente() {
  const [results] = await pool.query('CALL sp_calibracion_listar()');
  const mapa = new Map();
  for (const fila of results[0]) mapa.set(fila.id_dedo, fila);
  return mapa;
}
