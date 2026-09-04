// =====================================================================
//  Protocolo de trama de la órtesis (módulo Bluetooth HC-06)
// =====================================================================
//  No existe una especificación previa del firmware, así que se define
//  aquí un formato simple y se documenta. El modo mock genera exactamente
//  este formato; cuando exista el firmware real, ajustar parseLinea().
//
//  Una lectura por línea de texto ASCII terminada en '\n'. Campos
//  separados por coma, sin espacios:
//
//    L,<ms>,<adc_indice>,<adc_medio>,<adc_pulgar>,<fc>,<roll>,<pitch>,<yaw>,<rep>
//
//    L            prefijo literal que marca una línea de lectura
//    ms           marca de tiempo del microcontrolador en milisegundos
//    adc_indice   valor crudo del sensor flex del índice  (0..1023)
//    adc_medio    valor crudo del sensor flex del medio   (0..1023)
//    adc_pulgar   valor crudo del sensor flex del pulgar  (0..1023)
//    fc           frecuencia cardíaca en bpm (entero; 0 = sin dato)
//    roll,pitch,yaw   orientación de la mano en grados (sensor inercial)
//    rep          contador de repeticiones completadas (entero)
//
//  Ejemplo:  L,12345,320,410,290,84,-3.20,12.50,0.80,17
//
//  id_dedo según la tabla `dedo`: 1 = Pulgar, 2 = Índice, 3 = Medio.
// =====================================================================

export const ID_DEDO = { PULGAR: 1, INDICE: 2, MEDIO: 3 };

// Devuelve la trama normalizada, o null si la línea no cumple el formato.
export function parseLinea(linea) {
  if (typeof linea !== 'string') return null;

  const partes = linea.trim().split(',');
  if (partes.length !== 10 || partes[0] !== 'L') return null;

  const numeros = partes.slice(1).map(Number);
  if (numeros.some((v) => Number.isNaN(v))) return null;

  const [ms, adcIndice, adcMedio, adcPulgar, fc, roll, pitch, yaw, rep] = numeros;

  return {
    ms,
    adc: {
      [ID_DEDO.INDICE]: adcIndice,
      [ID_DEDO.MEDIO]: adcMedio,
      [ID_DEDO.PULGAR]: adcPulgar,
    },
    fc: fc > 0 ? Math.round(fc) : null,
    orientacion: { roll, pitch, yaw },
    repeticion: Math.max(0, Math.round(rep)),
  };
}

// Serializa una trama al formato de línea (lo usa el modo mock y sirve de
// referencia para el firmware).
export function formatearLinea({ ms, adc, fc, orientacion, repeticion }) {
  return [
    'L',
    ms,
    adc[ID_DEDO.INDICE],
    adc[ID_DEDO.MEDIO],
    adc[ID_DEDO.PULGAR],
    fc ?? 0,
    orientacion.roll.toFixed(2),
    orientacion.pitch.toFixed(2),
    orientacion.yaw.toFixed(2),
    repeticion,
  ].join(',');
}
