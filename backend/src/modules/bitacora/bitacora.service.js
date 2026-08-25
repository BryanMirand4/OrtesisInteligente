import { pool } from '../../config/db.js';

export async function listar({ fecha_inicio, fecha_fin, id_usuario, tipo_accion, modulo }) {
  const [results] = await pool.query('CALL sp_bitacora_listar(?,?,?,?,?)', [
    fecha_inicio ?? null,
    fecha_fin ?? null,
    id_usuario ?? null,
    tipo_accion ?? null,
    modulo ?? null,
  ]);
  return results[0];
}
