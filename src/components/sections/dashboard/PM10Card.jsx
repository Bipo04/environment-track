import { useMemo } from "react";
import PropTypes from "prop-types";
import { Wind } from "lucide-react";
import { OverviewSurface, RingGauge, StatusBanner } from "./EnvironmentOverviewCards";

// Standard Vietnam/EPA AQI color scale for PM10
const getAqiInfo = (aqi) => {
  if (aqi <= 50) {
    return {
      label: "Tốt",
      color: "#22c55e",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      emoji: "🟢",
      description: "Không khí trong lành, rất an toàn cho sức khỏe.",
    };
  }
  if (aqi <= 100) {
    return {
      label: "Trung bình",
      color: "#eab308",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20",
      emoji: "🟡",
      description: "Chất lượng không khí chấp nhận được, hạn chế với người cực nhạy cảm.",
    };
  }
  if (aqi <= 150) {
    return {
      label: "Kém",
      color: "#f97316",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      emoji: "🟠",
      description: "Nhóm người nhạy cảm nên hạn chế thời gian ở ngoài trời.",
    };
  }
  if (aqi <= 200) {
    return {
      label: "Xấu",
      color: "#ef4444",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      emoji: "🔴",
      description: "Ảnh hưởng xấu đến sức khỏe mọi người. Hạn chế ra ngoài.",
    };
  }
  if (aqi <= 300) {
    return {
      label: "Rất xấu",
      color: "#a855f7",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      emoji: "🟣",
      description: "Cảnh báo khẩn cấp về sức khỏe. Mọi người nên ở trong nhà.",
    };
  }
  return {
    label: "Nguy hại",
    color: "#7f1d1d",
    bg: "bg-red-950/20",
    border: "border-red-950/40",
    emoji: "🆘",
    description: "Nguy hiểm nghiêm trọng đến sức khỏe. Tránh ra ngoài tuyệt đối.",
  };
};

export const PM10Card = ({ pm10 = 0, aqi = 0, isDarkMode = false, onHide }) => {
  const aqiInfo = useMemo(() => getAqiInfo(aqi), [aqi]);

  return (
    <OverviewSurface
      icon={Wind}
      title="Bụi mịn PM10"
      accent={aqiInfo.color}
      variant="panel"
      bodyClassName="flex flex-1 flex-col"
      onHide={onHide}
    >
      <div className="flex flex-col items-center justify-center pt-2">
        <RingGauge
          valueText={`${aqi}`}
          label="Chỉ số AQI"
          status={aqiInfo.label}
          accent={aqiInfo.color}
          percent={aqi / 300}
          minLabel="0"
          maxLabel="300"
          showStatus={false}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className="mt-4 border-t border-border/60 pt-4 text-center dark:border-slate-800/90">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Nồng độ bụi mịn</p>
        <p className="mt-1 text-base font-semibold text-foreground">
          {pm10.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">µg/m³</span>
        </p>
      </div>

      <StatusBanner
        accent={aqiInfo.color}
        label={`${aqiInfo.label}`}
        note={aqiInfo.description}
        withDivider
        className="mt-auto w-full text-left"
      />
    </OverviewSurface>
  );
};

PM10Card.propTypes = {
  pm10: PropTypes.number,
  aqi: PropTypes.number,
  isDarkMode: PropTypes.bool,
  onHide: PropTypes.func,
};
