import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Home() {
  const { usuario } = useAuth();

  // El perfil Paciente tiene un solo módulo: su portal de solo lectura. No
  // tiene sentido mostrarle un panel para "elegir un módulo" que no existe.
  if (usuario?.perfil_nombre === 'Paciente') return <Navigate to="/portal" replace />;

  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>Hola, {usuario?.nombre_completo?.split(' ')[0]}</h1>
          <p>Seleccione un módulo en el menú lateral para comenzar.</p>
        </div>
      </header>
    </div>
  );
}
