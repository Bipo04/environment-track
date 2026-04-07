// Light Intensity Card (simplified spectrum)

const getLuxLabel = (lux) => {
  if (lux < 50) return { label: 'Tối', emoji: '🌑', color: '#6366f1' };
  if (lux < 200) return { label: 'Ánh sáng yếu', emoji: '🌒', color: '#8b5cf6' };
  if (lux < 1000) return { label: 'Bình thường', emoji: '🌤️', color: '#f59e0b' };
  if (lux < 10000) return { label: 'Sáng', emoji: '☀️', color: '#f97316' };
  return { label: 'Rất sáng', emoji: '🌟', color: '#ef4444' };
};

// Simple horizontal bar spectrum
const LightBar = ({ broadband, infrared }) => {
  const totalMax = 65535;
  const bbPct = Math.min((broadband / totalMax) * 100, 100);
  const irPct = Math.min((infrared / totalMax) * 100, 100);

  return (
    <div className="space-y-2.5">
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-muted-foreground font-medium">Broadband (BB)</span>
          <span className="text-[10px] font-bold text-amber-400">{broadband.toLocaleString()}</span>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-all duration-700"
            style={{ width: `${bbPct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-muted-foreground font-medium">Infrared (IR)</span>
          <span className="text-[10px] font-bold text-red-400">{infrared.toLocaleString()}</span>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)] transition-all duration-700"
            style={{ width: `${irPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const LightCard = ({ lux, broadband, infrared }) => {
  const info = getLuxLabel(lux);
  const luxPct = Math.min(lux / 40000, 1);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 flex flex-col gap-3 hover:border-amber-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-400/10 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/10">
            <span className="text-lg">☀️</span>
          </div>
          <span className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Ánh Sáng</span>
        </div>
      </div>

      {/* Main value */}
      <div className="text-center py-1">
        <div className="text-4xl mb-0.5">{info.emoji}</div>
        <p className="text-3xl font-extrabold" style={{ color: info.color }}>
          {lux.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground font-medium">Lux</p>
        <span
          className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}
        >
          {info.label}
        </span>
      </div>

      {/* Lux bar */}
      <div>
        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${luxPct * 100}%`,
              background: `linear-gradient(to right, #6366f1, #f59e0b, #ef4444)`,
              boxShadow: `0 0 10px ${info.color}60`
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground/60 mt-0.5">
          <span>0</span><span>10k</span><span>20k</span><span>40k Lux</span>
        </div>
      </div>

      {/* Spectrum bars */}
      <LightBar broadband={broadband} infrared={infrared} />

      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/3 to-orange-500/3 pointer-events-none rounded-2xl" />
    </div>
  );
};
