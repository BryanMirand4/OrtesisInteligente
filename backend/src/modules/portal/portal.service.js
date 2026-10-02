import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { construirExcel, construirPdf } from '../reportes/reportes.export.js';

// Portal del paciente (Sprint 5). Vista de SOLO LECTURA sobre el propio
// expediente: el paciente no puede consultar el de nadie más ni ver las
// observaciones clínicas, los datos de sensor ni los umbrales técnicos.
//
// La regla que sostiene todo el módulo: el id_paciente NUNCA llega por la URL
// ni por el cuerpo de la petición, se resuelve desde el id_usuario del JWT
// contra `paciente.id_usuario_acceso`. Así no existe un parámetro que se
// pueda manipular para leer el expediente de otra persona.

const NOMBRE_REPORTE = 'Mi rehabilitación (paciente)';

async function resolverPaciente(usuario) {
  const [results] = await pool.query('CALL sp_portal_resolver_paciente(?)', [usuario.id_usuario]);
  const paciente = results[0][0];

  if (!paciente) {
    throw new AppError(
      404,
      'Su cuenta aún no está vinculada a un expediente. Solicite a su fisioterapeuta que habilite su acceso.',
    );
  }

  return paciente;
}

async function resumenDe(idPaciente) {
  const [results] = await pool.query('CALL sp_portal_mi_resumen(?)', [idPaciente]);
  return results[0][0] ?? null;
}

async function evolucionDe(idPaciente) {
  const [results] = await pool.query('CALL sp_portal_mi_evolucion(?)', [idPaciente]);
  return results[0];
}

async function sesionesDe(idPaciente, limite) {
  const [results] = await pool.query('CALL sp_portal_mis_sesiones(?,?)', [idPaciente, limite ?? null]);
  return results[0];
}

async function avanceDedoDe(idPaciente) {
  const [results] = await pool.query('CALL sp_portal_mi_avance_dedo(?)', [idPaciente]);
  return results[0];
}

export async function miResumen(usuario) {
  const { id_paciente } = await resolverPaciente(usuario);
  return resumenDe(id_paciente);
}

export async function miEvolucion(usuario) {
  const { id_paciente } = await resolverPaciente(usuario);
  return evolucionDe(id_paciente);
}

export async function misSesiones(usuario, { limite } = {}) {
  const { id_paciente } = await resolverPaciente(usuario);
  return sesionesDe(id_paciente, limite);
}

export async function miAvanceDedo(usuario) {
  const { id_paciente } = await resolverPaciente(usuario);
  return avanceDedoDe(id_paciente);
}

// Carga completa del portal: pinta la vista de una sola vez, igual que hace
// el expediente clínico del Sprint 4.
export async function miAvance(usuario) {
  const { id_paciente } = await resolverPaciente(usuario);

  const [resumen, evolucion, sesiones, avanceDedo] = await Promise.all([
    resumenDe(id_paciente),
    evolucionDe(id_paciente),
    sesionesDe(id_paciente, null),
    avanceDedoDe(id_paciente),
  ]);

  return { resumen, evolucion, sesiones, avance_dedo: avanceDedo };
}

// "Descargar mi reporte" del mockup. Reutiliza la capa de exportación de la
// reportería con un tipo propio (`portal`), cuyas columnas ya excluyen la
// frecuencia cardíaca y las observaciones. El folio y el registro en bitácora
// salen del mismo procedimiento que los reportes del personal, para que la
// correlativa de documentos sea única en todo el sistema.
export async function miReporte(usuario, formato, filtros = {}, ipOrigen) {
  const { id_paciente } = await resolverPaciente(usuario);

  const [cabecera, [filas]] = await Promise.all([
    resumenDe(id_paciente),
    pool
      .query('CALL sp_portal_mi_reporte(?,?,?)', [
        id_paciente,
        filtros.fecha_inicio ?? null,
        filtros.fecha_fin ?? null,
      ])
      .then(([results]) => results),
  ]);

  const contenido = { tipo: 'portal', paciente: cabecera, totales: null, filas };
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query('CALL sp_reporte_registrar(?,?,?,?,?, @doc, @id_bita)', [
      usuario.id_usuario,
      'GENERAR_REPORTE',
      NOMBRE_REPORTE,
      formato,
      ipOrigen ?? null,
    ]);
    const [[fila]] = await conn.query('SELECT @doc AS documento');
    const documento = fila.documento;

    const meta = {
      documento,
      tipo: 'portal',
      tipo_nombre: NOMBRE_REPORTE,
      filtros,
      generado_por: usuario.nombre_completo ?? usuario.nombre_usuario,
      generado_en: new Date(),
    };

    const archivo =
      formato === 'pdf' ? await construirPdf(contenido, meta) : await construirExcel(contenido, meta);

    await conn.commit();
    return { ...archivo, documento };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
