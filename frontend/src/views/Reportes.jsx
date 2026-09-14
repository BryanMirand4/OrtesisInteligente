import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { Metric } from '../components/Metric.jsx';
import { Button } from '../components/Button.jsx';
import { Pill } from '../components/Pill.jsx';
import * as reportesApi from '../api/reportes.js';
import * as expedientesApi from '../api/expedientes.js';
import * as catalogosApi from '../api/catalogos.js';

const num = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor));
const grados = (valor) => (num(valor) === null ? '—' : `${num(valor)}°`);

function mesEnCurso() {
  const hoy = new Date();
  const iso = (f) => f.toISOString().slice(0, 10);
  return {
    fecha_inicio: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    fecha_fin: iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
  };
}

function fechaHora(valor) {
  if (!valor) return '—';
  return new Date(valor.replace(' ', 'T')).toLocaleString('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Columnas de la vista previa, espejo de las que exporta el backend.
const COLUMNAS_PREVIA = {
  consolidado: [
    { key: 'codigo_expediente', header: 'EXPEDIENTE' },
    { key: 'paciente', header: 'PACIENTE', render: (f) => `${f.nombres} ${f.apellidos}` },
    { key: 'diagnostico_nombre', header: 'DIAGNÓSTICO', render: (f) => f.diagnostico_nombre ?? '—' },
    { key: 'fisioterapeuta_nombre', header: 'FISIOTERAPEUTA' },
    { key: 'fecha', header: 'FECHA' },
    { key: 'duracion_minutos', header: 'DURACIÓN', render: (f) => (num(f.duracion_minutos) === null ? '—' : `${num(f.duracion_minutos)} min`) },
    { key: 'rango_articular', header: 'RANGO MÁX.', render: (f) => grados(f.rango_articular) },
    { key: 'repeticiones_total', header: 'REPS', render: (f) => f.repeticiones_total ?? '—' },
    { key: 'fc_promedio', header: 'FC PROM.', render: (f) => (f.fc_promedio ? `${f.fc_promedio} bpm` : '—') },
    { key: 'estado', header: 'ESTADO' },
  ],
  diagnostico: [
    { key: 'diagnostico_nombre', header: 'DIAGNÓSTICO' },
    { key: 'pacientes', header: 'PACIENTES' },
    { key: 'sesiones', header: 'SESIONES' },
    { key: 'sesiones_finalizadas', header: 'FINALIZADAS' },
    { key: 'rango_promedio', header: 'RANGO PROM.', render: (f) => grados(f.rango_promedio) },
    { key: 'mejora_pct', header: 'MEJORA', render: (f) => (num(f.mejora_pct) === null ? '—' : `${num(f.mejora_pct)}%`) },
  ],
  evolucion: [
    { key: 'etiqueta', header: 'SESIÓN' },
    { key: 'fecha', header: 'FECHA' },
    { key: 'duracion_minutos', header: 'DURACIÓN', render: (f) => (num(f.duracion_minutos) === null ? '—' : `${num(f.duracion_minutos)} min`) },
    { key: 'rango_articular', header: 'RANGO MÁX.', render: (f) => grados(f.rango_articular) },
    { key: 'rango_promedio', header: 'RANGO PROM.', render: (f) => grados(f.rango_promedio) },
    { key: 'repeticiones_total', header: 'REPS', render: (f) => f.repeticiones_total ?? '—' },
    { key: 'fc_promedio', header: 'FC PROM.', render: (f) => (f.fc_promedio ? `${f.fc_promedio} bpm` : '—') },
  ],
};

export function Reportes() {
  const [filtros, setFiltros] = useState(() => ({
    tipo: 'consolidado',
    ...mesEnCurso(),
    id_paciente: '',
    id_diagnostico: '',
  }));

  const [pacientes, setPacientes] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [previa, setPrevia] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Los combos se pueblan una sola vez. La lista de pacientes ya viene
  // recortada por perfil desde el backend.
  useEffect(() => {
    (async () => {
      try {
        const [listaPacientes, listaDiagnosticos] = await Promise.all([
          expedientesApi.listarExpedientes(),
          catalogosApi.listarDiagnosticos({ activo: true }),
        ]);
        setPacientes(listaPacientes);
        setDiagnosticos(listaDiagnosticos);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const cargarHistorial = useCallback(async () => {
    try {
      setHistorial(await reportesApi.listarHistorial({ limite: 20 }));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const parametros = useMemo(() => {
    const { tipo, fecha_inicio, fecha_fin, id_paciente, id_diagnostico } = filtros;
    return {
      tipo,
      fecha_inicio: fecha_inicio || undefined,
      fecha_fin: fecha_fin || undefined,
      id_paciente: id_paciente || undefined,
      id_diagnostico: tipo === 'consolidado' ? id_diagnostico || undefined : undefined,
    };
  }, [filtros]);

  const generarVistaPrevia = async () => {
    setCargando(true);
    setError('');
    setAviso('');
    try {
      setPrevia(await reportesApi.obtenerVistaPrevia(parametros));
    } catch (err) {
      setPrevia(null);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const descargar = async (formato) => {
    setDescargando(formato);
    setError('');
    setAviso('');
    try {
      const documento = await reportesApi.descargarReporte({ ...parametros, formato });
      setAviso(`Se generó ${documento}.`);
      await cargarHistorial();
    } catch (err) {
      setError(err.message);
    } finally {
      setDescargando('');
    }
  };

  const columnasHistorial = [
    { key: 'documento', header: 'DOCUMENTO', render: (r) => <span className="mono-destacado">{r.documento}</span> },
    { key: 'tipo', header: 'TIPO' },
    {
      key: 'tipo_accion',
      header: 'ACCIÓN',
      render: (r) => (
        <Pill tone={r.tipo_accion === 'GENERAR_REPORTE' ? 'ok' : 'neutral'}>
          {r.tipo_accion === 'GENERAR_REPORTE' ? 'Generado' : 'Descargado'}
        </Pill>
      ),
    },
    { key: 'generado_por', header: 'GENERADO POR', render: (r) => r.generado_por ?? '—' },
    { key: 'fecha_hora', header: 'FECHA', render: (r) => fechaHora(r.fecha_hora) },
  ];

  const columnasPrevia = COLUMNAS_PREVIA[previa?.tipo] ?? COLUMNAS_PREVIA.consolidado;
  const requierePaciente = filtros.tipo === 'evolucion';

  return (
    <div className="vista vista--ancha">
      <header className="vista__header">
        <div>
          <h1>Reportes</h1>
          <p>Generación de reportes clínicos e institucionales</p>
        </div>
      </header>

      <Card
        title="CRITERIOS DE FILTRADO"
        ayuda="La vista previa solo consulta. El archivo se numera y se registra en bitácora al generarse."
      >
        <div className="reportes__filtros">
          <label>
            TIPO
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
            >
              {reportesApi.TIPOS_REPORTE.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </label>

          <label>
            DESDE
            <input
              type="date"
              value={filtros.fecha_inicio}
              onChange={(e) => setFiltros((f) => ({ ...f, fecha_inicio: e.target.value }))}
            />
          </label>

          <label>
            HASTA
            <input
              type="date"
              value={filtros.fecha_fin}
              onChange={(e) => setFiltros((f) => ({ ...f, fecha_fin: e.target.value }))}
            />
          </label>

          <label>
            PACIENTE{requierePaciente ? ' *' : ''}
            <select
              value={filtros.id_paciente}
              onChange={(e) => setFiltros((f) => ({ ...f, id_paciente: e.target.value }))}
            >
              <option value="">Todos</option>
              {pacientes.map((p) => (
                <option key={p.id_paciente} value={p.id_paciente}>
                  {p.codigo_expediente} · {p.nombres} {p.apellidos}
                </option>
              ))}
            </select>
          </label>

          <label>
            DIAGNÓSTICO
            <select
              value={filtros.id_diagnostico}
              disabled={filtros.tipo !== 'consolidado'}
              onChange={(e) => setFiltros((f) => ({ ...f, id_diagnostico: e.target.value }))}
            >
              <option value="">Todos</option>
              {diagnosticos.map((d) => (
                <option key={d.id_diagnostico} value={d.id_diagnostico}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="reportes__acciones">
          <Button variant="secundario" onClick={generarVistaPrevia} disabled={cargando}>
            {cargando ? 'Consultando…' : 'Vista previa'}
          </Button>
          <Button onClick={() => descargar('xlsx')} disabled={descargando !== ''}>
            {descargando === 'xlsx' ? 'Generando…' : 'Generar Excel'}
          </Button>
          <Button variant="secundario" onClick={() => descargar('pdf')} disabled={descargando !== ''}>
            {descargando === 'pdf' ? 'Generando…' : 'Generar PDF'}
          </Button>
        </div>

        {error && <p className="mensaje-error">{error}</p>}
        {aviso && <p className="mensaje-ok">{aviso}</p>}
      </Card>

      {previa && (
        <Card title={`VISTA PREVIA · ${previa.tipo_nombre?.toUpperCase()}`}>
          <div className="reportes__totales">
            <Metric label="Sesiones" value={previa.totales?.sesiones_total ?? 0} hint={`${previa.totales?.sesiones_finalizadas ?? 0} finalizadas`} />
            <Metric label="Pacientes" value={previa.totales?.pacientes ?? 0} />
            <Metric label="Rango promedio" value={grados(previa.totales?.rango_promedio)} />
            <Metric label="FC promedio" value={previa.totales?.fc_promedio ? `${previa.totales.fc_promedio} bpm` : '—'} />
          </div>

          <Table
            columns={columnasPrevia}
            data={previa.filas}
            rowKey={(f, i) => f.id_sesion ?? f.id_diagnostico ?? f.numero ?? i}
            emptyMessage="No hay sesiones que cumplan los criterios seleccionados."
          />
        </Card>
      )}

      <Card title="REPORTES GENERADOS" ayuda="Reconstruido desde la bitácora de auditoría.">
        <Table
          columns={columnasHistorial}
          data={historial}
          rowKey={(r) => r.id_bitacora}
          emptyMessage="Todavía no se ha generado ningún reporte."
        />
      </Card>
    </div>
  );
}
