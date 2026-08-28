import { useState } from 'react';
import { Button } from '../../components/Button.jsx';
import * as catalogosApi from '../../api/catalogos.js';

const TITULOS = {
  diagnostico: 'diagnóstico',
  protocolo: 'protocolo',
};

export function CatalogoFormModal({ tipo, item, onClose, onSaved }) {
  const esEdicion = Boolean(item);
  const [form, setForm] = useState({
    codigo: item?.codigo ?? '',
    nombre: item?.nombre ?? '',
    descripcion: item?.descripcion ?? '',
    sesiones_meta: item?.sesiones_meta ?? '',
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
      if (tipo === 'diagnostico') {
        const payload = {
          codigo: form.codigo || null,
          nombre: form.nombre,
          descripcion: form.descripcion || null,
        };
        if (esEdicion) {
          await catalogosApi.actualizarDiagnostico(item.id_diagnostico, payload);
        } else {
          await catalogosApi.crearDiagnostico(payload);
        }
      } else {
        const payload = {
          nombre: form.nombre,
          descripcion: form.descripcion || null,
          sesiones_meta: form.sesiones_meta ? Number(form.sesiones_meta) : null,
        };
        if (esEdicion) {
          await catalogosApi.actualizarProtocolo(item.id_protocolo, payload);
        } else {
          await catalogosApi.crearProtocolo(payload);
        }
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
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{esEdicion ? `Editar ${TITULOS[tipo]}` : `Nuevo ${TITULOS[tipo]}`}</h2>
        <form onSubmit={onSubmit}>
          {tipo === 'diagnostico' && (
            <>
              <label htmlFor="codigo">Código (opcional)</label>
              <input
                id="codigo"
                placeholder="Ej. CIE-10 o abreviatura interna"
                value={form.codigo ?? ''}
                onChange={(e) => actualizarCampo('codigo', e.target.value)}
              />
            </>
          )}

          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            required
            value={form.nombre}
            onChange={(e) => actualizarCampo('nombre', e.target.value)}
          />

          <label htmlFor="descripcion">Descripción</label>
          <input
            id="descripcion"
            value={form.descripcion ?? ''}
            onChange={(e) => actualizarCampo('descripcion', e.target.value)}
          />

          {tipo === 'protocolo' && (
            <>
              <label htmlFor="sesiones_meta">Sesiones meta</label>
              <input
                id="sesiones_meta"
                type="number"
                min="1"
                value={form.sesiones_meta ?? ''}
                onChange={(e) => actualizarCampo('sesiones_meta', e.target.value)}
              />
            </>
          )}

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
