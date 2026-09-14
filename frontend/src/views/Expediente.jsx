import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { Metric } from '../components/Metric.jsx';
import { Pill } from '../components/Pill.jsx';
import { Button } from '../components/Button.jsx';
import { GraficaEvolucion } from './expediente/GraficaEvolucion.jsx';
import * as expedientesApi from '../api/expedientes.js';
import * as reportesApi from '../api/reportes.js';

const num = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor));
const grados = (valor) => (num(valor) === null ? '—' : `${num(valor)}°`);

function fechaLarga(valor) {
  if (!valor) return '—';
  return new Date(`${valor}T00:00:00`).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fechaCorta(valor) {
  if (!valor) return '—';
  return new Date(`${valor}T00:00:00`).toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function duracion(segundos) {
  const total = num(segundos);
  if (total === null) return '—';
  const minutos = Math.floor(total / 60);
  const resto = total % 60;
  return `${String(minutos).padStart(2, '0')}:${String(resto).padStart(2, '0')}`;
}

// El mockup rotula las sesiones canceladas como "Interrumpida".
const ESTADO_PILL = {
  FINALIZADA: { tone: 'ok', texto: 'Completa' },
  CANCELADA: { tone: 'warn', texto: 'Interrumpida' },
  EN_CURSO: { tone: 'neutral', texto: 'En curso' },
};

export function Expediente() {
  const { id } = useParams();
  const navegar = useNavigate();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDatos(await expedientesApi.obtenerExpediente(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Reutiliza el reporte "Evolución de paciente" del módulo de reportería:
  // el folio y el registro en bitácora los asigna el servidor.
  const descargar = async (formato) => {
    setDescargando(formato);
    setError('');
    setAviso('');
    try {
      const documento = await reportesApi.descargarReporte({
        tipo: 'evolucion',
        formato,
        id_paciente: id,
      });
      setAviso(`Se generó ${documento}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDescargando('');
    }
  };

  if (cargando) {
    return (
      <div className="vista vista--ancha">
        <Card>
          <p>Cargando expediente…</p>
        </Card>
      </div>
    );
  }

  if (error && !datos) {
    return (
      <div className="vista vista--ancha">
        <Card>
          <p className="mensaje-error">{error}</p>
          <button type="button" className="link-btn" onClick={() => navegar('/expedientes')}>
            Volver a expedientes
          </button>
        </Card>
      </div>
    );
  }

  const { resumen, evolucion, evolucion_dedo: evolucionDedo, sesiones, avance_metas: metas } = datos;

  const columnasSesiones = [
    { key: 'codigo_sesion', header: 'SESIÓN', render: (s) => <span className="mono-destacado">{s.codigo_sesion}</span> },
    { key: 'fecha', header: 'FECHA', render: (s) => fechaCorta(s.fecha) },
    { key: 'duracion_segundos', header: 'DURACIÓN', render: (s) => duracion(s.duracion_segundos) },
    { key: 'rango_articular', header: 'MÁX.', render: (s) => grados(s.rango_articular) },
    { key: 'repeticiones_total', header: 'REPS', render: (s) => s.repeticiones_total ?? '—' },
    { key: 'fc_promedio', header: 'FC PROM.', render: (s) => (s.fc_promedio ? `${s.fc_promedio} bpm` : '—') },
    {
      key: 'estado',
      header: 'ESTADO',
      render: (s) => {
        const pill = ESTADO_PILL[s.estado] ?? { tone: 'neutral', texto: s.estado };
        return <Pill tone={pill.tone}>{pill.texto}</Pill>;
      },
    },
  ];

  const columnasMetas = [
    { key: 'dedo_nombre', header: 'DEDO' },
    { key: 'angulo_inicial', header: 'INICIAL', render: (m) => grados(m.angulo_inicial) },
    { key: 'angulo_actual', header: 'ACTUAL', render: (m) => grados(m.angulo_actual) },
    { key: 'angulo_meta', header: 'META', render: (m) => grados(m.angulo_meta) },
    {
      key: 'avance_pct',
      header: 'AVANCE',
      render: (m) => {
        const avance = num(m.avance_pct);
        if (avance === null) return '—';
        return (
          <div className="avance">
            <div className="avance__barra">
              <span style={{ width: `${Math.min(avance, 100)}%` }} />
            </div>
            <span className="avance__valor">{avance}%</span>
          </div>
        );
      },
    },
  ];

  const mejora = num(resumen.mejora_pct);

  return (
    <div className="vista vista--ancha">
      <header className="vista__header">
        <div>
          <h1>
            {resumen.codigo_expediente} · {resumen.nombres} {resumen.apellidos}
          </h1>
          <p>
            {resumen.edad} años · {resumen.diagnostico_nombre ?? 'Sin diagnóstico'}, mano{' '}
            {resumen.mano_afectada?.toLowerCase()} · Ingreso {fechaLarga(resumen.fecha_ingreso)}
          </p>
        </div>
        <div className="expediente__acciones">
          <Button variant="secundario" disabled={descargando !== ''} onClick={() => descargar('xlsx')}>
            {descargando === 'xlsx' ? 'Generando…' : 'Exportar Excel'}
          </Button>
          <Button disabled={descargando !== ''} onClick={() => descargar('pdf')}>
            {descargando === 'pdf' ? 'Generando…' : 'Reporte PDF'}
          </Button>
        </div>
      </header>

      {error && <p className="mensaje-error">{error}</p>}
      {aviso && <p className="mensaje-ok">{aviso}</p>}

      <div className="indicadores__metricas">
        <Card>
          <Metric label="Rango inicial" value={grados(resumen.rango_inicial)} hint={fechaCorta(resumen.primera_sesion)} />
        </Card>
        <Card>
          <Metric label="Rango actual" value={grados(resumen.rango_actual)} hint={fechaCorta(resumen.ultima_sesion)} />
        </Card>
        <Card>
          <Metric
            label="Mejora"
            value={mejora === null ? '—' : `${mejora > 0 ? '+' : ''}${mejora}%`}
            hint="respecto a la primera sesión"
          />
        </Card>
        <Card>
          <Metric
            label="Sesiones"
            value={resumen.sesiones_finalizadas ?? 0}
            hint={
              resumen.sesiones_meta
                ? `${resumen.avance_protocolo_pct ?? 0}% de la meta (${resumen.sesiones_meta})`
                : `${resumen.adherencia_pct ?? '—'}% de adherencia`
            }
          />
        </Card>
      </div>

      <Card
        title="EVOLUCIÓN DEL RANGO ARTICULAR"
        ayuda="Cada punto es el mejor ángulo alcanzado en una sesión finalizada."
      >
        <GraficaEvolucion evolucion={evolucion} evolucionDedo={evolucionDedo} />
      </Card>

      <Card title="AVANCE POR DEDO" ayuda="El avance compara el ángulo actual contra la meta articular del paciente.">
        <Table
          columns={columnasMetas}
          data={metas}
          rowKey={(m) => m.id_dedo}
          emptyMessage="Este paciente todavía no tiene metas articulares definidas."
        />
      </Card>

      <Card title="SESIONES REGISTRADAS">
        <Table
          columns={columnasSesiones}
          data={sesiones}
          rowKey={(s) => s.id_sesion}
          emptyMessage="Este expediente todavía no tiene sesiones registradas."
        />
      </Card>

      <button type="button" className="link-btn" onClick={() => navegar('/expedientes')}>
        ← Volver a expedientes
      </button>
    </div>
  );
}
