// Órtesis: 3 sensores flex 2.2" + módulo ECG AD8232 (BPM) en Arduino Uno
//
// Flex (cada sensor): 5V -> Flex -> nodo -> 47k -> GND ; nodo -> A0 / A1 / A2
// AD8232: 3.3V -> 3.3V | GND -> GND | OUTPUT -> A3 | LO+ -> D10 | LO- -> D11 | SDN sin conectar
//
// Bluetooth HC-05 (usa el puerto serie por hardware, el mismo del USB):
//   HC-05 VCC -> 5V | GND -> GND
//   HC-05 TXD -> D0 (RX del Arduino)
//   HC-05 RXD <- D1 (TX del Arduino) a través de un divisor 1k / 2k
//              (D1 -> 1k -> nodo -> 2k -> GND ; nodo -> RXD), porque el RXD del HC-05 es de 3.3 V
//   IMPORTANTE: desconecta el cable de D0 (TXD del HC-05) para subir el sketch por USB.
//
//   El HC-05 viene a 9600 baudios; este sketch usa 115200. Configúralo una sola vez en modo AT
//   (botón presionado al encenderlo, 38400 baudios, "Ambos NL & CR"):
//     AT+UART=115200,0,0     AT+NAME=ORTESIS     AT+PSWD="1234"
//   Se usa el puerto serie por hardware y no SoftwareSerial porque SoftwareSerial bloquea las
//   interrupciones mientras transmite (~1 ms por byte) y arruinaría el muestreo del ECG cada 4 ms.
//
// Hay dos modos de salida (comando 'm' para cambiar):
//   MODO APP (por defecto): solo envía tramas para la aplicación web, ~10 por segundo:
//       L,<ms>,<adc_indice>,<adc_medio>,<adc_pulgar>,<bpm>,<roll>,<pitch>,<yaw>,<repeticiones>
//     Es el formato de backend/src/ortesis/protocolo.js. Los adc son 0..1023 y SUBEN al
//     flexionar el dedo; la aplicación los convierte a grados con la tabla calibracion_sensor.
//     roll/pitch/yaw van en 0.00 hasta que se agregue el sensor inercial.
//   MODO MONITOR: la salida original para el Monitor Serie / Plotter Serie a 115200 baudios.
//
// Al arrancar mide la resistencia de cada sensor flex RECTO y su ruido
// (no los toques durante ~3 s).
//
// Comandos por monitor serial o Bluetooth (escribe y Enter):
//   r  -> recalibrar reposo de los 3 sensores (todos rectos)
//   n1 -> guardar la posición actual del sensor 1 como 90° (igual n2, n3)
//   d  -> activar/desactivar modo depuración (imprime todas las lecturas)
//   m  -> cambiar entre MODO APP y MODO MONITOR
//   z  -> reiniciar el contador de repeticiones (la aplicación lo envía al conectarse)
//
// Integración: el ECG debe muestrearse cada 4 ms, así que todas las esperas del
// código flex usan esperarMs(), que sigue atendiendo al ECG mientras transcurre
// el tiempo en lugar de bloquear el programa con delay().

#include <EEPROM.h>

// true = tramas para la aplicación (Bluetooth); false = salida legible para el Monitor/Plotter
bool modoApp = true;

// =====================================================================
// ============================ ECG AD8232 =============================
// =====================================================================

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

// El ECG cambia el canal del ADC a A3; el flex lo usa para volver a estabilizar su canal
bool adcUsadoPorECG = false;

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

void setupECG() {
  pinMode(PIN_LO_MAS, INPUT);
  pinMode(PIN_LO_MENOS, INPUT);
}

// Antes era el loop() del sketch ECG: toma una muestra solo si ya pasaron 4 ms
void tareaECG() {
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
    adcUsadoPorECG = true;
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
  if (modoApp) return;   // En modo app el BPM viaja dentro de la trama 'L'

  // Formato compatible con el Plotter Serie
  Serial.print("ECG:");
  Serial.print(maxBloque);
  Serial.print(" BPM:");
  Serial.println(bpmMostrado);
}

// Reemplazo de delay(): espera el tiempo indicado sin dejar de muestrear el ECG
void esperarMs(unsigned long ms) {
  unsigned long inicio = micros();
  while (micros() - inicio < ms * 1000UL) tareaECG();
}

