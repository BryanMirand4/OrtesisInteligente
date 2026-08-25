import bcrypt from 'bcrypt';
import { pool } from '../../config/db.js';

export async function listar({ id_perfil, activo, q }) {
  const [results] = await pool.query('CALL sp_usuario_listar(?,?,?)', [
    id_perfil ?? null,
    activo === undefined ? null : Number(activo),
    q ?? null,
  ]);
  return results[0];
}

export async function obtener(idUsuario) {
  const [results] = await pool.query('CALL sp_usuario_obtener(?)', [idUsuario]);
  return results[0][0] ?? null;
}

export async function crear(datos, idUsuarioCrea) {
  const hash = await bcrypt.hash(datos.password, 12);

  // Se usa una única conexión (no el pool) porque el OUT param viaja en una
  // variable de sesión de MySQL: CALL y el SELECT @id_out deben compartir conexión.
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_usuario_crear(?,?,?,?,?,?, @id_out)', [
      datos.id_perfil,
      datos.nombre_completo,
      datos.nombre_usuario,
      datos.correo ?? null,
      hash,
      idUsuarioCrea,
    ]);
    const [[{ id_out }]] = await conn.query('SELECT @id_out AS id_out');
    return obtener(id_out);
  } finally {
    conn.release();
  }
}

export async function actualizar(idUsuario, datos, idUsuarioModifica) {
  await pool.query('CALL sp_usuario_actualizar(?,?,?,?,?)', [
    idUsuario,
    datos.id_perfil,
    datos.nombre_completo,
    datos.correo ?? null,
    idUsuarioModifica,
  ]);
  return obtener(idUsuario);
}

export async function cambiarEstado(idUsuario, activo, idUsuarioModifica) {
  await pool.query('CALL sp_usuario_cambiar_estado(?,?,?)', [
    idUsuario,
    activo ? 1 : 0,
    idUsuarioModifica,
  ]);
  return obtener(idUsuario);
}

export async function desbloquear(idUsuario, idUsuarioModifica) {
  await pool.query('CALL sp_usuario_desbloquear(?,?)', [idUsuario, idUsuarioModifica]);
  return obtener(idUsuario);
}
