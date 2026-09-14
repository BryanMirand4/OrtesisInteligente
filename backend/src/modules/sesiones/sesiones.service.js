import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as ortesis from '../../ortesis/index.js';

// Sesiones FINALIZADA del paciente vs. la meta de su protocolo (sesiones_meta).
// Si ya la alcanzó y no se pidió continuar de todas formas, se corta con un
// error identificable (code) para que el frontend pida confirmación al
// fisioterapeuta en vez de bloquear silenciosamente.
async function validarMetaSesiones(idPaciente) {
  const [[info]] = await pool.query(
    `SELECT pr.sesiones_meta,
            (SELECT COUNT(*) FROM sesion s
              WHERE s.id_paciente = p.id_paciente AND s.estado = 'FINALIZADA') AS sesiones_realizadas
       FROM paciente p
       LEFT JOIN protocolo pr ON pr.id_protocolo = p.id_protocolo
      WHERE p.id_paciente = ?`,
    [idPaciente],
  );

  if (info?.sesiones_meta && info.sesiones_realizadas >= info.sesiones_meta) {
    throw new AppError(
      409,
      `El paciente alcanzó la meta de ${info.sesiones_meta} sesiones establecida en su protocolo. ` +
        'Puede continuar y registrar una sesión adicional, o ajustar la meta del paciente antes de continuar.',
      'META_ALCANZADA',
    );
  }
}

export async function iniciar(idPaciente, idFisioterapeuta, forzarMetaSuperada = false) {
  if (!forzarMetaSuperada) {
    await validarMetaSesiones(idPaciente);
  }

  // Conexión única: el OUT param viaja en una variable de sesión de MySQL.
  const conn = await pool.getConnection();
  try {
    await conn.query('CALL sp_sesion_iniciar(?,?, @id_out)', [idPaciente, idFisioterapeuta]);
    const [[{ id_out }]] = await conn.query('SELECT @id_out AS id_out');
    return obtener(id_out, idFisioterapeuta);
  } finally {
    conn.release();
  }
}

// Sesión EN_CURSO del fisioterapeuta (o null). Permite retomar la vista en
// vivo si se recargó la página o se cambió de dispositivo.
export async function obtenerActiva(idFisioterapeuta) {
  const [rows] = await pool.query(
    `SELECT id_sesion FROM sesion WHERE id_fisioterapeuta = ? AND estado = 'EN_CURSO' LIMIT 1`,
    [idFisioterapeuta],
  );
  if (rows.length === 0) return null;
  return obtener(rows[0].id_sesion, idFisioterapeuta);
}

export async function obtener(idSesion, idFisioterapeuta) {
  const [results] = await pool.query('CALL sp_sesion_obtener(?)', [idSesion]);
  const sesion = results[0][0];

  if (!sesion) throw new AppError(404, 'Sesión no encontrada.');
  if (idFisioterapeuta && sesion.id_fisioterapeuta !== idFisioterapeuta) {
    throw new AppError(403, 'Esta sesión pertenece a otro fisioterapeuta.');
  }

  return { ...sesion, captura: ortesis.estadoCaptura(idSesion) };
}

export async function conectar(idSesion, puerto, duracionPlaneadaMinutos, idFisioterapeuta) {
  const sesion = await obtener(idSesion, idFisioterapeuta);
  if (sesion.estado !== 'EN_CURSO') {
    throw new AppError(409, 'La sesión no está en curso.');
  }

  const duracionPlaneadaSegundos = duracionPlaneadaMinutos
    ? Number(duracionPlaneadaMinutos) * 60
    : null;

  await pool.query('CALL sp_sesion_iniciar_captura(?,?,?)', [
    idSesion,
    puerto,
    duracionPlaneadaSegundos,
  ]);

  try {
    const info = await ortesis.iniciarCaptura(idSesion, puerto, {
      fcUmbral: sesion.fc_umbral,
      duracionPlaneadaSegundos,
    });
    return { ...info, id_sesion: Number(idSesion) };
  } catch (err) {
    // Falla de apertura del puerto: se permite reintentar desde el frontend.
    throw new AppError(502, err.message);
  }
}

export async function pausar(idSesion, idFisioterapeuta) {
  await obtener(idSesion, idFisioterapeuta);
  return ortesis.pausarCaptura(idSesion);
}

export async function reanudar(idSesion, idFisioterapeuta) {
  await obtener(idSesion, idFisioterapeuta);
  return ortesis.reanudarCaptura(idSesion);
}

export async function finalizar(idSesion, observaciones, idFisioterapeuta) {
  await obtener(idSesion, idFisioterapeuta);

  // Si la captura sigue viva (finalización manual), detenerCaptura fija ahí
  // mismo el corte; si ya se había detenido sola (tiempo cumplido), el valor
  // quedó guardado desde ese momento. En ambos casos es el tiempo ACTIVO
  // real, no el reloj de pared hasta que se confirma este endpoint.
  await ortesis.detenerCaptura(idSesion);
  const duracionActivaSegundos = ortesis.tomarDuracionActivaFinal(idSesion);

  await pool.query('CALL sp_sesion_finalizar(?,?,?,?)', [
    idSesion,
    observaciones ?? null,
    idFisioterapeuta,
    duracionActivaSegundos,
  ]);

  const [results] = await pool.query('CALL sp_sesion_obtener(?)', [idSesion]);
  const [resumen] = await pool.query(
    `SELECT rd.id_dedo, d.nombre AS dedo_nombre, rd.angulo_max, rd.angulo_promedio
       FROM resumen_dedo rd
       JOIN dedo d ON d.id_dedo = rd.id_dedo
      WHERE rd.id_sesion = ?
      ORDER BY d.orden`,
    [idSesion],
  );

  return { sesion: results[0][0], resumen_dedo: resumen };
}

export async function cancelar(idSesion, idFisioterapeuta) {
  await obtener(idSesion, idFisioterapeuta);

  await ortesis.detenerCaptura(idSesion);
  ortesis.tomarDuracionActivaFinal(idSesion); // limpia el registro; una sesión cancelada no lo usa
  await pool.query('CALL sp_sesion_cancelar(?,?)', [idSesion, idFisioterapeuta]);

  return obtener(idSesion, idFisioterapeuta);
}

export async function listarLecturas(idSesion, idFisioterapeuta) {
  await obtener(idSesion, idFisioterapeuta);

  const [results] = await pool.query('CALL sp_lectura_listar(?)', [idSesion]);

  // Agrupar las filas (lectura, dedo) por id_lectura para reconstruir la curva.
  const porLectura = new Map();
  for (const fila of results[0]) {
    if (!porLectura.has(fila.id_lectura)) {
      porLectura.set(fila.id_lectura, {
        id_lectura: fila.id_lectura,
        marca_tiempo: fila.marca_tiempo,
        frecuencia_cardiaca: fila.frecuencia_cardiaca,
        repeticion_num: fila.repeticion_num,
        orientacion: { roll: fila.roll, pitch: fila.pitch, yaw: fila.yaw },
        flexion: {},
      });
    }
    porLectura.get(fila.id_lectura).flexion[fila.dedo_nombre] = fila.angulo;
  }

  return [...porLectura.values()];
}