// =====================================================================
// ========================= SENSORES FLEX (x3) ========================
// =====================================================================

const int NUM_SENSORES = 3;
const int PINES[NUM_SENSORES] = { A0, A1, A2 };

// Dedo al que va cada sensor (índice en PINES): A0 = índice, A1 = medio, A2 = pulgar.
// Si los colocas distinto en el guante, cambia solo estos tres números.
const int SENSOR_INDICE = 0;
const int SENSOR_MEDIO  = 1;
const int SENSOR_PULGAR = 2;
// Una repetición = el dedo índice se flexiona y vuelve a quedar recto
const int SENSOR_REPETICIONES = SENSOR_INDICE;

const float VCC = 5.0;            // Voltaje de alimentación
const float R_DIV = 47000.0;      // Resistencia fija del divisor (medila con multímetro y ponla aquí)

// % de cambio de resistencia a 90° si aún no se ha calibrado con 'n'
const float CAMBIO_90_DEFECTO = 30.0;

// Detección de flexión (porcentaje de cambio respecto a la resistencia en reposo)
const float UMBRAL_MIN    = 8.0;  // % mínimo para considerar flexión
const float UMBRAL_MAX    = 12.0; // % máximo (tope aunque el ruido sea alto)
const float FACTOR_RUIDO  = 3.0;  // El umbral será FACTOR_RUIDO veces el ruido (desviación estándar)
const int   CONFIRMAR     = 4;    // Lecturas seguidas sobre el umbral para confirmar flexión

const int   MUESTRAS      = 16;   // Promedio de lecturas por ciclo
const float ALFA          = 0.3;  // Filtro exponencial (0..1, menor = más suave)
const float ALFA_REPOSO   = 0.01; // Velocidad con la que se reajusta el reposo (deriva lenta)

const int   EEPROM_DIR    = 0;    // Dirección donde se guarda la calibración de 90°
const long  EEPROM_FIRMA  = 0x464C5833; // "FLX3": indica que hay calibración válida

struct Calibracion {
  long firma;
  float cambio90[NUM_SENSORES];   // % de cambio de resistencia a 90° (puede ser negativo)
};

struct Sensor {
  int pin;
  float rReposo;                  // Resistencia del sensor recto
  float cambio90;
  float umbralOn;                 // Umbral calculado en la calibración
  float umbralOff;
  float rFiltrada;
  bool flexionando;
  int contador;
};

Sensor sensores[NUM_SENSORES];
bool depurar = false;
unsigned int repeticiones = 0;

float adcAResistencia(float adc) {
  if (adc < 1) adc = 1;           // Evita división entre cero
  float voltaje = adc * VCC / 1023.0;
  return R_DIV * (VCC / voltaje - 1.0);
}

float leerResistencia(int pin, int muestras) {
  // Al cambiar de canal el ADC necesita estabilizarse: se descartan las primeras lecturas
  analogRead(pin);
  delayMicroseconds(100);
  analogRead(pin);
  adcUsadoPorECG = false;
  long suma = 0;
  for (int i = 0; i < muestras; i++) {
    // Si el ECG leyó A3 durante la espera, se vuelve a estabilizar el canal del flex
    if (adcUsadoPorECG) {
      analogRead(pin);
      delayMicroseconds(100);
      adcUsadoPorECG = false;
    }
    suma += analogRead(pin);
    esperarMs(1);
  }
  return adcAResistencia((float)suma / muestras);
}

void guardarCalibracion() {
  Calibracion cal;
  cal.firma = EEPROM_FIRMA;
  for (int i = 0; i < NUM_SENSORES; i++) cal.cambio90[i] = sensores[i].cambio90;
  EEPROM.put(EEPROM_DIR, cal);
}

