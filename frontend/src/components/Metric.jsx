export function Metric({ label, value, hint }) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
      {hint && <span className="metric__hint">{hint}</span>}
    </div>
  );
}
