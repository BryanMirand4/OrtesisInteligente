import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { theme } from '../../theme.js';

// Barras del mockup `indicadores.svg`. El backend devuelve todas las semanas
// del período, incluso las vacías, para que el eje no salte.
export function SesionesPorSemana({ datos }) {
  if (!datos || datos.length === 0) {
    return <p className="table-empty">No hay sesiones registradas en el período.</p>;
  }

  const serie = datos.map((fila) => ({
    semana: fila.semana,
    sesiones: Number(fila.sesiones ?? 0),
    finalizadas: Number(fila.sesiones_finalizadas ?? 0),
    desde: fila.desde,
    hasta: fila.hasta,
  }));

  const maximo = Math.max(...serie.map((f) => f.sesiones));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
        <CartesianGrid stroke={theme.colors.line} vertical={false} />
        <XAxis
          dataKey="semana"
          stroke={theme.colors.line}
          tick={{ fill: theme.colors.slate, fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          stroke={theme.colors.line}
          tick={{ fill: theme.colors.slate, fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: theme.colors.wash }}
          contentStyle={{
            border: `1px solid ${theme.colors.line}`,
            borderRadius: theme.radius.button,
            fontFamily: 'var(--font-text)',
            fontSize: 12,
          }}
          labelFormatter={(semana) => {
            const fila = serie.find((f) => f.semana === semana);
            return fila ? `${semana} · ${fila.desde} al ${fila.hasta}` : semana;
          }}
          formatter={(valor, nombre) => [valor, nombre === 'sesiones' ? 'Sesiones' : 'Finalizadas']}
        />
        <Bar dataKey="sesiones" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {serie.map((fila) => (
            // La semana más activa se destaca en teal oscuro, como en el mockup.
            <Cell
              key={fila.semana}
              fill={fila.sesiones === maximo && maximo > 0 ? theme.colors.tealDark : theme.colors.teal}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
