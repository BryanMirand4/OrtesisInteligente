import { useAuth } from '../context/AuthContext.jsx';

export function Home() {
  const { usuario } = useAuth();

  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>Hola, {usuario?.nombre_completo?.split(' ')[0]}</h1>
          <p>Seleccioná un módulo en el menú lateral para comenzar.</p>
        </div>
      </header>
    </div>
  );
}
