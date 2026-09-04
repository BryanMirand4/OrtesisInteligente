import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import * as dispositivoApi from '../api/dispositivo.js';

function rangoEdad(u) {
  return u.edad_max >= 255 ? `${u.edad_min} años o más` : `${u.edad_min} – ${u.edad_max} años`;
}

export function Dispositivo() {
  const [calibracion, setCalibracion] = useState([]);
  const [umbrales, setUmbrales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [editandoUmbrales, setEditandoUmbrales] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [cal, umb] = await Promise.all([
        dispositivoApi.obtenerCalibracion(),
        dispositivoApi.obtenerUmbrales(),
      ]);
      setCalibracion(cal);
      setUmbrales(umb);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function actualizarCal(idDedo, campo, valor) {
    setCalibracion((filas) =>
      filas.map((f) => (f.id_dedo === idDedo ? { ...f, [campo]: valor } : f)),
    );
  }

  function actualizarUmbral(idParam, valor) {
    setUmbrales((filas) =>
      filas.map((f) => (f.id_param === idParam ? { ...f, fc_umbral: valor } : f)),
    );
  }

  async function guardarCalibracion() {
    setError('');
    setMensaje('');
    setGuardando(true);
    try {
      const payload = calibracion.map((c) => ({
        id_dedo: c.id_dedo,
        valor_min_adc: Number(c.valor_min_adc),
        valor_max_adc: Number(c.valor_max_adc),
        angulo_min: Number(c.angulo_min),
        angulo_max: Number(c.angulo_max),
      }));
      const actualizada = await dispositivoApi.guardarCalibracion(payload);
      setCalibracion(actualizada);
      setMensaje('Calibración guardada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function guardarUmbrales() {
    setError('');
    setMensaje('');
    setGuardando(true);
    try {
      const payload = umbrales.map((u) => ({ id_param: u.id_param, fc_umbral: Number(u.fc_umbral) }));
      const actualizados = await dispositivoApi.guardarUmbrales(payload);
      setUmbrales(actualizados);
      setEditandoUmbrales(false);
      setMensaje('Umbrales guardados.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>Configuración del dispositivo</h1>
          <p>Calibración de sensores y umbrales clínicos</p>
        </div>
      </header>

      {error && <p className="mensaje-error">{error}</p>}
      {mensaje && <p className="mensaje-ok">{mensaje}</p>}

      {cargando ? (
        <p>Cargando…</p>
      ) : (
        <>
          <Card
            title="CALIBRACIÓN DE SENSORES FLEX"
            ayuda="Cada sensor flex entrega un valor crudo (ADC). Estos dos valores por dedo — el que marca con la mano extendida y el que marca con la mano flexionada — permiten convertir esa lectura a grados. Guardar crea una nueva calibración vigente y conserva la anterior en el historial."
            action={
              <Button disabled={guardando} onClick={guardarCalibracion}>
                {guardando ? 'Guardando…' : 'Guardar calibración'}
              </Button>
            }
          >
            <div className="dispositivo__calibracion">
              {calibracion.map((c) => (
                <div key={c.id_dedo} className="dispositivo__dedo">
                  <span className="dispositivo__dedo-nombre">{c.dedo_nombre}</span>
                  <label>
                    Valor extendido ({Number(c.angulo_min).toFixed(0)}°)
                    <input
                      type="number"
                      min="0"
                      max="1023"
                      value={c.valor_min_adc}
                      onChange={(e) => actualizarCal(c.id_dedo, 'valor_min_adc', e.target.value)}
                    />
                  </label>
                  <label>
                    Valor flexionado ({Number(c.angulo_max).toFixed(0)}°)
                    <input
                      type="number"
                      min="0"
                      max="1023"
                      value={c.valor_max_adc}
                      onChange={(e) => actualizarCal(c.id_dedo, 'valor_max_adc', e.target.value)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title="UMBRALES DE FRECUENCIA CARDÍACA"
            ayuda="Durante la sesión, si la FC del paciente supera el umbral de su rango de edad, se dispara una alerta visual para el terapeuta. Los rangos de edad son fijos; solo se edita el valor del umbral en bpm."
            action={
              editandoUmbrales ? (
                <Button disabled={guardando} onClick={guardarUmbrales}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </Button>
              ) : (
                <Button variant="secundario" onClick={() => setEditandoUmbrales(true)}>
                  Editar umbrales
                </Button>
              )
            }
          >
            <table className="table">
              <thead>
                <tr>
                  <th>RANGO DE EDAD</th>
                  <th>UMBRAL (BPM)</th>
                </tr>
              </thead>
              <tbody>
                {umbrales.map((u) => (
                  <tr key={u.id_param}>
                    <td>{rangoEdad(u)}</td>
                    <td>
                      {editandoUmbrales ? (
                        <input
                          type="number"
                          min="60"
                          max="240"
                          className="dispositivo__umbral-input"
                          value={u.fc_umbral}
                          onChange={(e) => actualizarUmbral(u.id_param, e.target.value)}
                        />
                      ) : (
                        `${u.fc_umbral} bpm`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
