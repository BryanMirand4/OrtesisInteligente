import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';

// Evolución del expediente clínico (Sprint 4). Los cálculos de rango
// articular, mejora y adherencia están en db/sp_sprint4.sql.

// El Fisioterapeuta solo ve los expedientes que tiene asignados; el
// Coordinador tiene lectura sobre todos (CLAUDE.md 6.1). La restricción se
// resuelve acá, en el servidor, no ocultando botones en el frontend.
function idFisioterapeutaSegunPerfil(usuario) {
  return usuario.perfil_nombre === 'Fisioterapeuta' ? usuario.id_usuario : null;
}

export async function listar({ q }, usuario) {
  const [results] = await pool.query('CALL sp_expediente_listar(?,?)', [
    idFisioterapeutaSegunPerfil(usuario),
    q ?? null,
  ]);
  return results[0];
}

export async function resumen(idPaciente, usuario) {
  const [results] = await pool.query('CALL sp_expediente_resumen(?)', [idPaciente]);
  const expediente = results[0][0];

  if (!expediente) throw new AppError(404, 'Expediente no encontrado.');

  const idFisio = idFisioterapeutaSegunPerfil(usuario);
  if (idFisio && expediente.id_fisioterapeuta !== idFisio) {
    throw new AppError(403, 'Este expediente pertenece a otro fisioterapeuta.');
  }

  return expediente;
}

export async function evolucion(idPaciente, usuario) {
  await resumen(idPaciente, usuario); // valida existencia y pertenencia
  const [results] = await pool.query('CALL sp_expediente_evolucion(?)', [idPaciente]);
  return results[0];
}

export async function evolucionPorDedo(idPaciente, usuario) {
  await resumen(idPaciente, usuario);
  const [results] = await pool.query('CALL sp_expediente_evolucion_dedo(?)', [idPaciente]);
  return results[0];
}

export async function sesiones(idPaciente, usuario) {
  await resumen(idPaciente, usuario);
  const [results] = await pool.query('CALL sp_expediente_sesiones(?)', [idPaciente]);
  return results[0];
}

export async function avanceMetas(idPaciente, usuario) {
  await resumen(idPaciente, usuario);
  const [results] = await pool.query('CALL sp_expediente_avance_metas(?)', [idPaciente]);
  return results[0];
}

// Carga completa del expediente para pintar la vista de una sola vez.
// La validación de pertenencia ocurre una vez, en `resumen`.
export async function detalle(idPaciente, usuario) {
  const cabecera = await resumen(idPaciente, usuario);

  const [[serie], [serieDedo], [listaSesiones], [metas]] = await Promise.all([
    pool.query('CALL sp_expediente_evolucion(?)', [idPaciente]),
    pool.query('CALL sp_expediente_evolucion_dedo(?)', [idPaciente]),
    pool.query('CALL sp_expediente_sesiones(?)', [idPaciente]),
    pool.query('CALL sp_expediente_avance_metas(?)', [idPaciente]),
  ]);

  return {
    resumen: cabecera,
    evolucion: serie[0],
    evolucion_dedo: serieDedo[0],
    sesiones: listaSesiones[0],
    avance_metas: metas[0],
  };
}
