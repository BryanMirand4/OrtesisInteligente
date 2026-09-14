import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { theme } from '../../theme.js';

// Colores de sensor definidos en los tokens de diseño (CLAUDE.md 8).
const COLOR_POR_DEDO = {
  Índice: theme.colors.sensorIndice,
  Medio: theme.colors.sensorMedio,
  Pulgar: theme.colors.sensorPulgar,
  Anular: theme.colors.ok,
  Meñique: theme.colors.warn,
};

// Gráfica "EVOLUCIÓN DEL RANGO ARTICULAR". En modo general traza el mejor
// ángulo por sesión; en modo por dedo superpone una curva por sensor.
export function GraficaEvolucion({ evolucion, evolucionDedo, metaArticular }) {
  const [modo, setModo] = useState('general');

  const dedos = useMemo(
    () => [...new Set((evolucionDedo ?? []).map((fila) => fila.dedo_nombre))],
    [evolucionDedo],
  );

  const serie = useMemo(() => {
    const porSesion = new Map();

    for (const fila of evolucion ?? []) {
      porSesion.set(fila.numero, {
        etiqueta: fila.etiqueta,
        fecha: fila.fecha,
        Rango: Number(fila.rango_articular),
      });
    }

    for (const fila of evolucionDedo ?? []) {
      const punto = porSesion.get(fila.numero);
      if (punto) punto[fila.dedo_nombre] = Number(fila.angulo_max);
    }

    return [...porSesion.values()];
  }, [evolucion, evolucionDedo]);

  if (serie.length === 0) {
    return <p className="table-empty">Todavía no hay sesiones finalizadas con lecturas para graficar.</p>;
  }

  return (
    <div className="evolucion">
      <div className="evolucion__controles">
        <button
          type="button"
          className={`evolucion__tab${modo === 'general' ? ' evolucion__tab--activo' : ''}`}
          onClick={() => setModo('general')}
        >
          Rango general
        </button>
        <button
          type="button"
          className={`evolucion__tab${modo === 'dedo' ? ' evolucion__tab--activo' : ''}`}
          onClick={() => setModo('dedo')}
          disabled={dedos.length === 0}
        >
          Por dedo
        </button>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={theme.colors.line} vertical={false} />
          <XAxis
            dataKey="etiqueta"
            stroke={theme.colors.line}
            tick={{ fill: theme.colors.slate, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 'dataMax + 10']}
            tickFormatter={(v) => `${v}°`}
            stroke={theme.colors.line}
            tick={{ fill: theme.colors.slate, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              border: `1px solid ${theme.colors.line}`,
              borderRadius: theme.radius.button,
              fontFamily: 'var(--font-text)',
              fontSize: 12,
            }}
            labelFormatter={(etiqueta) => {
              const punto = serie.find((p) => p.etiqueta === etiqueta);
              return punto ? `${etiqueta} · ${punto.fecha}` : etiqueta;
            }}
            formatter={(valor, nombre) => [`${Number(valor).toFixed(1)}°`, nombre]}
          />

          {metaArticular ? (
            <ReferenceLine
              y={Number(metaArticular)}
              stroke={theme.colors.ok}
              strokeDasharray="5 4"
              label={{ value: 'meta', position: 'right', fill: theme.colors.ok, fontSize: 10 }}
            />
          ) : null}

          {modo === 'general' ? (
            <Line
              type="monotone"
              dataKey="Rango"
              name="Rango articular"
              stroke={theme.colors.teal}
              strokeWidth={2.5}
              dot={{ r: 3, fill: theme.colors.teal }}
              isAnimationActive={false}
            />
          ) : (
            <>
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-text)' }} />
              {dedos.map((dedo) => (
                <Line
                  key={dedo}
                  type="monotone"
                  dataKey={dedo}
                  name={dedo}
                  stroke={COLOR_POR_DEDO[dedo] ?? theme.colors.slate}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  isAnimationActive={false}
                />
              ))}
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
