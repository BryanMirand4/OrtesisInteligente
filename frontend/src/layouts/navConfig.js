// Ítems de navegación por perfil, según la matriz de permisos de CLAUDE.md (6.1).
// Los módulos aún no implementados quedan enrutados a un Placeholder hasta su sprint.
export const NAV_POR_PERFIL = {
  Administrador: [
    { to: '/usuarios', label: 'Usuarios', icon: '◈' },
    { to: '/catalogos', label: 'Catálogos', icon: '▤' },
    { to: '/dispositivo', label: 'Dispositivo', icon: '⚙' },
    { to: '/bitacora', label: 'Bitácora', icon: '≡' },
  ],
  Coordinador: [
    { to: '/expedientes', label: 'Expedientes', icon: '▤' },
    { to: '/pacientes', label: 'Pacientes', icon: '◈' },
    { to: '/indicadores', label: 'Indicadores', icon: '▲' },
    { to: '/reportes', label: 'Reportes', icon: '≡' },
  ],
  Fisioterapeuta: [
    { to: '/sesion-en-vivo', label: 'Sesión en vivo', icon: '●' },
    { to: '/expedientes', label: 'Expedientes', icon: '▤' },
    { to: '/pacientes', label: 'Pacientes', icon: '◈' },
    { to: '/reportes', label: 'Reportes', icon: '≡' },
  ],
  Paciente: [{ to: '/portal', label: 'Mi avance', icon: '◈' }],
};
