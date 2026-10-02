import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Table } from '../components/Table.jsx';
import { Button } from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { AnilloProgreso } from './portal/AnilloProgreso.jsx';
import { GraficaMiMovilidad } from './portal/GraficaMiMovilidad.jsx';
import * as portalApi from '../api/portal.js';

// Portal del paciente (mockups/portal paciente.svg). Toda la vista responde
// una sola pregunta: ¿estoy mejorando? Por eso no muestra observaciones
// clínicas, frecuencia cardíaca ni umbrales técnicos; el backend tampoco los
// envía. Los textos tratan al paciente de usted, sin tecnicismos: es el trato
// habitual en la atención del centro de salud.

const num = (valor) => (valor === null || valor === undefined || valor === '' ? null : Number(valor));
const grados = (valor) => (num(valor) === null ? '—' : `${Math.round(num(valor))}°`);

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaCorta(valor) {
  if (!valor) return '—';
  return new Date(`${valor}T00:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
}

// El procedimiento redondea a minutos: una sesión de pocos segundos llegaría
// como 0 y "0 min" se lee como un error. Se muestra "menos de 1 min".
function duracion(minutos) {
  const valor = num(minutos);
  if (valor === null) return '—';
  return valor < 1 ? 'menos de 1 min' : `${valor} min`;
}

// Frase de aliento bajo las métricas. Se apoya en el progreso de la última
// sesión contra la anterior; si todavía no hay con qué comparar, orienta
// sobre el siguiente paso en lugar de mostrar un número vacío.
function mensajeDeAvance(resumen) {
  const progreso = num(resumen?.progreso_reciente_grados);
  const sesiones = num(resumen?.sesiones_completadas) ?? 0;

  if (sesiones === 0) {
    return 'Aún no tiene sesiones de terapia registradas. La primera marca su punto de partida.';
  }
  if (progreso === null) {
    return 'Ya completó su primera sesión. Desde la siguiente podrá comparar su avance.';
  }
  if (progreso > 0) {
    return `Su movilidad mejoró ${progreso}° desde la sesión anterior. Va muy bien.`;
  }
  if (progreso === 0) {
    return 'Su movilidad se mantuvo igual que en la sesión anterior. Sostener lo alcanzado también es avanzar.';
  }
  return `Su movilidad bajó ${Math.abs(progreso)}° respecto a la sesión anterior. Coméntelo con su fisioterapeuta en la próxima consulta.`;
}

export function Portal() {
  const { usuario } = useAuth();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDatos(await portalApi.obtenerMiAvance());
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function descargar(formato) {
    setDescargando(formato);
    setError('');
    setAviso('');
    try {
      const documento = await portalApi.descargarMiReporte({ formato });
      setAviso(`Se descargó ${documento}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDescargando('');
    }
  }

  if (cargando) {
    return (
      <div className="vista">
        <Card>
          <p>Cargando su avance…</p>
        </Card>
      </div>
    );
  }

  // Cuenta sin expediente vinculado: el fisioterapeuta todavía no habilitó el
  // acceso. Se explica qué hacer en lugar de mostrar un error técnico.
  if (error && !datos) {
    return (
      <div className="vista">
        <Card title="MI REHABILITACIÓN">
          <p className="mensaje-error">{error}</p>
          <button type="button" className="link-btn" onClick={cargar}>
            Reintentar
          </button>
        </Card>
      </div>
    );
  }

  const { resumen, evolucion, sesiones, avance_dedo: avanceDedo } = datos;
  const primerNombre = (resumen?.nombres ?? usuario?.nombre_completo ?? '').split(' ')[0];

  const metaMaxima = (avanceDedo ?? []).reduce((mayor, fila) => {
    const meta = num(fila.angulo_meta);
    return meta !== null && meta > mayor ? meta : mayor;
  }, 0);

  const columnasSesiones = [
    {
      key: 'codigo_sesion',
      header: 'SESIÓN',
      render: (s) => <span className="mono-destacado">{s.codigo_sesion}</span>,
    },
    { key: 'fecha', header: 'FECHA', render: (s) => fechaCorta(s.fecha) },
    { key: 'duracion_minutos', header: 'DURACIÓN', render: (s) => duracion(s.duracion_minutos) },
    { key: 'rango_articular', header: 'MOVILIDAD', render: (s) => grados(s.rango_articular) },
    { key: 'repeticiones_total', header: 'REPETICIONES', render: (s) => s.repeticiones_total ?? '—' },
  ];

  const columnasAvance = [
    { key: 'dedo_nombre', header: 'DEDO' },
    { key: 'angulo_actual', header: 'HOY', render: (f) => grados(f.angulo_actual) },
    { key: 'angulo_meta', header: 'SU META', render: (f) => grados(f.angulo_meta) },
    {
      key: 'avance_pct',
      header: 'AVANCE',
      render: (f) => {
        const avance = num(f.avance_pct);
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

  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>Mi rehabilitación</h1>
          <p>Expediente {resumen?.codigo_expediente} · acceso de solo lectura</p>
        </div>
      </header>

      {error && <p className="mensaje-error">{error}</p>}
      {aviso && <p className="mensaje-ok">{aviso}</p>}

      <Card title="MI REHABILITACIÓN">
        <div className="portal__resumen">
          <AnilloProgreso valor={num(resumen?.avance_meta_pct)} />

          <div className="portal__detalle">
            <h2 className="portal__saludo">
              {saludo()}, {primerNombre}
            </h2>

            <div className="portal__metricas">
              <div className="portal__metrica">
                <span className="portal__metrica-label">Sesiones completadas</span>
                <span className="portal__metrica-valor">
                  {resumen?.sesiones_completadas ?? 0}
                  {resumen?.sesiones_meta ? <small> / {resumen.sesiones_meta}</small> : null}
                </span>
              </div>
              <div className="portal__metrica">
                <span className="portal__metrica-label">Movilidad alcanzada</span>
                <span className="portal__metrica-valor">{grados(resumen?.movilidad_actual)}</span>
              </div>
              <div className="portal__metrica">
                <span className="portal__metrica-label">Última sesión</span>
                <span className="portal__metrica-valor">{fechaCorta(resumen?.ultima_sesion)}</span>
              </div>
            </div>

            <p className="portal__mensaje">{mensajeDeAvance(resumen)}</p>

            <div className="portal__acciones">
              <Button disabled={descargando !== ''} onClick={() => descargar('pdf')}>
                {descargando === 'pdf' ? 'Preparando…' : 'Descargar mi reporte'}
              </Button>
              <Button
                variant="secundario"
                disabled={descargando !== ''}
                onClick={() => descargar('xlsx')}
              >
                {descargando === 'xlsx' ? 'Preparando…' : 'Descargar en Excel'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="EVOLUCIÓN DE SU MOVILIDAD"
        ayuda="Cada punto es el mejor ángulo alcanzado en una sesión de terapia."
      >
        <GraficaMiMovilidad evolucion={evolucion} meta={metaMaxima || null} />
      </Card>

      <Card title="AVANCE POR DEDO" ayuda="Compara el ángulo alcanzado hoy con la meta definida por su fisioterapeuta.">
        <Table
          columns={columnasAvance}
          data={avanceDedo}
          rowKey={(f) => f.id_dedo}
          emptyMessage="Su fisioterapeuta aún no ha definido metas por dedo."
        />
      </Card>

      <Card title="MIS SESIONES">
        <Table
          columns={columnasSesiones}
          data={sesiones}
          rowKey={(s) => s.codigo_sesion}
          emptyMessage="Aún no tiene sesiones de terapia registradas."
        />
      </Card>

      <p className="portal__nota">
        Esta vista es informativa. Su fisioterapeuta revisará con usted las observaciones clínicas de su
        tratamiento en la próxima consulta.
      </p>
    </div>
  );
}
