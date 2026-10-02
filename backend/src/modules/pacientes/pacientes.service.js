import { pool } from '../../config/db.js';

export async function listar({ activo, id_diagnostico, q }) {
  const [results] = await pool.query('CALL sp_paciente_listar(?,?,?)', [
    activo === undefined ? null : Number(activo),
    id_diagnostico ?? null,
    q ?? null,
  ]);
  return results[0];
}

export async function obtener(idPaciente) {
  const [results] = await pool.query('CALL sp_paciente_obtener(?)', [idPaciente]);
  return results[0][0] ?? null;
}

export async function crear(datos, idUsuarioCrea) {
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_paciente_crear(?,?,?,?,?,?,?,?,?,?,?, @id_out)', [
      datos.nombres,
      datos.apellidos,
      datos.fecha_nacimiento,
      datos.sexo,
      datos.telefono ?? null,
      datos.id_diagnostico ?? null,
      datos.mano_afectada,
      datos.fecha_ingreso,
      datos.id_fisioterapeuta,
      datos.id_protocolo ?? null,
      idUsuarioCrea,
    ]);
    const [[{ id_out }]] = await conn.query('SELECT @id_out AS id_out');
    return obtener(id_out);
  } finally {
    conn.release();
  }
}

export async function actualizar(idPaciente, datos, idUsuarioModifica) {
  await pool.query('CALL sp_paciente_actualizar(?,?,?,?,?,?,?,?,?,?,?,?)', [
    idPaciente,
    datos.nombres,
    datos.apellidos,
    datos.fecha_nacimiento,
    datos.sexo,
    datos.telefono ?? null,
    datos.id_diagnostico ?? null,
    datos.mano_afectada,
    datos.fecha_ingreso,
    datos.id_fisioterapeuta,
    datos.id_protocolo ?? null,
    idUsuarioModifica,
  ]);
  return obtener(idPaciente);
}

export async function cambiarEstado(idPaciente, activo, idUsuarioModifica) {
  await pool.query('CALL sp_paciente_cambiar_estado(?,?,?)', [
    idPaciente,
    activo ? 1 : 0,
    idUsuarioModifica,
  ]);
  return obtener(idPaciente);
}

export async function listarFisioterapeutas() {
  const [results] = await pool.query('CALL sp_paciente_fisioterapeutas_listar()');
  return results[0];
}

export async function listarMetas(idPaciente) {
  const [results] = await pool.query('CALL sp_meta_listar(?)', [idPaciente]);
  return results[0];
}

export async function guardarMetas(idPaciente, metas, idUsuarioAccion) {
  for (const meta of metas) {
    await pool.query('CALL sp_meta_guardar(?,?,?,?)', [
      idPaciente,
      meta.id_dedo,
      meta.angulo_meta,
      idUsuarioAccion,
    ]);
  }
  return listarMetas(idPaciente);
}

// Cuenta de acceso al portal (Sprint 5). El vínculo vive en
// `paciente.id_usuario_acceso` y es lo que permite al perfil Paciente
// resolver su propio expediente al entrar a /api/portal.
export async function listarCuentasAcceso(idPaciente) {
  const [results] = await pool.query('CALL sp_paciente_cuentas_acceso(?)', [idPaciente ?? null]);
  return results[0];
}

// Un id_usuario_acceso nulo retira el acceso al portal. Las validaciones
// (perfil Paciente, cuenta activa, no vinculada a otro expediente) las hace
// el procedimiento, que es el único punto por donde pasa el UPDATE.
export async function vincularAcceso(idPaciente, idUsuarioAcceso, idUsuarioAccion) {
  await pool.query('CALL sp_paciente_vincular_acceso(?,?,?)', [
    idPaciente,
    idUsuarioAcceso ?? null,
    idUsuarioAccion,
  ]);
  return obtener(idPaciente);
}
