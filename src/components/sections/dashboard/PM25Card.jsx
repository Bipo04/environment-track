import { useMemo } from "react";
import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";

// Standard Vietnam/EPA AQI color scale for PM2.5
const getAqiInfo = (aqi) => {
  if (aqi <= 50) {
    return {
      label: "Tốt",
      color: "#22c55e",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      emoji: "🟢",
      description: "Không khí trong lành, rất an toàn cho mọi người.",
    };
  }
  if (aqi <= 100) {
    return {
      label: "Trung bình",
      color: "#eab308",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      emoji: "🟡",
      description: "Chất lượng chấp nhận được. Người cực nhạy cảm nên hạn chế vận động mạnh ngoài trời.",
    };
  }
  if (aqi <= 150) {
    return {
      label: "Kém",
      color: "#f97316",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      emoji: "🟠",
      description: "Nhóm người nhạy cảm (trẻ em, người già, người hen suyễn) có thể gặp triệu chứng khó thở.",
    };
  }
  if (aqi <= 200) {
    return {
      label: "Xấu",
      color: "#ef4444",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      emoji: "🔴",
      description: "Người bình thường bắt đầu có triệu chứng mệt mỏi. Người nhạy cảm nên ở trong nhà.",
    };
  }
  if (aqi <= 300) {
    return {
      label: "Rất xấu",
      color: "#a855f7",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      emoji: "🟣",
      description: "Cảnh báo khẩn cấp toàn bộ dân cư. Hạn chế tối đa các hoạt động ngoài trời.",
    };
  }
  return {
    label: "Nguy hại",
    color: "#7f1d1d",
    bg: "bg-red-950/20",
    border: "border-red-950/40",
    emoji: "🆘",
    description: "Nguy cơ ảnh hưởng nghiêm trọng đến tính mạng. Toàn bộ dân cư nên ở trong nhà.",
  };
};

// Sparkline builder
const MiniSparkline = ({ values, color, height = 40 }) => {
  if (!values || !values.length) {
    return <div className="h-10 w-24 rounded bg-muted/20" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 100;

  const points = values.map((val, index) => {
    const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
    const y = max === min ? height / 2 : height - ((val - min) / (max - min)) * (height - 8) - 4;
    return `${x},${y}`;
  });

  return (
    <svg className="h-10 w-24 overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const PM25Card = ({ pm25 = 0, aqi = 0, history = [] }) => {
  const aqiInfo = useMemo(() => getAqiInfo(aqi), [aqi]);

  // Stats calculation
  const maxPm25 = useMemo(() => (history.length ? Math.max(...history) : pm25), [history, pm25]);

  // Calculate trend
  const trend = useMemo(() => {
    if (history.length < 2) return 0;
    return history[history.length - 1] - history[Math.max(0, history.length - 5)];
  }, [history]);

  const TrendIcon = trend >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 flex flex-col gap-4 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <span className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Chất lượng không khí PM2.5</span>
            <p className="text-[9px] text-muted-foreground leading-none">Bụi siêu mịn đường kính ≤ 2.5µm</p>
          </div>
        </div>
      </div>

      {/* Main Info Row */}
      <div className="flex justify-between items-center gap-4 mt-1">
        <div className="flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-foreground tracking-tight">
              {pm25.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">µg/m³</span>
          </div>
        </div>
      </div>

      {/* Warning/Description */}
      <p className="text-xs text-muted-foreground leading-relaxed italic bg-white/5 p-2 rounded-lg border border-border/20">
        {aqiInfo.description}
      </p>

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="text-center px-3 py-2 rounded-xl bg-background/60 border border-border/40 flex flex-col justify-center items-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">AQI</p>
          <p className="text-sm font-bold" style={{ color: aqiInfo.color }}>{aqi} - {aqiInfo.label}</p>
        </div>
        <div className="text-center px-3 py-2 rounded-xl bg-background/60 border border-border/40 flex flex-col justify-center items-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Đỉnh 24h</p>
          <p className="text-sm font-bold text-foreground">{maxPm25.toFixed(1)} µg/m³</p>
        </div>
      </div>

      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/2 to-indigo-500/2 pointer-events-none rounded-2xl" />
    </div>
  );
};
