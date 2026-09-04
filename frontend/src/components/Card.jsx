import { AyudaTooltip } from './AyudaTooltip.jsx';

export function Card({ title, ayuda, action, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card__header">
          {title && (
            <h2 className="card__title">
              {title}
              {ayuda && <AyudaTooltip texto={ayuda} />}
            </h2>
          )}
          {action}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
}
