import { EventEmitter } from 'events';
import { ID_DEDO } from './protocolo.js';

const HZ = 50;
const PERIODO_MS = 1000 / HZ;

// Fuente simulada de tramas: emite el mismo objeto normalizado que
// fuenteSerial, para desarrollar y probar sin hardware.
//   - Flexión senoidal por dedo, con periodo distinto por dedo.
//   - FC con deriva suave + picos esporádicos sobre el umbral (prueba la alerta).
//   - Contador de repeticiones (una por ciclo de flexión del índice).
export function crearFuenteMock() {
  const emisor = new EventEmitter();
  let timer = null;
  let t0 = Date.now();
  let repeticion = 0;
  let faseAnterior = 0;
  let fcBase = 78;

  function tick() {
    const ms = Date.now() - t0;
    const s = ms / 1000;

    const onda = (periodoS, desfaseS) =>
      0.5 - 0.5 * Math.cos(((s + desfaseS) / periodoS) * 2 * Math.PI);
    const aAdc = (u, min, max) => Math.round(min + u * (max - min));

    const uIndice = onda(3.0, 0);
    const uMedio = onda(3.4, 0.6);
    const uPulgar = onda(4.0, 1.2);

    // Una repetición por ciclo del índice (al reiniciarse la fase).
    const fase = (s / 3.0) % 1;
    if (fase < faseAnterior) repeticion += 1;
    faseAnterior = fase;

    fcBase += (Math.random() - 0.5) * 1.5;
    fcBase = Math.min(120, Math.max(70, fcBase));
    let fc = Math.round(fcBase + 10 * uIndice);
    if (Math.random() < 0.015) fc += 90; // pico esporádico -> dispara alerta_fc

    emisor.emit('trama', {
      ms,
      adc: {
        [ID_DEDO.INDICE]: aAdc(uIndice, 130, 640),
        [ID_DEDO.MEDIO]: aAdc(uMedio, 135, 625),
        [ID_DEDO.PULGAR]: aAdc(uPulgar, 145, 585),
      },
      fc,
      orientacion: {
        roll: Number((8 * Math.sin(s / 2)).toFixed(2)),
        pitch: Number((15 * uMedio - 5).toFixed(2)),
        yaw: Number((3 * Math.sin(s / 5)).toFixed(2)),
      },
      repeticion,
    });
  }

  return {
    tipo: 'mock',
    emisor,
    abrir() {
      return new Promise((resolve) => {
        t0 = Date.now();
        repeticion = 0;
        faseAnterior = 0;
        timer = setInterval(tick, PERIODO_MS);
        resolve();
      });
    },
    cerrar() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
