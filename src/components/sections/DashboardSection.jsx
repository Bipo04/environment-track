import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Droplets,
  Sparkles,
  SunMedium,
  Thermometer,
  TriangleAlert,
  Volume2,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { cn } from "@/lib/utils";
import { useFakeSensorData } from "@/hooks/useFakeSensorData";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { TempHumidCard } from "./dashboard/TempHumidCard";
import { LightCard } from "./dashboard/LightCard";
import { UVCard } from "./dashboard/UVCard";
import { SoundCard } from "./dashboard/SoundCard";
import { DeviceSidebar } from "./dashboard/DeviceSidebar";
import TemperatureChart from "./TemperatureChart";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const HISTORY_WINDOW = 7 * DAY;
const SEED_STEP = 5 * 60 * 1000;

const TAB_CONFIG = {
  tempHumidity: {
    label: "Nhiệt & Ẩm",
    title: "Cân bằng nhiệt độ và độ ẩm",
    subtitle:
      "Theo dõi đồng thời nhiệt độ và độ ẩm để thấy rõ biến động môi trường.",
    datasets: [
      {
        key: "temperature",
        label: "Nhiệt độ",
        color: "#ff9b43",
        unit: "°C",
        yAxisID: "y",
      },
      {
        key: "humidity",
        label: "Độ ẩm",
        color: "#4f8cff",
        unit: "%",
        yAxisID: "y1",
      },
    ],
    axisLabel: "Nhiệt độ",
    secondaryAxisLabel: "Độ ẩm",
  },
  light: {
    label: "Ánh sáng",
    title: "Phổ ánh sáng",
    subtitle: "So sánh lux môi trường với biến động BB và FR.",
    datasets: [
      {
        key: "lux",
        label: "Lux",
        color: "#73d37f",
        unit: " lux",
        yAxisID: "y",
      },
      {
        key: "bb",
        label: "Ánh sáng xanh (BB)",
        color: "#3fb0ff",
        unit: " bb",
        yAxisID: "y1",
      },
      {
        key: "fr",
        label: "Hồng ngoại xa (FR)",
        color: "#f5b84b",
        unit: " fr",
        yAxisID: "y1",
      },
    ],
    axisLabel: "Lux",
    secondaryAxisLabel: "BB / FR",
  },
  uv: {
    label: "UV",
    title: "Diễn biến phơi nhiễm UV",
    subtitle: "Theo dõi đỉnh UVA, UVB và UV Index trước khi vượt ngưỡng rủi ro.",
    datasets: [
      {
        key: "uvi",
        label: "UVI",
        color: "#a855f7",
        unit: " UVI",
        yAxisID: "y",
      },
      {
        key: "uva",
        label: "UVA",
        color: "#d946ef",
        unit: " uva",
        yAxisID: "y",
      },
      {
        key: "uvb",
        label: "UVB",
        color: "#7c3aed",
        unit: " uvb",
        yAxisID: "y1",
      },
    ],
    axisLabel: "UVI / UVA",
    secondaryAxisLabel: "UVB",
  },
  sound: {
    label: "Âm thanh",
    title: "Hoạt động âm thanh",
    subtitle: "Phát hiện các đợt tăng âm bất thường trước khi kéo dài.",
    datasets: [
      {
        key: "sound",
        label: "Mức âm thanh",
        color: "#26c6da",
        unit: " dBA",
        yAxisID: "y",
      },
    ],
    axisLabel: "dBA",
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const withAlpha = (hex, alpha) => {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((item) => `${item}${item}`)
          .join("")
      : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const wave = (index, speed, offset = 0) =>
  Math.sin(index * speed + offset) * 0.6 +
  Math.cos(index * speed * 0.42 + offset) * 0.4;

const normalizeSnapshot = (snapshot) => ({
  temperature: Number(snapshot?.temperature) || 0,
  humidity: Number(snapshot?.humidity) || 0,
  lux: Number(snapshot?.lux) || 0,
  bb: Number(snapshot?.bb ?? snapshot?.broadband) || 0,
  fr: Number(snapshot?.fr ?? snapshot?.infrared) || 0,
  uvi: Number(snapshot?.uvi ?? snapshot?.UVI) || 0,
  uva: Number(snapshot?.uva ?? snapshot?.UVA) || 0,
  uvb: Number(snapshot?.uvb ?? snapshot?.UVB) || 0,
  sound: Number(snapshot?.sound) || 0,
  timestamp: snapshot?.timestamp || "",
});

const hasLiveSensorData = (snapshot) =>
  Boolean(
    snapshot &&
      (Number(snapshot.temperature) > 0 ||
        Number(snapshot.humidity) > 0 ||
        Number(snapshot.lux) > 0 ||
        Number(snapshot.UVI ?? snapshot.uvi) > 0 ||
        Number(snapshot.sound) > 0)
  );

const buildSeedHistory = (baseSnapshot) => {
  const points = [];
  const now = Date.now();
  const totalPoints = Math.floor(HISTORY_WINDOW / SEED_STEP);
  const base = normalizeSnapshot(baseSnapshot);

  for (let index = 0; index <= totalPoints; index += 1) {
    const time = now - (totalPoints - index) * SEED_STEP;
    const date = new Date(time);
    const hour = date.getHours() + date.getMinutes() / 60;
    const dayFraction = hour / 24;
    const thermalWave = Math.sin((dayFraction - 0.18) * Math.PI * 2);
    const solarWave = Math.max(0, Math.sin(Math.PI * dayFraction));
    const rushHour =
      Math.exp(-Math.pow(hour - 9, 2) / 6) +
      Math.exp(-Math.pow(hour - 18, 2) / 7);

    const temperature = clamp(
      base.temperature + thermalWave * 3.8 + wave(index, 0.11, 0.4) * 1.6,
      18,
      40
    );
    const humidity = clamp(
      base.humidity - thermalWave * 11 + wave(index, 0.09, 1.7) * 7,
      35,
      92
    );
    const lux = clamp(
      base.lux * 0.35 +
        solarWave * 3100 +
        wave(index, 0.17, 0.2) * 240 +
        wave(index, 0.05, 2.4) * 160,
      10,
      5000
    );
    const bb = clamp(
      base.bb * 0.4 + lux * 8.8 + solarWave * 9000 + wave(index, 0.23, 0.5) * 1500,
      1500,
      55000
    );
    const fr = clamp(
      base.fr * 0.5 + lux * 4.5 + solarWave * 2600 + wave(index, 0.19, 1.1) * 700,
      400,
      20000
    );
    const uvi = clamp(solarWave * 8.6 + wave(index, 0.15, 2.1) * 0.7, 0, 11);
    const uva = clamp(0.25 + uvi * 0.28 + wave(index, 0.21, 1.4) * 0.08, 0, 5);
    const uvb = clamp(0.01 + uvi * 0.03 + wave(index, 0.26, 2.8) * 0.008, 0, 1);
    const sound = clamp(
      base.sound * 0.72 +
        40 +
        solarWave * 8 +
        rushHour * 15 +
        wave(index, 0.29, 0.7) * 4,
      35,
      96
    );

    points.push({
      time,
      temperature,
      humidity,
      lux,
      bb,
      fr,
      uvi,
      uva,
      uvb,
      sound,
    });
  }

  return points;
};

const sampleHistory = (entries, limit) => {
  if (entries.length <= limit) {
    return entries;
  }

  const sampled = [];
  const step = (entries.length - 1) / (limit - 1);

  for (let index = 0; index < limit; index += 1) {
    const item = entries[Math.round(index * step)];
    if (!sampled.length || sampled[sampled.length - 1].time !== item.time) {
      sampled.push(item);
    }
  }

  const last = entries[entries.length - 1];
  if (sampled[sampled.length - 1]?.time !== last.time) {
    sampled[sampled.length - 1] = last;
  }

  return sampled;
};

const filterHistoryByRange = (history, rangeKey) => {
  const threshold =
    Date.now() -
    (rangeKey === "1h" ? HOUR : rangeKey === "24h" ? DAY : HISTORY_WINDOW);

  const filtered = history.filter((entry) => entry.time >= threshold);

  return filtered.length ? filtered : history.slice(-48);
};

const average = (values) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const formatCompact = (value) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);

const formatNumber = (value, digits = 0) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const formatMetricValue = (key, value, compact = false) => {
  const numericValue = Number(value) || 0;

  switch (key) {
    case "temperature":
      return `${formatNumber(numericValue, 1)}°C`;
    case "humidity":
      return `${formatNumber(numericValue, 0)}%`;
    case "lux":
      return `${compact ? formatCompact(numericValue) : formatNumber(numericValue, 0)} lux`;
    case "bb":
      return `${compact ? formatCompact(numericValue) : formatNumber(numericValue, 0)} bb`;
    case "fr":
      return `${compact ? formatCompact(numericValue) : formatNumber(numericValue, 0)} fr`;
    case "uvi":
      return `${formatNumber(numericValue, 1)} UVI`;
    case "uva":
      return `${formatNumber(numericValue, 2)} uva`;
    case "uvb":
      return `${formatNumber(numericValue, 2)} uvb`;
    case "sound":
      return `${formatNumber(numericValue, 0)} dBA`;
    default:
      return `${formatNumber(numericValue, 1)}`;
  }
};

const formatDelta = (key, value) => {
  const absValue = Math.abs(value);
  const prefix = value >= 0 ? "+" : "-";

  switch (key) {
    case "temperature":
      return `${prefix}${formatNumber(absValue, 1)}°`;
    case "humidity":
      return `${prefix}${formatNumber(absValue, 0)}%`;
    case "lux":
      return `${prefix}${absValue >= 1000 ? formatCompact(absValue) : formatNumber(absValue, 0)} lux`;
    case "bb":
      return `${prefix}${absValue >= 1000 ? formatCompact(absValue) : formatNumber(absValue, 0)} bb`;
    case "fr":
      return `${prefix}${absValue >= 1000 ? formatCompact(absValue) : formatNumber(absValue, 0)} fr`;
    case "uvi":
      return `${prefix}${formatNumber(absValue, 1)} UVI`;
    case "uva":
      return `${prefix}${formatNumber(absValue, 2)} uva`;
    case "uvb":
      return `${prefix}${formatNumber(absValue, 2)} uvb`;
    case "sound":
      return `${prefix}${formatNumber(absValue, 0)} dBA`;
    default:
      return `${prefix}${formatNumber(absValue, 1)}`;
  }
};

const formatTimestamp = (time) =>
  new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);

const formatTooltipTimestamp = (time) =>
  new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(time);

const formatAxisTimestamp = (time, rangeKey) => {
  if (rangeKey === "7d") {
    return new Intl.DateTimeFormat("vi-VN", {
      month: "short",
      day: "numeric",
    }).format(time);
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);
};

const formatRelativeRefresh = (time) => {
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));

  if (seconds < 5) {
    return "just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  return `${Math.round(seconds / 60)}m ago`;
};

