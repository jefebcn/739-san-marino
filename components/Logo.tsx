export function Cime({ width = 34, color = "#C9A45C" }: { width?: number; color?: string }) {
  return (
    <svg width={width} height={(width * 48) / 120} viewBox="0 0 120 48" aria-hidden="true">
      <path d="M2 46 L26 22 L36 30 L58 4 L78 26 L90 16 L118 46 Z" fill={color} />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo" aria-label="739 San Marino">
      739
      <Cime />
      <small>San Marino</small>
    </span>
  );
}
