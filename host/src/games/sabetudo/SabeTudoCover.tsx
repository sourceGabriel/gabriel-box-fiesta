/** Sabe-Tudo catalog cover — four answer chips (A B C D) under a lit bulb. */
export function SabeTudoCover() {
  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Sabe-Tudo"
      preserveAspectRatio="xMidYMid slice"
      className="game-cover-svg"
    >
      <defs>
        <linearGradient id="sabetudoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a1140" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#sabetudoBg)" />

      {/* bulb */}
      <circle cx="150" cy="58" r="30" fill="#ffd54a" />
      <path d="M138 84 h24 v10 h-24 Z" fill="#c9a227" />
      <g stroke="#ffd54a" strokeWidth="4" strokeLinecap="round">
        <line x1="150" y1="12" x2="150" y2="2" />
        <line x1="198" y1="28" x2="206" y2="20" />
        <line x1="102" y1="28" x2="94" y2="20" />
      </g>

      {/* answer chips */}
      <g fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="18" fill="#0b0f17" textAnchor="middle">
        <rect x="24" y="108" width="120" height="30" rx="8" fill="#7c5cff" />
        <text x="84" y="129">A</text>
        <rect x="156" y="108" width="120" height="30" rx="8" fill="#22c55e" />
        <text x="216" y="129">B</text>
        <rect x="24" y="144" width="120" height="30" rx="8" fill="#f97316" />
        <text x="84" y="165">C</text>
        <rect x="156" y="144" width="120" height="30" rx="8" fill="#ec4899" />
        <text x="216" y="165">D</text>
      </g>

      <rect x="0" y="176" width="300" height="24" fill="#0b0f17" opacity="0.82" />
      <text
        x="150" y="193" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="16" letterSpacing="3"
        fill="#c4b5fd"
      >
        SABE-TUDO
      </text>
    </svg>
  );
}
