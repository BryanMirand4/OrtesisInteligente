import { pool } from '../config/db.js';
import { emitirSesion } from '../realtime/io.js';
import { crearFuenteMock } from './fuenteMock.js';
import { crearFuenteSerial } from './fuenteSerial.js';
import { adcAAngulo, cargarCalibracionVigente } from './calibrador.js';
import { ID_DEDO } from './protocolo.js';

const INTERVALO_FLUSH_MS = 1000;
const INTERVALO_TEMPORIZADOR_MS = 1000;
const MS_ENTRE_ALERTAS = 5000;

// Nombre de dedo (clave del payload Socket.IO) -> id_dedo de la tabla `dedo`.
const DEDOS = [
  ['indice', ID_DEDO.INDICE],
  ['medio', ID_DEDO.MEDIO],
  ['pulgar', ID_DEDO.PULGAR],
];

// id_sesion -> captura en curso.
const capturas = new Map();

// id_sesion -> segundos activos capturados hasta el instante exacto en que se
// cortó la captura (por tiempo cumplido o por detenerCaptura). Se guarda acá
// y no se recalcula después con el reloj de pared, porque entre que se corta
// la captura y el fisioterapeuta confirma "Finalizar" (o entre iniciar la
// sesión y conectar la órtesis) pasa tiempo "muerto" que NO es parte del
// ejercicio y no debe sumarse a duracion_segundos.
const duracionesFinales = new Map();

const usarMock = (puerto) =>
  process.env.SERIAL_MOCK === 'true' || !puerto || puerto.toUpperCase() === 'MOCK';

export function sesionActiva(idSesion) {
  return capturas.has(Number(idSesion));
}

// Segundos de terapia ACTIVA transcurridos (excluye el tiempo en pausa).
function segundosActivos(captura) {
  const pausaAbierta = captura.inicioPausaMs
    ? (Date.now() - captura.inicioPausaMs) / 1000
    : 0;
  return (Date.now() - captura.inicio) / 1000 - captura.segundosPausadosAcumulados - pausaAbierta;
}

// Estado actual de la captura de una sesión (o { activa: false }). Sirve
// para "rehidratar" el frontend tras un refresco de página.
export function estadoCaptura(idSesion) {
  const captura = capturas.get(Number(idSesion));
  if (!captura) return { activa: false };
  return {
    activa: true,
    pausada: captura.pausada,
    fuente: captura.fuente.tipo,
    duracion_planeada_segundos: captura.duracionPlaneadaSegundos,
    cronometro_segundos: Math.floor(segundosActivos(captura)),
  };
}

