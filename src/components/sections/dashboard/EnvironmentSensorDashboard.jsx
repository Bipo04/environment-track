import { useEffect, useRef, useState, useMemo } from "react";
import {
  ChevronDown,
  Droplets,
  Sparkles,
  SunMedium,
  Thermometer,
  TriangleAlert,
  Volume2,
  Plus,
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
import { PM10Card } from "./PM10Card";
import { PM25Card } from "./PM25Card";
import {
  TemperatureHumidityOverviewCard,
  LightOverviewCard,
  UvOverviewCard,
  SoundOverviewCard,
  Co2OverviewCard,
  SpectralOverviewCard,
  OverviewSurface,
  StatusBanner,
} from "./EnvironmentOverviewCards";

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

export const TAB_CONFIG = {
  pm25: {
    label: "Bụi mịn PM2.5",
    title: "Biểu đồ bụi mịn PM2.5",
    subtitle: "",
    datasets: [
      {
        key: "pm25",
        label: "Nồng độ PM2.5",
        color: "#0ea5e9",
        unit: " µg/m³",
        yAxisID: "y",
      },
      {
        key: "pm25_aqi",
        label: "PM2.5 AQI",
        color: "#f59e0b",
        unit: "",
        yAxisID: "y1",
      },
    ],
    axisLabel: "PM2.5 (µg/m³)",
    secondaryAxisLabel: "AQI",
  },
  pm10: {
    label: "Bụi mịn PM10",
    title: "Biểu đồ bụi mịn PM10",
    subtitle: "",
    datasets: [
      {
        key: "pm10",
        label: "Nồng độ PM10",
        color: "#6366f1",
        unit: " µg/m³",
        yAxisID: "y",
      },
      {
        key: "pm10_aqi",
        label: "PM10 AQI",
        color: "#10b981",
        unit: "",
        yAxisID: "y1",
      },
    ],
    axisLabel: "PM10 (µg/m³)",
    secondaryAxisLabel: "AQI",
  },
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
  co2: {
    label: "CO₂",
    title: "Biểu đồ nồng độ CO₂",
    subtitle: "",
    datasets: [
      {
        key: "co2",
        label: "CO₂",
        color: "#34d399",
        unit: " ppm",
        yAxisID: "y",
      },
    ],
    axisLabel: "CO₂ (ppm)",
  },
  spectral: {
    label: "Quang phổ",
    title: "Biểu đồ quang phổ AS7341",
    subtitle: "",
    datasets: [
      { key: "f1", label: "F1 Tím (415nm)", color: "#7c3aed", unit: "", yAxisID: "y" },
      { key: "f2", label: "F2 Chàm (445nm)", color: "#4f46e5", unit: "", yAxisID: "y" },
      { key: "f3", label: "F3 Lam (480nm)", color: "#2563eb", unit: "", yAxisID: "y" },
      { key: "f4", label: "F4 Lục lam (515nm)", color: "#0891b2", unit: "", yAxisID: "y" },
      { key: "f5", label: "F5 Lục (555nm)", color: "#16a34a", unit: "", yAxisID: "y" },
      { key: "f6", label: "F6 Vàng (590nm)", color: "#ca8a04", unit: "", yAxisID: "y" },
      { key: "f7", label: "F7 Đỏ cam (630nm)", color: "#ea580c", unit: "", yAxisID: "y" },
      { key: "f8", label: "F8 Đỏ (680nm)", color: "#dc2626", unit: "", yAxisID: "y" },
    ],
    axisLabel: "Cường độ",
  },
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const parseLooseNumber = (value) => {
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

export const withAlpha = (hex, alpha) => {
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

export const wave = (index, speed, offset = 0) =>
  Math.sin(index * speed + offset) * 0.6 +
  Math.cos(index * speed * 0.42 + offset) * 0.4;

export const calculateAqi = (val, breakpoints) => {
  for (let i = 0; i < breakpoints.length; i++) {
    const bp = breakpoints[i];
    if (val <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (val - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }
  return 500;
};

export const calculatePm25Aqi = (pm25) => {
  if (pm25 < 0) return 0;
  const breakpoints = [
    { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
  ];
  return calculateAqi(pm25, breakpoints);
};

export const calculatePm10Aqi = (pm10) => {
  if (pm10 < 0) return 0;
  const breakpoints = [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
    { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
    { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
    { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
    { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
    { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
  ];
  return calculateAqi(pm10, breakpoints);
};

export const getAirQualityStatus = (aqi) => {
  if (aqi <= 50) return "Tốt";
  if (aqi <= 100) return "Trung bình";
  if (aqi <= 150) return "Kém";
  if (aqi <= 200) return "Xấu";
  if (aqi <= 300) return "Rất xấu";
  return "Nguy hại";
};

export const normalizeSnapshot = (snapshot) => ({
  temperature: parseLooseNumber(snapshot?.temperature),
  humidity: parseLooseNumber(snapshot?.humidity),
  lux: parseLooseNumber(snapshot?.lux),
  bb: parseLooseNumber(snapshot?.bb ?? snapshot?.broadband),
  fr: parseLooseNumber(snapshot?.fr ?? snapshot?.infrared),
  uvi: parseLooseNumber(snapshot?.uvi ?? snapshot?.UVI),
  uva: parseLooseNumber(snapshot?.uva ?? snapshot?.UVA),
  uvb: parseLooseNumber(snapshot?.uvb ?? snapshot?.UVB),
  sound: parseLooseNumber(snapshot?.sound),
  pm25: parseLooseNumber(snapshot?.pm25),
  pm10: parseLooseNumber(snapshot?.pm10),
  pm25_aqi: parseLooseNumber(snapshot?.pm25_aqi),
  pm10_aqi: parseLooseNumber(snapshot?.pm10_aqi),
  aqi: parseLooseNumber(snapshot?.aqi),
  co2: parseLooseNumber(snapshot?.co2),
  f1: parseLooseNumber(snapshot?.f1),
  f2: parseLooseNumber(snapshot?.f2),
  f3: parseLooseNumber(snapshot?.f3),
  f4: parseLooseNumber(snapshot?.f4),
  f5: parseLooseNumber(snapshot?.f5),
  f6: parseLooseNumber(snapshot?.f6),
  f7: parseLooseNumber(snapshot?.f7),
  f8: parseLooseNumber(snapshot?.f8),
  clear: parseLooseNumber(snapshot?.clear),
  nir: parseLooseNumber(snapshot?.nir),
  flicker: parseLooseNumber(snapshot?.flicker),
  timestamp: snapshot?.timestamp || "",
});

export const buildSeedHistory = (baseSnapshot) => {
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

    const pm25 = clamp(
      (base.pm25 || 18.5) + wave(index, 0.08, 1.2) * 8,
      4,
      90
    );
    const pm10 = clamp(
      (base.pm10 || 32.4) + wave(index, 0.07, 2.5) * 14,
      8,
      140
    );

    // CO₂: dao động theo mô hình thông gió (thấp ban đêm, cao ban ngày khi có người)
    const co2Base = base.co2 || 500;
    const occupancyWave = 0.5 + 0.5 * Math.sin((dayFraction - 0.35) * Math.PI * 2);
    const co2 = clamp(
      co2Base + occupancyWave * 280 + rushHour * 120 + wave(index, 0.06, 1.8) * 40,
      400,
      1200
    );

    // Quang phổ AS7341: tỷ lệ theo cường độ ánh sáng mặt trời
    const spectralBase = solarWave * 200 + 20;
    const f1 = clamp(spectralBase * 0.55 + wave(index, 0.14, 0.3) * 15, 0, 800);
    const f2 = clamp(spectralBase * 0.65 + wave(index, 0.12, 0.8) * 18, 0, 800);
    const f3 = clamp(spectralBase * 0.80 + wave(index, 0.16, 1.2) * 22, 0, 800);
    const f4 = clamp(spectralBase * 0.90 + wave(index, 0.13, 1.7) * 25, 0, 800);
    const f5 = clamp(spectralBase * 1.00 + wave(index, 0.11, 2.0) * 28, 0, 800);
    const f6 = clamp(spectralBase * 0.95 + wave(index, 0.15, 2.5) * 24, 0, 800);
    const f7 = clamp(spectralBase * 0.85 + wave(index, 0.18, 3.0) * 20, 0, 800);
    const f8 = clamp(spectralBase * 0.70 + wave(index, 0.20, 3.5) * 16, 0, 800);
    const clear = clamp(spectralBase * 3.5 + wave(index, 0.09, 0.5) * 80, 0, 3000);
    const nir = clamp(spectralBase * 2.2 + wave(index, 0.10, 1.0) * 50, 0, 2000);
    const flicker = clamp(48 + wave(index, 0.25, 0.9) * 4, 40, 60);

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
      pm25: Number(pm25.toFixed(1)),
      pm10: Number(pm10.toFixed(1)),
      pm25_aqi: calculatePm25Aqi(pm25),
      pm10_aqi: calculatePm10Aqi(pm10),
      co2: Math.round(co2),
      f1: Math.round(f1), f2: Math.round(f2), f3: Math.round(f3), f4: Math.round(f4),
      f5: Math.round(f5), f6: Math.round(f6), f7: Math.round(f7), f8: Math.round(f8),
      clear: Math.round(clear), nir: Math.round(nir), flicker: Number(flicker.toFixed(1)),
    });
  }

  return points;
};

export const sampleHistory = (entries, limit) => {
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

export const filterHistoryByRange = (history, rangeKey) => {
  const threshold =
    Date.now() -
    (rangeKey === "1h" ? HOUR : rangeKey === "24h" ? DAY : HISTORY_WINDOW);

  const filtered = history.filter((entry) => entry.time >= threshold);

  return filtered.length ? filtered : history.slice(-48);
};

export const average = (values) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

export const formatCompact = (value) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);

export const formatNumber = (value, digits = 0) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const roundMetricValue = (key, value) => {
  const numericValue = Number(value) || 0;

  switch (key) {
    case "temperature":
    case "pm25":
    case "pm10":
    case "flicker":
      return Number(numericValue.toFixed(1));
    case "uvi":
      return Number(numericValue.toFixed(2));
    case "humidity":
    case "lux":
    case "bb":
    case "fr":
    case "sound":
    case "pm25_aqi":
    case "pm10_aqi":
    case "aqi":
    case "co2":
    case "f1": case "f2": case "f3": case "f4":
    case "f5": case "f6": case "f7": case "f8":
    case "clear": case "nir":
      return Math.round(numericValue);
    case "uva":
    case "uvb":
      return Number(numericValue.toFixed(2));
    default:
      return numericValue;
  }
};

export const getTrendDeadzone = (key) => {
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

export const formatAxisTick = (value) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

export const formatMetricValue = (key, value, compact = false) => {
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
    case "pm25":
      return `${formatNumber(numericValue, 1)} µg/m³`;
    case "pm10":
      return `${formatNumber(numericValue, 1)} µg/m³`;
    case "pm25_aqi":
    case "pm10_aqi":
    case "aqi":
      return `${formatNumber(numericValue, 0)} AQI`;
    case "co2":
      return `${formatNumber(numericValue, 0)} ppm`;
    case "f1": case "f2": case "f3": case "f4":
    case "f5": case "f6": case "f7": case "f8":
      return `${formatNumber(numericValue, 0)}`;
    case "clear":
      return `${formatNumber(numericValue, 0)} lux`;
    case "nir":
      return `${formatNumber(numericValue, 0)} nir`;
    case "flicker":
      return `${formatNumber(numericValue, 1)} Hz`;
    default:
      return `${formatNumber(numericValue, 1)}`;
  }
};

export const formatDelta = (key, value) => {
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

export const formatTimestamp = (time) =>
  new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);

export const formatTooltipTimestamp = (time) =>
  new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(time);

export const formatAxisTimestamp = (time, rangeKey) => {
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

export const getMetricSeries = (entries, key) => entries.map((entry) => Number(entry[key]) || 0);

const MIN_CHART_SPAN = {
  pm25: 15,
  pm10: 25,
  pm25_aqi: 50,
  pm10_aqi: 50,
  temperature: 4,
  humidity: 15,
  lux: 1000,
  bb: 5000,
  fr: 2500,
  uvi: 2.0,
  uva: 2,
  uvb: 0.5,
  sound: 600,
  co2: 150,
  f1: 150,
  f2: 150,
  f3: 150,
  f4: 150,
  f5: 150,
  f6: 150,
  f7: 150,
  f8: 150,
};


const MIN_CHART_LIMIT = {
  temperature: -40,
  humidity: 0,
  lux: 0,
  bb: 0,
  fr: 0,
  uvi: 0,
  uva: 0,
  uvb: 0,
  sound: 0,
  co2: 0,
  f1: 0,
  f2: 0,
  f3: 0,
  f4: 0,
  f5: 0,
  f6: 0,
  f7: 0,
  f8: 0,
  pm25: 0,
  pm10: 0,
  pm25_aqi: 0,
  pm10_aqi: 0,
};

const MAX_CHART_LIMIT = {
  temperature: 60,
  humidity: 100,
  lux: 40000,
  bb: 65535,
  fr: 65535,
  uvi: 15,
  uva: 65535,
  uvb: 65535,
  sound: 2000,
  co2: 5000,
  f1: 65535,
  f2: 65535,
  f3: 65535,
  f4: 65535,
  f5: 65535,
  f6: 65535,
  f7: 65535,
  f8: 65535,
  pm25: 500,
  pm10: 600,
  pm25_aqi: 500,
  pm10_aqi: 500,
};

export const getAxisBounds = (entries, datasets, axisId) => {
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
  const padding = finalSpan * 0.15; // 15% padding for breathing room

  const calculatedMin = midpoint - finalSpan / 2 - padding;
  const calculatedMax = midpoint + finalSpan / 2 + padding;

  const minLimit = Math.min(...axisDatasets.map((dataset) => MIN_CHART_LIMIT[dataset.key] !== undefined ? MIN_CHART_LIMIT[dataset.key] : 0));
  const maxLimit = Math.max(...axisDatasets.map((dataset) => MAX_CHART_LIMIT[dataset.key] !== undefined ? MAX_CHART_LIMIT[dataset.key] : 100000));

  return {
    min: Math.max(minLimit, calculatedMin),
    max: Math.min(maxLimit, calculatedMax),
  };
};


export const getTrend = (entries, key, fallbackValue = 0) => {
  if (entries.length < 2) {
    return 0;
  }

  const baselineIndex = Math.max(0, entries.length - Math.min(6, entries.length));
  const baseline = entries[baselineIndex][key] ?? fallbackValue;
  const current = entries[entries.length - 1][key] ?? fallbackValue;

  const delta = current - baseline;
  return Math.abs(delta) < getTrendDeadzone(key) ? 0 : delta;
};

export const getStatusStyles = (type, value, humidity = 0) => {
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

export const getStatWindow = (entries, key) => {
  const series = getMetricSeries(entries, key);
  return {
    min: Math.min(...series),
    max: Math.max(...series),
    avg: average(series),
    current: series[series.length - 1] ?? 0,
  };
};

export const describeVolatility = (value, low, high) => {
  if (value <= low) {
    return "Thấp";
  }
  if (value <= high) {
    return "Vừa";
  }
  return "Cao";
};

export const findDailyPeak = (history, key) => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const todayEntries = history.filter((entry) => entry.time >= dayStart.getTime());
  const source = todayEntries.length ? todayEntries : history.slice(-144);

  return source.reduce(
    (peak, entry) => (entry[key] > peak[key] ? entry : peak),
    source[0] || history[history.length - 1]
  );
};

export const calculateCorrelation = (entries, keyA, keyB) => {
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

export const getHumidityStatus = (value) => {
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

export const calculateDewPoint = (temperature, humidity) => {
  if (!Number.isFinite(temperature) || !Number.isFinite(humidity) || humidity <= 0) {
    return null;
  }

  const a = 17.27;
  const b = 237.7;
  const gamma = (a * temperature) / (b + temperature) + Math.log(humidity / 100);
  return (b * gamma) / (a - gamma);
};

export const getDewPointStatus = (dewPoint) => {
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

export const getProgressRatio = (key, value) => {
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

export const OverviewCard = ({
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

export const InsightItem = ({ icon: Icon, title, value, detail, accent, emphasis = false }) => (
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

export const DetailCard = ({
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

export const MetricSummaryCard = ({ title, datasets, latestEntry, chartHistory, mode = "current" }) => (
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

export const EmptyDashboardState = ({ title, description, selectedDevice }) => (
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

export const DeviceHeader = ({ selectedDevice, empty = false }) => {
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

export const MiniSparkline = ({ values, color, height = 84 }) => {
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

const ALL_CARDS = {
  pm25: { title: "Bụi mịn PM2.5" },
  pm10: { title: "Bụi mịn PM10" },
  co2: { title: "CO₂ — Khí Carbonic" },
  tempHumidity: { title: "Nhiệt độ & Độ ẩm" },
  light: { title: "Cường độ ánh sáng" },
  uv: { title: "Cảm biến UV" },
  sound: { title: "Âm thanh" },
  spectral: { title: "Quang phổ AS7341" },
};

export const EnvironmentSensorDashboard = ({
  devices = [],
  selectedDevice = null,
  selectedDeviceSnapshot = null,
}) => {
  const currentSnapshot = normalizeSnapshot(selectedDeviceSnapshot ?? {});

  const [historyByDevice, setHistoryByDevice] = useState({});
  const [selectedTab, setSelectedTab] = useState("pm25");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isChartTabDropdownOpen, setIsChartTabDropdownOpen] = useState(false);
  const lastSampleKey = useRef("");
  const chartRef = useRef(null);
  const lastRecordedTime = useRef(0);
  const lastDeviceId = useRef("");

  const DEFAULT_ORDER = [
    "pm25",
    "pm10",
    "co2",
    "tempHumidity",
    "light",
    "uv",
    "sound",
    "spectral",
  ];

  const [cardOrder, setCardOrder] = useState(() => {
    try {
      const stored = localStorage.getItem("envirotrack.dashboard.cardOrder");
      return stored ? JSON.parse(stored) : DEFAULT_ORDER;
    } catch {
      return DEFAULT_ORDER;
    }
  });

  const [visibleCards, setVisibleCards] = useState(() => {
    try {
      const stored = localStorage.getItem("envirotrack.dashboard.visibleCards");
      return stored ? JSON.parse(stored) : DEFAULT_ORDER;
    } catch {
      return DEFAULT_ORDER;
    }
  });

  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [draggedCardKey, setDraggedCardKey] = useState(null);

  const handleDragStart = (e, key) => {
    setDraggedCardKey(key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    if (!draggedCardKey || draggedCardKey === targetKey) return;

    const oldIndex = cardOrder.indexOf(draggedCardKey);
    const newIndex = cardOrder.indexOf(targetKey);

    const updatedOrder = [...cardOrder];
    updatedOrder.splice(oldIndex, 1);
    updatedOrder.splice(newIndex, 0, draggedCardKey);

    setCardOrder(updatedOrder);
    localStorage.setItem("envirotrack.dashboard.cardOrder", JSON.stringify(updatedOrder));
    setDraggedCardKey(null);
  };

  const handleHideCard = (key) => {
    const updated = visibleCards.filter((c) => c !== key);
    setVisibleCards(updated);
    localStorage.setItem("envirotrack.dashboard.visibleCards", JSON.stringify(updated));
  };

  const handleShowCard = (key) => {
    if (!visibleCards.includes(key)) {
      const updated = [...visibleCards, key];
      setVisibleCards(updated);
      localStorage.setItem("envirotrack.dashboard.visibleCards", JSON.stringify(updated));
    }
    setIsAddDropdownOpen(false);
  };

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

  // Seed history on device change
  useEffect(() => {
    if (!selectedDevice) {
      return;
    }

    setHistoryByDevice((previous) => {
      if (previous[selectedDevice.id]) {
        return previous;
      }
      const seed = buildSeedHistory(currentSnapshot);
      return {
        ...previous,
        [selectedDevice.id]: seed,
      };
    });
  }, [selectedDevice, currentSnapshot]);

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
      currentSnapshot.pm25,
      currentSnapshot.pm10,
      currentSnapshot.pm25_aqi,
      currentSnapshot.pm10_aqi,
      currentSnapshot.co2,
      currentSnapshot.f1,
      currentSnapshot.f5,
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
        pm25: roundMetricValue("pm25", currentSnapshot.pm25),
        pm10: roundMetricValue("pm10", currentSnapshot.pm10),
        pm25_aqi: roundMetricValue("pm25_aqi", currentSnapshot.pm25_aqi),
        pm10_aqi: roundMetricValue("pm10_aqi", currentSnapshot.pm10_aqi),
        co2: roundMetricValue("co2", currentSnapshot.co2),
        f1: roundMetricValue("f1", currentSnapshot.f1),
        f2: roundMetricValue("f2", currentSnapshot.f2),
        f3: roundMetricValue("f3", currentSnapshot.f3),
        f4: roundMetricValue("f4", currentSnapshot.f4),
        f5: roundMetricValue("f5", currentSnapshot.f5),
        f6: roundMetricValue("f6", currentSnapshot.f6),
        f7: roundMetricValue("f7", currentSnapshot.f7),
        f8: roundMetricValue("f8", currentSnapshot.f8),
        clear: roundMetricValue("clear", currentSnapshot.clear),
        nir: roundMetricValue("nir", currentSnapshot.nir),
        flicker: roundMetricValue("flicker", currentSnapshot.flicker),
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
    currentSnapshot?.pm25,
    currentSnapshot?.pm10,
    currentSnapshot?.pm25_aqi,
    currentSnapshot?.pm10_aqi,
    currentSnapshot?.co2,
    currentSnapshot?.f1,
    currentSnapshot?.f5,
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
          pm25: roundMetricValue("pm25", currentSnapshot.pm25),
          pm10: roundMetricValue("pm10", currentSnapshot.pm10),
          pm25_aqi: roundMetricValue("pm25_aqi", currentSnapshot.pm25_aqi),
          pm10_aqi: roundMetricValue("pm10_aqi", currentSnapshot.pm10_aqi),
          co2: roundMetricValue("co2", currentSnapshot.co2),
          f1: roundMetricValue("f1", currentSnapshot.f1),
          f2: roundMetricValue("f2", currentSnapshot.f2),
          f3: roundMetricValue("f3", currentSnapshot.f3),
          f4: roundMetricValue("f4", currentSnapshot.f4),
          f5: roundMetricValue("f5", currentSnapshot.f5),
          f6: roundMetricValue("f6", currentSnapshot.f6),
          f7: roundMetricValue("f7", currentSnapshot.f7),
          f8: roundMetricValue("f8", currentSnapshot.f8),
          clear: roundMetricValue("clear", currentSnapshot.clear),
          nir: roundMetricValue("nir", currentSnapshot.nir),
          flicker: roundMetricValue("flicker", currentSnapshot.flicker),
        },
      ];
  const chartHistory = displayHistory.slice(-20);
  const tabDefinition = TAB_CONFIG[selectedTab];

  const chartHistoryRef = useRef(chartHistory);
  useEffect(() => {
    chartHistoryRef.current = chartHistory;
  }, [chartHistory]);

  const chartOptions = useMemo(() => {
    const yBounds = getAxisBounds(chartHistory, tabDefinition.datasets, "y");
    const y1Bounds = getAxisBounds(chartHistory, tabDefinition.datasets, "y1");

    const yDatasets = tabDefinition.datasets.filter((d) => d.yAxisID === "y" || !d.yAxisID);
    const yLimitMin = yDatasets.length
      ? Math.min(...yDatasets.map((d) => (MIN_CHART_LIMIT[d.key] !== undefined ? MIN_CHART_LIMIT[d.key] : 0)))
      : undefined;
    const yLimitMax = yDatasets.length
      ? Math.max(...yDatasets.map((d) => (MAX_CHART_LIMIT[d.key] !== undefined ? MAX_CHART_LIMIT[d.key] : 100000)))
      : undefined;

    const y1Datasets = tabDefinition.datasets.filter((d) => d.yAxisID === "y1");
    const y1LimitMin = y1Datasets.length
      ? Math.min(...y1Datasets.map((d) => (MIN_CHART_LIMIT[d.key] !== undefined ? MIN_CHART_LIMIT[d.key] : 0)))
      : undefined;
    const y1LimitMax = y1Datasets.length
      ? Math.max(...y1Datasets.map((d) => (MAX_CHART_LIMIT[d.key] !== undefined ? MAX_CHART_LIMIT[d.key] : 100000)))
      : undefined;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
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
          limits: {
            y: {
              min: yLimitMin,
              max: yLimitMax,
            },
            ...(y1Datasets.length
              ? {
                  y1: {
                    min: y1LimitMin,
                    max: y1LimitMax,
                  },
                }
              : {}),
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "xy",
            scaleMode: "xy",
          },
          pan: {
            enabled: true,
            mode: "xy",
            scaleMode: "xy",
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
            autoSkip: false, // Hiện đủ các nhãn thời gian cho 20 điểm
            maxTicksLimit: 20,
            font: {
              family: "Space Grotesk, Segoe UI, sans-serif",
              size: 11,
              weight: 500,
            },
          },
        },
        y: {
          position: "left",
          suggestedMin: yBounds.min !== undefined ? yBounds.min : 0,
          suggestedMax: yBounds.max !== undefined ? yBounds.max : undefined,
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
                suggestedMin: y1Bounds.min !== undefined ? y1Bounds.min : 0,
                suggestedMax: y1Bounds.max !== undefined ? y1Bounds.max : undefined,
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
  }, [isDarkMode, tabDefinition, selectedDevice?.id]); // eslint-disable-next-line react-hooks/exhaustive-deps

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
  const temperatureStatus = getStatusStyles(
    "temperature",
    latestEntry.temperature,
    latestEntry.humidity
  );
  const humidityStatus = getHumidityStatus(latestEntry.humidity);
  const lightStatus = getStatusStyles("light", latestEntry.lux);
  const uvStatus = getStatusStyles("uv", latestEntry.uvi);
  const soundStatus = getStatusStyles("sound", latestEntry.sound);
  const soundBars = sampleHistory(displayHistory.slice(-18), 10).map((entry) => entry.sound);

  const chartData = {
    labels: chartHistory.map((entry) => formatAxisTimestamp(entry.time, "24h")),
    datasets: tabDefinition.datasets.map((dataset) => ({
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




  const renderCard = (key) => {
    switch (key) {
      case "pm25":
        return (
          <PM25Card
            pm25={latestEntry.pm25 || 0}
            aqi={latestEntry.pm25_aqi || 0}
            isDarkMode={isDarkMode}
            onHide={() => handleHideCard("pm25")}
          />
        );
      case "pm10":
        return (
          <PM10Card
            pm10={latestEntry.pm10 || 0}
            aqi={latestEntry.pm10_aqi || 0}
            isDarkMode={isDarkMode}
            onHide={() => handleHideCard("pm10")}
          />
        );
      case "co2":
        return (
          <Co2OverviewCard
            co2={latestEntry.co2 || 0}
            isDarkMode={isDarkMode}
            onHide={() => handleHideCard("co2")}
          />
        );
      case "tempHumidity":
        return (
          <TemperatureHumidityOverviewCard
            temperature={latestEntry.temperature}
            humidity={latestEntry.humidity}
            temperatureStatus={temperatureStatus}
            humidityStatus={humidityStatus}
            isDarkMode={isDarkMode}
            onHide={() => handleHideCard("tempHumidity")}
          />
        );
      case "light":
        return (
          <LightOverviewCard
            lux={latestEntry.lux}
            bb={latestEntry.bb}
            fr={latestEntry.fr}
            status={lightStatus}
            onHide={() => handleHideCard("light")}
          />
        );
      case "uv":
        return (
          <UvOverviewCard
            uva={latestEntry.uva}
            uvb={latestEntry.uvb}
            uvi={latestEntry.uvi}
            status={uvStatus}
            onHide={() => handleHideCard("uv")}
          />
        );
      case "sound":
        return (
          <SoundOverviewCard
            sound={latestEntry.sound}
            status={soundStatus}
            values={soundBars}
            isDarkMode={isDarkMode}
            onHide={() => handleHideCard("sound")}
          />
        );
      case "spectral":
        return (
          <SpectralOverviewCard
            f1={latestEntry.f1} f2={latestEntry.f2} f3={latestEntry.f3} f4={latestEntry.f4}
            f5={latestEntry.f5} f6={latestEntry.f6} f7={latestEntry.f7} f8={latestEntry.f8}
            clear={latestEntry.clear} nir={latestEntry.nir} flicker={latestEntry.flicker}
            onHide={() => handleHideCard("spectral")}
          />
        );
      default:
        return null;
    }
  };

  const hiddenCards = cardOrder.filter((key) => !visibleCards.includes(key));

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

          <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cardOrder
              .filter((key) => visibleCards.includes(key))
              .map((key) => (
                <div
                  key={key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, key)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, key)}
                  className={cn(
                    "transition-all duration-300 cursor-grab active:cursor-grabbing hover:shadow-md",
                    draggedCardKey === key && "opacity-40 scale-95"
                  )}
                >
                  {renderCard(key)}
                </div>
              ))}

            {hiddenCards.length > 0 && (
              <div
                className={cn(
                  "relative flex min-h-[330px] transition-all duration-300 select-none shadow-sm",
                  isAddDropdownOpen
                    ? "flex-col justify-between rounded-lg border border-border bg-card p-4"
                    : "items-center justify-center rounded-lg border-2 border-dashed border-border/70 bg-card/45 p-6 hover:bg-card/70 hover:border-primary/50 cursor-pointer group"
                )}
              >
                {isAddDropdownOpen ? (
                  <div className="flex flex-col h-full justify-between flex-1">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2 mb-3">
                        Thêm thẻ thông số
                      </p>
                      <div className="max-h-[190px] overflow-y-auto space-y-1.5 pr-1">
                        {hiddenCards.map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleShowCard(k)}
                            className="w-full text-left rounded-md px-3 py-2 text-sm bg-muted/40 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer font-medium"
                          >
                            {ALL_CARDS[k].title}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddDropdownOpen(false)}
                      className="mt-4 w-full py-2 rounded-md border border-border/70 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddDropdownOpen(true)}
                    className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full h-full text-muted-foreground group-hover:text-foreground transition-colors"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card shadow-sm group-hover:scale-110 transition-transform duration-300">
                      <Plus className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider">Thêm thông số</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:mt-8">
            <section className="min-w-0 rounded-lg border border-border/60 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground shrink-0">
                    {tabDefinition.title}
                  </h2>

                  <div className="relative lg:justify-self-end shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() => setIsChartTabDropdownOpen((prev) => !prev)}
                      className="flex items-center justify-between gap-3 min-w-[200px] px-4 py-2.5 rounded-lg border border-border/70 bg-card/90 hover:bg-card hover:border-primary/50 text-sm font-medium text-foreground transition-all shadow-sm cursor-pointer"
                    >
                      <span>{tabDefinition.label}</span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isChartTabDropdownOpen && "rotate-180")} />
                    </button>

                    {isChartTabDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40 cursor-default"
                          onClick={() => setIsChartTabDropdownOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1.5 z-50 w-full min-w-[200px] rounded-lg border border-border bg-card dark:bg-slate-900 p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200 backdrop-blur-md">
                          <div className="space-y-1">
                            {Object.entries(TAB_CONFIG).map(([key, tab]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setSelectedTab(key);
                                  setIsChartTabDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer flex items-center justify-between",
                                  selectedTab === key
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <span>{tab.label}</span>
                                {selectedTab === key && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
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
          </div>
        </div>
      </div>
    </section>
  );
};
