/** Zap! catalog cover — a lightning bolt splitting two speech bubbles. */
export function ZapCover() {
  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Zap!"
      preserveAspectRatio="xMidYMid slice"
      className="game-cover-svg"
    >
      <defs>
        <linearGradient id="zapBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a0f3d" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
        <linearGradient id="zapBolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe98a" />
          <stop offset="1" stopColor="#ffd23f" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#zapBg)" />

      {/* two speech bubbles facing off */}
      <g fill="#ff3caf" opacity="0.92">
        <rect x="16" y="44" width="120" height="76" rx="16" />
        <path d="M40 118 L40 140 L64 118 Z" />
      </g>
      <g fill="#35e0e0" opacity="0.92">
        <rect x="164" y="60" width="120" height="76" rx="16" />
        <path d="M260 134 L260 156 L236 134 Z" />
      </g>

      {/* lightning bolt down the middle */}
      <path
        d="M158 8 L118 104 L150 104 L138 184 L196 84 L160 84 Z"
        fill="url(#zapBolt)"
        stroke="#0b0f17"
        strokeWidth="5"
        strokeLinejoin="round"
        paintOrder="stroke"
      />

      <rect x="0" y="150" width="300" height="50" fill="#0b0f17" opacity="0.82" />
      <text
        x="150" y="180" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="34" letterSpacing="2"
        fill="#ffd23f" stroke="#0b0f17" strokeWidth="4" paintOrder="stroke"
      >
        ZAP!
      </text>
      <text
        x="150" y="194" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="9" letterSpacing="4"
        fill="#ff8fd4"
      >
        RESPONDA · DUELE · VOTE
      </text>
    </svg>
  );
}
