// Temperature & Humidity Card
// No trend/variation chart – just big gauges + key stats

const getHumidityLabel = (h) => {
  if (h <= 30) return { label: 'Khô', color: '#f97316', bg: 'from-orange-500/20 to-orange-600/5' };
  if (h <= 60) return { label: 'Tốt', color: '#22c55e', bg: 'from-green-500/20 to-green-600/5' };
  if (h <= 80) return { label: 'Ẩm', color: '#3b82f6', bg: 'from-blue-500/20 to-blue-600/5' };
  return { label: 'Rất ẩm', color: '#ef4444', bg: 'from-red-500/20 to-red-600/5' };
};

const getTempLabel = (t) => {
  if (t <= 10) return { label: 'Rất lạnh', color: '#3b82f6' };
  if (t <= 18) return { label: 'Lạnh', color: '#60a5fa' };
  if (t <= 24) return { label: 'Mát mẻ', color: '#0d9488' };
  if (t <= 27) return { label: 'Ổn định', color: '#22c55e' };
  if (t <= 30) return { label: 'Hơi nóng', color: '#f5b84b' };
  if (t <= 35) return { label: 'Nóng', color: '#f97316' };
  if (t <= 40) return { label: 'Rất nóng', color: '#ef4444' };
  return { label: 'Cực nóng', color: '#a855f7' };
};

// Semicircle gauge SVG
const SemiGauge = ({ percent, color, label, value }) => {
  const r = 44;
  const cx = 60;
  const cy = 60;
  const circumference = Math.PI * r; // half circle
  const dash = percent * circumference;
  const gap = circumference - dash;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 75">
        {/* Track */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
          filter={`drop-shadow(0 0 6px ${color})`}
        />
        {/* Center value */}
        <text x="60" y="58" textAnchor="middle" fill={color} fontSize="16" fontWeight="bold">
          {value}
        </text>
      </svg>
      <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
    </div>
  );
};

export const TempHumidCard = ({ temperature, humidity }) => {
  const tempInfo = getTempLabel(temperature);
  const humidInfo = getHumidityLabel(humidity);
  const tempPercent = Math.min(Math.max((temperature + 10) / 70, 0), 1);
  const humidPercent = humidity / 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 flex flex-col gap-3 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <span className="text-lg">🌡️</span>
          </div>
          <span className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Nhiệt Độ & Độ Ẩm</span>
        </div>
      </div>

      {/* Gauges Row */}
      <div className="flex justify-around items-end">
        <div className="flex flex-col items-center">
          <SemiGauge
            percent={tempPercent}
            color={tempInfo.color}
            label={tempInfo.label}
            value={`${temperature.toFixed(1)}°C`}
          />
          <span className="text-[10px] text-muted-foreground mt-1">Nhiệt độ</span>
        </div>
        <div className="w-px h-16 bg-border/40 self-center" />
        <div className="flex flex-col items-center">
          <SemiGauge
            percent={humidPercent}
            color={humidInfo.color}
            label={humidInfo.label}
            value={`${humidity.toFixed(0)}%`}
          />
          <span className="text-[10px] text-muted-foreground mt-1">Độ ẩm</span>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="rounded-xl bg-background/60 border border-border/40 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">Nhiệt độ</p>
          <p className="text-sm font-bold" style={{ color: tempInfo.color }}>{temperature.toFixed(1)}°C</p>
          <p className="text-[10px]" style={{ color: tempInfo.color }}>{tempInfo.label}</p>
        </div>
        <div className="rounded-xl bg-background/60 border border-border/40 px-3 py-2 text-center">
          <p className="text-[10px] text-muted-foreground">Độ ẩm</p>
          <p className="text-sm font-bold" style={{ color: humidInfo.color }}>{humidity.toFixed(0)}%</p>
          <p className="text-[10px]" style={{ color: humidInfo.color }}>{humidInfo.label}</p>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/3 to-blue-500/3 pointer-events-none rounded-2xl" />
    </div>
  );
};
