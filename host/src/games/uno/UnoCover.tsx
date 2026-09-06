/** UNO catalog cover — a tilted card back with the four-colour oval. Inline SVG, no assets. */
export function UnoCover() {
  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="UNO"
      preserveAspectRatio="xMidYMid slice"
      className="game-cover-svg"
    >
      <defs>
        <clipPath id="unoOval">
          <ellipse cx="150" cy="100" rx="88" ry="47" transform="rotate(-20 150 100)" />
        </clipPath>
        <linearGradient id="unoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a1030" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
      </defs>

      <rect width="300" height="200" fill="url(#unoBg)" />

      {/* card peeking behind */}
      <rect
        x="70" y="30" width="108" height="164" rx="13"
        fill="#141a24" stroke="#e5e7eb" strokeWidth="5"
        transform="rotate(-14 124 112)"
      />

      {/* front card */}
      <g transform="rotate(8 156 104)">
        <rect x="100" y="14" width="120" height="176" rx="15" fill="#0b0f17" stroke="#fafafa" strokeWidth="7" />
        <ellipse cx="150" cy="100" rx="90" ry="49" transform="rotate(-20 150 100)" fill="#fafafa" />
        <g clipPath="url(#unoOval)">
          <rect x="36" y="4" width="114" height="96" fill="#ef4444" />
          <rect x="150" y="4" width="114" height="96" fill="#f4b400" />
          <rect x="36" y="100" width="114" height="96" fill="#22c55e" />
          <rect x="150" y="100" width="114" height="96" fill="#3b82f6" />
        </g>
        <text
          x="150" y="116" textAnchor="middle"
          transform="rotate(-20 150 100)"
          fontFamily="system-ui, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900" fontSize="50" letterSpacing="1"
          fill="#ef4444" stroke="#fafafa" strokeWidth="4" paintOrder="stroke"
        >
          UNO
        </text>
      </g>
    </svg>
  );
}
