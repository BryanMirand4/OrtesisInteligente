export function Pill({ tone = 'neutral', children }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}