const getMetricSeries = (entries, key) => entries.map((entry) => Number(entry[key]) || 0);

const getTrend = (entries, key, fallbackValue = 0) => {
  if (entries.length < 2) {
    return 0;
  }

  const baselineIndex = Math.max(0, entries.length - Math.min(6, entries.length));
  const baseline = entries[baselineIndex][key] ?? fallbackValue;
  const current = entries[entries.length - 1][key] ?? fallbackValue;

  return current - baseline;
};

const getStatusStyles = (type, value, humidity = 0) => {
  if (type === "temperature") {
    if (value >= 33 || humidity >= 78) {
      return { label: "Nóng", note: "Nhiệt tích tụ đang tăng nhanh.", accent: "#ff6b63" };
    }
    if (value <= 21) {
      return { label: "Mát", note: "Nhiệt độ đang ở vùng thấp.", accent: "#4f8cff" };
    }
    return {
      label: "Ấm",
      note: "Nhiệt độ đang ở vùng dễ chịu.",
      accent: "#39d98a",
    };
  }

  if (type === "light") {
    if (value < 150) {
      return {
        label: "Thiếu sáng",
        note: "Cường độ ánh sáng đang thấp.",
        accent: "#4f8cff",
      };
    }
    if (value < 1500) {
      return {
        label: "Ổn định",
        note: "Ánh sáng đang ở mức cân bằng.",
        accent: "#73d37f",
      };
    }
    return {
      label: "Sáng mạnh",
      note: "Cường độ ánh sáng đang cao.",
      accent: "#f5b84b",
    };
  }

  if (type === "uv") {
    if (value < 3) {
      return {
        label: "UV thấp",
        note: "Mức phơi nhiễm vẫn an toàn.",
        accent: "#c084fc",
      };
    }
    if (value < 6) {
      return {
        label: "UV trung bình",
        note: "Nên theo dõi nếu tiếp xúc kéo dài.",
        accent: "#a855f7",
      };
    }
    if (value < 8) {
      return {
        label: "UV cao",
        note: "Nên có biện pháp bảo vệ bổ sung.",
        accent: "#9333ea",
      };
    }
    return {
      label: "UV rất cao",
      note: "Mức phơi nhiễm đang sát ngưỡng rủi ro.",
      accent: "#7c3aed",
    };
  }

  if (value < 50) {
    return { label: "Yên tĩnh", note: "Mức âm thanh đang thấp.", accent: "#4f8cff" };
  }
  if (value < 70) {
    return {
      label: "An toàn",
      note: "Trong giới hạn an toàn.",
      accent: "#39d98a",
    };
  }
  if (value < 85) {
    return {
      label: "Tăng nhẹ",
      note: "Âm thanh đang tăng nhưng chưa bất thường.",
      accent: "#f5b84b",
    };
  }

  return {
    label: "Cảnh báo",
    note: "Âm thanh đã vượt ngưỡng bất thường.",
    accent: "#ff6b63",
  };
};

const getStatWindow = (entries, key) => {
  const series = getMetricSeries(entries, key);
  return {
    min: Math.min(...series),
    max: Math.max(...series),
    avg: average(series),
    current: series[series.length - 1] ?? 0,
  };
};

const describeVolatility = (value, low, high) => {
  if (value <= low) {
    return "Thấp";
  }
  if (value <= high) {
    return "Vừa";
  }
  return "Cao";
};

const findDailyPeak = (history, key) => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const todayEntries = history.filter((entry) => entry.time >= dayStart.getTime());
  const source = todayEntries.length ? todayEntries : history.slice(-144);

  return source.reduce(
    (peak, entry) => (entry[key] > peak[key] ? entry : peak),
    source[0] || history[history.length - 1]
  );
};

