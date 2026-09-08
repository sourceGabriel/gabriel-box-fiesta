/** Lorota! catalog cover — a growing nose over a speech bubble full of "?". */
export function LorotaCover() {
  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Lorota!"
      preserveAspectRatio="xMidYMid slice"
      className="game-cover-svg"
    >
      <defs>
        <linearGradient id="lorotaBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f2f2a" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#lorotaBg)" />

      {/* speech bubble */}
      <g>
        <rect x="30" y="34" width="180" height="86" rx="18" fill="#12b981" opacity="0.92" />
        <path d="M64 118 L60 144 L92 118 Z" fill="#12b981" opacity="0.92" />
        <text
          x="120" y="92" textAnchor="middle"
          fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="44" letterSpacing="6"
          fill="#04140f"
        >
          ? ? ?
        </text>
      </g>

      {/* growing nose */}
      <path d="M214 96 q46 4 60 26 q-30 6 -60 -6 Z" fill="#f6c56b" stroke="#0b0f17" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="212" cy="94" r="16" fill="#f6c56b" stroke="#0b0f17" strokeWidth="4" />

      <rect x="0" y="150" width="300" height="50" fill="#0b0f17" opacity="0.82" />
      <text
        x="150" y="180" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="32" letterSpacing="2"
        fill="#2ee6a6" stroke="#0b0f17" strokeWidth="4" paintOrder="stroke"
      >
        LOROTA!
      </text>
      <text
        x="150" y="194" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="9" letterSpacing="4"
        fill="#7fd9bf"
      >
        MINTA · CACE A VERDADE
      </text>
    </svg>
  );
}
