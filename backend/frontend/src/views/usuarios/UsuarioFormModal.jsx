import { useState } from 'react';
import { Button } from '../../components/Button.jsx';
import * as usuariosApi from '../../api/usuarios.js';

export function UsuarioFormModal({ usuario, perfiles, onClose, onSaved }) {
  const esEdicion = Boolean(usuario);
  const [form, setForm] = useState({
    id_perfil: usuario?.id_perfil ?? perfiles[0]?.id_perfil ?? '',
    nombre_completo: usuario?.nombre_completo ?? '',
    nombre_usuario: usuario?.nombre_usuario ?? '',
    correo: usuario?.correo ?? '',
    password: '',
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
      if (esEdicion) {
        await usuariosApi.actualizarUsuario(usuario.id_usuario, {
          id_perfil: Number(form.id_perfil),
          nombre_completo: form.nombre_completo,
          correo: form.correo || null,
        });
      } else {
        await usuariosApi.crearUsuario({
          id_perfil: Number(form.id_perfil),
          nombre_completo: form.nombre_completo,
          nombre_usuario: form.nombre_usuario,
          correo: form.correo || null,
          password: form.password,
        });
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
        <h2>{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        <form onSubmit={onSubmit}>
          <label htmlFor="nombre_completo">Nombre completo</label>
          <input
            id="nombre_completo"
            required
            value={form.nombre_completo}
            onChange={(e) => actualizarCampo('nombre_completo', e.target.value)}
          />

          <label htmlFor="nombre_usuario">Nombre de usuario</label>
          <input
            id="nombre_usuario"
            required
            disabled={esEdicion}
            value={form.nombre_usuario}
            onChange={(e) => actualizarCampo('nombre_usuario', e.target.value)}
          />

          <label htmlFor="correo">Correo</label>
          <input
            id="correo"
            type="email"
            value={form.correo ?? ''}
            onChange={(e) => actualizarCampo('correo', e.target.value)}
          />

          <label htmlFor="id_perfil">Perfil</label>
          <select id="id_perfil" value={form.id_perfil} onChange={(e) => actualizarCampo('id_perfil', e.target.value)}>
            {perfiles.map((p) => (
              <option key={p.id_perfil} value={p.id_perfil}>
                {p.nombre}
              </option>
            ))}
          </select>

          {!esEdicion && (
            <>
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => actualizarCampo('password', e.target.value)}
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
