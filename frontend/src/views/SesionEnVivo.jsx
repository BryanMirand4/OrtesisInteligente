import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { Pill } from '../components/Pill.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import * as sesionesApi from '../api/sesiones.js';
import * as pacientesApi from '../api/pacientes.js';
import { crearSocketSesion } from '../api/socket.js';
import { Osciloscopio } from './sesion/Osciloscopio.jsx';

const VENTANA_SEGUNDOS = 15;
const MAX_PUNTOS = 300;
const REFRESCO_MS = 100;

function mmss(segundos) {
  const s = Math.max(0, Math.floor(segundos || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function subtitulo(s) {
  const partes = [];
  if (s.diagnostico_nombre) partes.push(s.diagnostico_nombre);
  partes.push(`mano ${s.mano_afectada.toLowerCase()}`);
  if (s.protocolo_nombre) partes.push(`Protocolo ${s.protocolo_nombre}`);
  return partes.join(' · ');
}

export function SesionEnVivo() {
  const { usuario, token } = useAuth();

  const [sesion, setSesion] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSel, setPacienteSel] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [accion, setAccion] = useState(false);

  const [puerto, setPuerto] = useState('MOCK');
  const [conexion, setConexion] = useState({ conectado: false, fuente: null });

  const [vivo, setVivo] = useState(null);
  const [serie, setSerie] = useState([]);
  const [maxIndice, setMaxIndice] = useState(0);
  const [alerta, setAlerta] = useState(null);
  const [observaciones, setObservaciones] = useState('');
  const [resumen, setResumen] = useState(null);

  const socketRef = useRef(null);
  const bufferRef = useRef([]); // { t, indice, medio, pulgar }
  const t0Ref = useRef(0);
  const ultimoVivoRef = useRef(null);
  const alertaTimerRef = useRef(null);

  // ¿Hay una sesión en curso? + pacientes asignados a este fisioterapeuta.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [activa, lista] = await Promise.all([
          sesionesApi.obtenerSesionActiva(),
          pacientesApi.listarPacientes({ activo: true }),
        ]);
        if (!activo) return;
        setPacientes(lista.filter((p) => p.id_fisioterapeuta === usuario.id_usuario));
        if (activa) {
          setSesion(activa);
          setObservaciones(activa.observaciones || '');
        }
      } catch (err) {
        if (activo) setError(err.message);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [usuario.id_usuario]);

  // Refresco throttleado de la gráfica y de los valores en vivo.
  useEffect(() => {
    if (!conexion.conectado) return undefined;
    const timer = setInterval(() => {
      const ahora = (Date.now() - t0Ref.current) / 1000;
      const desde = ahora - VENTANA_SEGUNDOS;
      let ventana = bufferRef.current.filter((m) => m.t >= desde);
      if (ventana.length > MAX_PUNTOS) {
        const paso = Math.ceil(ventana.length / MAX_PUNTOS);
        ventana = ventana.filter((_, i) => i % paso === 0);
      }
      setSerie(ventana);
      if (ultimoVivoRef.current) setVivo(ultimoVivoRef.current);
    }, REFRESCO_MS);
    return () => clearInterval(timer);
  }, [conexion.conectado]);

  // Limpieza al desmontar la vista.
  useEffect(
    () => () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (alertaTimerRef.current) clearTimeout(alertaTimerRef.current);
    },
    [],
  );

  const conectarSocket = useCallback(
    (idSesion) => {
      const socket = crearSocketSesion(token);
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('unir_sesion', { id_sesion: idSesion }, (resp) => {
          if (!resp?.ok) setError(resp?.error || 'No se pudo unir a la sesión.');
        });
      });
      socket.on('connect_error', (e) => setError(`Socket: ${e.message}`));

      socket.on('estado_captura', (info) =>
        setConexion({ conectado: info.conectado, fuente: info.fuente }),
      );

      socket.on('lectura', (l) => {
        if (!t0Ref.current) t0Ref.current = Date.now();
        const t = (Date.now() - t0Ref.current) / 1000;
        bufferRef.current.push({
          t,
          indice: l.flexion.indice ?? 0,
          medio: l.flexion.medio ?? 0,
          pulgar: l.flexion.pulgar ?? 0,
        });
        if (bufferRef.current.length > 4000) {
          bufferRef.current.splice(0, bufferRef.current.length - 4000);
        }
        ultimoVivoRef.current = l;
        setMaxIndice((m) => Math.max(m, l.flexion.indice ?? 0));
      });

      socket.on('alerta_fc', (a) => {
        setAlerta(a);
        if (alertaTimerRef.current) clearTimeout(alertaTimerRef.current);
        alertaTimerRef.current = setTimeout(() => setAlerta(null), 6000);
      });

      socket.connect();
    },
    [token],
  );

  function cortarStream() {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConexion({ conectado: false, fuente: null });
    setAlerta(null);
  }

  async function iniciar() {
    setError('');
    setAccion(true);
    try {
      const nueva = await sesionesApi.iniciarSesion(Number(pacienteSel));
      setResumen(null);
      setObservaciones('');
      setSesion(nueva);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccion(false);
    }
  }

  async function conectar() {
    setError('');
    try {
      const info = await sesionesApi.conectarSesion(sesion.id_sesion, puerto.trim() || 'MOCK');
      t0Ref.current = 0;
      bufferRef.current = [];
      ultimoVivoRef.current = null;
      setSerie([]);
      setVivo(null);
      setMaxIndice(0);
      setConexion({ conectado: true, fuente: info.fuente });
      conectarSocket(sesion.id_sesion);
    } catch (err) {
      setError(err.message);
    }
  }

  async function finalizar() {
    setError('');
    setAccion(true);
    try {
      const r = await sesionesApi.finalizarSesion(sesion.id_sesion, observaciones);
      cortarStream();
      setResumen(r);
      setSesion(null);
      setVivo(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccion(false);
    }
  }

  async function cancelar() {
    if (!window.confirm('¿Cancelar la sesión? No se calculará el resumen.')) return;
    setError('');
    setAccion(true);
    try {
      await sesionesApi.cancelarSesion(sesion.id_sesion);
      cortarStream();
      setSesion(null);
      setVivo(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccion(false);
    }
  }

  if (cargando) {
    return (
      <div className="vista">
        <header className="vista__header">
          <div>
            <h1>Sesión en curso</h1>
          </div>
        </header>
        <p>Cargando…</p>
      </div>
    );
  }

  // ---- Resumen de la última sesión finalizada ----
  if (resumen && !sesion) {
    const s = resumen.sesion;
    return (
      <div className="vista">
        <header className="vista__header">
          <div>
            <h1>Sesión finalizada</h1>
            <p>
              {s.codigo_expediente} · {mmss(s.duracion_segundos)} · {s.repeticiones_total} repeticiones
            </p>
          </div>
          <Button onClick={() => setResumen(null)}>Nueva sesión</Button>
        </header>

        {error && <p className="mensaje-error">{error}</p>}

        <Card title="RESUMEN POR DEDO">
          <div className="resumen__grid">
            {resumen.resumen_dedo.map((d) => (
              <div key={d.id_dedo} className="resumen__dedo">
                <span className="resumen__dedo-nombre">{d.dedo_nombre}</span>
                <span className="resumen__dedo-max">{Number(d.angulo_max).toFixed(1)}°</span>
                <span className="resumen__dedo-prom">prom. {Number(d.angulo_promedio).toFixed(1)}°</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="FRECUENCIA CARDÍACA Y TIEMPO">
          <div className="vivo__metricas">
            <Metrica etiqueta="FC mínima" valor={s.fc_min ?? '—'} sufijo="bpm" />
            <Metrica etiqueta="FC máxima" valor={s.fc_max ?? '—'} sufijo="bpm" />
            <Metrica etiqueta="FC promedio" valor={s.fc_promedio ?? '—'} sufijo="bpm" />
            <Metrica etiqueta="Duración" valor={mmss(s.duracion_segundos)} />
          </div>
          {s.observaciones && (
            <p className="resumen__obs">
              <strong>Observación:</strong> {s.observaciones}
            </p>
          )}
        </Card>
      </div>
    );
  }

  // ---- Selección de paciente ----
  if (!sesion) {
    return (
      <div className="vista">
        <header className="vista__header">
          <div>
            <h1>Sesión en vivo</h1>
            <p>Elegí un paciente para iniciar una sesión de terapia.</p>
          </div>
        </header>

        {error && <p className="mensaje-error">{error}</p>}

        <Card title="NUEVA SESIÓN">
          {pacientes.length === 0 ? (
            <p>No tenés pacientes activos asignados.</p>
          ) : (
            <div className="sesion__seleccion">
              <select value={pacienteSel} onChange={(e) => setPacienteSel(e.target.value)}>
                <option value="">Seleccioná un paciente…</option>
                {pacientes.map((p) => (
                  <option key={p.id_paciente} value={p.id_paciente}>
                    {p.codigo_expediente} · {p.nombres} {p.apellidos}
                  </option>
                ))}
              </select>
              <Button disabled={!pacienteSel || accion} onClick={iniciar}>
                {accion ? 'Iniciando…' : 'Iniciar sesión'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ---- Sesión activa ----
  const flexion = vivo?.flexion ?? {};
  const orientacion = vivo?.orientacion ?? {};
  const fcAlta = Boolean(alerta);

  return (
    <div className="vista vista--ancha">
      <header className="vista__header">
        <div>
          <h1>Sesión en curso</h1>
          <p>
            {sesion.codigo_expediente} · {subtitulo(sesion)}
          </p>
        </div>
        <div className="sesion__cabecera-acciones">
          <Pill tone={conexion.conectado ? 'ok' : 'neutral'}>
            {conexion.conectado
              ? `Órtesis conectada${conexion.fuente === 'mock' ? ' (simulada)' : ''}`
              : 'Sin conexión'}
          </Pill>
          <Button variant="secundario" disabled={accion} onClick={cancelar}>
            Cancelar
          </Button>
          <Button disabled={accion} onClick={finalizar}>
            {accion ? 'Finalizando…' : 'Finalizar sesión'}
          </Button>
        </div>
      </header>

      {error && <p className="mensaje-error">{error}</p>}

      {alerta && (
        <div className="alerta-fc" role="alert">
          ⚠ Frecuencia cardíaca elevada: {alerta.fc} bpm (umbral {alerta.umbral} bpm)
        </div>
      )}

      {!conexion.conectado && (
        <Card title="CONEXIÓN CON LA ÓRTESIS">
          <div className="sesion__conexion">
            <label htmlFor="puerto">Puerto</label>
            <input
              id="puerto"
              value={puerto}
              onChange={(e) => setPuerto(e.target.value)}
              placeholder="COM4 o MOCK"
            />
            <Button onClick={conectar}>Conectar</Button>
          </div>
          <p className="sesion__conexion-nota">
            Usá <code>MOCK</code> para trabajar con datos simulados sin hardware.
          </p>
        </Card>
      )}

      <div className="sesion__panel">
        <Osciloscopio serie={serie} />

        <div className="sesion__lateral">
          <div className="vivo__metricas">
            <Metrica etiqueta="♥ Frecuencia cardíaca" valor={vivo?.fc ?? '—'} sufijo="bpm" alerta={fcAlta} />
            <Metrica etiqueta="Repeticiones" valor={vivo?.repeticiones ?? 0} />
            <Metrica etiqueta="Tiempo" valor={mmss(vivo?.cronometro_segundos)} />
            <Metrica etiqueta="Máx. índice" valor={`${maxIndice.toFixed(0)}°`} />
          </div>

          <div className="vivo__dedos">
            <Dedo nombre="Índice" valor={flexion.indice} clase="indice" />
            <Dedo nombre="Medio" valor={flexion.medio} clase="medio" />
            <Dedo nombre="Pulgar" valor={flexion.pulgar} clase="pulgar" />
          </div>

          <div className="vivo__orientacion">
            <span>Orientación de la mano</span>
            <div>
              <span>roll {fmt(orientacion.roll)}°</span>
              <span>pitch {fmt(orientacion.pitch)}°</span>
              <span>yaw {fmt(orientacion.yaw)}°</span>
            </div>
          </div>
        </div>
      </div>

      <Card title="OBSERVACIÓN CLÍNICA">
        <textarea
          className="sesion__observacion"
          maxLength={500}
          rows={3}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Comentarios cualitativos sobre el desempeño del paciente…"
        />
        <span className="sesion__contador">{observaciones.length} / 500 caracteres</span>
      </Card>
    </div>
  );
}

function fmt(v) {
  return v === undefined || v === null ? '—' : Number(v).toFixed(1);
}

function Metrica({ etiqueta, valor, sufijo, alerta }) {
  return (
    <div className={`vivo__metrica${alerta ? ' vivo__metrica--alerta' : ''}`}>
      <span className="vivo__metrica-label">{etiqueta}</span>
      <span className="vivo__metrica-valor">
        {valor}
        {sufijo && <small> {sufijo}</small>}
      </span>
    </div>
  );
}

function Dedo({ nombre, valor, clase }) {
  return (
    <div className={`vivo__dedo vivo__dedo--${clase}`}>
      <span>{nombre}</span>
      <strong>{valor === undefined || valor === null ? '—' : `${Number(valor).toFixed(0)}°`}</strong>
    </div>
  );
}
