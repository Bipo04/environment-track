import { useEffect, useRef, useState, useMemo } from "react";
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
import zoomPlugin from "chartjs-plugin-zoom";
import { Line } from "react-chartjs-2";
import { cn } from "@/lib/utils";
import { useFakeSensorData } from "@/hooks/useFakeSensorData";
import { useDeviceMqttData } from "@/hooks/useDeviceMqttData";
import { TempHumidCard } from "./dashboard/TempHumidCard";
import { LightCard } from "./dashboard/LightCard";
import { UVCard } from "./dashboard/UVCard";
import { SoundCard } from "./dashboard/SoundCard";
import { DeviceSidebar } from "./dashboard/DeviceSidebar";
import TemperatureChart from "./TemperatureChart";
import { AirSensorDashboard } from "./dashboard/AirSensorDashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const HISTORY_WINDOW = 7 * DAY;
const SEED_STEP = 5 * 60 * 1000;

const STANDARD_RANGES = {
  tempHumidity: {
    y: { min: 0, max: 50 },
    y1: { min: 0, max: 100 },
  },
  light: {
    y: { min: 0, max: 3000 },
    y1: { min: 0, max: 1000 },
  },
  uv: {
    y: { min: 0, max: 12 },
    y1: { min: 0, max: 100 },
  },
  sound: {
    y: { min: 0, max: 4095 },
  },
};

const TAB_CONFIG = {
  tempHumidity: {
    label: "Nhiệt & Ẩm",
    title: "Biểu đồ nhiệt độ và độ ẩm",
    subtitle: "",
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
    title: "Biểu đồ ánh sáng",
    subtitle: "",
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
        label: "Broadband",
        color: "#3fb0ff",
        unit: " bb",
        yAxisID: "y1",
      },
      {
        key: "fr",
        label: "IR",
        color: "#f5b84b",
        unit: " fr",
        yAxisID: "y1",
      },
    ],
    axisLabel: "Lux",
    secondaryAxisLabel: "Broadband / IR",
  },
  uv: {
    label: "UV",
    title: "Biểu đồ UV",
    subtitle: "",
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
        yAxisID: "y1",
      },
      {
        key: "uvb",
        label: "UVB",
        color: "#7c3aed",
        unit: " uvb",
        yAxisID: "y1",
      },
    ],
    axisLabel: "UVI",
    secondaryAxisLabel: "UVA / UVB",
  },
  sound: {
    label: "Âm thanh",
    title: "Biểu đồ âm thanh",
    subtitle: "",
    datasets: [
      {
        key: "sound",
        label: "Mức âm thanh",
        color: "#26c6da",
        unit: " dB",
        yAxisID: "y",
      },
    ],
    axisLabel: "dB",
  },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseLooseNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

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
  temperature: parseLooseNumber(snapshot?.temperature),
  humidity: parseLooseNumber(snapshot?.humidity),
  lux: parseLooseNumber(snapshot?.lux),
  bb: parseLooseNumber(snapshot?.bb ?? snapshot?.broadband),
  fr: parseLooseNumber(snapshot?.fr ?? snapshot?.infrared),
  uvi: parseLooseNumber(snapshot?.uvi ?? snapshot?.UVI),
  uva: parseLooseNumber(snapshot?.uva ?? snapshot?.UVA),
  uvb: parseLooseNumber(snapshot?.uvb ?? snapshot?.UVB),
  sound: parseLooseNumber(snapshot?.sound),
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
      base.sound * 0.6 +
        300 +
        solarWave * 300 +
        rushHour * 1000 +
        wave(index, 0.29, 0.7) * 400,
      100,
      3500
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

const roundMetricValue = (key, value) => {
  const numericValue = Number(value) || 0;

  switch (key) {
    case "temperature":
      return Number(numericValue.toFixed(1));
    case "uvi":
      return Number(numericValue.toFixed(2));
    case "humidity":
    case "lux":
    case "bb":
    case "fr":
    case "sound":
      return Math.round(numericValue);
    case "uva":
    case "uvb":
      return Number(numericValue.toFixed(2));
    default:
      return numericValue;
  }
};

