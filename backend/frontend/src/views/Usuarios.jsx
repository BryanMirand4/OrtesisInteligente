import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { Tag } from '../components/Tag.jsx';
import { Pill } from '../components/Pill.jsx';
import { Button } from '../components/Button.jsx';
import * as usuariosApi from '../api/usuarios.js';
import * as perfilesApi from '../api/perfiles.js';
import { UsuarioFormModal } from './usuarios/UsuarioFormModal.jsx';

// Matriz de permisos documentada en CLAUDE.md (6.1) y reflejada en
// db/seed_permisos.sql. Se muestra como referencia fija junto al listado
// dinámico de usuarios; no se deriva letra por letra de `permiso` porque el
// esquema no distingue variantes como "Propio" o "Lectura" por columna.
const MATRIZ_PERMISOS = [
  { modulo: 'Sesión en vivo', Fisio: '✔', Coord: '—', Admin: '—', Paciente: '—' },
  { modulo: 'Expedientes', Fisio: '✔', Coord: 'Lectura', Admin: '—', Paciente: 'Propio' },
  { modulo: 'Pacientes', Fisio: '✔', Coord: 'Lectura', Admin: '—', Paciente: '—' },
  { modulo: 'Indicadores', Fisio: '—', Coord: '✔', Admin: '—', Paciente: '—' },
  { modulo: 'Reportes', Fisio: 'Propios', Coord: '✔', Admin: '—', Paciente: 'Propio' },
  { modulo: 'Usuarios y catálogos', Fisio: '—', Coord: '—', Admin: '✔', Paciente: '—' },
  { modulo: 'Dispositivo', Fisio: '—', Coord: '—', Admin: '✔', Paciente: '—' },
  { modulo: 'Bitácora', Fisio: '—', Coord: '—', Admin: '✔', Paciente: '—' },
];

function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor.replace(' ', 'T'));
  return fecha.toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaUsuarios, listaPerfiles] = await Promise.all([
        usuariosApi.listarUsuarios({ q: busqueda || undefined }),
        perfilesApi.listarPerfiles(),
      ]);
      setUsuarios(listaUsuarios);
      setPerfiles(listaPerfiles);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [busqueda]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarEstado(usuario) {
    await usuariosApi.cambiarEstadoUsuario(usuario.id_usuario, !usuario.activo);
    cargar();
  }

  async function desbloquear(usuario) {
    await usuariosApi.desbloquearUsuario(usuario.id_usuario);
    cargar();
  }

  const columnas = [
    { key: 'nombre_usuario', header: 'USUARIO' },
    { key: 'nombre_completo', header: 'NOMBRE' },
    { key: 'perfil_nombre', header: 'PERFIL', render: (u) => <Tag>{u.perfil_nombre}</Tag> },
    { key: 'ultimo_acceso', header: 'ÚLTIMO ACCESO', render: (u) => formatearFecha(u.ultimo_acceso) },
    {
      key: 'estado',
      header: 'ESTADO',
      render: (u) => (
        <div className="usuarios__estado">
          <Pill tone={u.activo ? 'ok' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Pill>
          {u.bloqueado ? <Pill tone="warn">Bloqueado</Pill> : null}
        </div>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (u) => (
        <div className="usuarios__acciones">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setUsuarioEditar(u);
              setModalAbierto(true);
            }}
          >
            Editar
          </button>
          <button type="button" className="link-btn" onClick={() => alternarEstado(u)}>
            {u.activo ? 'Inactivar' : 'Activar'}
          </button>
          {u.bloqueado ? (
            <button type="button" className="link-btn" onClick={() => desbloquear(u)}>
              Desbloquear
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>Usuarios del sistema</h1>
          <p>Cuentas registradas y perfiles asignados</p>
        </div>
        <Button
          onClick={() => {
            setUsuarioEditar(null);
            setModalAbierto(true);
          }}
        >
          Nuevo usuario
        </Button>
      </header>

      <Card
        action={
          <input
            className="buscador"
            placeholder="Buscar por nombre, usuario o correo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        }
      >
        {error && <p className="mensaje-error">{error}</p>}
        {cargando ? (
          <p>Cargando…</p>
        ) : (
          <Table columns={columnas} data={usuarios} emptyMessage="No hay usuarios registrados." />
        )}
      </Card>

      <Card title="MATRIZ DE PERMISOS">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>MÓDULO</th>
                <th>FISIO.</th>
                <th>COORD.</th>
                <th>ADMIN.</th>
                <th>PACIENTE</th>
              </tr>
            </thead>
            <tbody>
              {MATRIZ_PERMISOS.map((fila) => (
                <tr key={fila.modulo}>
                  <td>{fila.modulo}</td>
                  <td>{fila.Fisio}</td>
                  <td>{fila.Coord}</td>
                  <td>{fila.Admin}</td>
                  <td>{fila.Paciente}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modalAbierto && (
        <UsuarioFormModal
          usuario={usuarioEditar}
          perfiles={perfiles}
          onClose={() => setModalAbierto(false)}
          onSaved={() => {
            setModalAbierto(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}
