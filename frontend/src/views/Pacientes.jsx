import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { Pill } from '../components/Pill.jsx';
import { Button } from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import * as pacientesApi from '../api/pacientes.js';
import * as catalogosApi from '../api/catalogos.js';
import { PacienteFormModal } from './pacientes/PacienteFormModal.jsx';
import { MetasModal } from './pacientes/MetasModal.jsx';

function formatearFechaCorta(valor) {
  if (!valor) return '—';
  const fecha = new Date(`${valor}T00:00:00`);
  return fecha.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
}

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '—';
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) edad -= 1;
  return edad;
}

export function Pacientes() {
  const { usuario } = useAuth();
  const esFisioterapeuta = usuario.perfil_nombre === 'Fisioterapeuta';

  const [pacientes, setPacientes] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [protocolos, setProtocolos] = useState([]);
  const [fisioterapeutas, setFisioterapeutas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('activos');
  const [modalPaciente, setModalPaciente] = useState(null); // { paciente } | { paciente: null } | null
  const [modalMetasPaciente, setModalMetasPaciente] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaPacientes, listaDiagnosticos, listaProtocolos, listaFisios] = await Promise.all([
        pacientesApi.listarPacientes({
          q: busqueda || undefined,
          activo: filtroActivo === 'todos' ? undefined : filtroActivo === 'activos',
        }),
        catalogosApi.listarDiagnosticos({ activo: true }),
        catalogosApi.listarProtocolos({ activo: true }),
        pacientesApi.listarFisioterapeutas(),
      ]);
      setPacientes(listaPacientes);
      setDiagnosticos(listaDiagnosticos);
      setProtocolos(listaProtocolos);
      setFisioterapeutas(listaFisios);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroActivo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarEstado(paciente) {
    await pacientesApi.cambiarEstadoPaciente(paciente.id_paciente, !paciente.activo);
    cargar();
  }

  const columnas = [
    { key: 'codigo_expediente', header: 'EXPEDIENTE', render: (p) => <span className="mono-destacado">{p.codigo_expediente}</span> },
    { key: 'paciente', header: 'PACIENTE', render: (p) => `${p.nombres} ${p.apellidos}` },
    { key: 'edad', header: 'EDAD', render: (p) => p.edad ?? calcularEdad(p.fecha_nacimiento) },
    { key: 'diagnostico_nombre', header: 'DIAGNÓSTICO', render: (p) => p.diagnostico_nombre ?? '—' },
    { key: 'mano_afectada', header: 'MANO' },
    {
      key: 'sesiones',
      header: 'SESIONES',
      render: (p) => (p.sesiones_meta ? `${p.sesiones_realizadas ?? 0} / ${p.sesiones_meta}` : '—'),
    },
    { key: 'ultima_sesion', header: 'ÚLTIMA', render: (p) => formatearFechaCorta(p.ultima_sesion) },
    {
      key: 'estado',
      header: 'ESTADO',
      render: (p) => <Pill tone={p.activo ? 'ok' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Pill>,
    },
    ...(esFisioterapeuta
      ? [
          {
            key: 'acciones',
            header: '',
            render: (p) => (
              <div className="usuarios__acciones">
                <button type="button" className="link-btn" onClick={() => setModalPaciente({ paciente: p })}>
                  Editar
                </button>
                <button type="button" className="link-btn" onClick={() => setModalMetasPaciente(p)}>
                  Metas
                </button>
                <button type="button" className="link-btn" onClick={() => alternarEstado(p)}>
                  {p.activo ? 'Inactivar' : 'Activar'}
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>Pacientes</h1>
          <p>{pacientes.length} expedientes {filtroActivo === 'activos' ? 'activos' : ''} en el programa</p>
        </div>
        {esFisioterapeuta && (
          <Button onClick={() => setModalPaciente({ paciente: null })}>Nuevo paciente</Button>
        )}
      </header>

      <Card
        action={
          <div className="pacientes__filtros">
            <input
              className="buscador"
              placeholder="Buscar por nombre o expediente…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
              <option value="activos">Filtro · Activos</option>
              <option value="inactivos">Filtro · Inactivos</option>
              <option value="todos">Filtro · Todos</option>
            </select>
          </div>
        }
      >
        {error && <p className="mensaje-error">{error}</p>}
        {cargando ? (
          <p>Cargando…</p>
        ) : (
          <Table
            columns={columnas}
            data={pacientes}
            emptyMessage="No hay pacientes registrados."
            rowKey={(p) => p.id_paciente}
          />
        )}
      </Card>

      {modalPaciente && (
        <PacienteFormModal
          paciente={modalPaciente.paciente}
          diagnosticos={diagnosticos}
          protocolos={protocolos}
          fisioterapeutas={fisioterapeutas}
          usuarioActual={usuario}
          onClose={() => setModalPaciente(null)}
          onSaved={() => {
            setModalPaciente(null);
            cargar();
          }}
        />
      )}

      {modalMetasPaciente && (
        <MetasModal paciente={modalMetasPaciente} onClose={() => setModalMetasPaciente(null)} />
      )}
    </div>
  );
}