// Abre la fuente (serial o mock), empieza a emitir por Socket.IO y a
// bufferizar lecturas para persistirlas en lote.
export async function iniciarCaptura(idSesion, puerto, opciones = {}) {
  idSesion = Number(idSesion);
  if (capturas.has(idSesion)) return estadoCaptura(idSesion);

  const { fcUmbral = null, duracionPlaneadaSegundos = null } = opciones;

  const calibracion = await cargarCalibracionVigente();
  const fuente = usarMock(puerto) ? crearFuenteMock() : crearFuenteSerial(puerto);

  const captura = {
    idSesion,
    fuente,
    calibracion,
    fcUmbral,
    duracionPlaneadaSegundos,
    pausada: false,
    inicioPausaMs: null,
    segundosPausadosAcumulados: 0,
    buffer: [],
    inicio: Date.now(),
    ultimaAlerta: 0,
    timerFlush: null,
    timerTemporizador: null,
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
  if (captura.duracionPlaneadaSegundos) {
    captura.timerTemporizador = setInterval(
      () => verificarTemporizador(captura),
      INTERVALO_TEMPORIZADOR_MS,
    );
  }
  capturas.set(idSesion, captura);

  emitirSesion(idSesion, 'estado_captura', { conectado: true, fuente: fuente.tipo });
  return estadoCaptura(idSesion);
}

function manejarTrama(captura, trama) {
  // En pausa se descarta todo: no se persiste, no se emite y no cuenta para
  // el temporizador ni para el máximo alcanzado.
  if (captura.pausada) return;

  const cronometroSegundos = Math.floor(segundosActivos(captura));

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

// Verifica si se cumplió el tiempo planeado. Si es así, corta la captura en
// el acto (no se sigue registrando) y avisa al frontend para que el
// fisioterapeuta confirme el cierre desde la pantalla de finalizar (así no
// se pierde la oportunidad de escribir la observación clínica). La sesión
// sigue EN_CURSO en la base hasta que se confirme.
function verificarTemporizador(captura) {
  if (captura.pausada || !captura.duracionPlaneadaSegundos) return;
  if (segundosActivos(captura) >= captura.duracionPlaneadaSegundos) {
    detenerFuenteInterna(captura.idSesion, 'tiempo_cumplido').catch((e) => console.error(e.message));
  }
}

// Pausa la captura: dejan de leerse/emitirse/persistirse muestras y se
// congela el temporizador, sin tocar el estado de la sesión en la BD.
export function pausarCaptura(idSesion) {
  const captura = capturas.get(Number(idSesion));
  if (!captura || captura.pausada) return estadoCaptura(idSesion);

  captura.pausada = true;
  captura.inicioPausaMs = Date.now();
  emitirSesion(captura.idSesion, 'pausa', { pausada: true });
  return estadoCaptura(idSesion);
}

// Reanuda una captura pausada. Persiste el tiempo de esa pausa (acumulado)
// para que la duración real, calculada al finalizar, lo descuente.
export async function reanudarCaptura(idSesion) {
  idSesion = Number(idSesion);
  const captura = capturas.get(idSesion);
  if (!captura || !captura.pausada) return estadoCaptura(idSesion);

  const segundosPausa = Math.max(0, Math.round((Date.now() - captura.inicioPausaMs) / 1000));
  captura.segundosPausadosAcumulados += segundosPausa;
  captura.inicioPausaMs = null;
  captura.pausada = false;

  if (segundosPausa > 0) {
    await pool.query('CALL sp_sesion_incrementar_pausa(?,?)', [idSesion, segundosPausa]);
  }

  emitirSesion(idSesion, 'pausa', { pausada: false });
  return estadoCaptura(idSesion);
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

// Cierra la fuente, hace el flush final y libera la sesión. `motivo` viaja en
// el evento de socket para que el frontend distinga un corte manual (el
// fisioterapeuta ya va a llamar a /finalizar o /cancelar) de uno automático
// por tiempo cumplido (debe mostrar la pantalla de cierre y pedir confirmar).
async function detenerFuenteInterna(idSesion, motivo) {
  idSesion = Number(idSesion);
  const captura = capturas.get(idSesion);
  if (!captura) return;

  // Instante exacto del corte: es el valor que se va a persistir como
  // duracion_segundos, sin importar cuánto tarde después el fisioterapeuta
  // en confirmar el cierre.
  duracionesFinales.set(idSesion, Math.floor(segundosActivos(captura)));

  clearInterval(captura.timerFlush);
  clearInterval(captura.timerTemporizador);
  captura.fuente.cerrar();
  await flush(captura);
  capturas.delete(idSesion);

  if (motivo === 'tiempo_cumplido') {
    emitirSesion(idSesion, 'tiempo_cumplido', {});
  }
  emitirSesion(idSesion, 'estado_captura', { conectado: false, fuente: captura.fuente.tipo });
}

export async function detenerCaptura(idSesion) {
  return detenerFuenteInterna(idSesion, 'manual');
}

// Devuelve (y limpia) la duración activa capturada para esta sesión, o null
// si la órtesis nunca llegó a conectarse. Se llama una sola vez, al finalizar.
export function tomarDuracionActivaFinal(idSesion) {
  idSesion = Number(idSesion);
  const valor = duracionesFinales.get(idSesion);
  duracionesFinales.delete(idSesion);
  return valor ?? null;
}
