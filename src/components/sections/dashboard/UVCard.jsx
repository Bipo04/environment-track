// UV Sensor Card - kept close to original reference image

const getUVIInfo = (uvi) => {
  if (uvi <= 2) return { label: 'Thấp', risk: 'An toàn', color: '#22c55e', icon: '😊' };
  if (uvi <= 5) return { label: 'Trung bình', risk: 'Cần che chắn', color: '#eab308', icon: '😐' };
  if (uvi <= 7) return { label: 'Cao', risk: 'Cần che chắn', color: '#f97316', icon: '😬' };
  if (uvi <= 10) return { label: 'Rất cao', risk: 'Hạn chế ra ngoài', color: '#ef4444', icon: '😰' };
  return { label: 'Cực cao', risk: 'Tránh ra ngoài', color: '#8b5cf6', icon: '🆘' };
};

// UV color scale bar with indicator
const UVScaleBar = ({ uvi }) => {
  const clampedUvi = Math.min(uvi, 11);
  const pct = (clampedUvi / 11) * 100;
  const segments = [
    { start: 0, end: 18.2, color: '#22c55e' },
    { start: 18.2, end: 45.5, color: '#84cc16' },
    { start: 45.5, end: 63.6, color: '#eab308' },
    { start: 63.6, end: 90.9, color: '#f97316' },
    { start: 90.9, end: 100, color: '#ef4444' },
  ];

  return (
    <div className="relative">
      {/* Scale bar */}
      <div className="h-4 rounded-full overflow-hidden flex">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="h-full"
            style={{
              width: `${seg.end - seg.start}%`,
              background: seg.color,
            }}
          />
        ))}
      </div>

      {/* Indicator */}
      <div
        className="absolute top-1/2 w-0.5 h-6 -translate-y-1/2 rounded-full bg-white shadow-lg"
        style={{
          left: `${pct}%`,
          boxShadow: '0 0 8px rgba(255,255,255,0.8)',
          transition: 'left 1s ease',
        }}
      />

      {/* Scale labels */}
      <div className="flex justify-between text-[9px] text-muted-foreground mt-2">
        <span>0</span>
        <span>3</span>
        <span>6</span>
        <span>8</span>
        <span>11+</span>
      </div>
    </div>
  );
};

// UVA / UVB stat row
const UVStat = ({ label, value, color, riskText }) => (
  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-background/60 border border-border/40">
    <div>
      <span className="text-xs font-bold" style={{ color }}>{label}</span>
      <p className="text-[10px] text-muted-foreground">{riskText}</p>
    </div>
    <span className="text-sm font-extrabold" style={{ color }}>
      {value.toFixed(2)} <span className="text-[9px] font-normal">mW/cm²</span>
    </span>
  </div>
);

export const UVCard = ({ uvi, uva, uvb }) => {
  const info = getUVIInfo(uvi);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 flex flex-col gap-3 hover:border-purple-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-400/10 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <span className="text-lg">🔆</span>
          </div>
          <span className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Tia UV Chuyên Sâu</span>
        </div>
      </div>

      {/* Main UV Index */}
      <div className="text-center">
        <div className="text-3xl font-extrabold" style={{ color: info.color }}>
          {uvi.toFixed(1)} <span className="text-lg font-bold">UV</span>
        </div>
        <div
          className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}
        >
          <span>{info.icon}</span>
          Mức: {info.label} – {info.risk}
        </div>
      </div>

      {/* Color scale */}
      <UVScaleBar uvi={uvi} />

      {/* UVA / UVB */}
      <div className="space-y-2">
        <UVStat label="UVA" value={uva} color="#f97316" riskText="Nguy cơ lão hóa da" />
        <UVStat label="UVB" value={uvb} color="#ef4444" riskText="Nguy cơ cháy nắng" />
      </div>

      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/3 to-pink-500/3 pointer-events-none rounded-2xl" />
    </div>
  );
};
