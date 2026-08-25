export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card__header">
          {title && <h2 className="card__title">{title}</h2>}
          {action}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}
