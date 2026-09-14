import { pool } from '../../config/db.js';

// Todo el cálculo agregado vive en los procedimientos del Sprint 4
// (db/sp_sprint4.sql). Aquí solo se invocan y se arma la respuesta.

export async function resumen({ fecha_inicio, fecha_fin }) {
  const [results] = await pool.query('CALL sp_indicador_resumen(?,?)', [
    fecha_inicio ?? null,
    fecha_fin ?? null,
  ]);
  return results[0][0] ?? null;
}

export async function sesionesPorSemana({ fecha_inicio, fecha_fin }) {
  const [results] = await pool.query('CALL sp_indicador_sesiones_por_semana(?,?)', [
    fecha_inicio ?? null,
    fecha_fin ?? null,
  ]);
  return results[0];
}

export async function porFisioterapeuta({ fecha_inicio, fecha_fin }) {
  const [results] = await pool.query('CALL sp_indicador_por_fisioterapeuta(?,?)', [
    fecha_inicio ?? null,
    fecha_fin ?? null,
  ]);
  return results[0];
}

export async function porDiagnostico({ fecha_inicio, fecha_fin }) {
  const [results] = await pool.query('CALL sp_indicador_por_diagnostico(?,?)', [
    fecha_inicio ?? null,
    fecha_fin ?? null,
  ]);
  return results[0];
}

// Carga única para la vista de indicadores: evita cuatro viajes desde el
// navegador para pintar una sola pantalla.
export async function panel(filtros) {
  const [datosResumen, semanas, fisioterapeutas, diagnosticos] = await Promise.all([
    resumen(filtros),
    sesionesPorSemana(filtros),
    porFisioterapeuta(filtros),
    porDiagnostico(filtros),
  ]);

  return {
    resumen: datosResumen,
    sesiones_por_semana: semanas,
    por_fisioterapeuta: fisioterapeutas,
    por_diagnostico: diagnosticos,
  };
}
