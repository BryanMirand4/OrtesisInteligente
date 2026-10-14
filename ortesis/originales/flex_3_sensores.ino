// Lectura de 3 sensores flex 2.2" en Arduino Uno
// Conexión (cada sensor): 5V -> Flex -> nodo -> 47k -> GND ; nodo -> A0 / A1 / A2
//
// Al arrancar mide la resistencia de cada sensor RECTO y su ruido
// (no los toques durante ~3 s) y luego solo imprime los que se flexionan.
//
// Comandos por monitor serial (escribe y Enter):
//   r  -> recalibrar reposo de los 3 sensores (todos rectos)
//   n1 -> guardar la posición actual del sensor 1 como 90° (igual n2, n3)
//   d  -> activar/desactivar modo depuración (imprime todas las lecturas)

#include <EEPROM.h>

const int NUM_SENSORES = 3;
const int PINES[NUM_SENSORES] = { A0, A1, A2 };

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
  long suma = 0;
  for (int i = 0; i < muestras; i++) {
    suma += analogRead(pin);
    delay(1);
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
  delay(1000);

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
    delay(20);
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
    Serial.print("-- Sensor ");
    Serial.print(i + 1);
    Serial.println(" recto --");
  }

  if (s.flexionando || depurar) {
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

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(50);

  for (int i = 0; i < NUM_SENSORES; i++) sensores[i].pin = PINES[i];

  cargarCalibracion();
  calibrarReposo();
  Serial.println("Listo. Comandos: r = reposo, n1/n2/n3 = 90 grados, d = depuración");
}

void loop() {
  leerComandos();

  for (int i = 0; i < NUM_SENSORES; i++) actualizarSensor(i);

  delay(50);
}
