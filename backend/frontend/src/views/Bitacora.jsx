import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import * as bitacoraApi from '../api/bitacora.js';

const TIPOS_ACCION = [
  'LOGIN',
  'LOGIN_FALLIDO',
  'CREAR',
  'MODIFICAR',
  'INACTIVAR',
  'INICIO_TERAPIA',
  'FIN_TERAPIA',
  'GENERAR_REPORTE',
  'DESCARGAR_REPORTE',
  'ERROR',
];

function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor.replace(' ', 'T'));
  return fecha.toLocaleString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Bitacora() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({ tipo_accion: '', fecha_inicio: '', fecha_fin: '' });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await bitacoraApi.listarBitacora({
        tipo_accion: filtros.tipo_accion || undefined,
        fecha_inicio: filtros.fecha_inicio ? `${filtros.fecha_inicio} 00:00:00` : undefined,
        fecha_fin: filtros.fecha_fin ? `${filtros.fecha_fin} 23:59:59` : undefined,
      });
      setRegistros(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const columnas = [
    { key: 'fecha_hora', header: 'FECHA', render: (r) => formatearFecha(r.fecha_hora) },
    { key: 'nombre_usuario', header: 'USUARIO', render: (r) => r.nombre_usuario ?? '—' },
    { key: 'tipo_accion', header: 'ACCIÓN' },
    { key: 'modulo', header: 'MÓDULO' },
    { key: 'descripcion', header: 'DESCRIPCIÓN' },
    { key: 'ip_origen', header: 'IP', render: (r) => r.ip_origen ?? '—' },
  ];

  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>Bitácora de auditoría</h1>
          <p>Registro de acciones relevantes del sistema</p>
        </div>
      </header>

      <Card>
        <div className="bitacora__filtros">
          <select
            value={filtros.tipo_accion}
            onChange={(e) => setFiltros((f) => ({ ...f, tipo_accion: e.target.value }))}
          >
            <option value="">Todas las acciones</option>
            {TIPOS_ACCION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filtros.fecha_inicio}
            onChange={(e) => setFiltros((f) => ({ ...f, fecha_inicio: e.target.value }))}
          />
          <input
            type="date"
            value={filtros.fecha_fin}
            onChange={(e) => setFiltros((f) => ({ ...f, fecha_fin: e.target.value }))}
          />
        </div>

        {error && <p className="mensaje-error">{error}</p>}
        {cargando ? (
          <p>Cargando…</p>
        ) : (
          <Table columns={columnas} data={registros} emptyMessage="No hay registros de bitácora." />
        )}
      </Card>
    </div>
  );
}
