import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "../components/Button.jsx";

function IconoOjo(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconoOjoTachado(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.86 21.86 0 0 1 5.06-6.06" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await iniciarSesion(nombreUsuario, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login">
      <div className="login__panel">
        <span className="login__eyebrow">CENTRO DE SALUD ZONA 5, MIXCO</span>
        <h1 className="login__titulo">
          Órtesis inteligente
          <br />
          para rehabilitación
          <br />
          de tendones
        </h1>
        <p className="login__descripcion">
          Sistema de monitoreo y registro clínico del rango de movimiento
          articular de la mano.
        </p>
      </div>

      <div className="login__formulario">
        <form onSubmit={onSubmit}>
          <h2>Iniciar sesión</h2>
          <p className="login__subtitulo">
            Ingresá tus credenciales institucionales.
          </p>

          <label className="login__label" htmlFor="nombre_usuario">
            USUARIO
          </label>
          <input
            id="nombre_usuario"
            className="login__input"
            placeholder="usuario"
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            autoComplete="username"
          />

          <label className="login__label" htmlFor="password">
            CONTRASEÑA
          </label>
          <div className="login__input-wrap">
            <input
              id="password"
              type={mostrarPassword ? "text" : "password"}
              className="login__input login__input--con-icono"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login__toggle-password"
              onClick={() => setMostrarPassword((v) => !v)}
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {mostrarPassword ? <IconoOjoTachado /> : <IconoOjo />}
            </button>
          </div>

          {error && <p className="mensaje-error">{error}</p>}

          <Button type="submit" disabled={cargando}>
            {cargando ? "Ingresando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
