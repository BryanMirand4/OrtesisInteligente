import { pool } from '../../config/db.js';

export async function listar({ activo, q }) {
  const [results] = await pool.query('CALL sp_diagnostico_listar(?,?)', [
    activo === undefined ? null : Number(activo),
    q ?? null,
  ]);
  return results[0];
}

export async function obtener(idDiagnostico) {
  const [results] = await pool.query('CALL sp_diagnostico_obtener(?)', [idDiagnostico]);
  return results[0][0] ?? null;
}

export async function crear(datos, idUsuarioAccion) {
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_diagnostico_crear(?,?,?,?, @id_out)', [
      datos.codigo ?? null,
      datos.nombre,
      datos.descripcion ?? null,
      idUsuarioAccion,
    ]);
    const [[{ id_out }]] = await conn.query('SELECT @id_out AS id_out');
    return obtener(id_out);
  } finally {
    conn.release();
  }
}

export async function actualizar(idDiagnostico, datos, idUsuarioAccion) {
  await pool.query('CALL sp_diagnostico_actualizar(?,?,?,?,?)', [
    idDiagnostico,
    datos.codigo ?? null,
    datos.nombre,
    datos.descripcion ?? null,
    idUsuarioAccion,
  ]);
  return obtener(idDiagnostico);
}

export async function cambiarEstado(idDiagnostico, activo, idUsuarioAccion) {
  await pool.query('CALL sp_diagnostico_cambiar_estado(?,?,?)', [
    idDiagnostico,
    activo ? 1 : 0,
    idUsuarioAccion,
  ]);
  return obtener(idDiagnostico);
}