const calculateCorrelation = (entries, keyA, keyB) => {
  const samples = entries.slice(-36);

  if (samples.length < 3) {
    return 0;
  }

  const seriesA = getMetricSeries(samples, keyA);
  const seriesB = getMetricSeries(samples, keyB);
  const avgA = average(seriesA);
  const avgB = average(seriesB);

  const numerator = seriesA.reduce(
    (sum, value, index) => sum + (value - avgA) * (seriesB[index] - avgB),
    0
  );

  const denominatorA = Math.sqrt(
    seriesA.reduce((sum, value) => sum + Math.pow(value - avgA, 2), 0)
  );
  const denominatorB = Math.sqrt(
    seriesB.reduce((sum, value) => sum + Math.pow(value - avgB, 2), 0)
  );

  if (!denominatorA || !denominatorB) {
    return 0;
  }

  return numerator / (denominatorA * denominatorB);
};

const getHumidityStatus = (value) => {
  if (value < 35) {
    return {
      label: "Khô",
      note: "Độ ẩm thấp hơn mức dễ chịu.",
      accent: "#f59e0b",
    };
  }
  if (value < 65) {
    return {
      label: "Bình thường",
      note: "Độ ẩm nằm trong vùng ổn định.",
      accent: "#22c55e",
    };
  }
  if (value < 80) {
    return {
      label: "Ẩm",
      note: "Không khí đang ẩm hơn bình thường.",
      accent: "#4f8cff",
    };
  }
  return {
    label: "Rất ẩm",
    note: "Độ ẩm cao, cần theo dõi nấm mốc.",
    accent: "#a855f7",
  };
};

const getProgressRatio = (key, value) => {
  switch (key) {
    case "temperature":
      return clamp((value - 10) / 30, 0, 1);
    case "humidity":
      return clamp(value / 100, 0, 1);
    case "lux":
      return clamp(value / 5000, 0, 1);
    case "bb":
      return clamp(value / 55000, 0, 1);
    case "fr":
      return clamp(value / 20000, 0, 1);
    case "uva":
      return clamp(value / 5, 0, 1);
    case "uvb":
      return clamp(value / 1, 0, 1);
    case "uvi":
      return clamp(value / 11, 0, 1);
    case "sound":
      return clamp(value / 100, 0, 1);
    default:
      return clamp(value, 0, 1);
  }
};

const OverviewSurface = ({
  icon: Icon,
  title,
  accent,
  children,
  variant = "default",
  bodyClassName = "",
}) => {
  const isPanel = variant === "panel";

  return (
    <article
      className={cn(
        "flex h-full min-h-0 flex-col text-foreground shadow-sm sm:min-h-[390px]",
        isPanel
          ? "relative overflow-hidden rounded-lg border border-border/70 bg-card/90 px-4 py-4 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.3)] sm:px-5 sm:py-5 lg:px-6 lg:py-6 dark:border-slate-800/90 dark:bg-slate-900/80 dark:shadow-[0_30px_70px_-48px_rgba(15,23,42,0.92)]"
          : "rounded-lg border border-border/70 bg-card/90 p-4 sm:p-5 dark:border-slate-800/90 dark:bg-slate-900/80",
      )}
    >
      {isPanel ? (
        <div className="relative flex items-center gap-2.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground dark:text-slate-400">
            <Icon className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
            <span>{title}</span>
          </div>
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
          <span>{title}</span>
        </div>
      )}

      <div className={cn("mt-4 flex flex-1 flex-col sm:mt-5", isPanel && "relative", bodyClassName)}>
        {children}
      </div>
    </article>
  );
};

