import { useEffect, useState } from 'react';
import { Button } from '../../components/Button.jsx';
import * as pacientesApi from '../../api/pacientes.js';

export function MetasModal({ paciente, onClose }) {
  const [metas, setMetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    pacientesApi
      .listarMetas(paciente.id_paciente)
      .then((datos) => {
        if (vivo) setMetas(datos);
      })
      .catch((err) => {
        if (vivo) setError(err.message);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [paciente.id_paciente]);

  function actualizarAngulo(idDedo, valor) {
    setMetas((filas) => filas.map((f) => (f.id_dedo === idDedo ? { ...f, angulo_meta: valor } : f)));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = metas
      .filter((f) => f.angulo_meta !== '' && f.angulo_meta !== null && f.angulo_meta !== undefined)
      .map((f) => ({ id_dedo: f.id_dedo, angulo_meta: Number(f.angulo_meta) }));

    if (payload.length === 0) {
      setError('Ingresá al menos un ángulo meta.');
      return;
    }

    setGuardando(true);
    try {
      await pacientesApi.guardarMetas(paciente.id_paciente, payload);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal__overlay" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Metas articulares · {paciente.codigo_expediente}</h2>
        {cargando ? (
          <p>Cargando…</p>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="metas__lista">
              {metas.map((fila) => (
                <div key={fila.id_dedo} className="metas__fila">
                  <span>{fila.dedo_nombre}</span>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    step="0.1"
                    placeholder="Ángulo (°)"
                    value={fila.angulo_meta ?? ''}
                    onChange={(e) => actualizarAngulo(fila.id_dedo, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {error && <p className="mensaje-error">{error}</p>}

            <div className="modal__acciones">
              <Button type="button" variant="secundario" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar metas'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