void cargarCalibracion() {
  Calibracion cal;
  EEPROM.get(EEPROM_DIR, cal);
  bool valida = (cal.firma == EEPROM_FIRMA);

  for (int i = 0; i < NUM_SENSORES; i++) {
    float c = cal.cambio90[i];
    Serial.print("Sensor ");
    Serial.print(i + 1);
    if (valida && !isnan(c) && c != 0) {
      sensores[i].cambio90 = c;
      Serial.print(": calibración 90 grados cargada: ");
      Serial.print(c, 1);
      Serial.println(" %");
    } else {
      sensores[i].cambio90 = CAMBIO_90_DEFECTO;
      Serial.print(": sin calibración de 90 grados, dobla a 90 y envía 'n");
      Serial.print(i + 1);
      Serial.println("'");
    }
  }
}

void calibrarReposo() {
  Serial.println("Calibrando... deja los sensores RECTOS y sin tocar los cables");
  esperarMs(1000);

  // Mide reposo y ruido (desviación estándar: un pico aislado no la dispara)
  float suma[NUM_SENSORES] = { 0 };
  float sumaCuad[NUM_SENSORES] = { 0 };
  const int N = 50;
  for (int n = 0; n < N; n++) {
    for (int i = 0; i < NUM_SENSORES; i++) {
      float r = leerResistencia(sensores[i].pin, MUESTRAS);
      suma[i] += r;
      sumaCuad[i] += r * r;
    }
    esperarMs(20);
  }

  for (int i = 0; i < NUM_SENSORES; i++) {
    Sensor &s = sensores[i];
    s.rReposo = suma[i] / N;
    s.rFiltrada = s.rReposo;
    s.flexionando = false;
    s.contador = 0;

    float desv = sqrt(max(0.0, sumaCuad[i] / N - s.rReposo * s.rReposo));
    float ruido = desv * 100.0 / s.rReposo;          // % de variación sin tocar
    s.umbralOn = constrain(ruido * FACTOR_RUIDO, UMBRAL_MIN, UMBRAL_MAX);
    s.umbralOff = s.umbralOn * 0.6;

    Serial.print("Sensor ");
    Serial.print(i + 1);
    Serial.print(": R en reposo: ");
    Serial.print(s.rReposo, 0);
    Serial.print(" ohm  Ruido: ");
    Serial.print(ruido, 1);
    Serial.print(" %  Umbral: ");
    Serial.print(s.umbralOn, 1);
    Serial.println(" %");

    if (ruido * FACTOR_RUIDO > UMBRAL_MAX) {
      Serial.print("AVISO: ruido alto en sensor ");
      Serial.print(i + 1);
      Serial.println(", revisa cables/contactos (puede dar falsas lecturas)");
    }
  }
}

void calibrar90(int i) {
  Sensor &s = sensores[i];
  float r = leerResistencia(s.pin, 64);
  float cambio = (r - s.rReposo) * 100.0 / s.rReposo;
  if (abs(cambio) < s.umbralOn) {
    Serial.print("Sensor ");
    Serial.print(i + 1);
    Serial.print(": cambio muy pequeño, dobla más el sensor y vuelve a enviar 'n");
    Serial.print(i + 1);
    Serial.println("'");
    return;
  }
  s.cambio90 = cambio;
  guardarCalibracion();

  Serial.print("Sensor ");
  Serial.print(i + 1);
  Serial.print(": 90 grados guardado: R = ");
  Serial.print(r, 0);
  Serial.print(" ohm  Cambio = ");
  Serial.print(s.cambio90, 1);
  Serial.println(" %");
}

void leerComandos() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');   // Funciona con o sin fin de línea (timeout)
  cmd.trim();
  cmd.toLowerCase();
  if (cmd.length() == 0) return;

  char c = cmd.charAt(0);
  if (c == 'r') {
    calibrarReposo();
  } else if (c == 'd') {
    depurar = !depurar;
    Serial.println(depurar ? "Depuración ON" : "Depuración OFF");
  } else if (c == 'm') {
    modoApp = !modoApp;
    Serial.println(modoApp ? "Modo APP (tramas L)" : "Modo MONITOR");
  } else if (c == 'z') {
    repeticiones = 0;
    Serial.println("Repeticiones en 0");
  } else if (c == 'n') {
    int num = cmd.length() > 1 ? cmd.charAt(1) - '0' : 0;
    if (num >= 1 && num <= NUM_SENSORES) {
      calibrar90(num - 1);
    } else {
      Serial.println("Indica el sensor: n1, n2 o n3");
    }
  }
}

