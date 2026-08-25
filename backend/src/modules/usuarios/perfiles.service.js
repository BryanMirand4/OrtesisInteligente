import { pool } from '../../config/db.js';

export async function listarPerfiles() {
  const [results] = await pool.query('CALL sp_perfil_listar()');
  return results[0];
}

export async function listarPermisos() {
  const [results] = await pool.query('CALL sp_permiso_listar()');
  return results[0];
}

export async function listarPermisosPorPerfil(idPerfil) {
  const [results] = await pool.query('CALL sp_perfil_permisos_listar(?)', [idPerfil]);
  return results[0];
}
