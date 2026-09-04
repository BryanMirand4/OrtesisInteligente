import { pool } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import * as ortesis from '../../ortesis/index.js';

export async function iniciar(idPaciente, idFisioterapeuta) {
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

  return { ...sesion, captura_activa: ortesis.sesionActiva(idSesion) };
}

export async function conectar(idSesion, puerto, idFisioterapeuta) {
  const sesion = await obtener(idSesion, idFisioterapeuta);
  if (sesion.estado !== 'EN_CURSO') {
    throw new AppError(409, 'La sesión no está en curso.');
  }

  await pool.query('CALL sp_sesion_registrar_puerto(?,?)', [idSesion, puerto]);

  try {
    const info = await ortesis.iniciarCaptura(idSesion, puerto, sesion.fc_umbral);
    return { ...info, id_sesion: Number(idSesion) };
  } catch (err) {
    // Falla de apertura del puerto: se permite reintentar desde el frontend.
    throw new AppError(502, err.message);
  }
}

export async function finalizar(idSesion, observaciones, idFisioterapeuta) {
  await obtener(idSesion, idFisioterapeuta);

  await ortesis.detenerCaptura(idSesion);
  await pool.query('CALL sp_sesion_finalizar(?,?,?)', [
    idSesion,
    observaciones ?? null,
    idFisioterapeuta,
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
