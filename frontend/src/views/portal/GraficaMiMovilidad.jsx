import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { theme } from '../../theme.js';

function fechaCorta(valor) {
  if (!valor) return '';
  return new Date(`${valor}T00:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
}

// Versión simplificada de la gráfica del expediente para el portal: una sola
// curva, sin selector de dedos ni frecuencia cardíaca. El paciente necesita
// leer una tendencia, no analizar sensores.
export function GraficaMiMovilidad({ evolucion, meta }) {
  const serie = useMemo(
    () =>
      (evolucion ?? []).map((fila) => ({
        etiqueta: fila.etiqueta,
        fecha: fila.fecha,
        movilidad: Number(fila.rango_articular),
      })),
    [evolucion],
  );

  if (serie.length === 0) {
    return (
      <p className="table-empty">
        Al completar su primera sesión de terapia podrá ver aquí cómo avanza su movilidad.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="degradadoMovilidad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.colors.teal} stopOpacity={0.28} />
            <stop offset="100%" stopColor={theme.colors.teal} stopOpacity={0.02} />
          </linearGradient>
        </defs>

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
            return punto ? `Sesión del ${fechaCorta(punto.fecha)}` : etiqueta;
          }}
          formatter={(valor) => [`${Number(valor).toFixed(0)}°`, 'Movilidad']}
        />

        {meta ? (
          <ReferenceLine
            y={Number(meta)}
            stroke={theme.colors.ok}
            strokeDasharray="5 4"
            label={{ value: 'su meta', position: 'right', fill: theme.colors.ok, fontSize: 10 }}
          />
        ) : null}

        <Area
          type="monotone"
          dataKey="movilidad"
          stroke={theme.colors.teal}
          strokeWidth={2.5}
          fill="url(#degradadoMovilidad)"
          dot={{ r: 3, fill: theme.colors.teal }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
