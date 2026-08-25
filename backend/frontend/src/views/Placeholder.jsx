export function Placeholder({ titulo = 'Módulo en construcción' }) {
  return (
    <div className="vista">
      <header className="vista__header">
        <div>
          <h1>{titulo}</h1>
          <p>Este módulo se habilitará en un sprint posterior.</p>
        </div>
      </header>
    </div>
  );
}