const getTrendDeadzone = (key) => {
  switch (key) {
    case "temperature":
    case "uvi":
      return 0.05;
    case "humidity":
    case "lux":
    case "bb":
    case "fr":
    case "sound":
      return 0.5;
    case "uva":
    case "uvb":
      return 0.005;
    default:
      return 0.01;
  }
};

const formatAxisTick = (value) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
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
      return `${formatNumber(numericValue, 2)} UVI`;
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
  if (Math.abs(value) < getTrendDeadzone(key)) {
    value = 0;
  }

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
      return `${prefix}${formatNumber(absValue, 2)} UVI`;
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
    second: "2-digit",
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

const MIN_CHART_SPAN = {
  temperature: 2,
  humidity: 8,
  lux: 500,
  bb: 3000,
  fr: 1500,
  uvi: 1.5,
  uva: 1,
  uvb: 0.3,
  sound: 500,
};

const getAxisBounds = (entries, datasets, axisId) => {
  const axisDatasets = datasets.filter((dataset) => dataset.yAxisID === axisId);
  if (!axisDatasets.length) {
    return {};
  }

  const values = axisDatasets.flatMap((dataset) => getMetricSeries(entries, dataset.key));
  if (!values.length) {
    return {};
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const dataSpan = maxValue - minValue;
  const minSpan = Math.max(...axisDatasets.map((dataset) => MIN_CHART_SPAN[dataset.key] || 1));
  const finalSpan = Math.max(dataSpan, minSpan);
  const midpoint = (minValue + maxValue) / 2;
  const padding = finalSpan * 0.12;

  return {
    min: midpoint - finalSpan / 2 - padding,
    max: midpoint + finalSpan / 2 + padding,
  };
};

const getTrend = (entries, key, fallbackValue = 0) => {
  if (entries.length < 2) {
    return 0;
  }

  const baselineIndex = Math.max(0, entries.length - Math.min(6, entries.length));
  const baseline = entries[baselineIndex][key] ?? fallbackValue;
  const current = entries[entries.length - 1][key] ?? fallbackValue;

  const delta = current - baseline;
  return Math.abs(delta) < getTrendDeadzone(key) ? 0 : delta;
};

const getStatusStyles = (type, value, humidity = 0) => {
  if (type === "temperature") {
    if (value <= 10) {
      return { label: "Rất lạnh", note: "Trời rét buốt. Chú ý giữ ấm cơ thể.", accent: "#3b82f6" };
    }
    if (value <= 18) {
      return { label: "Lạnh", note: "Nhiệt độ xuống thấp, không khí lạnh rõ.", accent: "#60a5fa" };
    }
    if (value <= 24) {
      return { label: "Mát mẻ", note: "Mát mẻ dễ chịu. Thời tiết lý tưởng.", accent: "#0d9488" };
    }
    if (value <= 27) {
      return {
        label: "Ổn định",
        note: "Thời tiết dễ chịu, không khí thoáng mát.",
        accent: "#22c55e",
      };
    }
    if (value <= 30) {
      return {
        label: "Hơi nóng",
        note: "Không khí hơi ngột ngạt, bắt đầu oi bức.",
        accent: "#f5b84b",
      };
    }
    if (value <= 35) {
      return {
        label: "Nóng",
        note: "Trời oi nóng. Chú ý uống đủ nước.",
        accent: "#f97316",
      };
    }
    if (value <= 40) {
      return {
        label: "Rất nóng",
        note: "Nắng nóng gay gắt. Hạn chế ra ngoài.",
        accent: "#ef4444",
      };
    }
    return {
      label: "Cực nóng",
      note: "Nhiệt độ quá tải! Kiểm tra thiết bị ngay.",
      accent: "#a855f7",
    };
  }

  if (type === "light") {
    if (value <= 50) {
      return {
        label: "Rất tối",
        note: "Ánh sáng rất thấp.",
        accent: "#ef4444",
      };
    }
    if (value <= 200) {
      return {
        label: "Thiếu sáng",
        note: "Cường độ ánh sáng thấp.",
        accent: "#f97316",
      };
    }
    if (value <= 1000) {
      return {
        label: "Đủ sáng",
        note: "Ánh sáng phù hợp.",
        accent: "#22c55e",
      };
    }
    return {
      label: "Quá sáng",
      note: "Ánh sáng quá mạnh.",
      accent: "#eab308",
    };
  }

  if (type === "uv") {
    if (value <= 2) {
      return {
        label: "UV thấp",
        note: "Mức UV an toàn.",
        accent: "#22c55e",
      };
    }
    if (value <= 5) {
      return {
        label: "UV trung bình",
        note: "Mức UV trung bình.",
        accent: "#eab308",
      };
    }
    if (value <= 7) {
      return {
        label: "UV cao",
        note: "Mức UV cao.",
        accent: "#f97316",
      };
    }
    if (value <= 10) {
      return {
        label: "UV rất cao",
        note: "Mức UV rất cao.",
        accent: "#ef4444",
      };
    }
    return {
      label: "UV cực đoan",
      note: "Mức UV nguy hiểm.",
      accent: "#a855f7",
    };
  }

  if (value <= 300) {
    return { label: "Yên tĩnh", note: "Âm thanh ở mức thấp.", accent: "#22c55e" };
  }
  if (value <= 700) {
    return {
      label: "Bình thường",
      note: "Âm thanh ở mức bình thường.",
      accent: "#22c55e",
    };
  }
  if (value <= 1200) {
    return {
      label: "Ồn",
      note: "Mức âm thanh khá cao.",
      accent: "#f97316",
    };
  }
  if (value <= 2000) {
    return {
      label: "Cảnh báo",
      note: "Âm thanh lớn.",
      accent: "#ef4444",
    };
  }
  return {
    label: "Rất ồn",
    note: "Âm thanh ở mức rất cao.",
    accent: "#a855f7",
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
  if (value <= 30) {
    return {
      label: "Khô",
      note: "Không khí khô.",
      accent: "#f97316",
    };
  }
  if (value <= 60) {
    return {
      label: "Tốt",
      note: "Độ ẩm phù hợp.",
      accent: "#22c55e",
    };
  }
  if (value <= 80) {
    return {
      label: "Ẩm",
      note: "Không khí có độ ẩm cao.",
      accent: "#3b82f6",
    };
  }
  return {
    label: "Rất ẩm",
    note: "Độ ẩm quá cao.",
    accent: "#ef4444",
  };
};

const calculateDewPoint = (temperature, humidity) => {
  if (!Number.isFinite(temperature) || !Number.isFinite(humidity) || humidity <= 0) {
    return null;
  }

  const a = 17.27;
  const b = 237.7;
  const gamma = (a * temperature) / (b + temperature) + Math.log(humidity / 100);
  return (b * gamma) / (a - gamma);
};

const getDewPointStatus = (dewPoint) => {
  if (dewPoint === null || !Number.isFinite(dewPoint)) {
    return { label: "-", note: "Chưa đủ dữ liệu.", accent: "#64748b" };
  }

  if (dewPoint >= 24) {
    return {
      label: "Ẩm rít, oi bức",
      note: "Nguy cơ ngưng tụ cao khi bề mặt lạnh hơn điểm sương.",
      accent: "#ef4444",
    };
  }

  if (dewPoint >= 20) {
    return {
      label: "Ẩm, dễ khó chịu",
      note: "Theo dõi các khung giờ đêm và sáng sớm.",
      accent: "#f97316",
    };
  }

  if (dewPoint >= 16) {
    return {
      label: "Dễ chịu",
      note: "Độ ẩm cảm nhận đang ở vùng ổn định.",
      accent: "#22c55e",
    };
  }

  return {
    label: "Khô thoáng",
    note: "Nguy cơ ngưng tụ thấp.",
    accent: "#3b82f6",
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
      return clamp(value / 4095, 0, 1);
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
            <span>{title}</span>
          </div>
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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
  align = "left",
}) => {
  const isPanel = variant === "panel";
  const isRightAligned = align === "right";

  return (
    <div className={cn(isRightAligned && "text-right")}>
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
            marginLeft: isRightAligned ? "auto" : undefined,
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
  const level = clamp(value / 4095, 0, 1);
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
  <div className="min-w-[225px] rounded-lg border border-border/50 bg-card/40 px-3 py-[11px] dark:bg-slate-900/40 sm:min-w-[250px]">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
    <div className="mt-1.5 space-y-1.5">
      {datasets.map((dataset) => (
        <div
          key={`${mode}-${dataset.key}`}
          className="flex items-center justify-between gap-3 rounded border border-border/30 bg-background/25 px-2 py-1 dark:bg-slate-950/15"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: dataset.color }}
            />
            <span className="whitespace-nowrap text-[13px] font-medium text-foreground/80">{dataset.label}</span>
          </div>
          <span className="shrink-0 whitespace-nowrap pl-1 text-sm font-bold tracking-tight text-foreground">
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
}) => {
  const dewPoint = calculateDewPoint(temperature, humidity);
  const dewPointStatus = getDewPointStatus(dewPoint);

  return (
    <OverviewSurface
      icon={Thermometer}
      title="Nhiệt độ & Độ ẩm"
      accent="#ff9b43"
      variant="panel"
      bodyClassName="flex flex-1 flex-col"
    >
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

      <div className="flex flex-col items-center py-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground dark:text-slate-400">
          Điểm sương
        </p>
        <p
          className="mt-1.5 text-[1.2rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ color: dewPointStatus.accent }}
        >
          {dewPoint !== null ? `${formatNumber(dewPoint, 1)}°C` : "—"}
        </p>
        <p className="mt-1 text-xs font-medium" style={{ color: dewPointStatus.accent }}>
          {dewPointStatus.label}
        </p>
      </div>

      <div className="mt-auto h-[118px] border-t border-border/60 dark:border-slate-800/90">
        <div className="grid h-full grid-cols-2 gap-3 sm:gap-4">
          <StatusBanner
            accent={temperatureStatus.accent}
            label={temperatureStatus.label}
            note={temperatureStatus.note}
            icon={Thermometer}
            className="h-full pt-4"
          />
          <StatusBanner
            accent={humidityStatus.accent}
            label={humidityStatus.label}
            note={humidityStatus.note}
            icon={Droplets}
            className="h-full pt-4"
          />
        </div>
      </div>
    </OverviewSurface>
  );
};

const LightOverviewCard = ({ lux, bb, fr, status }) => (
  <OverviewSurface
    icon={SunMedium}
    title="Cường độ ánh sáng"
    accent="#facc15"
    variant="panel"
    bodyClassName="flex flex-1 flex-col"
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
        label="Broadband"
        value={formatNumber(bb, 0)}
        suffix=""
        accent="#ff9b43"
        ratio={getProgressRatio("bb", bb)}
        variant="panel"
      />
      <MetricBarRow
        label="IR"
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
      className="mt-auto w-full"
    />
  </OverviewSurface>
);

const UvOverviewCard = ({ uva, uvb, uvi, status }) => (
  <OverviewSurface
    icon={Sparkles}
    title="Cảm biến UV"
    accent="#a855f7"
    variant="panel"
    bodyClassName="flex flex-1 flex-col"
  >
    <div className="space-y-5">
      <MetricBarRow
        label="UVA"
        value={formatNumber(uva, 2)}
        suffix=""
        accent="#9333ea"
        ratio={clamp(uva / 20, 0, 1)}
        variant="panel"
      />
      <MetricBarRow
        label="UVB"
        value={formatNumber(uvb, 2)}
        suffix=""
        accent="#a78bfa"
        ratio={clamp(uvb / 20, 0, 1)}
        variant="panel"
      />
      <MetricBarRow
        label="UV Index"
        value={formatNumber(uvi, 2)}
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
      className="mt-auto w-full"
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
    </div>
    <StatusBanner
      accent={status.accent}
      label={status.label}
      note={status.note}
      icon={Activity}
      withDivider
      className="mt-auto w-full text-left"
    />
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

const EmptyDashboardState = ({ title, description, selectedDevice }) => (
  <div className="mt-6 lg:mt-8">
    <div className="flex min-h-[420px] items-center justify-center px-6 text-center sm:px-8 lg:px-10">
      <div className="max-w-lg">
        <p className="text-xl font-semibold tracking-[-0.03em] text-foreground">{title}</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        {selectedDevice ? (
          <p className="mt-2 text-xs text-muted-foreground">Thiết bị đang chọn: {selectedDevice.id}</p>
        ) : null}
      </div>
    </div>
  </div>
);

const DeviceHeader = ({ selectedDevice, empty = false }) => {
  if (!selectedDevice) {
    return null;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-foreground sm:mt-2 sm:text-4xl sm:leading-tight sm:tracking-[-0.05em] lg:text-5xl">
        {selectedDevice.type}
      </h1>
      <div className="mt-4 space-y-1 text-sm leading-6 text-muted-foreground">
        <p>ID: {selectedDevice.id}</p>
        <p>Vị trí: {selectedDevice.location}</p>
      </div>
    </div>
  );
};

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

const EnvironmentSensorDashboard = ({
  devices = [],
  selectedDevice = null,
  selectedDeviceSnapshot = null,
}) => {
  const currentSnapshot = normalizeSnapshot(selectedDeviceSnapshot ?? {});

  const [historyByDevice, setHistoryByDevice] = useState({});
  const [selectedTab, setSelectedTab] = useState("tempHumidity");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const lastSampleKey = useRef("");
  const chartRef = useRef(null);
  const lastRecordedTime = useRef(0);
  const lastDeviceId = useRef("");

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
    if (chartRef.current && chartRef.current.resetZoom) {
      chartRef.current.resetZoom();
    }
  }, [selectedTab, selectedDevice]);

  useEffect(() => {
    if (!selectedDevice) {
      lastSampleKey.current = "";
      return;
    }

    if (selectedDevice.id !== lastDeviceId.current) {
      lastDeviceId.current = selectedDevice.id;
      lastRecordedTime.current = 0;
    }

    const sampleKey = [
      selectedDevice.id,
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

     const now = Date.now();
     if (lastRecordedTime.current !== 0 && now - lastRecordedTime.current < 1000) {
       return;
     }

    lastSampleKey.current = sampleKey;
    lastRecordedTime.current = now;

    setHistoryByDevice((previous) => {
      const previousHistory = previous[selectedDevice.id] || [];
      const nextEntry = {
        time: Date.now(),
        temperature: roundMetricValue("temperature", currentSnapshot.temperature),
        humidity: roundMetricValue("humidity", currentSnapshot.humidity),
        lux: roundMetricValue("lux", currentSnapshot.lux),
        bb: roundMetricValue("bb", currentSnapshot.bb),
        fr: roundMetricValue("fr", currentSnapshot.fr),
        uvi: roundMetricValue("uvi", currentSnapshot.uvi),
        uva: roundMetricValue("uva", currentSnapshot.uva),
        uvb: roundMetricValue("uvb", currentSnapshot.uvb),
        sound: roundMetricValue("sound", currentSnapshot.sound),
      };

      const trimmed = [...previousHistory, nextEntry].filter(
        (entry) => entry.time >= Date.now() - HISTORY_WINDOW
      );

      return {
        ...previous,
        [selectedDevice.id]: trimmed.slice(-2600),
      };
    });
  }, [
    selectedDevice,
    currentSnapshot?.temperature,
    currentSnapshot?.humidity,
    currentSnapshot?.lux,
    currentSnapshot?.bb,
    currentSnapshot?.fr,
    currentSnapshot?.uvi,
    currentSnapshot?.uva,
    currentSnapshot?.uvb,
    currentSnapshot?.sound,
    currentSnapshot?.timestamp,
  ]);

  const history = selectedDevice ? historyByDevice[selectedDevice.id] || [] : [];
  const displayHistory = history.length
    ? history
    : [
        {
          time: Date.now(),
          temperature: roundMetricValue("temperature", currentSnapshot.temperature),
          humidity: roundMetricValue("humidity", currentSnapshot.humidity),
          lux: roundMetricValue("lux", currentSnapshot.lux),
          bb: roundMetricValue("bb", currentSnapshot.bb),
          fr: roundMetricValue("fr", currentSnapshot.fr),
          uvi: roundMetricValue("uvi", currentSnapshot.uvi),
          uva: roundMetricValue("uva", currentSnapshot.uva),
          uvb: roundMetricValue("uvb", currentSnapshot.uvb),
          sound: roundMetricValue("sound", currentSnapshot.sound),
        },
      ];
  const rangeHistory = displayHistory.slice(-120);
  const chartHistory = displayHistory.slice(-20);
  const cardHistory = displayHistory.slice(-18);
  const tabDefinition = TAB_CONFIG[selectedTab];

  const emptyStateTitle = !devices.length
    ? "Chưa đăng ký thiết bị nào"
    : !selectedDevice
      ? "Chưa chọn thiết bị"
      : `Thiết bị ${selectedDevice.id} chưa có dữ liệu`;
  const emptyStateDescription = !devices.length
    ? "Đăng ký ít nhất một thiết bị ở thanh bên trái để bắt đầu theo dõi dữ liệu môi trường."
    : !selectedDevice
      ? "Chọn một thiết bị trong danh sách để xem dữ liệu của thiết bị đó."
      : "Chọn một thiết bị cảm biến môi trường để hiển thị giao diện theo dõi.";

  if (!devices.length || !selectedDevice) {
    return (
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-35">
          <div className="absolute left-[10%] top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-[120px] dark:bg-cyan-500/8" />
          <div className="absolute right-[6%] top-32 h-64 w-64 rounded-full bg-fuchsia-400/8 blur-[130px] dark:bg-fuchsia-500/8" />
          <div className="absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-emerald-400/8 blur-[150px] dark:bg-emerald-500/6" />
        </div>

        <div className="container relative px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="p-3 sm:p-5 lg:p-8">
            {selectedDevice ? (
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <DeviceHeader selectedDevice={selectedDevice} />
              </div>
            ) : null}

            <EmptyDashboardState
              title={emptyStateTitle}
              description={emptyStateDescription}
              selectedDevice={selectedDevice}
            />
          </div>
        </div>
      </section>
    );
  }

  const latestEntry = displayHistory[displayHistory.length - 1];
  const previousEntry = displayHistory[Math.max(0, displayHistory.length - 2)] || latestEntry;
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
  const dailyMaxTemperature = findDailyPeak(displayHistory, "temperature");
  const dailyMaxUvi = findDailyPeak(displayHistory, "uvi");
  const abnormalSoundEvents = displayHistory.filter((entry) => entry.sound >= 2000);
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
      value: formatNumber(latestEntry.uvi, 2),
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
      fill: false,
      borderWidth: 2.8,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointBackgroundColor: dataset.color,
      pointBorderColor: isDarkMode ? "#08111f" : "#ffffff",
      pointBorderWidth: 2,
      tension: 0,
      yAxisID: dataset.yAxisID,
      metricKey: dataset.key,
      unit: dataset.unit,
    })),
  };

  const chartHistoryRef = useRef(chartHistory);
  useEffect(() => {
    chartHistoryRef.current = chartHistory;
  }, [chartHistory]);

  const chartOptions = useMemo(() => {
    return {
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
            title: (items) => {
              if (items[0] && chartHistoryRef.current[items[0].dataIndex]) {
                return formatTooltipTimestamp(chartHistoryRef.current[items[0].dataIndex].time);
              }
              return "";
            },
            label: (context) =>
              `${context.dataset.label}: ${formatMetricValue(
                context.dataset.metricKey,
                context.parsed.y,
                context.dataset.metricKey === "bb" || context.dataset.metricKey === "fr"
              )}`,
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "y",
            scaleMode: "y",
          },
          pan: {
            enabled: true,
            mode: "y",
            scaleMode: "y",
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
          grid: {
            color: isDarkMode ? "rgba(148, 163, 184, 0.12)" : "rgba(148, 163, 184, 0.18)",
          },
          ticks: {
            color: isDarkMode ? "#90a3bf" : "#526075",
            callback: (value) => formatAxisTick(value),
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
                grid: {
                  drawOnChartArea: false,
                },
                ticks: {
                  color: isDarkMode ? "#90a3bf" : "#526075",
                  callback: (value) => formatAxisTick(value),
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
  }, [isDarkMode, tabDefinition]);

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

      return [
        {
          metric: "Biến động nhiệt độ",
          value: `${formatNumber(tempStats.max - tempStats.min, 1)}°C`,
          note: `Nhiệt độ dao động từ ${tempStats.min.toFixed(1)}°C đến ${tempStats.max.toFixed(1)}°C.`,
        },
        {
          metric: "Biến động độ ẩm",
          value: `${formatNumber(humidityStats.max - humidityStats.min, 0)}%`,
          note: `Độ ẩm dao động từ ${humidityStats.min.toFixed(0)}% đến ${humidityStats.max.toFixed(0)}%.`,
        },
        {
          metric: "Xu hướng nhiệt",
          value: tempTrend === 0 ? "Ổn định" : tempTrend > 0 ? "Tăng dần" : "Giảm dần",
          note: `Nhiệt độ thay đổi ${tempTrend === 0 ? "ổn định" : `${tempTrend > 0 ? "tăng" : "giảm"} ${Math.abs(tempTrend).toFixed(1)}°C`} trong 20 mẫu qua.`,
        },
        {
          metric: "Xu hướng độ ẩm",
          value: humidityTrend === 0 ? "Ổn định" : humidityTrend > 0 ? "Tăng dần" : "Giảm dần",
          note: `Độ ẩm thay đổi ${humidityTrend === 0 ? "ổn định" : `${humidityTrend > 0 ? "tăng" : "giảm"} ${Math.abs(humidityTrend).toFixed(0)}%`} trong 20 mẫu qua.`,
        },
      ];
    }

    if (selectedTab === "light") {
      const luxStats = getStatWindow(chartHistory, "lux");
      const luxTrend = getTrend(chartHistory, "lux", latestEntry.lux);
      const balance = latestEntry.fr === 0 ? 0 : latestEntry.bb / latestEntry.fr;

      return [
        {
          metric: "Cường độ sáng đỉnh",
          value: formatMetricValue("lux", luxStats.max),
          note: `Mức sáng cực đại trong 20 mẫu qua.`,
        },
        {
          metric: "Biến động ánh sáng",
          value: describeVolatility(luxStats.max - luxStats.min, 200, 800),
          note: `Biên độ dao động nguồn sáng: ${formatNumber(luxStats.max - luxStats.min, 0)} lux.`,
        },
        {
          metric: "Tỷ lệ BB/FR (Băng rộng/Hồng ngoại)",
          value: `${formatNumber(balance, 2)}`,
          note: balance >= 2 ? "Băng rộng chiếm ưu thế." : "Cân bằng hoặc hồng ngoại cao.",
        },
        {
          metric: "Xu hướng sáng",
          value: luxTrend === 0 ? "Ổn định" : luxTrend > 0 ? "Tăng dần" : "Giảm dần",
          note: `Ánh sáng thay đổi ${luxTrend === 0 ? "ổn định" : `${luxTrend > 0 ? "tăng" : "giảm"} ${Math.abs(luxTrend).toFixed(0)} lux`} trong 20 mẫu qua.`,
        },
      ];
    }

    if (selectedTab === "uv") {
      const uviStats = getStatWindow(chartHistory, "uvi");
      const uviTrend = getTrend(chartHistory, "uvi", latestEntry.uvi);
      const uvMix = latestEntry.uvb === 0 ? latestEntry.uva : latestEntry.uva / latestEntry.uvb;

      return [
        {
          metric: "Mức phơi nhiễm UV",
          value: uvStatus.label,
          note: `Mức độ phơi nhiễm tia cực tím (UVI hiện tại: ${latestEntry.uvi.toFixed(2)}).`,
        },
        {
          metric: "Đỉnh chỉ số UVI",
          value: formatMetricValue("uvi", uviStats.max),
          note: `Chỉ số UVI cực đại trong 20 mẫu qua.`,
        },
        {
          metric: "Tỷ lệ UVA/UVB",
          value: `${formatNumber(uvMix, 2)}`,
          note: uvMix >= 8 ? "Tia UVA chiếm ưu thế." : "Tia UVB có xu hướng tăng.",
        },
        {
          metric: "Xu hướng UVI",
          value: uviTrend === 0 ? "Ổn định" : uviTrend > 0 ? "Tăng dần" : "Giảm dần",
          note: `Chỉ số UV thay đổi ${uviTrend === 0 ? "ổn định" : `${uviTrend > 0 ? "tăng" : "giảm"} ${Math.abs(uviTrend).toFixed(2)}`} trong 20 mẫu qua.`,
        },
      ];
    }

    const soundRange = getStatWindow(chartHistory, "sound");
    const soundTrend = getTrend(chartHistory, "sound", latestEntry.sound);
    const alertsInWindow = chartHistory.filter((entry) => entry.sound >= 2000).length;

    return [
      {
        metric: "Mức âm thanh nền",
        value: formatMetricValue("sound", soundRange.min),
        note: "Mức âm thanh nền tối thiểu trong 20 mẫu qua.",
      },
      {
        metric: "Cường độ âm đỉnh",
        value: formatMetricValue("sound", soundRange.max),
        note: "Cực đại độ ồn trong 20 mẫu qua.",
      },
      {
        metric: "Sự kiện vượt ngưỡng",
        value: `${alertsInWindow} lần`,
        note: alertsInWindow ? "Đã phát hiện độ ồn vượt ngưỡng cảnh báo 2000 dBA." : "Chưa phát hiện sự kiện vượt ngưỡng 2000 dBA.",
      },
      {
        metric: "Xu hướng độ ồn",
        value: soundTrend === 0 ? "Ổn định" : soundTrend > 0 ? "Tăng dần" : "Giảm dần",
        note: `Độ ồn thay đổi ${soundTrend === 0 ? "ổn định" : `${soundTrend > 0 ? "tăng" : "giảm"} ${Math.abs(soundTrend).toFixed(0)} dBA`} trong 20 mẫu qua.`,
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

      <div className="container relative px-3 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6">
        <div className="p-2 sm:p-4 lg:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <DeviceHeader selectedDevice={selectedDevice} />
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

          <div className="mt-6 flex flex-col gap-4 lg:mt-8">
            <section className="min-w-0 rounded-lg border border-border/60 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    {tabDefinition.title}
                  </h2>

                  <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:justify-self-end">
                    <div className="flex min-w-max flex-nowrap justify-start gap-2 sm:justify-end">
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
                </div>

                <div className="flex w-fit flex-wrap gap-2">
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
                  <Line ref={chartRef} data={chartData} options={chartOptions} />
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

const AirSensorDashboardPlaceholder = ({ selectedDevice }) => (
  <section className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 opacity-35">
      <div className="absolute left-[10%] top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-[120px] dark:bg-cyan-500/8" />
      <div className="absolute right-[6%] top-32 h-64 w-64 rounded-full bg-fuchsia-400/8 blur-[130px] dark:bg-fuchsia-500/8" />
      <div className="absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-emerald-400/8 blur-[150px] dark:bg-emerald-500/6" />
    </div>

      <div className="container relative px-3 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6">
        <div className="p-2 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <DeviceHeader selectedDevice={selectedDevice} />
        </div>

        <div className="mt-6 lg:mt-8">
          <div className="flex min-h-[420px] items-center justify-center px-6 text-center sm:px-8 lg:px-10">
            <div className="max-w-lg">
              <p className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                Màn hình cảm biến không khí sẽ làm riêng
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Thiết bị này đã được tách sang luồng giao diện khác. Hiện tại chỉ màn cảm biến môi trường đã hoàn thiện.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const DashboardSection = (props) => {
  const deviceType = props.selectedDevice?.type?.trim().toLowerCase();
  const deviceId = props.selectedDevice?.id?.trim();
  const topic =
    deviceType === "cảm biến môi trường"
      ? `env_v2/${deviceId}/data`
      : deviceType === "cảm biến không khí"
        ? `dust_v2/${deviceId}/data`
        : "";
  const selectedDeviceSnapshot = useDeviceMqttData({
    topic,
    enabled: Boolean(deviceId),
  });

  if (deviceType === "cảm biến không khí") {
    return (
      <AirSensorDashboard
        {...props}
        selectedDeviceSnapshot={selectedDeviceSnapshot}
      />
    );
  }

  return (
    <EnvironmentSensorDashboard
      {...props}
      selectedDeviceSnapshot={selectedDeviceSnapshot}
    />
  );
};
