import { CHARACTER_META } from './coupCards';

/** Coup catalog cover — three fanned character portraits over a dark deco ground. */
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
        <clipPath id="coupCardClip">
          <rect x="0" y="0" width="96" height="140" rx="12" />
        </clipPath>
      </defs>
      <rect width="300" height="200" fill="url(#coupBg)" />

      <g transform="translate(102 30) rotate(-16 48 70)">
        <g clipPath="url(#coupCardClip)">
          <image href={CHARACTER_META.Contessa.art} x="-30" y="0" height="140" preserveAspectRatio="xMidYMid slice" />
        </g>
        <rect x="0" y="0" width="96" height="140" rx="12" fill="none" stroke="#e74c3c" strokeWidth="4" />
      </g>
      <g transform="translate(150 20) rotate(16 48 70)">
        <g clipPath="url(#coupCardClip)">
          <image href={CHARACTER_META.Captain.art} x="-30" y="0" height="140" preserveAspectRatio="xMidYMid slice" />
        </g>
        <rect x="0" y="0" width="96" height="140" rx="12" fill="none" stroke="#2980b9" strokeWidth="4" />
      </g>
      <g transform="translate(126 14)">
        <g clipPath="url(#coupCardClip)">
          <image href={CHARACTER_META.Duke.art} x="-30" y="0" height="140" preserveAspectRatio="xMidYMid slice" />
        </g>
        <rect x="0" y="0" width="96" height="140" rx="12" fill="none" stroke="#e2b13c" strokeWidth="4" />
      </g>

      <rect x="0" y="150" width="300" height="50" fill="#0b0f17" opacity="0.82" />
      <text
        x="150" y="176" textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700" fontSize="34" letterSpacing="3"
        fill="#f4e9d4" stroke="#0b0f17" strokeWidth="4" paintOrder="stroke"
      >
        COUP
      </text>
      <text
        x="150" y="192" textAnchor="middle"
        fontFamily="system-ui, sans-serif" fontWeight="600" fontSize="9" letterSpacing="4"
        fill="#b98b4a"
      >
        BLEFE · DESAFIO
      </text>
    </svg>
  );
}
