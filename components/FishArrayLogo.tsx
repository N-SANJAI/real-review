interface Props {
  className?: string;
}

export default function FishArrayLogo({ className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 420 120"
      role="img"
      aria-label="Colorful fish array logo with bigger fish chasing smaller fish"
      className={className}
    >
      <defs>
        <linearGradient id="fish-shark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="fish-mid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="fish-small" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="fish-tiny" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      <g transform="translate(0 10)">
        <FishBody x={20} y={24} width={165} height={72} fill="url(#fish-shark)" eyeColor="#e2e8f0" />
        <FishBody x={160} y={38} width={120} height={56} fill="url(#fish-mid)" eyeColor="#ecfeff" />
        <FishBody x={265} y={50} width={88} height={40} fill="url(#fish-small)" eyeColor="#fff7ed" />
        <FishBody x={340} y={58} width={62} height={30} fill="url(#fish-tiny)" eyeColor="#faf5ff" />
      </g>
    </svg>
  );
}

function FishBody({
  x,
  y,
  width,
  height,
  fill,
  eyeColor,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  eyeColor: string;
}) {
  const tailWidth = Math.max(12, width * 0.2);
  const eyeSize = Math.max(2.5, height * 0.05);
  return (
    <g>
      <ellipse cx={x + width * 0.5} cy={y + height * 0.5} rx={width * 0.45} ry={height * 0.43} fill={fill} />
      <polygon
        points={`${x + width * 0.04},${y + height * 0.5} ${x - tailWidth},${y + height * 0.1} ${x - tailWidth},${y + height * 0.9}`}
        fill={fill}
      />
      <path
        d={`M ${x + width * 0.36} ${y + height * 0.1} Q ${x + width * 0.48} ${y - height * 0.36}, ${x + width * 0.64} ${y + height * 0.15}`}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={Math.max(2, height * 0.08)}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={x + width * 0.74} cy={y + height * 0.42} r={eyeSize} fill={eyeColor} />
      <circle cx={x + width * 0.745} cy={y + height * 0.42} r={eyeSize * 0.45} fill="#0f172a" />
    </g>
  );
}
