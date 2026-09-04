import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ANCHO_TOOLTIP = 260;

// Ícono "?" con un párrafo de ayuda que aparece al pasar el cursor o al
// enfocar con teclado (accesible vía Tab). Se usa junto a títulos de
// sección para explicar brevemente para qué sirve esa parte del sistema.
//
// El texto se renderiza en un portal sobre <body> en vez de justo al lado
// del ícono: las tarjetas (.card) usan overflow:hidden para las esquinas
// redondeadas, y eso recortaba el párrafo si se posicionaba adentro.
export function AyudaTooltip({ texto }) {
  const [coords, setCoords] = useState(null);
  const iconoRef = useRef(null);

  function mostrar() {
    const rect = iconoRef.current.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - ANCHO_TOOLTIP - 12);
    setCoords({ top: rect.bottom + 8, left: Math.max(left, 12) });
  }

  function ocultar() {
    setCoords(null);
  }

  return (
    <span className="ayuda">
      <button
        ref={iconoRef}
        type="button"
        className="ayuda__icono"
        aria-label={`Ayuda: ${texto}`}
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
        onFocus={mostrar}
        onBlur={ocultar}
      >
        ?
      </button>
      {coords &&
        createPortal(
          <span
            className="ayuda__texto"
            role="tooltip"
            style={{ top: coords.top, left: coords.left, width: ANCHO_TOOLTIP }}
          >
            {texto}
          </span>,
          document.body,
        )}
    </span>
  );
}