const RingGauge = ({
  valueText,
  label,
  status,
  accent,
  percent,
  minLabel,
  maxLabel,
  showStatus = true,
  isDarkMode = false,
}) => {
  const clamped = clamp(percent, 0, 1);
  const arcLength = 100;
  const dashValue = clamped * arcLength;
  const trackColor = isDarkMode ? "rgba(30, 41, 59, 0.78)" : "rgba(100, 116, 139, 0.55)";

  return (
    <div className="flex flex-col items-center text-center">
      <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="relative h-[86px] w-[120px]">
        <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden="true">
          <path
            d="M18 62 A42 42 0 0 1 102 62"
            fill="none"
            stroke={trackColor}
            strokeWidth="10"
            strokeLinecap="butt"
            pathLength="100"
            strokeDasharray={`${arcLength} 100`}
          />
          <path
            d="M18 62 A42 42 0 0 1 102 62"
            fill="none"
            stroke={accent}
            strokeWidth="10"
            strokeLinecap="butt"
            pathLength="100"
            strokeDasharray={`${dashValue} 100`}
            style={{ filter: `drop-shadow(0 0 6px ${withAlpha(accent, 0.3)})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pt-8">
          <p className="text-[1.2rem] font-semibold leading-none tracking-[-0.03em]" style={{ color: accent }}>
            {valueText}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex w-full items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      {showStatus ? (
        <p className="mt-1 text-xs font-medium" style={{ color: accent }}>
          {status}
        </p>
      ) : null}
    </div>
  );
};

const MetricBarRow = ({
  label,
  value,
  accent,
  ratio,
  suffix,
  variant = "default",
}) => {
  const isPanel = variant === "panel";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span
          className={cn(
            "uppercase",
            isPanel
              ? "text-[11px] tracking-[0.2em] text-muted-foreground dark:text-slate-400"
              : "text-xs tracking-[0.18em] text-muted-foreground"
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "font-semibold tracking-[-0.03em]",
            isPanel ? "text-[1.12rem]" : "text-[1.1rem]"
          )}
          style={{ color: accent }}
        >
          {value}
          {suffix}
        </span>
      </div>
      <div
        className={cn(
          "rounded-none",
          isPanel ? "h-1.5 bg-slate-200/90 dark:bg-slate-800" : "h-2 bg-muted/70"
        )}
      >
        <div
          className="h-full rounded-none transition-all duration-500"
          style={{
            width: `${ratio * 100}%`,
            background: `linear-gradient(90deg, ${withAlpha(accent, 0.92)}, ${accent})`,
            boxShadow: isPanel ? "none" : `0 0 12px ${withAlpha(accent, 0.35)}`,
          }}
        />
      </div>
    </div>
  );
};

const SoundBars = ({ value, accent, isDarkMode, count = 10 }) => {
  const totalBars = Math.max(8, Math.min(12, count));
  const level = clamp(value / 100, 0, 1);
  const activeBars = Math.max(2, Math.round(level * totalBars));

  return (
    <div className="flex h-[92px] items-end justify-center gap-2">
      {Array.from({ length: totalBars }).map((_, index) => {
        const height = 18 + ((index + 1) / totalBars) * 52;
        const intensity = 0.28 + (index / Math.max(totalBars - 1, 1)) * 0.72;
        const isActive = index < activeBars;

        return (
          <span
            key={`sound-bar-${index}`}
            className="w-2.5 rounded-none"
            style={{
              height: `${height}px`,
              background: isActive
                ? `linear-gradient(180deg, ${withAlpha(accent, Math.min(0.45 + intensity * 0.45, 0.92))}, ${withAlpha(accent, Math.min(0.62 + intensity * 0.38, 1))})`
                : isDarkMode
                  ? "linear-gradient(180deg, rgba(59,72,101,0.82), rgba(31,41,55,0.96))"
                  : "linear-gradient(180deg, rgba(112,129,168,0.45), rgba(66,87,126,0.72))",
              boxShadow: isActive ? `0 0 14px ${withAlpha(accent, intensity * 0.12)}` : "none",
              opacity: isActive ? 1 : 0.88,
            }}
          />
        );
      })}
    </div>
  );
};

const StatusBanner = ({
  accent,
  label,
  note,
  icon: Icon = Activity,
  withDivider = false,
  className = "",
}) => (
  <div
    className={cn(
      "flex h-[118px] flex-col overflow-hidden pt-4",
      withDivider && "border-t border-border/60 dark:border-slate-800/90",
      className
    )}
  >
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
      <div className="min-h-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: accent }}>
          {label}
        </p>
        <p className="mt-1 max-h-[72px] overflow-hidden text-sm leading-6 text-muted-foreground dark:text-slate-400">
          {note}
        </p>
      </div>
    </div>
  </div>
);

const MetricSummaryCard = ({ title, datasets, latestEntry, chartHistory, mode = "current" }) => (
  <div className="rounded-lg border border-border/60 bg-card/90 px-4 py-4 dark:bg-slate-900/80">
    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
    <div className="mt-3 space-y-3">
      {datasets.map((dataset) => (
        <div
          key={`${mode}-${dataset.key}`}
          className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-background/70 px-3 py-2 dark:bg-slate-950/35"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: dataset.color }}
            />
            <span className="text-sm font-medium text-foreground">{dataset.label}</span>
          </div>
          <span className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            {mode === "current"
              ? formatMetricValue(dataset.key, latestEntry[dataset.key], dataset.key === "bb" || dataset.key === "fr")
              : formatDelta(dataset.key, getTrend(chartHistory, dataset.key))}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const TemperatureHumidityOverviewCard = ({
  temperature,
  humidity,
  temperatureStatus,
  humidityStatus,
  isDarkMode,
}) => (
  <OverviewSurface icon={Thermometer} title="Nhiệt độ & Độ ẩm" accent="#ff9b43">
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      <RingGauge
        valueText={`${formatNumber(temperature, 1)}°C`}
        label="Nhiệt độ"
        status={temperatureStatus.label}
        accent={temperatureStatus.accent}
        percent={getProgressRatio("temperature", temperature)}
        minLabel="0"
        maxLabel="50"
        showStatus={false}
        isDarkMode={isDarkMode}
      />
      <RingGauge
        valueText={`${formatNumber(humidity, 0)}%`}
        label="Độ ẩm"
        status={humidityStatus.label}
        accent={humidityStatus.accent}
        percent={getProgressRatio("humidity", humidity)}
        minLabel="0"
        maxLabel="100"
        showStatus={false}
        isDarkMode={isDarkMode}
      />
    </div>
    <div className="mt-auto border-t border-border/60 pt-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatusBanner
          accent={temperatureStatus.accent}
          label={temperatureStatus.label}
          note={temperatureStatus.note}
          icon={Thermometer}
          className="pt-0"
        />
        <StatusBanner
          accent={humidityStatus.accent}
          label={humidityStatus.label}
          note={humidityStatus.note}
          icon={Droplets}
          className="pt-0"
        />
      </div>
    </div>
  </OverviewSurface>
);

const LightOverviewCard = ({ lux, bb, fr, status }) => (
  <OverviewSurface
    icon={SunMedium}
    title="Cường độ ánh sáng"
    accent="#facc15"
    variant="panel"
    bodyClassName="flex flex-1 flex-col gap-6"
  >
    <div className="space-y-5">
      <MetricBarRow
        label="Lux"
        value={formatNumber(lux, 0)}
        suffix=""
        accent="#facc15"
        ratio={getProgressRatio("lux", lux)}
        variant="panel"
      />
      <MetricBarRow
        label="BB"
        value={formatNumber(bb, 0)}
        suffix=""
        accent="#ff9b43"
        ratio={getProgressRatio("bb", bb)}
        variant="panel"
      />
      <MetricBarRow
        label="FR"
        value={formatNumber(fr, 0)}
        suffix=""
        accent="#ff6b35"
        ratio={getProgressRatio("fr", fr)}
        variant="panel"
      />
    </div>
    <StatusBanner
      accent={status.accent}
      label={status.label}
      note={status.note}
      withDivider
      className="mt-auto"
    />
  </OverviewSurface>
);

const UvOverviewCard = ({ uva, uvb, uvi, status }) => (
  <OverviewSurface
    icon={Sparkles}
    title="Cảm biến UV"
    accent="#a855f7"
    variant="panel"
    bodyClassName="flex flex-1 flex-col gap-6"
  >
    <div className="space-y-5">
      <MetricBarRow
        label="UVA"
        value={formatNumber(uva, 2)}
        suffix=""
        accent="#9333ea"
        ratio={getProgressRatio("uva", uva)}
        variant="panel"
      />
      <MetricBarRow
        label="UVB"
        value={formatNumber(uvb, 2)}
        suffix=""
        accent="#a78bfa"
        ratio={getProgressRatio("uvb", uvb)}
        variant="panel"
      />
      <MetricBarRow
        label="UV Index"
        value={formatNumber(uvi, 1)}
        suffix=""
        accent="#ec4899"
        ratio={getProgressRatio("uvi", uvi)}
        variant="panel"
      />
    </div>
    <StatusBanner
      accent={status.accent}
      label={status.label}
      note={status.note}
      withDivider
      className="mt-auto"
    />
  </OverviewSurface>
);

const SoundOverviewCard = ({ sound, status, values, isDarkMode }) => (
  <OverviewSurface
    icon={Volume2}
    title="Âm thanh"
    accent="#22d3ee"
    variant="panel"
    bodyClassName="flex flex-1 flex-col"
  >
    <div className="flex flex-1 flex-col items-center text-center">
      <p className="text-[3.3rem] font-semibold leading-none tracking-[-0.06em] text-cyan-400">
        {formatNumber(sound, 0)}
      </p>
      <p className="mt-2 text-sm uppercase tracking-[0.24em] text-muted-foreground dark:text-slate-400">dBA</p>
      <div className="mt-6 w-full">
        <SoundBars
          value={sound}
          accent="#22d3ee"
          isDarkMode={isDarkMode}
          count={values.length}
        />
      </div>
      <div className="mt-auto w-full pt-6">
        <StatusBanner
          accent={status.accent}
          label={status.label}
          note={status.note}
          icon={Activity}
          withDivider
        />
      </div>
    </div>
  </OverviewSurface>
);

const DataChip = ({ icon: Icon, label, value, accent }) => (
  <div
    className="rounded-2xl border px-3 py-2"
    style={{
      borderColor: withAlpha(accent, 0.18),
      background: `linear-gradient(135deg, ${withAlpha(accent, 0.1)}, transparent 90%)`,
    }}
  >
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
    <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
  </div>
);

const MiniSparkline = ({ values, color, height = 84 }) => {
  if (!values.length) {
    return <div className="h-full rounded-2xl bg-muted/40" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 240;
  const normalized = values.map((value, index) => {
    const x = values.length === 1 ? width : (index / (values.length - 1)) * width;
    const y =
      max === min ? height / 2 : height - ((value - min) / (max - min)) * (height - 10) - 5;
    return `${x},${y}`;
  });
  const fillPath = `0,${height} ${normalized.join(" ")} ${width},${height}`;

  return (
    <svg
      className="h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-fill-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={withAlpha(color, 0.42)} />
          <stop offset="100%" stopColor={withAlpha(color, 0)} />
        </linearGradient>
      </defs>
      <polyline
        points={fillPath}
        fill={`url(#spark-fill-${color.replace("#", "")})`}
        stroke="none"
      />
      <polyline
        points={normalized.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const OverviewCard = ({
  title,
  icon: Icon,
  accent,
  status,
  value,
  unit,
  delta,
  deltaMetric,
  note,
  sparkline,
  children,
}) => {
  const TrendIcon = delta >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm"
      style={{
        boxShadow: `0 28px 90px -48px ${withAlpha(accent, 0.35)}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          background: `radial-gradient(circle at top left, ${withAlpha(accent, 0.2)} 0%, transparent 72%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
            <span>{title}</span>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <span className="text-4xl font-semibold tracking-[-0.05em] text-foreground">
              {value}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">{unit}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                color: accent,
                borderColor: withAlpha(accent, 0.22),
                backgroundColor: withAlpha(accent, 0.14),
              }}
            >
              {status}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                color: accent,
                borderColor: withAlpha(accent, 0.22),
                backgroundColor: withAlpha(accent, 0.1),
              }}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              {formatDelta(deltaMetric, delta)}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">{note}</p>
        </div>

        <div className="h-24 w-28 shrink-0">
          <MiniSparkline values={sparkline} color={accent} />
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3">{children}</div>
    </article>
  );
};

const InsightItem = ({ icon: Icon, title, value, detail, accent, emphasis = false }) => (
  <div
    className="rounded-[26px] border p-4"
    style={{
      borderColor: withAlpha(accent, 0.22),
      background: `linear-gradient(135deg, ${withAlpha(accent, 0.12)}, transparent 80%)`,
    }}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Icon className="h-4 w-4" style={{ color: accent }} />
          <span>{title}</span>
        </div>
        <p
          className={cn(
            "mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground",
            emphasis && "text-[2rem]"
          )}
        >
          {value}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
    </div>
  </div>
);

const DetailCard = ({
  title,
  icon: Icon,
  accent,
  headline,
  description,
  values,
  stats,
}) => (
  <article className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <Icon className="h-4 w-4" style={{ color: accent }} />
          <span>{title}</span>
        </div>
        <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground">
          {headline}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div
        className="rounded-2xl p-3"
        style={{
          backgroundColor: withAlpha(accent, 0.14),
          color: accent,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>

    <div className="mt-5 h-28 rounded-xl border border-border/60 bg-background/80 p-3">
      <MiniSparkline values={values} color={accent} height={92} />
    </div>

    <div className="mt-5 grid grid-cols-3 gap-3">
      {stats.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border/60 bg-background/80 px-3 py-3"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  </article>
);

export const LegacyDashboardSection = () => {
  const sensorData = useFakeSensorData();

  return (
    <div className="flex h-full overflow-hidden">
      {/* Device Sidebar */}
      <DeviceSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background/50">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/50 backdrop-blur-sm shrink-0">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Bảng Điều Khiển <span className="text-primary">Sensor Môi Trường</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Hệ Thống Giám Sát Thời Gian Thực
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Kết nối tốt
            </div>
            <span className="text-xs text-muted-foreground">
              {sensorData.timestamp}
            </span>
          </div>
        </div>

        {/* Scrollable content: Cards + Chart */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Sensor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <TempHumidCard
              temperature={sensorData.temperature}
              humidity={sensorData.humidity}
            />
            <LightCard
              lux={sensorData.lux}
              broadband={sensorData.broadband}
              infrared={sensorData.infrared}
            />
            <UVCard
              uvi={sensorData.UVI}
              uva={sensorData.UVA}
              uvb={sensorData.UVB}
            />
            <SoundCard sound={sensorData.sound} />
          </div>

          {/* Chart – compact mode for dashboard */}
          <TemperatureChart compact />
        </div>
      </div>
    </div>
  );
};

export const DashboardSection = () => {
  const liveSnapshot = useWebSocket();
  const fallbackSnapshot = useFakeSensorData();
  const currentSnapshot = normalizeSnapshot(
    hasLiveSensorData(liveSnapshot) ? liveSnapshot : fallbackSnapshot
  );
  const dataSource = hasLiveSensorData(liveSnapshot) ? "Live socket" : "Simulated feed";

  const [history, setHistory] = useState(() => buildSeedHistory(currentSnapshot));
  const [selectedTab, setSelectedTab] = useState("tempHumidity");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const lastSampleKey = useRef("");

  useEffect(() => {
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sampleKey = [
      currentSnapshot.temperature,
      currentSnapshot.humidity,
      currentSnapshot.lux,
      currentSnapshot.bb,
      currentSnapshot.fr,
      currentSnapshot.uvi,
      currentSnapshot.uva,
      currentSnapshot.uvb,
      currentSnapshot.sound,
      currentSnapshot.timestamp,
    ].join("|");

    if (sampleKey === lastSampleKey.current) {
      return;
    }

    lastSampleKey.current = sampleKey;

    setHistory((previous) => {
      const nextEntry = {
        time: Date.now(),
        temperature: currentSnapshot.temperature,
        humidity: currentSnapshot.humidity,
        lux: currentSnapshot.lux,
        bb: currentSnapshot.bb,
        fr: currentSnapshot.fr,
        uvi: currentSnapshot.uvi,
        uva: currentSnapshot.uva,
        uvb: currentSnapshot.uvb,
        sound: currentSnapshot.sound,
      };

      const trimmed = [...previous, nextEntry].filter(
        (entry) => entry.time >= Date.now() - HISTORY_WINDOW
      );

      return trimmed.slice(-2600);
    });
  }, [
    currentSnapshot.temperature,
    currentSnapshot.humidity,
    currentSnapshot.lux,
    currentSnapshot.bb,
    currentSnapshot.fr,
    currentSnapshot.uvi,
    currentSnapshot.uva,
    currentSnapshot.uvb,
    currentSnapshot.sound,
    currentSnapshot.timestamp,
  ]);

  const rangeHistory = history.slice(-120);
  const chartHistory = history.slice(-20);
  const cardHistory = history.slice(-18);
  const tabDefinition = TAB_CONFIG[selectedTab];
  const latestEntry = history[history.length - 1];
  const previousEntry = history[Math.max(0, history.length - 2)] || latestEntry;
  const temperatureStatus = getStatusStyles(
    "temperature",
    latestEntry.temperature,
    latestEntry.humidity
  );
  const humidityStatus = getHumidityStatus(latestEntry.humidity);
  const lightStatus = getStatusStyles("light", latestEntry.lux);
  const uvStatus = getStatusStyles("uv", latestEntry.uvi);
  const soundStatus = getStatusStyles("sound", latestEntry.sound);
  const lightCorrelation = calculateCorrelation(rangeHistory, "lux", "uvi");
  const dailyMaxTemperature = findDailyPeak(history, "temperature");
  const dailyMaxUvi = findDailyPeak(history, "uvi");
  const abnormalSoundEvents = history.filter((entry) => entry.sound >= 80);
  const latestAbnormalSound =
    abnormalSoundEvents[abnormalSoundEvents.length - 1] || latestEntry;
  const soundBars = sampleHistory(cardHistory, 10).map((entry) => entry.sound);

  const overviewCards = [
    {
      key: "temp-humidity",
      title: "Temperature & humidity",
      icon: Thermometer,
      accent: temperatureStatus.accent,
      status: temperatureStatus.label,
      note: temperatureStatus.note,
      value: formatNumber(latestEntry.temperature, 1),
      unit: "°C",
      delta: getTrend(cardHistory, "temperature", latestEntry.temperature),
      deltaMetric: "temperature",
      sparkline: getMetricSeries(cardHistory, "temperature"),
      details: (
        <>
          <DataChip
            icon={Droplets}
            label="Humidity"
            value={formatMetricValue("humidity", latestEntry.humidity)}
            accent="#4f8cff"
          />
          <DataChip
            icon={Activity}
            label="Comfort swing"
            value={formatNumber(
              Math.abs(latestEntry.temperature - previousEntry.temperature) +
                Math.abs(latestEntry.humidity - previousEntry.humidity) / 10,
              1
            )}
            accent={temperatureStatus.accent}
          />
        </>
      ),
    },
    {
      key: "light",
      title: "Light intensity",
      icon: SunMedium,
      accent: lightStatus.accent,
      status: lightStatus.label,
      note: lightStatus.note,
      value: formatNumber(latestEntry.lux, 0),
      unit: "lux",
      delta: getTrend(cardHistory, "lux", latestEntry.lux),
      deltaMetric: "lux",
      sparkline: getMetricSeries(cardHistory, "lux"),
      details: (
        <>
          <DataChip
            icon={Sparkles}
            label="Blue light"
            value={formatMetricValue("bb", latestEntry.bb, true)}
            accent="#3fb0ff"
          />
          <DataChip
            icon={SunMedium}
            label="Far red"
            value={formatMetricValue("fr", latestEntry.fr, true)}
            accent="#f5b84b"
          />
        </>
      ),
    },
    {
      key: "uv",
      title: "UV exposure",
      icon: Sparkles,
      accent: uvStatus.accent,
      status: uvStatus.label,
      note: uvStatus.note,
      value: formatNumber(latestEntry.uvi, 1),
      unit: "UVI",
      delta: getTrend(cardHistory, "uvi", latestEntry.uvi),
      deltaMetric: "uvi",
      sparkline: getMetricSeries(cardHistory, "uvi"),
      details: (
        <>
          <DataChip
            icon={Activity}
            label="UVA"
            value={formatMetricValue("uva", latestEntry.uva)}
            accent="#d946ef"
          />
          <DataChip
            icon={Sparkles}
            label="UVB"
            value={formatMetricValue("uvb", latestEntry.uvb)}
            accent="#7c3aed"
          />
        </>
      ),
    },
    {
      key: "sound",
      title: "Sound level",
      icon: Volume2,
      accent: soundStatus.accent,
      status: soundStatus.label,
      note: soundStatus.note,
      value: formatNumber(latestEntry.sound, 0),
      unit: "dBA",
      delta: getTrend(cardHistory, "sound", latestEntry.sound),
      deltaMetric: "sound",
      sparkline: getMetricSeries(cardHistory, "sound"),
      details: (
        <>
          <DataChip
            icon={TriangleAlert}
            label="Alert floor"
            value="80 dBA"
            accent="#ff6b63"
          />
          <DataChip
            icon={Activity}
            label="Current state"
            value={soundStatus.label}
            accent={soundStatus.accent}
          />
        </>
      ),
    },
  ];

  const chartData = {
    labels: chartHistory.map((entry) => formatAxisTimestamp(entry.time, "24h")),
    datasets: tabDefinition.datasets.map((dataset, index) => ({
      label: dataset.label,
      data: chartHistory.map((entry) => entry[dataset.key]),
      borderColor: dataset.color,
      backgroundColor: (context) => {
        const { chart } = context;
        const { ctx, chartArea } = chart;

        if (!chartArea) {
          return withAlpha(dataset.color, 0.18);
        }

        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(
          0,
          withAlpha(dataset.color, tabDefinition.datasets.length === 1 ? 0.32 : 0.18)
        );
        gradient.addColorStop(1, withAlpha(dataset.color, 0));
        return gradient;
      },
      fill: index === 0,
      borderWidth: 2.8,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointBackgroundColor: dataset.color,
      pointBorderColor: isDarkMode ? "#08111f" : "#ffffff",
      pointBorderWidth: 2,
      tension: 0.38,
      yAxisID: dataset.yAxisID,
      metricKey: dataset.key,
      unit: dataset.unit,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          boxHeight: 10,
          padding: 18,
          color: isDarkMode ? "#dbe8ff" : "#1f2937",
          font: {
            family: "Space Grotesk, Segoe UI, sans-serif",
            size: 12,
            weight: 600,
          },
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? "rgba(8, 17, 31, 0.92)" : "rgba(255, 255, 255, 0.96)",
        titleColor: isDarkMode ? "#f8fafc" : "#0f172a",
        bodyColor: isDarkMode ? "#dbe8ff" : "#0f172a",
        borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
        borderWidth: 1,
        padding: 14,
        displayColors: true,
        callbacks: {
          title: (items) =>
            items[0] ? formatTooltipTimestamp(chartHistory[items[0].dataIndex].time) : "",
          label: (context) =>
            `${context.dataset.label}: ${formatMetricValue(
              context.dataset.metricKey,
              context.parsed.y,
              context.dataset.metricKey === "bb" || context.dataset.metricKey === "fr"
            )}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: isDarkMode ? "#90a3bf" : "#526075",
          maxRotation: 0,
          autoSkipPadding: 18,
          font: {
            family: "Space Grotesk, Segoe UI, sans-serif",
            size: 11,
          },
        },
      },
      y: {
        position: "left",
        grace: "12%",
        grid: {
          color: isDarkMode ? "rgba(148, 163, 184, 0.12)" : "rgba(148, 163, 184, 0.18)",
        },
        ticks: {
          color: isDarkMode ? "#90a3bf" : "#526075",
          font: {
            family: "Space Grotesk, Segoe UI, sans-serif",
            size: 11,
          },
        },
        title: {
          display: true,
          text: tabDefinition.axisLabel,
          color: isDarkMode ? "#dbe8ff" : "#0f172a",
          font: {
            family: "Plus Jakarta Sans, Space Grotesk, sans-serif",
            size: 12,
            weight: 700,
          },
        },
      },
      ...(tabDefinition.datasets.some((dataset) => dataset.yAxisID === "y1")
        ? {
            y1: {
              position: "right",
              grace: "12%",
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                color: isDarkMode ? "#90a3bf" : "#526075",
                font: {
                  family: "Space Grotesk, Segoe UI, sans-serif",
                  size: 11,
                },
              },
              title: {
                display: true,
                text: tabDefinition.secondaryAxisLabel,
                color: isDarkMode ? "#dbe8ff" : "#0f172a",
                font: {
                  family: "Plus Jakarta Sans, Space Grotesk, sans-serif",
                  size: 12,
                  weight: 700,
                },
              },
            },
          }
        : {}),
    },
  };

  const detailWindow = sampleHistory(rangeHistory, 30);
  const temperatureStats = getStatWindow(detailWindow, "temperature");
  const lightStats = getStatWindow(detailWindow, "lux");
  const uvStats = getStatWindow(detailWindow, "uvi");
  const soundStats = getStatWindow(detailWindow, "sound");

  const detailCards = [
    {
      title: "Thermal detail",
      icon: Thermometer,
      accent: temperatureStatus.accent,
      headline: `${formatMetricValue("temperature", temperatureStats.current)} now`,
      description: `Humidity is holding at ${formatMetricValue(
        "humidity",
        latestEntry.humidity
      )}, with a ${formatMetricValue(
        "temperature",
        temperatureStats.max - temperatureStats.min
      ).replace("°C", "° range")} swing in the selected window.`,
      values: getMetricSeries(detailWindow, "temperature"),
      stats: [
        { label: "Min", value: formatMetricValue("temperature", temperatureStats.min) },
        {
          label: "Avg",
          value: formatMetricValue(
            "humidity",
            average(getMetricSeries(detailWindow, "humidity"))
          ),
        },
        { label: "Max", value: formatMetricValue("temperature", temperatureStats.max) },
      ],
    },
    {
      title: "Light detail",
      icon: SunMedium,
      accent: lightStatus.accent,
      headline: `${formatMetricValue("lux", lightStats.current)} ambient`,
      description:
        "BB and FR are shifting with the ambient curve, helping reveal spectrum balance rather than lux alone.",
      values: getMetricSeries(detailWindow, "lux"),
      stats: [
        { label: "BB", value: formatMetricValue("bb", latestEntry.bb, true) },
        { label: "Avg", value: formatMetricValue("lux", lightStats.avg) },
        { label: "FR", value: formatMetricValue("fr", latestEntry.fr, true) },
      ],
    },
    {
      title: "UV detail",
      icon: Sparkles,
      accent: uvStatus.accent,
      headline: `${formatMetricValue("uvi", uvStats.current)} current exposure`,
      description:
        "UV intensity rises and falls in step with light correlation, making peak windows easier to anticipate.",
      values: getMetricSeries(detailWindow, "uvi"),
      stats: [
        { label: "UVA", value: formatMetricValue("uva", latestEntry.uva) },
        { label: "Peak", value: formatMetricValue("uvi", uvStats.max) },
        { label: "UVB", value: formatMetricValue("uvb", latestEntry.uvb) },
      ],
    },
    {
      title: "Acoustic detail",
      icon: Volume2,
      accent: soundStatus.accent,
      headline: `${formatMetricValue("sound", soundStats.current)} acoustic load`,
      description:
        "Noise spikes are separated from the background floor so abnormal events stand out immediately.",
      values: getMetricSeries(detailWindow, "sound"),
      stats: [
        { label: "Floor", value: formatMetricValue("sound", soundStats.min) },
        { label: "Alerts", value: `${abnormalSoundEvents.length}` },
        { label: "Peak", value: formatMetricValue("sound", soundStats.max) },
      ],
    },
  ];

  const insightRows = [
    {
      metric: "Nhiệt độ cao nhất hôm nay",
      value: formatMetricValue("temperature", dailyMaxTemperature.temperature),
      note: `Ghi nhận lúc ${formatTimestamp(dailyMaxTemperature.time)}.`,
    },
    {
      metric: "UV Index cao nhất",
      value: formatMetricValue("uvi", dailyMaxUvi.uvi),
      note: `Đạt đỉnh lúc ${formatTimestamp(dailyMaxUvi.time)}.`,
    },
    {
      metric: "Cảnh báo âm thanh",
      value: abnormalSoundEvents.length
        ? `${formatMetricValue("sound", latestAbnormalSound.sound)}`
        : "Không có",
      note: abnormalSoundEvents.length
        ? `${abnormalSoundEvents.length} lần cảnh báo, gần nhất ${formatTimestamp(
            latestAbnormalSound.time
          )}.`
        : "Âm thanh gần đây vẫn dưới ngưỡng bất thường.",
    },
    {
      metric: "Nhận định",
      value:
        lightCorrelation >= 0.7
          ? "Ánh sáng và UV tăng cùng chiều"
          : lightCorrelation >= 0.3
            ? "Ánh sáng và UV biến động trung bình"
            : "Ánh sáng và UV liên hệ thấp",
      note:
        lightCorrelation >= 0.7
          ? "Khả năng cao đang có phơi nắng trực tiếp."
          : lightCorrelation >= 0.3
            ? "Điều kiện môi trường đang thay đổi xen kẽ."
            : "Có thể là môi trường trong nhà hoặc ánh sáng lọc.",
    },
  ];

  const compactInsightRows = (() => {
    if (selectedTab === "tempHumidity") {
      const tempStats = getStatWindow(chartHistory, "temperature");
      const humidityStats = getStatWindow(chartHistory, "humidity");
      const tempTrend = getTrend(chartHistory, "temperature", latestEntry.temperature);
      const humidityTrend = getTrend(chartHistory, "humidity", latestEntry.humidity);
      const comfortSwing =
        (tempStats.max - tempStats.min) + (humidityStats.max - humidityStats.min) / 10;

      return [
        {
          metric: "Độ ổn định",
          value: describeVolatility(comfortSwing, 2.4, 4.8),
          note: "Tổng hợp từ biên độ nhiệt độ và độ ẩm trong 20 mẫu gần nhất.",
        },
        {
          metric: "Biên độ nhiệt",
          value: `${formatNumber(tempStats.max - tempStats.min, 1)}°C`,
          note: `Dao động từ ${formatMetricValue("temperature", tempStats.min)} đến ${formatMetricValue("temperature", tempStats.max)}.`,
        },
        {
          metric: "Biên độ ẩm",
          value: `${formatNumber(humidityStats.max - humidityStats.min, 0)}%`,
          note: `Độ ẩm ${humidityTrend >= 0 ? "tăng" : "giảm"} ${formatNumber(Math.abs(humidityTrend), 0)}% so với đầu chuỗi.`,
        },
        {
          metric: "Xu hướng chung",
          value: tempTrend >= 0 ? "Ấm dần" : "Mát dần",
          note: `Nhiệt độ ${tempTrend >= 0 ? "tăng" : "giảm"} ${formatNumber(Math.abs(tempTrend), 1)}°C trong cửa sổ hiện tại.`,
        },
      ];
    }

    if (selectedTab === "light") {
      const luxStats = getStatWindow(chartHistory, "lux");
      const bbStats = getStatWindow(chartHistory, "bb");
      const frStats = getStatWindow(chartHistory, "fr");
      const luxTrend = getTrend(chartHistory, "lux", latestEntry.lux);
      const balance = latestEntry.fr === 0 ? 0 : latestEntry.bb / latestEntry.fr;

      return [
        {
          metric: "Độ ổn định lux",
          value: describeVolatility(luxStats.max - luxStats.min, 250, 900),
          note: `Biên độ lux trong 20 mẫu là ${formatNumber(luxStats.max - luxStats.min, 0)}.`,
        },
        {
          metric: "Đỉnh gần nhất",
          value: formatMetricValue("lux", luxStats.max),
          note: `Lux hiện ${luxTrend >= 0 ? "cao hơn" : "thấp hơn"} đầu chuỗi ${formatNumber(Math.abs(luxTrend), 0)}.`,
        },
        {
          metric: "Tỷ lệ BB/FR",
          value: `${formatNumber(balance, 2)}`,
          note: balance >= 2 ? "Phổ đang nghiêng về BB." : "Phổ đang khá cân bằng với FR.",
        },
        {
          metric: "Biến động phổ",
          value: describeVolatility((bbStats.max - bbStats.min) / 1000 + (frStats.max - frStats.min) / 1000, 8, 20),
          note: `BB dao động ${formatCompact(bbStats.max - bbStats.min)}, FR dao động ${formatCompact(frStats.max - frStats.min)}.`,
        },
      ];
    }

    if (selectedTab === "uv") {
      const uviStats = getStatWindow(chartHistory, "uvi");
      const uvaStats = getStatWindow(chartHistory, "uva");
      const uvbStats = getStatWindow(chartHistory, "uvb");
      const uviTrend = getTrend(chartHistory, "uvi", latestEntry.uvi);
      const uvMix = latestEntry.uvb === 0 ? latestEntry.uva : latestEntry.uva / latestEntry.uvb;

      return [
        {
          metric: "Mức phơi nhiễm",
          value: uvStatus.label,
          note: uvStatus.note,
        },
        {
          metric: "Biên độ UVI",
          value: formatNumber(uviStats.max - uviStats.min, 1),
          note: `UVI ${uviTrend >= 0 ? "tăng" : "giảm"} ${formatNumber(Math.abs(uviTrend), 1)} trong 20 mẫu.`,
        },
        {
          metric: "Nghiêng UVA/UVB",
          value: `${formatNumber(uvMix, 2)}`,
          note: uvMix >= 8 ? "UVA chiếm ưu thế rõ rệt." : "UVB đang tăng tỷ trọng.",
        },
        {
          metric: "Đỉnh UV gần nhất",
          value: formatMetricValue("uvi", uviStats.max),
          note: `UVA tối đa ${formatMetricValue("uva", uvaStats.max)}, UVB tối đa ${formatMetricValue("uvb", uvbStats.max)}.`,
        },
      ];
    }

    const soundRange = getStatWindow(chartHistory, "sound");
    const soundTrend = getTrend(chartHistory, "sound", latestEntry.sound);
    const alertsInWindow = chartHistory.filter((entry) => entry.sound >= 80).length;

    return [
      {
        metric: "Mức nền",
        value: formatMetricValue("sound", soundRange.min),
        note: "Mức thấp nhất trong 20 mẫu gần nhất, dùng làm nền so sánh.",
      },
      {
        metric: "Đỉnh gần nhất",
        value: formatMetricValue("sound", soundRange.max),
        note: `Âm thanh hiện ${soundTrend >= 0 ? "cao hơn" : "thấp hơn"} đầu chuỗi ${formatNumber(Math.abs(soundTrend), 0)} dBA.`,
      },
      {
        metric: "Vượt ngưỡng",
        value: `${alertsInWindow} lần`,
        note: alertsInWindow ? "Đã chạm ngưỡng 80 dBA trong cửa sổ hiện tại." : "Chưa vượt ngưỡng 80 dBA trong 20 mẫu gần nhất.",
      },
      {
        metric: "Độ dao động",
        value: describeVolatility(soundRange.max - soundRange.min, 8, 18),
        note: `Biên độ âm thanh là ${formatNumber(soundRange.max - soundRange.min, 0)} dBA.`,
      },
    ];
  })();

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute left-[10%] top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-[120px] dark:bg-cyan-500/8" />
        <div className="absolute right-[6%] top-32 h-64 w-64 rounded-full bg-fuchsia-400/8 blur-[130px] dark:bg-fuchsia-500/8" />
        <div className="absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-emerald-400/8 blur-[150px] dark:bg-emerald-500/6" />
      </div>

      <div className="container relative px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="p-3 sm:p-5 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-[-0.06em] text-foreground sm:mt-5 sm:text-4xl lg:text-5xl">
                Hệ thống giám sát môi trường thời gian thực
              </h1>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <TemperatureHumidityOverviewCard
              temperature={latestEntry.temperature}
              humidity={latestEntry.humidity}
              temperatureStatus={temperatureStatus}
              humidityStatus={humidityStatus}
              isDarkMode={isDarkMode}
            />
            <LightOverviewCard
              lux={latestEntry.lux}
              bb={latestEntry.bb}
              fr={latestEntry.fr}
              status={lightStatus}
            />
            <UvOverviewCard
              uva={latestEntry.uva}
              uvb={latestEntry.uvb}
              uvi={latestEntry.uvi}
              status={uvStatus}
            />
            <SoundOverviewCard
              sound={latestEntry.sound}
              status={soundStatus}
              values={soundBars}
              isDarkMode={isDarkMode}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:mt-8 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,360px)]">
            <section className="min-w-0 rounded-lg border border-border/60 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                      Biểu đồ chính
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                      {tabDefinition.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {tabDefinition.subtitle}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="-mx-1 overflow-x-auto px-1 pb-1">
                      <div className="flex min-w-max flex-nowrap gap-2">
                      {Object.entries(TAB_CONFIG).map(([key, tab]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedTab(key)}
                          className={cn(
                            "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all sm:px-4",
                            selectedTab === key
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                              : "border border-border/50 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                      </div>
                    </div>

                    <div className="flex justify-end" />
                  </div>
                </div>

                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  <MetricSummaryCard
                    title="Hiện tại"
                    datasets={tabDefinition.datasets}
                    latestEntry={latestEntry}
                    chartHistory={chartHistory}
                    mode="current"
                  />
                  <MetricSummaryCard
                    title="Xu hướng"
                    datasets={tabDefinition.datasets}
                    latestEntry={latestEntry}
                    chartHistory={chartHistory}
                    mode="trend"
                  />
                </div>

                <div className="h-[280px] overflow-hidden rounded-lg border border-border/60 bg-card/90 p-3 dark:bg-slate-900/80 sm:h-[340px] sm:p-4 lg:h-[430px]">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            </section>

            <aside className="min-w-0 rounded-lg border border-border/60 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Tổng hợp nhanh
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    Bảng phân tích
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Tóm tắt các ngưỡng quan trọng, giá trị cực đại và cảnh báo gần nhất.
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-lg border border-border/60 bg-card/90 dark:bg-slate-900/80">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="w-[34%] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-4 sm:py-3 sm:text-[11px] sm:tracking-[0.18em]">
                        Chỉ số
                      </th>
                      <th className="w-[24%] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-4 sm:py-3 sm:text-[11px] sm:tracking-[0.18em]">
                        Giá trị
                      </th>
                      <th className="w-[42%] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-4 sm:py-3 sm:text-[11px] sm:tracking-[0.18em]">
                        Ghi chú
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {compactInsightRows.map((row, index) => (
                      <tr
                        key={row.metric}
                        className={cn(
                          "align-top",
                          index !== compactInsightRows.length - 1 && "border-b border-border/60"
                        )}
                      >
                        <td className="break-words px-3 py-2 text-[13px] font-medium leading-5 text-foreground sm:px-4 sm:py-3 sm:text-sm">
                          {row.metric}
                        </td>
                        <td className="break-words px-3 py-2 text-[13px] font-semibold leading-5 text-foreground sm:px-4 sm:py-3 sm:text-sm">
                          {row.value}
                        </td>
                        <td className="break-words px-3 py-2 text-[13px] leading-5 text-muted-foreground sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
                          {row.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};
