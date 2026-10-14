import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Windows guarda aquí el nombre de cada dispositivo Bluetooth emparejado,
// en una subclave por dirección MAC (valor `Name`, binario UTF-8).
const CLAVE_DISPOSITIVOS_BT =
  'HKLM\\SYSTEM\\CurrentControlSet\\Services\\BTHPORT\\Parameters\\Devices';

const NOMBRE_POR_DEFECTO = 'ORTESIS';

// Mapa MAC (12 hex en mayúsculas) -> nombre Bluetooth del dispositivo.
async function nombresBluetoothEmparejados() {
  let salida;
  try {
    const { stdout } = await execFileAsync(
      'reg',
      ['query', CLAVE_DISPOSITIVOS_BT, '/s', '/v', 'Name'],
      { windowsHide: true },
    );
    salida = stdout;
  } catch {
    return new Map(); // `reg` sale con error si no hay ningún dispositivo emparejado
  }

  const nombres = new Map();
  let mac = null;
  for (const linea of salida.split(/\r?\n/)) {
    const clave = linea.match(/\\Devices\\([0-9a-f]{12})\s*$/i);
    if (clave) {
      mac = clave[1].toUpperCase();
      continue;
    }
    const valor = linea.match(/^\s+Name\s+REG_BINARY\s+([0-9a-f]*)/i);
    if (valor && mac) {
      const nombre = Buffer.from(valor[1], 'hex').toString('utf8').replace(/\0+$/, '').trim();
      nombres.set(mac, nombre);
      mac = null;
    }
  }
  return nombres;
}

// El puerto COM "saliente" de un dispositivo emparejado trae su MAC en el
// pnpId (…&0&71C1EED156C7_C00000000). El "entrante" trae 000000000000 y no
// sirve para conectarse a la órtesis.
function macDelPnpId(pnpId = '') {
  const m = pnpId.match(/&([0-9a-f]{12})_C[0-9a-f]*$/i);
  if (!m || /^0+$/.test(m[1])) return null;
  return m[1].toUpperCase();
}

export function nombreOrtesis() {
  return (process.env.ORTESIS_NOMBRE_BT || NOMBRE_POR_DEFECTO).trim();
}

// Devuelve el puerto COM de la órtesis emparejada con el nombre indicado, o
// null si no está emparejada en esta computadora.
export async function buscarPuertoPorNombre(nombre) {
  const { SerialPort } = await import('serialport');
  const [puertos, nombres] = await Promise.all([SerialPort.list(), nombresBluetoothEmparejados()]);

  const buscado = nombre.toLowerCase();
  for (const puerto of puertos) {
    const mac = macDelPnpId(puerto.pnpId);
    if (mac && nombres.get(mac)?.toLowerCase() === buscado) return puerto.path;
  }
  return null;
}

// Decide de dónde leer al conectar una sesión:
//   SERIAL_MOCK=true  -> datos simulados (desarrollo sin hardware)
//   SERIAL_PORT=COMx  -> puerto fijo (solo para pruebas, p. ej. por cable USB)
//   si no             -> busca la órtesis por su nombre Bluetooth (ORTESIS_NOMBRE_BT)
export async function resolverPuerto() {
  if (process.env.SERIAL_MOCK === 'true') return 'MOCK';
  if (process.env.SERIAL_PORT?.trim()) return process.env.SERIAL_PORT.trim();

  const nombre = nombreOrtesis();
  if (process.platform !== 'win32') {
    throw new Error(
      'La búsqueda de la órtesis por nombre solo está disponible en Windows. Configure SERIAL_PORT.',
    );
  }

  const puerto = await buscarPuertoPorNombre(nombre);
  if (!puerto) {
    throw new Error(
      `No se encontró la órtesis "${nombre}" en esta computadora. Emparéjela desde ` +
        'Configuración de Windows > Bluetooth y dispositivos > Agregar dispositivo ' +
        '(PIN 1234) y vuelva a intentar.',
    );
  }
  return puerto;
}
