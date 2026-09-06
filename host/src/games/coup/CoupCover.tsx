/** Coup catalog cover — three fanned influence cards over a crest. Inline SVG, no assets. */
export function CoupCover() {
  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Coup"
      preserveAspectRatio="xMidYMid slice"
      className="game-cover-svg"
    >
      <defs>
        <linearGradient id="coupBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a1206" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#coupBg)" />

      <g transform="rotate(-16 150 110)">
        <rect x="60" y="34" width="96" height="140" rx="12" fill="#141a24" stroke="#9b59b6" strokeWidth="4" />
      </g>
      <g transform="rotate(0 150 104)">
        <rect x="102" y="24" width="96" height="150" rx="12" fill="#161d29" stroke="#e2b13c" strokeWidth="4" />
      </g>
      <g transform="rotate(16 150 110)">
        <rect x="150" y="34" width="96" height="140" rx="12" fill="#141a24" stroke="#2980b9" strokeWidth="4" />
      </g>

      <text
        x="150" y="112" textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700" fontSize="46" letterSpacing="3"
        fill="#f4e9d4" stroke="#0b0f17" strokeWidth="5" paintOrder="stroke"
      >
        COUP
      </text>
      <text
        x="150" y="140" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="12" letterSpacing="4"
        fill="#b98b4a"
      >
        BLEFE · DESAFIO
      </text>
    </svg>
  );
}