void actualizarSensor(int i) {
  Sensor &s = sensores[i];

  float r = leerResistencia(s.pin, MUESTRAS);
  s.rFiltrada = s.rFiltrada + ALFA * (r - s.rFiltrada);

  float cambio = (s.rFiltrada - s.rReposo) * 100.0 / s.rReposo;   // % de cambio

  if (!s.flexionando) {
    if (abs(cambio) >= s.umbralOn) {
      s.contador++;
      if (s.contador >= CONFIRMAR) {
        s.flexionando = true;
        s.contador = 0;
      }
    } else {
      s.contador = 0;
      // Sin flexión: sigue lentamente la deriva del sensor
      s.rReposo = s.rReposo + ALFA_REPOSO * (s.rFiltrada - s.rReposo);
    }
  } else if (abs(cambio) < s.umbralOff) {
    s.flexionando = false;
    if (i == SENSOR_REPETICIONES) repeticiones++;   // Flexionó y volvió a recto
    if (!modoApp) {
      Serial.print("-- Sensor ");
      Serial.print(i + 1);
      Serial.println(" recto --");
    }
  }

  if ((s.flexionando && !modoApp) || depurar) {
    // Proporcional al cambio medido a 90° (funciona en cualquier dirección de doblado)
    float angulo = abs(cambio) * 90.0 / abs(s.cambio90);
    angulo = constrain(angulo, 0, 180);

    Serial.print(s.flexionando ? "FLEX" : "    ");
    Serial.print(i + 1);
    Serial.print("  R: ");
    Serial.print(s.rFiltrada, 0);
    Serial.print(" ohm  Cambio: ");
    Serial.print(cambio, 1);
    Serial.print(" %  Angulo: ");
    Serial.println(angulo, 1);
  }
}

void setupFlex() {
  for (int i = 0; i < NUM_SENSORES; i++) sensores[i].pin = PINES[i];

  cargarCalibracion();
  calibrarReposo();
  Serial.println("Listo. Comandos: r = reposo, n1/n2/n3 = 90 grados, d = depuración, m = modo, z = repeticiones a 0");
}

// Lectura 0..1023 para la aplicación, que siempre SUBE al flexionar.
// Es el voltaje sobre el sensor flex (no sobre la resistencia de 47k), calculado
// desde la resistencia filtrada. Si el sensor baja su resistencia al doblarse
// (cambio a 90° negativo), se invierte para conservar el sentido.
int adcParaApp(int i) {
  Sensor &s = sensores[i];
  float adc = 1023.0 * s.rFiltrada / (s.rFiltrada + R_DIV);
  if (s.cambio90 < 0) adc = 1023.0 - adc;
  return constrain((int)(adc + 0.5), 0, 1023);
}

// Trama para backend/src/ortesis/protocolo.js:
//   L,<ms>,<adc_indice>,<adc_medio>,<adc_pulgar>,<bpm>,<roll>,<pitch>,<yaw>,<repeticiones>
void enviarTrama() {
  Serial.print("L,");
  Serial.print(millis());
  Serial.print(',');
  Serial.print(adcParaApp(SENSOR_INDICE));
  Serial.print(',');
  Serial.print(adcParaApp(SENSOR_MEDIO));
  Serial.print(',');
  Serial.print(adcParaApp(SENSOR_PULGAR));
  Serial.print(',');
  Serial.print(bpmMostrado);            // 0 = sin dato (electrodos sueltos)
  Serial.print(",0.00,0.00,0.00,");     // roll, pitch, yaw: pendiente el sensor inercial
  Serial.println(repeticiones);
}

// Antes era el loop() del sketch flex
void tareaFlex() {
  leerComandos();

  for (int i = 0; i < NUM_SENSORES; i++) actualizarSensor(i);

  if (modoApp) enviarTrama();

  esperarMs(50);
}

// =====================================================================
// ============================ PROGRAMA ===============================
// =====================================================================

void setup() {
  // Un solo puerto serie (USB y HC-05 en D0/D1) a 115200: el HC-05 debe estar configurado igual
  Serial.begin(115200);
  Serial.setTimeout(50);

  setupECG();
  setupFlex();
}

void loop() {
  tareaECG();
  tareaFlex();   // Durante sus esperas sigue llamando a tareaECG()
}
