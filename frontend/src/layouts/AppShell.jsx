import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NAV_POR_PERFIL } from './navConfig.js';

function iniciales(nombreCompleto = '') {
  return nombreCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

export function AppShell() {
  const { usuario, cerrarSesion } = useAuth();
  const nav = NAV_POR_PERFIL[usuario?.perfil_nombre] ?? [];

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__brand-nombre">Órtesis Inteligente</span>
          <span className="shell__brand-sub">C.S. ZONA 5, MIXCO</span>
        </div>

        <div className="shell__usuario">
          <span className="shell__avatar">{iniciales(usuario?.nombre_completo)}</span>
          <div>
            <p className="shell__usuario-nombre">{usuario?.nombre_completo}</p>
            <p className="shell__usuario-perfil">{usuario?.perfil_nombre?.toUpperCase()}</p>
          </div>
        </div>

        <nav className="shell__nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `shell__nav-item${isActive ? ' shell__nav-item--activo' : ''}`}
            >
              <span className="shell__nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="shell__logout" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </aside>

      <main className="shell__contenido">
        <Outlet />
      </main>
    </div>
  );
}
