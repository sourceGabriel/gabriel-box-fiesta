/** É Você! catalog cover — a pointing hand + a ring of little face circles. */
export function EvoceCover() {
  return (
    <svg
      viewBox="0 0 300 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="É Você!"
      preserveAspectRatio="xMidYMid slice"
      className="game-cover-svg"
    >
      <defs>
        <linearGradient id="evoceBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b1466" />
          <stop offset="1" stopColor="#0b0f17" />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill="url(#evoceBg)" />

      {/* ring of faces */}
      <g>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const cx = 150 + Math.cos(a) * 60;
          const cy = 92 + Math.sin(a) * 44;
          const colors = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#a855f7'];
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="17" fill={colors[i]} />
              <circle cx={cx - 5} cy={cy - 3} r="2.4" fill="#0b0f17" />
              <circle cx={cx + 5} cy={cy - 3} r="2.4" fill="#0b0f17" />
              <path d={`M${cx - 6} ${cy + 5} q6 6 12 0`} stroke="#0b0f17" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </g>
          );
        })}
      </g>

      {/* pointing hand in the middle */}
      <text x="150" y="108" textAnchor="middle" fontSize="42">👉</text>

      <rect x="0" y="150" width="300" height="50" fill="#0b0f17" opacity="0.82" />
      <text
        x="150" y="182" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="32" letterSpacing="2"
        fill="#c4b5fd" stroke="#0b0f17" strokeWidth="4" paintOrder="stroke"
      >
        É VOCÊ!
      </text>
      <text
        x="150" y="195" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="8.5" letterSpacing="3"
        fill="#a78bfa"
      >
        QUEM CONHECE MELHOR A GALERA
      </text>
    </svg>
  );
}
