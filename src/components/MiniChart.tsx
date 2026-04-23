interface MiniChartProps {
  data: number[];
  label: string;
}

export default function MiniChart({ data, label }: MiniChartProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const width = 280;
  const height = 60;
  const padX = 8;
  const padY = 8;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const points = data.map((val, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * usableW;
    const y = padY + usableH - (val / max) * usableH;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  const areaPoints = [
    `${padX},${padY + usableH}`,
    ...points,
    `${padX + usableW},${padY + usableH}`,
  ].join(' ');

  return (
    <div style={{ marginBottom: '12px' }}>
      {label && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
      )}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <polygon points={areaPoints} fill="var(--primary)" fillOpacity="0.12" />
        <polyline points={polyline} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((val, i) => {
          const x = padX + (i / Math.max(data.length - 1, 1)) * usableW;
          const y = padY + usableH - (val / max) * usableH;
          return <circle key={i} cx={x} cy={y} r="3" fill="var(--primary)" />;
        })}
      </svg>
    </div>
  );
}
