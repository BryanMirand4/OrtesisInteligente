import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppShell } from './layouts/AppShell.jsx';
import { Login } from './views/Login.jsx';
import { Home } from './views/Home.jsx';
import { Usuarios } from './views/Usuarios.jsx';
import { Bitacora } from './views/Bitacora.jsx';
import { Pacientes } from './views/Pacientes.jsx';
import { Catalogos } from './views/Catalogos.jsx';
import { SesionEnVivo } from './views/SesionEnVivo.jsx';
import { Dispositivo } from './views/Dispositivo.jsx';
import { Placeholder } from './views/Placeholder.jsx';

function RutaProtegida({ perfilesPermitidos, children }) {
  const { estaAutenticado, usuario } = useAuth();

  if (!estaAutenticado) return <Navigate to="/login" replace />;
  if (perfilesPermitidos && !perfilesPermitidos.includes(usuario.perfil_nombre)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function AppRoutes() {
  const { estaAutenticado } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={estaAutenticado ? <Navigate to="/" replace /> : <Login />} />

      <Route
        element={
          <RutaProtegida>
            <AppShell />
          </RutaProtegida>
        }
      >
        <Route path="/" element={<Home />} />
        <Route
          path="/sesion-en-vivo"
          element={
            <RutaProtegida perfilesPermitidos={['Fisioterapeuta']}>
              <SesionEnVivo />
            </RutaProtegida>
          }
        />
        <Route
          path="/dispositivo"
          element={
            <RutaProtegida perfilesPermitidos={['Administrador']}>
              <Dispositivo />
            </RutaProtegida>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RutaProtegida perfilesPermitidos={['Administrador']}>
              <Usuarios />
            </RutaProtegida>
          }
        />
        <Route
          path="/bitacora"
          element={
            <RutaProtegida perfilesPermitidos={['Administrador']}>
              <Bitacora />
            </RutaProtegida>
          }
        />
        <Route
          path="/pacientes"
          element={
            <RutaProtegida perfilesPermitidos={['Fisioterapeuta', 'Coordinador']}>
              <Pacientes />
            </RutaProtegida>
          }
        />
        <Route
          path="/catalogos"
          element={
            <RutaProtegida perfilesPermitidos={['Administrador']}>
              <Catalogos />
            </RutaProtegida>
          }
        />
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
