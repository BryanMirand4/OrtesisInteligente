import { pool } from '../../config/db.js';

export async function listar() {
  const [results] = await pool.query('CALL sp_dedo_listar()');
  return results[0];
}
