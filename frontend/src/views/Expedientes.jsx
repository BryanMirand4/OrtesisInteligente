import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { Pill } from '../components/Pill.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import * as expedientesApi from '../api/expedientes.js';

const num = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor));

const grados = (valor) => (num(valor) === null ? '—' : `${num(valor)}°`);

function mejoraPill(valor) {
  const n = num(valor);
  if (n === null || Number.isNaN(n)) return <Pill tone="neutral">sin datos</Pill>;
  return <Pill tone={n >= 0 ? 'ok' : 'warn'}>{`${n > 0 ? '+' : ''}${n}%`}</Pill>;
}

function fechaCorta(valor) {
  if (!valor) return '—';
  return new Date(`${valor}T00:00:00`).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Índice de expedientes. El backend ya recorta la lista a los pacientes
// asignados cuando quien consulta es Fisioterapeuta.
export function Expedientes() {
  const { usuario } = useAuth();
  const navegar = useNavigate();

  const [expedientes, setExpedientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setExpedientes(await expedientesApi.listarExpedientes({ q: busqueda || undefined }));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [busqueda]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const columnas = [
    { key: 'codigo_expediente', header: 'EXPEDIENTE', render: (e) => <span className="mono-destacado">{e.codigo_expediente}</span> },
    { key: 'paciente', header: 'PACIENTE', render: (e) => `${e.nombres} ${e.apellidos}` },
    { key: 'edad', header: 'EDAD', render: (e) => `${e.edad} años` },
    { key: 'diagnostico_nombre', header: 'DIAGNÓSTICO', render: (e) => e.diagnostico_nombre ?? '—' },
    { key: 'rango_inicial', header: 'RANGO INICIAL', render: (e) => grados(e.rango_inicial) },
    { key: 'rango_actual', header: 'RANGO ACTUAL', render: (e) => grados(e.rango_actual) },
    { key: 'mejora_pct', header: 'MEJORA', render: (e) => mejoraPill(e.mejora_pct) },
    { key: 'sesiones_finalizadas', header: 'SESIONES' },
    { key: 'ultima_sesion', header: 'ÚLTIMA SESIÓN', render: (e) => fechaCorta(e.ultima_sesion) },
    {
      key: 'acciones',
      header: '',
      render: (e) => (
        <button type="button" className="link-btn" onClick={() => navegar(`/expedientes/${e.id_paciente}`)}>
          Ver expediente
        </button>
      ),
    },
  ];

  return (
    <div className="vista vista--ancha">
      <header className="vista__header">
        <div>
          <h1>Expedientes</h1>
          <p>
            {usuario.perfil_nombre === 'Fisioterapeuta'
              ? 'Pacientes asignados y su evolución articular'
              : 'Evolución articular del servicio (solo lectura)'}
          </p>
        </div>
      </header>

      <Card>
        <input
          className="buscador"
          type="search"
          placeholder="Buscar por nombre o código de expediente…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {error && <p className="mensaje-error">{error}</p>}
        {cargando ? (
          <p>Cargando expedientes…</p>
        ) : (
          <Table
            columns={columnas}
            data={expedientes}
            rowKey={(e) => e.id_paciente}
            emptyMessage="No hay expedientes que coincidan con la búsqueda."
          />
        )}
      </Card>
    </div>
  );
}
