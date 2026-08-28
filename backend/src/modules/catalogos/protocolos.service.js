import { pool } from '../../config/db.js';

export async function listar({ activo, q }) {
  const [results] = await pool.query('CALL sp_protocolo_listar(?,?)', [
    activo === undefined ? null : Number(activo),
    q ?? null,
  ]);
  return results[0];
}

export async function obtener(idProtocolo) {
  const [results] = await pool.query('CALL sp_protocolo_obtener(?)', [idProtocolo]);
  return results[0][0] ?? null;
}

export async function crear(datos, idUsuarioAccion) {
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_protocolo_crear(?,?,?,?, @id_out)', [
      datos.nombre,
      datos.descripcion ?? null,
      datos.sesiones_meta ?? null,
      idUsuarioAccion,
    ]);
    const [[{ id_out }]] = await conn.query('SELECT @id_out AS id_out');
    return obtener(id_out);
  } finally {
    conn.release();
  }
}

export async function actualizar(idProtocolo, datos, idUsuarioAccion) {
  await pool.query('CALL sp_protocolo_actualizar(?,?,?,?,?)', [
    idProtocolo,
    datos.nombre,
    datos.descripcion ?? null,
    datos.sesiones_meta ?? null,
    idUsuarioAccion,
  ]);
  return obtener(idProtocolo);
}

export async function cambiarEstado(idProtocolo, activo, idUsuarioAccion) {
  await pool.query('CALL sp_protocolo_cambiar_estado(?,?,?)', [
    idProtocolo,
    activo ? 1 : 0,
    idUsuarioAccion,
  ]);
  return obtener(idProtocolo);
}
