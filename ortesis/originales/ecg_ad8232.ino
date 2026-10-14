// Módulo ECG AD8232 en Arduino Uno + cálculo de BPM
//
// AD8232: 3.3V -> 3.3V | GND -> GND | OUTPUT -> A3 | LO+ -> D10 | LO- -> D11 | SDN sin conectar
//
// Abre el Monitor Serie o Plotter Serie a 115200 baudios.

const int PIN_ECG = A3;
const int PIN_LO_MAS = 10;
const int PIN_LO_MENOS = 11;

const unsigned long PERIODO_ECG_US = 4000;   // 250 muestras por segundo
const int MUESTRAS_POR_ENVIO = 5;            // Envía 1 de cada 5 muestras = 50 por segundo al Plotter

// ---------- Detección de latidos ----------
const float ALFA_LINEA_BASE = 0.005;          // Seguimiento lento de la línea base (~0.8 s)
const float DECAIMIENTO_ENVOLVENTE = 0.998;   // Cuánto "olvida" la altura del último pico por muestra
const float FRACCION_UMBRAL = 0.5;            // Latido = señal por encima del 50% del último pico
const int AMPLITUD_MINIMA = 30;               // Ignora ruido menor a esto (unidades del ADC)
const unsigned long REFRACTARIO_MS = 250;     // Tiempo mínimo entre latidos (máx. 240 BPM)
const unsigned long INTERVALO_MAX_MS = 2000;  // Más de esto entre latidos (< 30 BPM) se descarta
const int NUM_INTERVALOS = 8;                 // Promedio de los últimos 8 latidos, como un monitor de hospital
const float TOLERANCIA_INTERVALO = 0.3;       // Latidos que se alejan más de 30% del promedio se ignoran
const int RECHAZOS_PARA_REINICIAR = 3;        // Si se rechazan 3 seguidos, el ritmo cambió de verdad
const unsigned long PERIODO_PANTALLA_MS = 1000;  // El BPM mostrado se actualiza 1 vez por segundo

unsigned long ultimoTiempo = 0;
unsigned long ultimaActualizacionBpm = 0;
int bpmMostrado = 0;
int contadorEnvio = 0;
int maxBloque = 0;

float lineaBase = 0;
float envolvente = 0;
bool sobreUmbral = false;
bool electrodosSueltos = true;

unsigned long ultimoLatido = 0;
unsigned long intervalos[NUM_INTERVALOS];
int numIntervalos = 0;
int indiceIntervalo = 0;
int rechazosSeguidos = 0;
int bpm = 0;

void reiniciarPromedio() {
  numIntervalos = 0;
  indiceIntervalo = 0;
  rechazosSeguidos = 0;
}

void reiniciarDeteccion() {
  envolvente = 0;
  sobreUmbral = false;
  ultimoLatido = 0;
  reiniciarPromedio();
  bpm = 0;
}

unsigned long promedioIntervalos() {
  unsigned long suma = 0;
  for (int i = 0; i < numIntervalos; i++) suma += intervalos[i];
  return suma / numIntervalos;
}

void registrarLatido(unsigned long ahoraMs) {
  if (ultimoLatido == 0) {
    ultimoLatido = ahoraMs;
    return;
  }

  unsigned long intervalo = ahoraMs - ultimoLatido;
  if (intervalo > INTERVALO_MAX_MS) {
    reiniciarPromedio();   // Pausa larga: se empieza a promediar de nuevo
    ultimoLatido = ahoraMs;
    return;
  }

  // Con suficientes latidos, ignora los que no encajan con el ritmo (ruido, onda T, latido perdido)
  if (numIntervalos >= 3) {
    unsigned long promedio = promedioIntervalos();
    bool muyCorto = intervalo < promedio * (1.0 - TOLERANCIA_INTERVALO);
    bool muyLargo = intervalo > promedio * (1.0 + TOLERANCIA_INTERVALO);
    if (muyCorto || muyLargo) {
      rechazosSeguidos++;
      if (rechazosSeguidos < RECHAZOS_PARA_REINICIAR) {
        // Un pico falso no mueve la referencia; un latido perdido sí
        if (muyLargo) ultimoLatido = ahoraMs;
        return;
      }
      reiniciarPromedio();   // El ritmo cambió de verdad: se acepta el nuevo
    }
  }

  rechazosSeguidos = 0;
  intervalos[indiceIntervalo] = intervalo;
  indiceIntervalo = (indiceIntervalo + 1) % NUM_INTERVALOS;
  if (numIntervalos < NUM_INTERVALOS) numIntervalos++;
  bpm = 60000UL / promedioIntervalos();
  ultimoLatido = ahoraMs;
}

void actualizarBpmMostrado() {
  unsigned long ahoraMs = millis();
  // Electrodo suelto o sin latidos: se muestra al instante, como la alarma de un monitor
  if (bpm == 0 || ahoraMs - ultimaActualizacionBpm >= PERIODO_PANTALLA_MS) {
    bpmMostrado = bpm;
    ultimaActualizacionBpm = ahoraMs;
  }
}

void detectarLatido(int ecg) {
  unsigned long ahoraMs = millis();

  lineaBase += (ecg - lineaBase) * ALFA_LINEA_BASE;
  float senal = ecg - lineaBase;

  envolvente *= DECAIMIENTO_ENVOLVENTE;
  if (senal > envolvente) envolvente = senal;
  float umbral = envolvente * FRACCION_UMBRAL;

  if (!sobreUmbral) {
    if (senal > umbral && senal > AMPLITUD_MINIMA &&
        ahoraMs - ultimoLatido > REFRACTARIO_MS) {
      sobreUmbral = true;
      registrarLatido(ahoraMs);
    }
  } else if (senal < umbral * 0.5) {
    sobreUmbral = false;   // Histéresis: espera a que baje para aceptar el siguiente pico
  }

  // Sin latidos por un rato: no mostrar un BPM viejo
  if (ultimoLatido != 0 && ahoraMs - ultimoLatido > INTERVALO_MAX_MS) bpm = 0;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LO_MAS, INPUT);
  pinMode(PIN_LO_MENOS, INPUT);
}

void loop() {
  unsigned long ahora = micros();
  if (ahora - ultimoTiempo < PERIODO_ECG_US) return;
  ultimoTiempo = ahora;

  // Si algún electrodo está suelto, LO+ o LO- se ponen en HIGH
  int ecg;
  if (digitalRead(PIN_LO_MAS) == HIGH || digitalRead(PIN_LO_MENOS) == HIGH) {
    ecg = 0;
    electrodosSueltos = true;
    reiniciarDeteccion();
  } else {
    ecg = analogRead(PIN_ECG);
    if (electrodosSueltos) {
      lineaBase = ecg;     // Al reconectar, parte de la lectura actual
      electrodosSueltos = false;
    }
    detectarLatido(ecg);
  }
  actualizarBpmMostrado();

  // Se sigue muestreando a 250 Hz para detectar bien los latidos, pero solo se
  // envía el máximo de cada bloque para que el Plotter avance más lento sin perder los picos
  if (contadorEnvio == 0 || ecg > maxBloque) maxBloque = ecg;
  contadorEnvio++;
  if (contadorEnvio < MUESTRAS_POR_ENVIO) return;
  contadorEnvio = 0;

  // Formato compatible con el Plotter Serie
  Serial.print("ECG:");
  Serial.print(maxBloque);
  Serial.print(" BPM:");
  Serial.println(bpmMostrado);
}
