interface GrainOverlayProps {
  opacity: number;
}

interface WavyConnectorProps {
  parentLeft: number;
  parentWidth: number;
  childLeft: number;
  childWidth: number;
  parentBottom: number;
  childTop: number;
  strokeColor: string;
}

interface FlagPennantProps {
  x: number;
  color: string;
}

export const GrainFilter = () => (
  <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
    <defs>
      <filter id="earth-grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="multiply" />
      </filter>
      <filter id="earth-paper-tex">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="1.2"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
        <feBlend in="SourceGraphic" mode="soft-light" />
      </filter>
    </defs>
  </svg>
);

export const GrainOverlay = ({ opacity }: GrainOverlayProps) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      filter: "url(#earth-grain)",
      opacity,
      pointerEvents: "none",
      zIndex: 50,
    }}
  />
);

export const WavyConnector = ({
  parentLeft,
  parentWidth,
  childLeft,
  childWidth,
  parentBottom,
  childTop,
  strokeColor,
}: WavyConnectorProps) => {
  void parentWidth;
  void childWidth;
  const x1 = parentLeft + 15;
  const y1 = parentBottom;
  const x2 = childLeft + 8;
  const y2 = childTop;
  const midY = (y1 + y2) / 2;
  const waveAmp = 4;
  return (
    <path
      d={`M${x1},${y1} C${x1 + waveAmp},${midY - 3} ${x2 - waveAmp},${midY + 3} ${x2},${y2}`}
      fill="none"
      stroke={strokeColor}
      strokeWidth={1.5}
      strokeDasharray="4 3"
      opacity={0.3}
    />
  );
};

export const FlagPennant = ({ x, color }: FlagPennantProps) => (
  <svg
    width="14"
    height="16"
    viewBox="0 0 14 16"
    style={{
      position: "absolute",
      left: x - 7,
      top: 2,
      pointerEvents: "none",
    }}
  >
    <polygon points="2,0 14,5 2,10" fill={color} opacity={0.85} />
    <line x1="2" y1="0" x2="2" y2="16" stroke={color} strokeWidth="1.5" />
  </svg>
);
