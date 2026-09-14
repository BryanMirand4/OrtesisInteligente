import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { Metric } from '../components/Metric.jsx';
import { Pill } from '../components/Pill.jsx';
import { SesionesPorSemana } from './indicadores/SesionesPorSemana.jsx';
import * as indicadoresApi from '../api/indicadores.js';

// Los agregados llegan como texto porque MySQL devuelve DECIMAL en string
// para no perder precisión. Se normalizan al pintarlos.
const num = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor));

function mesEnCurso() {
  const hoy = new Date();
  const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  const iso = (f) => f.toISOString().slice(0, 10);
  return { fecha_inicio: iso(primero), fecha_fin: iso(ultimo) };
}

function etiquetaPeriodo(fechaInicio) {
  if (!fechaInicio) return 'PERÍODO';
  const fecha = new Date(`${fechaInicio}T00:00:00`);
  return `PERÍODO · ${fecha.toLocaleDateString('es-GT', { month: 'long' }).toUpperCase()}`;
}

function subtituloPeriodo(fechaInicio) {
  if (!fechaInicio) return 'Área de rehabilitación';
  const fecha = new Date(`${fechaInicio}T00:00:00`);
  return `Área de rehabilitación · ${fecha.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })}`;
}

function porcentaje(valor, { conSigno = false } = {}) {
  const n = num(valor);
  if (n === null || Number.isNaN(n)) return '—';
  return `${conSigno && n > 0 ? '+' : ''}${n}%`;
}

export function Indicadores() {
  const [filtros, setFiltros] = useState(mesEnCurso);
  const [panel, setPanel] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setPanel(await indicadoresApi.obtenerPanel(filtros));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resumen = panel?.resumen;

  const pistaVariacion = useMemo(() => {
    const variacion = num(resumen?.variacion_sesiones_pct);
    if (variacion === null || Number.isNaN(variacion)) return 'sin período anterior para comparar';
    return `${variacion > 0 ? '+' : ''}${variacion}% vs. período anterior`;
  }, [resumen]);

  const columnasFisio = [
    { key: 'nombre_completo', header: 'PROFESIONAL' },
    { key: 'pacientes', header: 'PACIENTES' },
    { key: 'sesiones', header: 'SESIONES' },
    { key: 'sesiones_finalizadas', header: 'FINALIZADAS' },
    { key: 'mejora_pct', header: 'MEJORA PROM.', render: (f) => porcentaje(f.mejora_pct, { conSigno: true }) },
  ];

  const columnasDiagnostico = [
    { key: 'diagnostico_nombre', header: 'DIAGNÓSTICO' },
    { key: 'pacientes', header: 'PACIENTES' },
    { key: 'sesiones', header: 'SESIONES' },
    {
      key: 'rango_promedio',
      header: 'RANGO PROM.',
      render: (f) => (num(f.rango_promedio) === null ? '—' : `${num(f.rango_promedio)}°`),
    },
    { key: 'mejora_pct', header: 'MEJORA PROM.', render: (f) => porcentaje(f.mejora_pct, { conSigno: true }) },
  ];

  return (
    <div className="vista vista--ancha">
      <header className="vista__header">
        <div>
          <h1>Indicadores del servicio</h1>
          <p>{subtituloPeriodo(filtros.fecha_inicio)}</p>
        </div>
        <div className="indicadores__periodo">
          <Pill tone="ok">{etiquetaPeriodo(filtros.fecha_inicio)}</Pill>
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
      </header>

      {error && <p className="mensaje-error">{error}</p>}

      {cargando ? (
        <Card>
          <p>Cargando indicadores…</p>
        </Card>
      ) : (
        <>
          <div className="indicadores__metricas">
            <Card>
              <Metric
                label="Pacientes atendidos"
                value={resumen?.pacientes_atendidos ?? 0}
                hint={`${resumen?.sesiones_finalizadas ?? 0} sesiones finalizadas`}
              />
            </Card>
            <Card>
              <Metric label="Sesiones del período" value={resumen?.sesiones_total ?? 0} hint={pistaVariacion} />
            </Card>
            <Card>
              <Metric
                label="Mejora articular prom."
                value={porcentaje(resumen?.mejora_articular_pct, { conSigno: true })}
                hint="pacientes con 2 o más sesiones"
              />
            </Card>
            <Card>
              <Metric
                label="Adherencia"
                value={porcentaje(resumen?.adherencia_pct)}
                hint={`${resumen?.sesiones_canceladas ?? 0} sesiones canceladas`}
              />
            </Card>
          </div>

          <Card
            title="SESIONES POR SEMANA"
            ayuda="Cada barra agrupa siete días contados desde la fecha inicial del período."
          >
            <SesionesPorSemana datos={panel?.sesiones_por_semana ?? []} />
          </Card>

          <Card
            title="SESIONES POR FISIOTERAPEUTA"
            ayuda="La mejora promedio considera solo a los pacientes con al menos dos sesiones finalizadas dentro del período."
          >
            <Table
              columns={columnasFisio}
              data={panel?.por_fisioterapeuta ?? []}
              rowKey={(f) => f.id_fisioterapeuta}
              emptyMessage="No hay sesiones registradas en el período."
            />
          </Card>

          <Card title="SESIONES POR DIAGNÓSTICO">
            <Table
              columns={columnasDiagnostico}
              data={panel?.por_diagnostico ?? []}
              rowKey={(f) => f.id_diagnostico ?? 'sin-diagnostico'}
              emptyMessage="No hay sesiones registradas en el período."
            />
          </Card>
        </>
      )}
    </div>
  );
}
