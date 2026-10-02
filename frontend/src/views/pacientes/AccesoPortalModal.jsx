import { useEffect, useState } from 'react';
import { Button } from '../../components/Button.jsx';
import * as pacientesApi from '../../api/pacientes.js';

// Habilita (o retira) el acceso del paciente a su portal de solo lectura.
// El selector solo lista cuentas con perfil Paciente que estén libres, más la
// que ya tenga este expediente. Las validaciones de fondo las repite el
// procedimiento almacenado: el frontend no es la única defensa.
export function AccesoPortalModal({ paciente, onClose, onSaved }) {
  const [cuentas, setCuentas] = useState([]);
  const [seleccion, setSeleccion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([
      pacientesApi.listarCuentasAcceso(paciente.id_paciente),
      pacientesApi.obtenerPaciente(paciente.id_paciente),
    ])
      .then(([lista, detalle]) => {
        if (!vivo) return;
        setCuentas(lista);
        setSeleccion(detalle?.id_usuario_acceso ? String(detalle.id_usuario_acceso) : '');
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

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await pacientesApi.vincularAcceso(paciente.id_paciente, seleccion === '' ? null : Number(seleccion));
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal__overlay" role="presentation" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Acceso al portal · {paciente.codigo_expediente}</h2>
        <p className="modal__descripcion">
          La cuenta vinculada podrá consultar su avance de rehabilitación en modo de solo lectura. No verá
          observaciones clínicas ni datos técnicos del dispositivo.
        </p>

        {cargando ? (
          <p>Cargando…</p>
        ) : (
          <form onSubmit={onSubmit}>
            <label htmlFor="id_usuario_acceso">Cuenta del paciente</label>
            <select
              id="id_usuario_acceso"
              value={seleccion}
              onChange={(e) => setSeleccion(e.target.value)}
            >
              <option value="">Sin acceso al portal</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id_usuario} value={cuenta.id_usuario}>
                  {cuenta.nombre_completo} · {cuenta.nombre_usuario}
                </option>
              ))}
            </select>

            {cuentas.length === 0 && (
              <p className="modal__descripcion">
                No hay cuentas con perfil Paciente disponibles. El administrador debe crear una desde el
                módulo de Usuarios.
              </p>
            )}

            {error && <p className="mensaje-error">{error}</p>}

            <div className="modal__acciones">
              <Button type="button" variant="secundario" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar acceso'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
