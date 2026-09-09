/** Dilema nos Trilhos catalog cover — a trolley bearing down on a forked track. */
export function DilemaCover() {
  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Dilema nos Trilhos"
      preserveAspectRatio="xMidYMid slice"
      className="game-cover-svg"
    >
      <defs>
        <linearGradient id="dilemaBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b1408" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#dilemaBg)" />

      {/* forked rails */}
      <g stroke="#f97316" strokeWidth="4" fill="none" opacity="0.9" strokeLinecap="round">
        <path d="M150 120 L20 120" />
        <path d="M150 120 L20 120" transform="translate(0 14)" />
        <path d="M150 120 C 200 120 210 70 280 60" />
        <path d="M150 134 C 205 134 220 150 285 150" />
      </g>
      {/* sleepers */}
      <g stroke="#7c3f16" strokeWidth="5" opacity="0.7">
        <path d="M40 112 L40 142" />
        <path d="M75 112 L75 142" />
        <path d="M110 112 L110 142" />
      </g>

      {/* trolley */}
      <g transform="translate(70 78)">
        <rect x="0" y="0" width="70" height="34" rx="6" fill="#fbbf24" />
        <rect x="8" y="6" width="20" height="14" rx="2" fill="#0b0f17" />
        <rect x="42" y="6" width="20" height="14" rx="2" fill="#0b0f17" />
        <circle cx="16" cy="40" r="7" fill="#0b0f17" stroke="#f97316" strokeWidth="3" />
        <circle cx="54" cy="40" r="7" fill="#0b0f17" stroke="#f97316" strokeWidth="3" />
        <path d="M35 -14 L35 0" stroke="#f97316" strokeWidth="3" />
      </g>

      {/* the two crowds */}
      <text x="255" y="52" textAnchor="middle" fontSize="20">😀</text>
      <text x="262" y="150" textAnchor="middle" fontSize="20">😈</text>

      <rect x="0" y="152" width="300" height="48" fill="#0b0f17" opacity="0.84" />
      <text
        x="150" y="182" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="30" letterSpacing="2"
        fill="#f97316" stroke="#0b0f17" strokeWidth="4" paintOrder="stroke"
      >
        DILEMA
      </text>
      <text
        x="150" y="195" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="8.5" letterSpacing="3"
        fill="#fdba74"
      >
        NOS TRILHOS
      </text>
    </svg>
  );
}
