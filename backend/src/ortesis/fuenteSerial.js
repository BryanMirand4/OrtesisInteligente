import { EventEmitter } from 'events';
import { parseLinea } from './protocolo.js';

const BAUD_RATE = Number(process.env.SERIAL_BAUD_RATE) || 9600;

// Fuente real: abre el puerto serial virtual del HC-06, parte el flujo en
// líneas y emite la trama normalizada. Misma interfaz que fuenteMock.
//
// `serialport` trae un binding nativo; se importa de forma perezosa para que
// el modo mock (desarrollo sin hardware) no dependa de él.
export function crearFuenteSerial(puerto) {
  const emisor = new EventEmitter();
  let port = null;

  return {
    tipo: 'serial',
    emisor,
    async abrir() {
      const { SerialPort } = await import('serialport');
      const { ReadlineParser } = await import('@serialport/parser-readline');

      await new Promise((resolve, reject) => {
        port = new SerialPort({ path: puerto, baudRate: BAUD_RATE, autoOpen: false });
        port.open((err) => {
          if (err) {
            reject(new Error(`No se pudo abrir el puerto ${puerto}: ${err.message}`));
            return;
          }
          const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
          parser.on('data', (linea) => {
            const trama = parseLinea(linea);
            if (trama) emisor.emit('trama', trama);
          });
          port.on('error', (e) => emisor.emit('error', e));
          resolve();
        });
      });
    },
    cerrar() {
      if (port && port.isOpen) port.close(() => {});
      port = null;
    },
  };
}
