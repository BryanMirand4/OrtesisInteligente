import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { construirExcel, construirPdf } from './reportes.export.js';

// Reportería del Sprint 4. Los archivos NO se almacenan: se generan al vuelo
// a partir de los procedimientos de db/sp_sprint4.sql y el rastro queda en
// `bitacora` (el esquema no contempla una tabla `reporte`).

export const TIPOS_REPORTE = {
  consolidado: 'Consolidado de sesiones',
  diagnostico: 'Por diagnóstico',
  evolucion: 'Evolución de paciente',
};

// "Reportes: propios" de la matriz de permisos (CLAUDE.md 6.1). El alcance
// se deriva del JWT, nunca del querystring: un fisioterapeuta no puede pedir
// los datos de otro manipulando la URL.
function idFisioterapeutaSegunPerfil(usuario) {
  return usuario.perfil_nombre === 'Fisioterapeuta' ? usuario.id_usuario : null;
}

async function totales(filtros, idFisio) {
  const [results] = await pool.query('CALL sp_reporte_totales(?,?,?,?,?)', [
    filtros.fecha_inicio ?? null,
    filtros.fecha_fin ?? null,
    filtros.id_paciente ?? null,
    filtros.id_diagnostico ?? null,
    idFisio,
  ]);
  return results[0][0] ?? null;
}

async function consolidado(filtros, idFisio) {
  const [results] = await pool.query('CALL sp_reporte_consolidado(?,?,?,?,?)', [
    filtros.fecha_inicio ?? null,
    filtros.fecha_fin ?? null,
    filtros.id_paciente ?? null,
    filtros.id_diagnostico ?? null,
    idFisio,
  ]);
  return results[0];
}

async function porDiagnostico(filtros, idFisio) {
  const [results] = await pool.query('CALL sp_reporte_por_diagnostico(?,?,?)', [
    filtros.fecha_inicio ?? null,
    filtros.fecha_fin ?? null,
    idFisio,
  ]);
  return results[0];
}

async function evolucionPaciente(idPaciente, filtros) {
  const [results] = await pool.query('CALL sp_reporte_evolucion_paciente(?,?,?)', [
    idPaciente,
    filtros.fecha_inicio ?? null,
    filtros.fecha_fin ?? null,
  ]);
  return results[0];
}

async function cabeceraPaciente(idPaciente, idFisio) {
  const [results] = await pool.query('CALL sp_expediente_resumen(?)', [idPaciente]);
  const paciente = results[0][0];

  if (!paciente) throw new AppError(404, 'El paciente indicado no existe.');
  if (idFisio && paciente.id_fisioterapeuta !== idFisio) {
    throw new AppError(403, 'Este expediente pertenece a otro fisioterapeuta.');
  }

  return paciente;
}

// Arma el contenido del reporte según su tipo. Es la fuente única tanto de
// la vista previa en pantalla como del archivo descargable, para que lo que
// se ve sea exactamente lo que se exporta.
async function armarContenido(tipo, filtros, usuario) {
  const idFisio = idFisioterapeutaSegunPerfil(usuario);

  if (tipo === 'evolucion') {
    if (!filtros.id_paciente) {
      throw new AppError(400, 'El reporte de evolución requiere seleccionar un paciente.');
    }
    const paciente = await cabeceraPaciente(filtros.id_paciente, idFisio);
    const [serie, resumenTotales] = await Promise.all([
      evolucionPaciente(filtros.id_paciente, filtros),
      totales(filtros, idFisio),
    ]);
    return { tipo, paciente, totales: resumenTotales, filas: serie };
  }

  if (tipo === 'diagnostico') {
    const [filas, resumenTotales] = await Promise.all([
      porDiagnostico(filtros, idFisio),
      totales(filtros, idFisio),
    ]);
    return { tipo, paciente: null, totales: resumenTotales, filas };
  }

  // consolidado
  if (filtros.id_paciente) await cabeceraPaciente(filtros.id_paciente, idFisio);
  const [filas, resumenTotales] = await Promise.all([
    consolidado(filtros, idFisio),
    totales(filtros, idFisio),
  ]);
  return { tipo, paciente: null, totales: resumenTotales, filas };
}

export async function vistaPrevia(tipo, filtros, usuario) {
  const contenido = await armarContenido(tipo, filtros, usuario);
  return {
    tipo,
    tipo_nombre: TIPOS_REPORTE[tipo],
    filtros,
    totales: contenido.totales,
    paciente: contenido.paciente,
    filas: contenido.filas,
  };
}

export async function historial({ fecha_inicio, fecha_fin, limite }, usuario) {
  // El fisioterapeuta solo ve el rastro de sus propias generaciones.
  const idUsuario = usuario.perfil_nombre === 'Fisioterapeuta' ? usuario.id_usuario : null;

  const [results] = await pool.query('CALL sp_reporte_historial(?,?,?,?)', [
    fecha_inicio ?? null,
    fecha_fin ?? null,
    idUsuario,
    limite ?? null,
  ]);
  return results[0];
}

// Genera el archivo y registra GENERAR_REPORTE en bitácora obteniendo el
// folio (REP-AAAA-MM-NNN.ext) desde el procedimiento, para que la numeración
// sea consistente aunque haya varias generaciones a la vez.
//
// El folio se asigna dentro de una transacción que solo se confirma cuando el
// archivo quedó armado: así la bitácora no queda con un documento que nunca
// llegó a descargarse ni se salta un número de la correlativa.
export async function generar(tipo, formato, filtros, usuario, ipOrigen) {
  const contenido = await armarContenido(tipo, filtros, usuario);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query('CALL sp_reporte_registrar(?,?,?,?,?, @doc, @id_bita)', [
      usuario.id_usuario,
      'GENERAR_REPORTE',
      TIPOS_REPORTE[tipo],
      formato,
      ipOrigen ?? null,
    ]);
    const [[fila]] = await conn.query('SELECT @doc AS documento');
    const documento = fila.documento;

    const meta = {
      documento,
      tipo,
      tipo_nombre: TIPOS_REPORTE[tipo],
      filtros,
      generado_por: usuario.nombre_completo ?? usuario.nombre_usuario,
      generado_en: new Date(),
    };

    const archivo =
      formato === 'pdf'
        ? await construirPdf(contenido, meta)
        : await construirExcel(contenido, meta);

    await conn.commit();
    return { ...archivo, documento };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
