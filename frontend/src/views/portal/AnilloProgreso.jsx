import { theme } from '../../theme.js';

// Anillo de avance del mockup portal paciente.svg (rotulado ahí "% DE TU
// META"; en pantalla se trata al paciente de usted). Es un SVG y no una
// librería de gráficas porque muestra un solo número: dibujarlo a mano pesa
// menos y permite controlar el grosor y los topes redondeados del trazo.
export function AnilloProgreso({ valor, etiqueta = 'DE SU META', tamano = 168 }) {
  const grosor = 14;
  const radio = (tamano - grosor) / 2;
  const centro = tamano / 2;
  const circunferencia = 2 * Math.PI * radio;

  const porcentaje = valor === null || valor === undefined ? null : Math.max(0, Math.min(Number(valor), 100));
  const avance = porcentaje === null ? 0 : (porcentaje / 100) * circunferencia;

  return (
    <div className="anillo">
      <svg
        width={tamano}
        height={tamano}
        viewBox={`0 0 ${tamano} ${tamano}`}
        role="img"
        aria-label={porcentaje === null ? `Sin datos de ${etiqueta}` : `${porcentaje}% ${etiqueta}`}
      >
        <circle
          cx={centro}
          cy={centro}
          r={radio}
          fill="none"
          stroke={theme.colors.line}
          strokeWidth={grosor}
        />
        {porcentaje !== null && (
          <circle
            cx={centro}
            cy={centro}
            r={radio}
            fill="none"
            stroke={theme.colors.teal}
            strokeWidth={grosor}
            strokeLinecap="round"
            strokeDasharray={`${avance} ${circunferencia - avance}`}
            // Arranca a las 12 en punto en lugar de las 3.
            transform={`rotate(-90 ${centro} ${centro})`}
          />
        )}
      </svg>

      <div className="anillo__centro">
        <span className="anillo__valor">{porcentaje === null ? '—' : `${porcentaje}%`}</span>
        <span className="anillo__etiqueta">{etiqueta}</span>
      </div>
    </div>
  );
}
