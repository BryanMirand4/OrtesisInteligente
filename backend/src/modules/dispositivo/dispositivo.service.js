import { pool } from '../../config/db.js';

export async function listarCalibracion() {
  const [results] = await pool.query('CALL sp_calibracion_listar()');
  return results[0];
}

export async function guardarCalibracion(calibraciones, idUsuario) {
  for (const c of calibraciones) {
    await pool.query('CALL sp_calibracion_guardar(?,?,?,?,?,?)', [
      c.id_dedo,
      c.valor_min_adc,
      c.valor_max_adc,
      c.angulo_min,
      c.angulo_max,
      idUsuario,
    ]);
  }
  return listarCalibracion();
}

export async function listarUmbrales() {
  const [results] = await pool.query('CALL sp_umbral_fc_listar()');
  return results[0];
}

export async function guardarUmbrales(umbrales, idUsuario) {
  for (const u of umbrales) {
    await pool.query('CALL sp_umbral_fc_actualizar(?,?,?)', [u.id_param, u.fc_umbral, idUsuario]);
  }
  return listarUmbrales();
}
