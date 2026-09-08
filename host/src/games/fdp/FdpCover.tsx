/** FDP — Foi De Propósito catalog cover — a censored speech bubble + a sly "18". */
export function FdpCover() {
  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FDP — Foi De Propósito"
      preserveAspectRatio="xMidYMid slice"
      className="game-cover-svg"
    >
      <defs>
        <linearGradient id="fdpBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a0a12" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#fdpBg)" />

      {/* speech bubble with a censor bar */}
      <rect x="26" y="30" width="188" height="86" rx="16" fill="#e11d48" opacity="0.92" />
      <path d="M60 114 L54 140 L92 114 Z" fill="#e11d48" opacity="0.92" />
      <rect x="46" y="60" width="148" height="26" rx="5" fill="#0b0f17" />
      <text x="120" y="79" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="20" letterSpacing="4" fill="#e11d48">
        #@!*
      </text>

      {/* 18+ stamp */}
      <circle cx="238" cy="70" r="30" fill="none" stroke="#fca5a5" strokeWidth="5" />
      <text x="238" y="80" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="26" fill="#fca5a5">
        18
      </text>

      <rect x="0" y="150" width="300" height="50" fill="#0b0f17" opacity="0.82" />
      <text
        x="150" y="182" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="34" letterSpacing="4"
        fill="#fb7185" stroke="#0b0f17" strokeWidth="4" paintOrder="stroke"
      >
        FDP
      </text>
      <text
        x="150" y="195" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="8.5" letterSpacing="3"
        fill="#fda4af"
      >
        FOI DE PROPÓSITO
      </text>
    </svg>
  );
}
