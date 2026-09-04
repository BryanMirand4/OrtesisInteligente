import { memo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { theme } from '../../theme.js';

const SERIES = [
  { key: 'indice', nombre: 'Índice', color: theme.colors.sensorIndice },
  { key: 'medio', nombre: 'Medio', color: theme.colors.sensorMedio },
  { key: 'pulgar', nombre: 'Pulgar', color: theme.colors.sensorPulgar },
];

// Osciloscopio de flexión en vivo. Aislado y memoizado porque es el punto
// caliente de re-render: recibe la ventana de muestras ya recortada/decimada
// desde la vista y solo se vuelve a pintar cuando esa referencia cambia.
function OsciloscopioBase({ serie }) {
  return (
    <div className="osciloscopio">
      <div className="osciloscopio__encabezado">
        <span className="osciloscopio__titulo">FLEXIÓN — °</span>
        <div className="osciloscopio__leyenda">
          {SERIES.map((s) => (
            <span key={s.key}>
              <i style={{ background: s.color }} />
              {s.nombre}
            </span>
          ))}
          <span className="osciloscopio__fuente">HC-06</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={248}>
        <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#1b3543" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `${Math.round(v)}s`}
            stroke="#3a5866"
            tick={{ fill: '#6e93a0', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke="#3a5866"
            tick={{ fill: '#6e93a0', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#0d1b23',
              border: '1px solid #1e3b47',
              borderRadius: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
            labelFormatter={(v) => `t = ${Number(v).toFixed(1)} s`}
            formatter={(value, name) => [`${Number(value).toFixed(1)}°`, name]}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.nombre}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export const Osciloscopio = memo(OsciloscopioBase);
