import { pool } from '../config/db.js';
import { emitirSesion } from '../realtime/io.js';
import { crearFuenteMock } from './fuenteMock.js';
import { crearFuenteSerial } from './fuenteSerial.js';
import { adcAAngulo, cargarCalibracionVigente } from './calibrador.js';
import { ID_DEDO } from './protocolo.js';

const INTERVALO_FLUSH_MS = 1000;
const MS_ENTRE_ALERTAS = 5000;

// Nombre de dedo (clave del payload Socket.IO) -> id_dedo de la tabla `dedo`.
const DEDOS = [
  ['indice', ID_DEDO.INDICE],
  ['medio', ID_DEDO.MEDIO],
  ['pulgar', ID_DEDO.PULGAR],
];

// id_sesion -> captura en curso.
const capturas = new Map();

const usarMock = (puerto) =>
  process.env.SERIAL_MOCK === 'true' || !puerto || puerto.toUpperCase() === 'MOCK';

export function sesionActiva(idSesion) {
  return capturas.has(Number(idSesion));
}

// Abre la fuente (serial o mock), empieza a emitir por Socket.IO y a
// bufferizar lecturas para persistirlas en lote.
export async function iniciarCaptura(idSesion, puerto, fcUmbral) {
  idSesion = Number(idSesion);
  if (capturas.has(idSesion)) return capturas.get(idSesion).info;

  const calibracion = await cargarCalibracionVigente();
  const fuente = usarMock(puerto) ? crearFuenteMock() : crearFuenteSerial(puerto);

  const captura = {
    idSesion,
    fuente,
    calibracion,
    fcUmbral: fcUmbral ?? null,
    buffer: [],
    inicio: Date.now(),
    ultimaAlerta: 0,
    timerFlush: null,
    info: { conectado: true, fuente: fuente.tipo },
  };

  fuente.emisor.on('trama', (trama) => manejarTrama(captura, trama));
  fuente.emisor.on('error', (err) =>
    console.error(`Órtesis sesión ${idSesion}: ${err.message}`),
  );

  await fuente.abrir();

  captura.timerFlush = setInterval(
    () => flush(captura).catch((e) => console.error(e.message)),
    INTERVALO_FLUSH_MS,
  );
  capturas.set(idSesion, captura);

  emitirSesion(idSesion, 'estado_captura', captura.info);
  return captura.info;
}

function manejarTrama(captura, trama) {
  const cronometroSegundos = Math.floor((Date.now() - captura.inicio) / 1000);

  const flexion = {};
  const angulosPorDedo = {};
  for (const [nombre, idDedo] of DEDOS) {
    const calib = captura.calibracion.get(idDedo);
    const angulo = calib ? adcAAngulo(trama.adc[idDedo], calib) : 0;
    flexion[nombre] = angulo;
    angulosPorDedo[idDedo] = angulo;
  }

  const marcaTiempo = new Date();
  captura.buffer.push({
    marcaTiempo,
    roll: trama.orientacion.roll,
    pitch: trama.orientacion.pitch,
    yaw: trama.orientacion.yaw,
    fc: trama.fc,
    repeticion: trama.repeticion,
    angulos: angulosPorDedo,
  });

  emitirSesion(captura.idSesion, 'lectura', {
    marca_tiempo: marcaTiempo.toISOString(),
    flexion,
    fc: trama.fc,
    orientacion: trama.orientacion,
    repeticiones: trama.repeticion,
    cronometro_segundos: cronometroSegundos,
  });

  if (
    captura.fcUmbral &&
    trama.fc &&
    trama.fc > captura.fcUmbral &&
    Date.now() - captura.ultimaAlerta > MS_ENTRE_ALERTAS
  ) {
    captura.ultimaAlerta = Date.now();
    emitirSesion(captura.idSesion, 'alerta_fc', { fc: trama.fc, umbral: captura.fcUmbral });
  }
}

// Persiste el buffer acumulado en una transacción. Inserta `lectura` en lote y,
// a partir del insertId del lote (los id de un INSERT multi-fila de InnoDB son
// consecutivos), inserta `lectura_flexion` en lote.
async function flush(captura) {
  if (captura.buffer.length === 0) return;

  const lote = captura.buffer;
  captura.buffer = [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const filasLectura = lote.map((m) => [
      captura.idSesion,
      formatoFechaSql(m.marcaTiempo),
      m.roll,
      m.pitch,
      m.yaw,
      m.fc,
      m.repeticion,
    ]);
    const [res] = await conn.query(
      `INSERT INTO lectura
         (id_sesion, marca_tiempo, roll, pitch, yaw, frecuencia_cardiaca, repeticion_num)
       VALUES ?`,
      [filasLectura],
    );

    const filasFlexion = [];
    lote.forEach((m, i) => {
      const idLectura = res.insertId + i;
      for (const [idDedo, angulo] of Object.entries(m.angulos)) {
        filasFlexion.push([idLectura, Number(idDedo), angulo]);
      }
    });
    if (filasFlexion.length > 0) {
      await conn.query(
        'INSERT INTO lectura_flexion (id_lectura, id_dedo, angulo) VALUES ?',
        [filasFlexion],
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error(`Flush de la sesión ${captura.idSesion} falló: ${err.message}`);
  } finally {
    conn.release();
  }
}

// 'YYYY-MM-DD HH:MM:SS.mmm' en hora local, compatible con DATETIME(3).
function formatoFechaSql(d) {
  const p = (n, largo = 2) => String(n).padStart(largo, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
  );
}

// Cierra la fuente, hace el flush final y libera la sesión.
export async function detenerCaptura(idSesion) {
  idSesion = Number(idSesion);
  const captura = capturas.get(idSesion);
  if (!captura) return;

  clearInterval(captura.timerFlush);
  captura.fuente.cerrar();
  await flush(captura);
  capturas.delete(idSesion);

  emitirSesion(idSesion, 'estado_captura', { conectado: false, fuente: captura.fuente.tipo });
}
