import { useState } from 'react';
import { Button } from '../../components/Button.jsx';
import * as pacientesApi from '../../api/pacientes.js';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export function PacienteFormModal({ paciente, diagnosticos, protocolos, fisioterapeutas, usuarioActual, onClose, onSaved }) {
  const esEdicion = Boolean(paciente);
  const fisioPorDefecto = fisioterapeutas.some((f) => f.id_usuario === usuarioActual.id_usuario)
    ? usuarioActual.id_usuario
    : fisioterapeutas[0]?.id_usuario ?? '';

  const [form, setForm] = useState({
    nombres: paciente?.nombres ?? '',
    apellidos: paciente?.apellidos ?? '',
    fecha_nacimiento: paciente?.fecha_nacimiento ?? '',
    sexo: paciente?.sexo ?? 'F',
    telefono: paciente?.telefono ?? '',
    id_diagnostico: paciente?.id_diagnostico ?? '',
    mano_afectada: paciente?.mano_afectada ?? 'Derecha',
    fecha_ingreso: paciente?.fecha_ingreso ?? hoyISO(),
    id_fisioterapeuta: paciente?.id_fisioterapeuta ?? fisioPorDefecto,
    id_protocolo: paciente?.id_protocolo ?? '',
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function actualizarCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const payload = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        fecha_nacimiento: form.fecha_nacimiento,
        sexo: form.sexo,
        telefono: form.telefono || null,
        id_diagnostico: form.id_diagnostico ? Number(form.id_diagnostico) : null,
        mano_afectada: form.mano_afectada,
        fecha_ingreso: form.fecha_ingreso,
        id_fisioterapeuta: Number(form.id_fisioterapeuta),
        id_protocolo: form.id_protocolo ? Number(form.id_protocolo) : null,
      };
      if (esEdicion) {
        await pacientesApi.actualizarPaciente(paciente.id_paciente, payload);
      } else {
        await pacientesApi.crearPaciente(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal__overlay" role="presentation" onClick={onClose}>
      <div className="modal modal--ancho" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{esEdicion ? `Editar paciente · ${paciente.codigo_expediente}` : 'Nuevo paciente'}</h2>
        <form onSubmit={onSubmit}>
          <div className="modal__grid">
            <div>
              <label htmlFor="nombres">Nombres</label>
              <input
                id="nombres"
                required
                value={form.nombres}
                onChange={(e) => actualizarCampo('nombres', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="apellidos">Apellidos</label>
              <input
                id="apellidos"
                required
                value={form.apellidos}
                onChange={(e) => actualizarCampo('apellidos', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
              <input
                id="fecha_nacimiento"
                type="date"
                required
                value={form.fecha_nacimiento}
                onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="sexo">Sexo</label>
              <select id="sexo" value={form.sexo} onChange={(e) => actualizarCampo('sexo', e.target.value)}>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </select>
            </div>

            <div>
              <label htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                value={form.telefono ?? ''}
                onChange={(e) => actualizarCampo('telefono', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="mano_afectada">Mano afectada</label>
              <select
                id="mano_afectada"
                value={form.mano_afectada}
                onChange={(e) => actualizarCampo('mano_afectada', e.target.value)}
              >
                <option value="Izquierda">Izquierda</option>
                <option value="Derecha">Derecha</option>
                <option value="Ambas">Ambas</option>
              </select>
            </div>

            <div>
              <label htmlFor="id_diagnostico">Diagnóstico</label>
              <select
                id="id_diagnostico"
                value={form.id_diagnostico}
                onChange={(e) => actualizarCampo('id_diagnostico', e.target.value)}
              >
                <option value="">Sin diagnóstico</option>
                {diagnosticos.map((d) => (
                  <option key={d.id_diagnostico} value={d.id_diagnostico}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="id_protocolo">Protocolo</label>
              <select
                id="id_protocolo"
                value={form.id_protocolo}
                onChange={(e) => actualizarCampo('id_protocolo', e.target.value)}
              >
                <option value="">Sin protocolo</option>
                {protocolos.map((p) => (
                  <option key={p.id_protocolo} value={p.id_protocolo}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fecha_ingreso">Fecha de ingreso</label>
              <input
                id="fecha_ingreso"
                type="date"
                required
                value={form.fecha_ingreso}
                onChange={(e) => actualizarCampo('fecha_ingreso', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="id_fisioterapeuta">Fisioterapeuta asignado</label>
              <select
                id="id_fisioterapeuta"
                required
                value={form.id_fisioterapeuta}
                onChange={(e) => actualizarCampo('id_fisioterapeuta', e.target.value)}
              >
                {fisioterapeutas.map((f) => (
                  <option key={f.id_usuario} value={f.id_usuario}>
                    {f.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="mensaje-error">{error}</p>}

          <div className="modal__acciones">
            <Button type="button" variant="secundario" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
