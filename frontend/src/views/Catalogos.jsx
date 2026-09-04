import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { Pill } from '../components/Pill.jsx';
import { Button } from '../components/Button.jsx';
import * as catalogosApi from '../api/catalogos.js';
import { CatalogoFormModal } from './catalogos/CatalogoFormModal.jsx';

export function Catalogos() {
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [protocolos, setProtocolos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { tipo, item } | null

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaDiagnosticos, listaProtocolos] = await Promise.all([
        catalogosApi.listarDiagnosticos(),
        catalogosApi.listarProtocolos(),
      ]);
      setDiagnosticos(listaDiagnosticos);
      setProtocolos(listaProtocolos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function alternarEstadoDiagnostico(d) {
    await catalogosApi.cambiarEstadoDiagnostico(d.id_diagnostico, !d.activo);
    cargar();
  }

  async function alternarEstadoProtocolo(p) {
    await catalogosApi.cambiarEstadoProtocolo(p.id_protocolo, !p.activo);
    cargar();
  }

  const columnasDiagnosticos = [
    { key: 'codigo', header: 'CÓDIGO', render: (d) => d.codigo ?? '—' },
    { key: 'nombre', header: 'NOMBRE' },
    { key: 'descripcion', header: 'DESCRIPCIÓN', render: (d) => d.descripcion ?? '—' },
    {
      key: 'estado',
      header: 'ESTADO',
      render: (d) => <Pill tone={d.activo ? 'ok' : 'neutral'}>{d.activo ? 'Activo' : 'Inactivo'}</Pill>,
    },
    {
      key: 'acciones',
      header: '',
      render: (d) => (
        <div className="usuarios__acciones">
          <button type="button" className="link-btn" onClick={() => setModal({ tipo: 'diagnostico', item: d })}>
            Editar
          </button>
          <button type="button" className="link-btn" onClick={() => alternarEstadoDiagnostico(d)}>
            {d.activo ? 'Inactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  const columnasProtocolos = [
    { key: 'nombre', header: 'NOMBRE' },
    { key: 'descripcion', header: 'DESCRIPCIÓN', render: (p) => p.descripcion ?? '—' },
    { key: 'sesiones_meta', header: 'SESIONES META', render: (p) => p.sesiones_meta ?? '—' },
    {
      key: 'estado',
      header: 'ESTADO',
      render: (p) => <Pill tone={p.activo ? 'ok' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Pill>,
    },
    {
      key: 'acciones',
      header: '',
      render: (p) => (
        <div className="usuarios__acciones">
          <button type="button" className="link-btn" onClick={() => setModal({ tipo: 'protocolo', item: p })}>
            Editar
          </button>
          <button type="button" className="link-btn" onClick={() => alternarEstadoProtocolo(p)}>
            {p.activo ? 'Inactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>Catálogos</h1>
          <p>Diagnósticos y protocolos disponibles para el expediente de pacientes</p>
        </div>
      </header>

      {error && <p className="mensaje-error">{error}</p>}

      <Card
        title="DIAGNÓSTICOS"
        ayuda="Catálogo de diagnósticos clínicos que se pueden asignar a un paciente en su expediente (por ejemplo, el tipo de lesión tendinosa). Un diagnóstico inactivo deja de aparecer como opción al crear o editar un paciente, pero se conserva en los expedientes que ya lo tenían asignado."
        action={<Button onClick={() => setModal({ tipo: 'diagnostico', item: null })}>Nuevo diagnóstico</Button>}
      >
        {cargando ? (
          <p>Cargando…</p>
        ) : (
          <Table
            columns={columnasDiagnosticos}
            data={diagnosticos}
            emptyMessage="No hay diagnósticos registrados."
            rowKey={(d) => d.id_diagnostico}
          />
        )}
      </Card>

      <Card
        title="PROTOCOLOS"
        ayuda="Catálogo de planes de tratamiento que se pueden asignar a un paciente. Cada protocolo define un nombre, una descripción y una cantidad de sesiones meta, que se usa para calcular el avance del paciente (por ejemplo, 9 de 12 sesiones) en la lista de pacientes."
        action={<Button onClick={() => setModal({ tipo: 'protocolo', item: null })}>Nuevo protocolo</Button>}
      >
        {cargando ? (
          <p>Cargando…</p>
        ) : (
          <Table
            columns={columnasProtocolos}
            data={protocolos}
            emptyMessage="No hay protocolos registrados."
            rowKey={(p) => p.id_protocolo}
          />
        )}
      </Card>

      {modal && (
        <CatalogoFormModal
          tipo={modal.tipo}
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            cargar();
          }}
        />
      )}
    </div>
  );
}
