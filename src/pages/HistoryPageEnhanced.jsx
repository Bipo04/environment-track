import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DeviceSidebar } from "@/components/sections/dashboard/DeviceSidebar";
import { historyService } from "@/services/historyService";
import {
  loadSelectedDeviceId,
  loadStoredDevices,
  saveSelectedDeviceId,
  saveStoredDevices,
} from "@/lib/deviceStorage";
import {
  getCombinedMetricBounds,
  getMetricBounds,
  getZoomLimitsForMetrics,
} from "@/components/sections/dashboard/EnvironmentSensorDashboard";

const HISTORY_TABLE_PAGE_SIZES = [10, 20, 50, 100];

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

/** Cùng cấu hình zoom/pan trục Y như dashboard live */
const HISTORY_CHART_ZOOM_PLUGIN = {
  zoom: {
    wheel: { enabled: true },
    pinch: { enabled: true },
    mode: "y",
    scaleMode: "y",
  },
  pan: {
    enabled: true,
    mode: "y",
    scaleMode: "y",
  },
};

const CHART_ZOOM_HINT =
  "Cuộn chuột trên biểu đồ để thay đổi biên độ trục Y, kéo để dịch; đổi bộ lọc sẽ đặt lại thang.";

const buildBoundedYScale = (bounds, scaleConfig = {}) => ({
  ...scaleConfig,
  suggestedMin: bounds.min,
  suggestedMax: bounds.max,
  grace: 0,
});

const withHistoryChartZoom = (options, scaleKeys = {}) => {
  const limits = {};

  if (scaleKeys.y?.length) {
    limits.y = getZoomLimitsForMetrics(scaleKeys.y);
  }
  if (scaleKeys.y1?.length) {
    limits.y1 = getZoomLimitsForMetrics(scaleKeys.y1);
  }

  return {
    ...options,
    plugins: {
      ...options.plugins,
      zoom: {
        limits,
        ...HISTORY_CHART_ZOOM_PLUGIN,
      },
    },
  };
};

const ANALYTICS_PAGE_SIZE = 100;
const ANALYTICS_MAX_PAGES = 8;

const METRICS = [
  { key: "temperature", label: "Nhiệt độ", unit: "°C", color: "#ef4444", decimals: 1 },
  { key: "humidity", label: "Độ ẩm", unit: "%", color: "#2563eb", decimals: 1 },
  { key: "lux", label: "Ánh sáng", unit: "lux", color: "#f59e0b", decimals: 0 },
  { key: "UVI", label: "UVI", unit: "", color: "#8b5cf6", decimals: 2 },
  { key: "UVA", label: "UVA", unit: "", color: "#a855f7", decimals: 2 },
  { key: "UVB", label: "UVB", unit: "", color: "#c084fc", decimals: 2 },
  { key: "broadband", label: "Broadband", unit: "", color: "#f97316", decimals: 0 },
  { key: "infrared", label: "Hồng ngoại", unit: "", color: "#ec4899", decimals: 0 },
  { key: "sound", label: "Âm thanh", unit: "RMS", color: "#22c55e", decimals: 1 },
  { key: "co2", label: "Khí CO2", unit: "ppm", color: "#10b981", decimals: 0 },
  { key: "scd4x_temperature", label: "Nhiệt độ (SCD40)", unit: "°C", color: "#f43f5e", decimals: 1 },
  { key: "scd4x_humidity", label: "Độ ẩm (SCD40)", unit: "%", color: "#0284c7", decimals: 1 },
  { key: "pm1", label: "PM1.0", unit: "µg/m3", color: "#64748b", decimals: 1 },
  { key: "pm25", label: "PM2.5", unit: "µg/m3", color: "#f97316", decimals: 1 },
  { key: "pm10", label: "PM10", unit: "µg/m3", color: "#334155", decimals: 1 },
  { key: "aqi", label: "AQI", unit: "", color: "#0f766e", decimals: 0 },
  { key: "f1", label: "F1 (415nm)", unit: "", color: "#4f46e5", decimals: 0 },
  { key: "f2", label: "F2 (445nm)", unit: "", color: "#3b82f6", decimals: 0 },
  { key: "f3", label: "F3 (480nm)", unit: "", color: "#06b6d4", decimals: 0 },
  { key: "f4", label: "F4 (515nm)", unit: "", color: "#10b981", decimals: 0 },
  { key: "f5", label: "F5 (555nm)", unit: "", color: "#84cc16", decimals: 0 },
  { key: "f6", label: "F6 (590nm)", unit: "", color: "#eab308", decimals: 0 },
  { key: "f7", label: "F7 (630nm)", unit: "", color: "#f97316", decimals: 0 },
  { key: "f8", label: "F8 (680nm)", unit: "", color: "#ef4444", decimals: 0 },
  { key: "clear", label: "Specter Clear", unit: "", color: "#94a3b8", decimals: 0 },
  { key: "nir", label: "NIR", unit: "", color: "#ec4899", decimals: 0 },
  { key: "flicker", label: "Flicker", unit: "", color: "#a855f7", decimals: 0 },
];

const TIME_MODES = [
  { key: "hour", label: "Theo giờ" },
  { key: "day", label: "Theo ngày" },
  { key: "week", label: "Theo tuần" },
  { key: "month", label: "Theo tháng" },
];

// ─── Date helpers ───────────────────────────────────────────────
/** Format a Date to "YYYY-MM-DD" in LOCAL time (not UTC). */
const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getWeekInputValue = (date) => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const weekNumber =
    1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${target.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
};

const fromWeekInputValue = (value) => {
  const [yearPart, weekPart] = String(value || "").split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);
  if (!Number.isFinite(year) || !Number.isFinite(week)) {
    return new Date();
  }

  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - day + 1 + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/** Resolve a Date from a YYYY-MM-DD string using local midnight. */
const fromLocalDateString = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

/**
 * Given a mode and a reference value (ISO date string for day/week, "YYYY-MM" for month)
 * returns { from, to } as ISO datetime strings for API filtering,
 * and a `refDate` (Date) for heatmap/chart rendering.
 */
const pad = (value) => String(value).padStart(2, "0");

const toLocalIsoString = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const fromLocalDateTimeString = (value) => {
  if (!value) return null;
  const match = String(value).trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return null;
  const [, y, m, d, hh = "0", mm = "0", ss = "0"] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss), 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseApiDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const local = fromLocalDateTimeString(String(value));
  if (local) return local;

  const iso = new Date(String(value));
  return Number.isNaN(iso.getTime()) ? null : iso;
};

const getDateRangeForMode = (mode, value, hour) => {
  const now = new Date();
  if (mode === "hour") {
    const ref = value ? fromLocalDateString(value) : new Date();
    const targetHour = hour !== undefined ? Number(hour) : now.getHours();
    ref.setHours(targetHour, 0, 0, 0);
    const end = new Date(ref.getTime() + 60 * 60 * 1000 - 1);

    // Shift DB query bounds backwards by 13 minutes
    const dbRef = new Date(ref.getTime() - 13 * 60 * 1000);
    const dbEnd = new Date(end.getTime() - 13 * 60 * 1000);

    return { from: toLocalIsoString(dbRef), to: toLocalIsoString(dbEnd), refDate: ref, endDate: end };
  }

  if (mode === "day") {
    const ref = value ? fromLocalDateString(value) : new Date();
    ref.setHours(0, 0, 0, 0);
    const isToday = toLocalDateString(ref) === toLocalDateString(now);
    const end = isToday ? now : (() => { const d = new Date(ref); d.setHours(23, 59, 59, 999); return d; })();
    return { from: toLocalIsoString(ref), to: toLocalIsoString(end), refDate: ref, endDate: end };
  }

  if (mode === "week") {
    const ref = value ? fromWeekInputValue(value) : getStartOfWeek(new Date());
    const end = new Date(ref);
    end.setDate(ref.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const isThisWeek = getStartOfWeek(now).getTime() === getStartOfWeek(ref).getTime();
    const resolvedEnd = isThisWeek ? now : end;
    return { from: toLocalIsoString(ref), to: toLocalIsoString(resolvedEnd), refDate: ref, endDate: resolvedEnd };
  }

  const ref = value ? new Date(`${value}-01T00:00:00`) : new Date();
  ref.setDate(1);
  ref.setHours(0, 0, 0, 0);
  const end = new Date(ref);
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  const isThisMonth = now.getFullYear() === ref.getFullYear() && now.getMonth() === ref.getMonth();
  const resolvedEnd = isThisMonth ? now : end;
  return { from: toLocalIsoString(ref), to: toLocalIsoString(resolvedEnd), refDate: ref, endDate: resolvedEnd };
};

const MODE_POINT_LIMITS = {
  hour: 20,
  day: 24,
  week: 7,
  month: 10,
};

const DAY_SLOT_HOURS = Array.from({ length: 24 }, (_, i) => i);

const MODE_DISTRIBUTION_STEPS = {
  hour: 1,
  day: 1,
  week: 2,
  month: 1,
};

const isSameCalendarDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getInclusiveDayCount = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
};

const buildMonthDayBuckets = (dayCount) => {
  if (dayCount <= 0) {
    return [];
  }

  if (dayCount <= 10) {
    return Array.from({ length: dayCount }, (_, start) => ({ start, end: start, size: 1 }));
  }

  if (dayCount <= 20) {
    const buckets = [];
    for (let start = 0; start < dayCount; ) {
      const remaining = dayCount - start;
      const size = remaining >= 2 ? 2 : 1;
      buckets.push({ start, end: start + size - 1, size });
      start += size;
    }
    return buckets;
  }

  const buckets = [];
  for (let start = 0; start < dayCount; ) {
    const remaining = dayCount - start;
    const size = remaining <= 4 ? remaining : 3;
    buckets.push({ start, end: start + size - 1, size });
    start += size;
  }

  return buckets;
};

const getTimeSlots = (mode, refDate = new Date(), endDate = new Date()) => {
  if (mode === "hour") {
    const start = new Date(refDate);
    const slots = [];
    for (let index = 0; index < 60; index += 1) {
      const slotStart = new Date(start.getTime() + index * 1 * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + 1 * 60 * 1000 - 1);
      const timeLabel = `${slotStart.getHours().toString().padStart(2, "0")}:${slotStart.getMinutes().toString().padStart(2, "0")}`;

      slots.push({
        key: `hour-${slotStart.getTime()}`,
        label: (index % 3 === 0 || index === 59) ? timeLabel : "",
        fullLabel: timeLabel,
        matches: (timestamp) => {
          const date = new Date(timestamp);
          return date >= slotStart && date <= slotEnd;
        },
      });
    }
    return slots;
  }

  if (mode === "day") {
    const ref = new Date(refDate);
    ref.setHours(0, 0, 0, 0);

    return DAY_SLOT_HOURS.map((hour) => {
      const timeLabel = `${hour.toString().padStart(2, "0")}:00`;
      return {
        key: `day-${ref.getFullYear()}-${ref.getMonth()}-${ref.getDate()}-${hour}`,
        label: timeLabel,
        fullLabel: timeLabel,
        matches: (timestamp) => {
          const date = new Date(timestamp);
          return isSameCalendarDay(date, ref) && date.getHours() === hour;
        },
      };
    });
  }

  if (mode === "week") {
    const weekStart = getStartOfWeek(refDate);
    const slots = [];

    for (let index = 0; index < 7; index += 1) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + index);
      dayDate.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayDate);
      dayEnd.setHours(23, 59, 59, 999);
      const timeLabel = dayDate.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });

      slots.push({
        key: `week-${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`,
        label: timeLabel,
        fullLabel: timeLabel,
        matches: (timestamp) => {
          const date = new Date(timestamp);
          return date >= dayDate && date <= dayEnd;
        },
      });
    }

    return slots;
  }

  const monthStart = new Date(refDate);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthStart.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);
  const dayCount = getInclusiveDayCount(monthStart, monthEnd);
  const buckets = buildMonthDayBuckets(dayCount);

  const slots = [];
  for (let index = 0; index < dayCount; index += 1) {
    const dayDate = new Date(monthStart);
    dayDate.setDate(monthStart.getDate() + index);
    dayDate.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Find if this day index is the start of a bucket to display the label
    const bucket = buckets.find((b) => b.start === index);
    let label = "";
    if (bucket) {
      const startDate = new Date(monthStart);
      startDate.setDate(monthStart.getDate() + bucket.start);
      label = startDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    }

    slots.push({
      key: `month-${monthStart.getFullYear()}-${monthStart.getMonth()}-${index}`,
      label,
      fullLabel: dayDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      matches: (timestamp) => {
        const date = new Date(timestamp);
        return date >= dayDate && date <= dayEnd;
      },
    });
  }
  return slots;
};

const getModePointCount = (mode, refDate, endDate) => getTimeSlots(mode, refDate, endDate).length;

const aggregateMetricSlot = (records, metricKey, slot) => {
  const minField = `${metricKey}_min`;
  const maxField = `${metricKey}_max`;
  const matched = records.filter(
    (record) => Number.isFinite(record[metricKey]) && slot.matches(record.time)
  );

  if (!matched.length) {
    return {
      label: slot.label,
      fullLabel: slot.fullLabel || slot.label,
      average: null,
      min: null,
      max: null,
      count: 0,
      peak: null,
    };
  }

  const values = matched.map((record) => record[metricKey]);
  const apiMins = matched.map((record) => record[minField]).filter(Number.isFinite);
  const apiMaxs = matched.map((record) => record[maxField]).filter(Number.isFinite);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    label: slot.label,
    fullLabel: slot.fullLabel || slot.label,
    average,
    min: apiMins.length ? Math.min(...apiMins) : Math.min(...values),
    max: apiMaxs.length ? Math.max(...apiMaxs) : Math.max(...values),
    count: values.length,
    peak: matched.reduce(
      (best, record) =>
        record[metricKey] > best.value ? { value: record[metricKey], time: record.time } : best,
      { value: matched[0][metricKey], time: matched[0].time }
    ),
  };
};

const ENVIRONMENT_PAIR_KEYS = ["temperature", "humidity"];

const HEATMAP_METRICS = [
  { key: "temperature", label: "Nhiệt độ", unit: "°C", color: "#ef4444", low: "#fee2e2", high: "#ef4444", decimals: 1 },
  { key: "humidity", label: "Độ ẩm", unit: "%", color: "#2563eb", low: "#dbeafe", high: "#2563eb", decimals: 0 },
];

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const ANALYSIS_GROUPS = [
  { key: "environment", label: "Nhiệt độ & độ ẩm", metrics: ["temperature", "humidity"] },
  { key: "light", label: "Ánh sáng", metrics: ["lux", "broadband", "infrared"] },
  { key: "uv", label: "UV", metrics: ["UVA", "UVB", "UVI"] },
  { key: "sound", label: "Âm thanh", metrics: ["sound"] },
  { key: "co2", label: "Khí CO2", metrics: ["co2", "scd4x_temperature", "scd4x_humidity"] },
  { key: "dust", label: "Bụi mịn", metrics: ["pm25", "pm10"] },
  { key: "spectrometer", label: "Quang phổ", metrics: ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "clear", "nir", "flicker"] },
];

const SPLIT_RANGE_CHART_GROUPS = new Set(["uv"]);

const ENVIRONMENT_COLUMNS = [
  "temperature",
  "humidity",
  "lux",
  "UVI",
  "UVA",
  "UVB",
  "broadband",
  "infrared",
  "sound",
];

const AIR_COLUMNS = ["pm1", "pm25", "pm10", "aqi"];

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const getHistoryTypeFromDeviceType = (deviceType) => {
  const normalized = normalizeText(deviceType);

  if (normalized.includes("moi truong")) {
    return "environment";
  }

  if (normalized.includes("khong khi")) {
    return "air";
  }

  return "";
};

const getRecordColumns = (historyType, records) => {
  if (historyType === "environment") {
    return ENVIRONMENT_COLUMNS;
  }

  if (historyType === "air") {
    return AIR_COLUMNS;
  }

  const hasAirMetrics = records.some(
    (record) =>
      record.pm1 !== null ||
      record.pm25 !== null ||
      record.pm10 !== null ||
      record.aqi !== null
  );

  return hasAirMetrics ? AIR_COLUMNS : ENVIRONMENT_COLUMNS;
};

const parseNumeric = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getMetricMeta = (metricKey) => METRICS.find((metric) => metric.key === metricKey) || METRICS[0];

const formatMetricValue = (value, metricKey) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const metric = getMetricMeta(metricKey);
  return `${Number(value).toFixed(metric.decimals)}${metric.unit ? ` ${metric.unit}` : ""}`;
};

const formatCompactTime = (timestamp) => {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatTime = (time, mode) => {
  if (!time) {
    return "";
  }

  const date = new Date(time);
  if (mode === "hour" || mode === "day") {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

const formatSignedMetricValue = (value, metricKey) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatMetricValue(value, metricKey)}`;
};

const formatDateTime = (timestamp) => {
  if (!timestamp) {
    return "-";
  }

  return new Date(timestamp).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  if (!Number.isFinite(dewPoint)) {
    return { label: "-", note: "Chưa đủ dữ liệu nhiệt độ và độ ẩm." };
  }

  if (dewPoint >= 24) {
    return { label: "Ẩm rít, oi bức", note: "Nguy cơ ngưng tụ cao khi bề mặt lạnh hơn điểm sương." };
  }

  if (dewPoint >= 20) {
    return { label: "Ẩm, dễ khó chịu", note: "Theo dõi các khung giờ đêm và sáng sớm." };
  }

  if (dewPoint >= 16) {
    return { label: "Dễ chịu", note: "Độ ẩm cảm nhận đang ở vùng ổn định." };
  }

  return { label: "Khô thoáng", note: "Nguy cơ ngưng tụ thấp." };
};

const calculateCorrelation = (records, firstKey, secondKey) => {
  const pairs = records
    .map((record) => [record[firstKey], record[secondKey]])
    .filter(([first, second]) => Number.isFinite(first) && Number.isFinite(second));

  if (pairs.length < 2) {
    return null;
  }

  const firstAverage = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const secondAverage = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
  let numerator = 0;
  let firstVariance = 0;
  let secondVariance = 0;

  pairs.forEach(([first, second]) => {
    const firstDelta = first - firstAverage;
    const secondDelta = second - secondAverage;
    numerator += firstDelta * secondDelta;
    firstVariance += firstDelta ** 2;
    secondVariance += secondDelta ** 2;
  });

  const denominator = Math.sqrt(firstVariance * secondVariance);
  return denominator ? numerator / denominator : null;
};

const getCorrelationLabel = (value) => {
  if (!Number.isFinite(value)) {
    return "chưa đủ dữ liệu";
  }

  const strength = Math.abs(value);
  const direction = value < 0 ? "nghịch biến" : "đồng biến";

  if (strength >= 0.8) {
    return `rất mạnh ${direction}`;
  }

  if (strength >= 0.6) {
    return `mạnh ${direction}`;
  }

  if (strength >= 0.35) {
    return `vừa ${direction}`;
  }

  return `yếu ${direction}`;
};

const getDeviceId = (record) =>
  String(
    record?.DeviceId ??
      record?.deviceId ??
      record?.device_id ??
      record?.device ??
      record?.sensorId ??
      record?.sensor_id ??
      record?.deviceInfo?.id ??
      ""
  ).trim();

const normalizeHistoryRecord = (record, index) => {
  const createdAtRaw =
    record?.createdAt ||
    record?.created_at ||
    record?.CreatedTime ||
    record?.timestamp ||
    record?.time ||
    new Date().toISOString();

  const adjustedTime = new Date(createdAtRaw).getTime() + 13 * 60 * 1000;
  const createdAt = new Date(adjustedTime).toISOString();

  return {
    id: record?._id || record?.id || `${createdAt}-${index}`,
    createdAt,
    time: adjustedTime,
    deviceId: getDeviceId(record),
    temperature: parseNumeric(record?.temperature ?? record?.temp),
    humidity: parseNumeric(record?.humidity ?? record?.humid),
    lux: parseNumeric(record?.lux ?? record?.light),
    UVI: parseNumeric(record?.UVI ?? record?.uvi ?? record?.uvIndex ?? record?.uv_index),
    UVA: parseNumeric(record?.UVA ?? record?.uva ?? record?.uv_a),
    UVB: parseNumeric(record?.UVB ?? record?.uvb ?? record?.uv_b),
    broadband: parseNumeric(record?.broadband ?? record?.bb ?? record?.visible),
    infrared: parseNumeric(record?.infrared ?? record?.infra_red ?? record?.fr ?? record?.ir),
    sound: parseNumeric(record?.sound ?? record?.noise ?? record?.db ?? record?.sound_level),
    pm1: parseNumeric(record?.pm1 ?? record?.PM1 ?? record?.pm_1),
    pm25: parseNumeric(record?.pm25 ?? record?.PM25 ?? record?.Pm25 ?? record?.pm2_5 ?? record?.pm_25),
    pm10: parseNumeric(record?.pm10 ?? record?.PM10 ?? record?.Pm10 ?? record?.pm_10),
    // Dust table stores AQI by particle size; prefer PM2.5 AQI, fallback to PM10 AQI
    aqi: parseNumeric(record?.aqi ?? record?.AQI ?? record?.Pm25_AQI ?? record?.Pm10_AQI),
    co2: parseNumeric(record?.co2 ?? record?.CO2),
    scd4x_temperature: parseNumeric(record?.scd4x_temperature ?? record?.SCD_TEMP ?? record?.scd_temp),
    scd4x_humidity: parseNumeric(record?.scd4x_humidity ?? record?.SCD_HUM ?? record?.scd_hum),
    f1: parseNumeric(record?.f1 ?? record?.F1 ?? record?.as_f1),
    f2: parseNumeric(record?.f2 ?? record?.F2 ?? record?.as_f2),
    f3: parseNumeric(record?.f3 ?? record?.F3 ?? record?.as_f3),
    f4: parseNumeric(record?.f4 ?? record?.F4 ?? record?.as_f4),
    f5: parseNumeric(record?.f5 ?? record?.F5 ?? record?.as_f5),
    f6: parseNumeric(record?.f6 ?? record?.F6 ?? record?.as_f6),
    f7: parseNumeric(record?.f7 ?? record?.F7 ?? record?.as_f7),
    f8: parseNumeric(record?.f8 ?? record?.F8 ?? record?.as_f8),
    clear: parseNumeric(record?.clear ?? record?.Clear ?? record?.as_clear),
    nir: parseNumeric(record?.nir ?? record?.Nir ?? record?.as_nir),
    flicker: parseNumeric(record?.flicker ?? record?.Flicker ?? record?.as_flicker),
  };
};

const getStartOfWeek = (date) => {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getStartOfMonth = (date) => {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getEndOfMonth = (date) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1, 0);
  next.setHours(23, 59, 59, 999);
  return next;
};

const getScopedRecords = (records, mode, refDate = new Date()) => {
  const now = new Date(refDate);
  const start = new Date(now);

  if (mode === "hour") {
    start.setTime(now.getTime() - 60 * 60 * 1000);
  } else if (mode === "day") {
    start.setHours(0, 0, 0, 0);
  } else if (mode === "week") {
    start.setTime(getStartOfWeek(now).getTime());
  } else {
    start.setTime(getStartOfMonth(now).getTime());
    now.setTime(getEndOfMonth(now).getTime());
  }

  return records.filter((record) => record.time >= start.getTime() && record.time <= now.getTime());
};

const metricColorToRgb = (hexColor) => {
  const normalized = String(hexColor || "#64748b").replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized.padStart(6, "0").slice(0, 6);
  const value = Number.parseInt(full, 16);

  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
};

const buildMetricRangeData = (metric, records, mode, refDate, endDate, yAxisID = "y") => {
  const series = getModeSeries(records, metric.key, mode, refDate, endDate);
  const datasets = [];
  appendMetricRangeDatasets(datasets, series, metric, yAxisID);

  return {
    labels: series.map((item) => item.label),
    datasets,
  };
};

const appendMetricRangeDatasets = (datasets, series, metric, yAxisID = "y") => {
  const rgb = metricColorToRgb(metric.color);

  datasets.push(
    {
      label: metric.label,
      data: series.map((item) => item.max),
      borderColor: `rgba(${rgb}, 0.55)`,
      backgroundColor: `rgba(${rgb}, 0.42)`,
      pointRadius: 0,
      tension: 0,
      fill: "+1",
      yAxisID,
    },
    {
      label: `${metric.label} min`,
      data: series.map((item) => item.min),
      borderColor: `rgba(${rgb}, 0)`,
      backgroundColor: `rgba(${rgb}, 0)`,
      pointRadius: 0,
      tension: 0,
      fill: false,
      yAxisID,
    }
  );
};

const summarizeValues = (values) => {
  if (!values.length) {
    return { average: null, min: null, max: null };
  }

  return {
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
};

const aggregatePairedSlot = (records, slot) => {
  const matched = records.filter(
    (record) =>
      slot.matches(record.time) &&
      (Number.isFinite(record.temperature) || Number.isFinite(record.humidity))
  );

  if (!matched.length) {
    return {
      label: slot.label,
      fullLabel: slot.fullLabel || slot.label,
      temperature: { average: null, min: null, max: null },
      humidity: { average: null, min: null, max: null },
      dewPoint: summarizeValues([]),
    };
  }

  const temperatureValues = [];
  const temperatureMins = [];
  const temperatureMaxs = [];
  const humidityValues = [];
  const humidityMins = [];
  const humidityMaxs = [];
  const dewPointValues = [];

  matched.forEach((record) => {
    if (Number.isFinite(record.temperature)) {
      temperatureValues.push(record.temperature);
      if (Number.isFinite(record.temperature_min)) temperatureMins.push(record.temperature_min);
      if (Number.isFinite(record.temperature_max)) temperatureMaxs.push(record.temperature_max);
    }

    if (Number.isFinite(record.humidity)) {
      humidityValues.push(record.humidity);
      if (Number.isFinite(record.humidity_min)) humidityMins.push(record.humidity_min);
      if (Number.isFinite(record.humidity_max)) humidityMaxs.push(record.humidity_max);
    }

    const dewPoint = calculateDewPoint(record.temperature, record.humidity);
    if (Number.isFinite(dewPoint)) {
      dewPointValues.push(dewPoint);
    }
  });

  const tempAvg = temperatureValues.length
    ? temperatureValues.reduce((sum, value) => sum + value, 0) / temperatureValues.length
    : null;
  const humAvg = humidityValues.length
    ? humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length
    : null;

  return {
    label: slot.label,
    fullLabel: slot.fullLabel || slot.label,
    temperature: {
      average: tempAvg,
      min: temperatureMins.length
        ? Math.min(...temperatureMins)
        : temperatureValues.length
          ? Math.min(...temperatureValues)
          : null,
      max: temperatureMaxs.length
        ? Math.max(...temperatureMaxs)
        : temperatureValues.length
          ? Math.max(...temperatureValues)
          : null,
    },
    humidity: {
      average: humAvg,
      min: humidityMins.length
        ? Math.min(...humidityMins)
        : humidityValues.length
          ? Math.min(...humidityValues)
          : null,
      max: humidityMaxs.length
        ? Math.max(...humidityMaxs)
        : humidityValues.length
          ? Math.max(...humidityValues)
          : null,
    },
    dewPoint: summarizeValues(dewPointValues),
  };
};

const getPairedModeSeries = (records, mode, refDate = new Date(), endDate = new Date()) =>
  getTimeSlots(mode, refDate, endDate).map((slot) => aggregatePairedSlot(records, slot));

const getEnvMetricStats = (records, metricKey) => {
  const points = records
    .map((record) => ({ value: record[metricKey], time: record.time }))
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => a.time - b.time);

  if (!points.length) {
    return null;
  }

  const values = points.map((point) => point.value);
  const latest = points[points.length - 1];
  const previous = points[Math.max(0, points.length - 2)] || latest;

  return {
    latest,
    trend: latest.value - previous.value,
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    fluctuation: Math.max(...values) - Math.min(...values),
    max: points.reduce((best, point) => (point.value >= best.value ? point : best), points[0]),
    min: points.reduce((best, point) => (point.value <= best.value ? point : best), points[0]),
  };
};

const buildHeatmapData = (records, metricKey, mode, refDate = new Date()) => {
  const now = new Date(refDate);

  if (mode === "hour") {
    const buckets = Array.from({ length: 20 }, () => []);
    const start = now;
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    records.forEach((record) => {
      const value = record[metricKey];
      if (!Number.isFinite(value)) return;
      const date = new Date(record.time);
      if (date >= start && date <= end) {
        const diffMinutes = Math.floor((date.getTime() - start.getTime()) / (3 * 60 * 1000));
        if (diffMinutes >= 0 && diffMinutes < 20) {
          buckets[diffMinutes].push(value);
        }
      }
    });

    const values = buckets.map((vals) =>
      vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    );
    const flat = values.filter((v) => Number.isFinite(v));
    return {
      mode,
      sections: [
        {
          columns: Array.from({ length: 10 }, (_, i) => `${i * 3}-${(i + 1) * 3}m`),
          values: values.slice(0, 10),
        },
        {
          columns: Array.from({ length: 10 }, (_, i) => `${(i + 10) * 3}-${(i + 11) * 3}m`),
          values: values.slice(10, 20),
        },
      ],
      min: flat.length ? Math.min(...flat) : null,
      max: flat.length ? Math.max(...flat) : null,
    };
  }

  if (mode === "day") {
    const buckets = Array.from({ length: 24 }, () => []);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    records.forEach((record) => {
      const value = record[metricKey];
      if (!Number.isFinite(value)) return;
      const date = new Date(record.time);
      if (date >= dayStart && date <= dayEnd) {
        buckets[date.getHours()].push(value);
      }
    });

    const hours = buckets.map((vals) =>
      vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    );
    const flat = hours.filter((v) => Number.isFinite(v));
    return {
      mode,
      sections: [
        {
          columns: Array.from({ length: 11 }, (_, i) => String(i + 1)),
          values: hours.slice(1, 12),
        },
        {
          columns: Array.from({ length: 12 }, (_, i) => String(i + 12)),
          values: hours.slice(12, 24),
        },
      ],
      min: flat.length ? Math.min(...flat) : null,
      max: flat.length ? Math.max(...flat) : null,
    };
  }

  if (mode === "week") {
    const startOfWeek = getStartOfWeek(now);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const dayLabels = WEEKDAY_LABELS.map((label, i) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      return { label: `${label} ${dayDate.getDate().toString().padStart(2, "0")}/${(dayDate.getMonth() + 1).toString().padStart(2, "0")}`, start: new Date(dayDate), end: (() => { const d = new Date(dayDate); d.setHours(23, 59, 59, 999); return d; })(), values: [] };
    });

    records.forEach((record) => {
      const value = record[metricKey];
      if (!Number.isFinite(value)) return;
      const date = new Date(record.time);
      if (date < startOfWeek || date > endOfWeek) return;
      const weekDayIndex = (date.getDay() + 6) % 7;
      dayLabels[weekDayIndex].values.push(value);
    });

    const values = dayLabels.map((row) => row.values.length ? row.values.reduce((s, v) => s + v, 0) / row.values.length : null);
    const flat = values.filter((v) => Number.isFinite(v));
    return {
      mode,
      sections: [
        {
          columns: WEEKDAY_LABELS,
          values,
          columnTitles: dayLabels.map((row) => row.label),
        },
      ],
      min: flat.length ? Math.min(...flat) : null,
      max: flat.length ? Math.max(...flat) : null,
    };
  }

  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const buckets = Array.from({ length: daysInMonth }, () => []);

  const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

  records.forEach((record) => {
    const value = record[metricKey];
    if (!Number.isFinite(value)) return;
    const date = new Date(record.time);
    if (date >= monthStart && date <= monthEnd) {
      buckets[date.getDate() - 1].push(value);
    }
  });

  const values = buckets.map((vals) => vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null);
  const flat = values.filter((v) => Number.isFinite(v));
  return {
    mode,
    sections: [
      {
        columns: Array.from({ length: 16 }, (_, i) => String(i + 1)),
        values: values.slice(0, 16),
      },
      {
        columns: Array.from({ length: daysInMonth - 16 }, (_, i) => String(i + 17)),
        values: values.slice(16),
      },
    ],
    min: flat.length ? Math.min(...flat) : null,
    max: flat.length ? Math.max(...flat) : null,
  };
};

const getStrongestPeriod = (records, metricKey, mode, refDate = new Date(), endDate = new Date()) => {
  const groups = getModeSeries(records, metricKey, mode, refDate, endDate).filter((item) =>
    Number.isFinite(item.average)
  );
  if (!groups.length) {
    return null;
  }

  return groups.reduce((best, item) => (item.average > best.average ? item : best), groups[0]);
};

const getModeSeries = (records, metricKey, mode, refDate = new Date(), endDate = new Date()) =>
  getTimeSlots(mode, refDate, endDate).map((slot) => aggregateMetricSlot(records, metricKey, slot));



const THRESHOLDS = {
  temperature: 0.1,
  humidity: 0.5,
  broadband: 10,
  infrared: 10,
  lux: 10,
  UVA: 0.1,
  UVB: 0.1,
  UVI: 0.1,
  sound: 20,
  pm1: 1,
  pm25: 1,
  pm10: 1,
  aqi: 1,
  co2: 10,
  scd4x_temperature: 0.1,
  scd4x_humidity: 0.5,
  f1: 10, f2: 10, f3: 10, f4: 10,
  f5: 10, f6: 10, f7: 10, f8: 10,
  clear: 10, nir: 10, flicker: 5
};

const METRIC_ADVANCED_CONFIGS = {
  sound: { kUp: 1.5, kDown: 1.8, cooldownLimit: 2, emaAlpha: 0.6 },
  temperature: { kUp: 1.5, kDown: 1.5, cooldownLimit: 1, emaAlpha: 0.1 },
  scd4x_temperature: { kUp: 1.5, kDown: 1.5, cooldownLimit: 1, emaAlpha: 0.1 },
  co2: { kUp: 2.0, kDown: 2.0, cooldownLimit: 2, emaAlpha: 0.2 }
};

function computeClientReversalCount(metricKey, values, mode) {
  if (values.length <= 1) {
    return 0;
  }

  const baseThreshold = THRESHOLDS[metricKey] ?? 1.0;
  const advConfig = METRIC_ADVANCED_CONFIGS[metricKey] || {};
  const kUp = advConfig.kUp ?? 2.0;
  const kDown = advConfig.kDown ?? 2.5;
  const cooldownLimit = advConfig.cooldownLimit ?? 3;
  const emaAlpha = advConfig.emaAlpha ?? 0.2;
  const isSubPeriodData = mode !== "hour"; // in frontend, hour view uses raw values, other modes use aggregated values (hour/day)

  let reversalCount = 0;
  const isSound = metricKey.toLowerCase() === "sound";

  if (isSound) {
    let direction = "none";
    let refValue = null;
    let cooldownCounter = 0;
    let filteredValue = null;

    // Calculate stddev
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sumSqDiff = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
    const variance = values.length > 1 ? sumSqDiff / (values.length - 1) : 0;
    const stddev = Math.pow(variance, 0.5);

    const effectiveAlpha = isSubPeriodData ? Math.min(1.0, emaAlpha * 2.5) : emaAlpha;

    for (const rawValue of values) {
      if (filteredValue === null) {
        filteredValue = rawValue;
      } else {
        filteredValue = (effectiveAlpha * rawValue) + ((1.0 - effectiveAlpha) * filteredValue);
      }
      const x_t = filteredValue;

      const thresholdUp = Math.max(baseThreshold, kUp * stddev);
      const thresholdDown = Math.max(baseThreshold * 1.2, kDown * stddev);

      if (cooldownCounter > 0) {
        cooldownCounter--;
      }

      if (refValue === null) {
        refValue = x_t;
        continue;
      }

      if (direction === "none") {
        const diff = x_t - refValue;
        if (diff >= thresholdUp) {
          direction = "up";
          refValue = x_t;
        } else if (diff <= -thresholdDown) {
          direction = "down";
          refValue = x_t;
        }
      } else if (direction === "up") {
        if (x_t > refValue) {
          refValue = x_t;
        } else if ((refValue - x_t) >= thresholdDown) {
          if (cooldownCounter === 0) {
            reversalCount++;
            direction = "down";
            refValue = x_t;
            cooldownCounter = cooldownLimit;
          } else {
            refValue = x_t;
          }
        }
      } else if (direction === "down") {
        if (x_t < refValue) {
          refValue = x_t;
        } else if ((x_t - refValue) >= thresholdUp) {
          if (cooldownCounter === 0) {
            reversalCount++;
            direction = "up";
            refValue = x_t;
            cooldownCounter = cooldownLimit;
          } else {
            refValue = x_t;
          }
        }
      }
    }
  } else {
    let direction = "none";
    let refValue = null;

    for (const x_t of values) {
      if (refValue === null) {
        refValue = x_t;
        continue;
      }

      if (direction === "none") {
        const diff = x_t - refValue;
        if (diff >= baseThreshold) {
          direction = "up";
          refValue = x_t;
        } else if (diff <= -baseThreshold) {
          direction = "down";
          refValue = x_t;
        }
      } else if (direction === "up") {
        if (x_t > refValue) {
          refValue = x_t;
        } else if ((refValue - x_t) >= baseThreshold) {
          reversalCount++;
          direction = "down";
          refValue = x_t;
        }
      } else if (direction === "down") {
        if (x_t < refValue) {
          refValue = x_t;
        } else if ((x_t - refValue) >= baseThreshold) {
          reversalCount++;
          direction = "up";
          refValue = x_t;
        }
      }
    }
  }

  return reversalCount;
}

const getPeriodStats = (series, metricKey, mode = "day") => {
  const points = series
    .map((item) => ({
      label: item.label,
      value: item.average,
      peak: item.max,
      low: item.min,
    }))
    .filter((item) => Number.isFinite(item.value));

  if (!points.length) {
    return null;
  }

  const deltas = [];
  for (let index = 1; index < points.length; index += 1) {
    const delta = points[index].value - points[index - 1].value;
    deltas.push({
      delta,
      label: points[index].label,
    });
  }

  const average = points.reduce((sum, item) => sum + item.value, 0) / points.length;
  const averageAbsDelta = deltas.length
    ? deltas.reduce((sum, item) => sum + Math.abs(item.delta), 0) / deltas.length
    : 0;
  const strongestJump = deltas.length
    ? deltas.reduce((best, item) => (Math.abs(item.delta) > Math.abs(best.delta) ? item : best), deltas[0])
    : null;

  const reversalCount = computeClientReversalCount(metricKey, points.map((p) => p.value), mode);

  return {
    latest: points[points.length - 1],
    average,
    averageAbsDelta,
    reversalCount,
    strongestJump,
  };
};

const buildProfileBreakdown = (records, metricKey) => {
  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}:00`,
    values: [],
  }));
  const weekdayBuckets = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => ({
    label,
    values: [],
  }));
  const monthBuckets = Array.from({ length: 12 }, (_, month) => ({
    label: `T${month + 1}`,
    values: [],
  }));

  records.forEach((record) => {
    const value = record[metricKey];
    if (value === null || value === undefined) {
      return;
    }

    const date = new Date(record.time);
    hourBuckets[date.getHours()].values.push(value);
    weekdayBuckets[(date.getDay() + 6) % 7].values.push(value);
    monthBuckets[date.getMonth()].values.push(value);
  });

  const withAverage = (bucket) => ({
    label: bucket.label,
    average: bucket.values.length
      ? bucket.values.reduce((sum, value) => sum + value, 0) / bucket.values.length
      : null,
    count: bucket.values.length,
  });

  return {
    byHour: hourBuckets.map(withAverage),
    byWeekday: weekdayBuckets.map(withAverage),
    byMonth: monthBuckets.map(withAverage),
  };
};

const getMetricStats = (records, metricKey, mode = "day") => {
  const points = records
    .map((record) => ({ value: record[metricKey], time: record.time }))
    .filter((point) => point.value !== null && point.value !== undefined)
    .sort((a, b) => a.time - b.time);

  if (!points.length) {
    return null;
  }

  const values = points.map((point) => point.value);
  const deltas = [];

  for (let index = 1; index < points.length; index += 1) {
    const delta = points[index].value - points[index - 1].value;
    deltas.push({
      delta,
      time: points[index].time,
      from: points[index - 1].value,
      to: points[index].value,
    });
  }

  const reversalCount = computeClientReversalCount(metricKey, values, mode);

  const absoluteDeltas = deltas.map((item) => Math.abs(item.delta));
  const latest = points[points.length - 1];
  const peak = points.reduce((best, point) => (point.value >= best.value ? point : best), points[0]);
  const low = points.reduce((best, point) => (point.value <= best.value ? point : best), points[0]);
  const strongestJump = deltas.length
    ? deltas.reduce((best, item) => (Math.abs(item.delta) > Math.abs(best.delta) ? item : best), deltas[0])
    : null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const averageAbsDelta = absoluteDeltas.length
    ? absoluteDeltas.reduce((sum, value) => sum + value, 0) / absoluteDeltas.length
    : 0;
  const profile = buildProfileBreakdown(records, metricKey);
  const hottestHour = profile.byHour.reduce(
    (best, bucket) =>
      bucket.average !== null && (best.average === null || bucket.average > best.average) ? bucket : best,
    { label: "-", average: null }
  );
  const hottestWeekday = profile.byWeekday.reduce(
    (best, bucket) =>
      bucket.average !== null && (best.average === null || bucket.average > best.average) ? bucket : best,
    { label: "-", average: null }
  );
  const hottestMonth = profile.byMonth.reduce(
    (best, bucket) =>
      bucket.average !== null && (best.average === null || bucket.average > best.average) ? bucket : best,
    { label: "-", average: null }
  );

  return {
    latest,
    average,
    min: low,
    max: peak,
    averageAbsDelta,
    strongestJump,
    reversalCount,
    profile,
    hottestHour,
    hottestWeekday,
    hottestMonth,
  };
};

const getPageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
};

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: "#64748b" },
      grid: { color: "rgba(148, 163, 184, 0.12)" },
    },
    y: {
      ticks: { color: "#64748b" },
      grid: { color: "rgba(148, 163, 184, 0.12)" },
    },
  },
};



const StatCard = ({ label, value, subvalue, accent }) => (
  <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    <p className="mt-3 text-2xl font-bold" style={{ color: accent }}>
      {value}
    </p>
    {subvalue ? <div className="mt-2 text-sm text-muted-foreground">{subvalue}</div> : null}
  </div>
);

const ComparisonStatCard = ({ title, rows, footer }) => (
  <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
    <div className="mt-4 space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[1fr_auto] items-start gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
          <div>
            <p className="text-sm text-muted-foreground">{row.label}</p>
            <p className="mt-1 text-xl font-bold" style={{ color: row.accent }}>
              {row.value}
            </p>
          </div>
          {row.side ? (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{row.sideLabel}</p>
              <p className="mt-1 text-base font-semibold">{row.side}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
    {footer ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{footer}</p> : null}
  </div>
);

const HeatmapGrid = ({ data, metric }) => {
  const range = Number.isFinite(data.max) && Number.isFinite(data.min) ? data.max - data.min : 0;
  const isWeekMode = data.mode === "week";
  const sections = data.sections || [];

  const getCellColor = (value) => {
    if (!Number.isFinite(value)) {
      return "rgba(148, 163, 184, 0.12)";
    }

    const ratio = range > 0 ? (value - data.min) / range : 0.5;
    const alpha = 0.18 + ratio * 0.74;
    
    let rgb = "37, 99, 235";
    const colorHex = metric.color || (metric.key === "temperature" ? "#ef4444" : "#2563eb");
    try {
      const clean = colorHex.replace("#", "");
      if (clean.length === 6) {
        const num = parseInt(clean, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        rgb = `${r}, ${g}, ${b}`;
      }
    } catch (e) {}

    return `rgba(${rgb}, ${alpha})`;
  };

  const columnMin = "minmax(0, 1fr)";
  const cellHeight = isWeekMode ? "h-6" : "h-8";
  const textSize = isWeekMode ? "text-[9px]" : "text-[10px]";

  return (
    <div className={isWeekMode ? "" : "overflow-x-auto"}>
      <div className={isWeekMode ? "w-full" : "min-w-0"}>
        <div className="space-y-3">
          {sections.map((section, sectionIndex) => (
            <div
              key={`heatmap-section-${sectionIndex}`}
              className={`grid gap-1 ${textSize} text-muted-foreground`}
              style={{
                gridTemplateColumns: `repeat(${section.columns.length}, ${columnMin})`,
              }}
            >
              {section.columns.map((label, colIndex) => (
                <div
                  key={`${sectionIndex}-${label}`}
                  className="text-center"
                  title={section.columnTitles?.[colIndex]}
                >
                  {label}
                </div>
              ))}
              {section.values.map((value, idx) => (
                <div
                  key={`heatmap-cell-${sectionIndex}-${idx}`}
                  className={`${cellHeight} rounded-md border border-background/50`}
                  style={{ backgroundColor: getCellColor(value) }}
                  title={`${section.columnTitles?.[idx] ?? section.columns[idx] ?? idx} - ${Number.isFinite(value) ? `${value.toFixed(metric.decimals)}${metric.unit}` : "Không có dữ liệu"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const METRIC_CODE_TO_FIELD = {
  temperature: "temperature",
  temp: "temperature",
  temp_min: "temperature",
  temp_max: "temperature",
  humidity: "humidity",
  hum: "humidity",
  co2: "co2",
  scd_temp: "scd4x_temperature",
  scd_hum: "scd4x_humidity",
  scd4x_temperature: "scd4x_temperature",
  scd4x_humidity: "scd4x_humidity",
  scd_temp_min: "scd4x_temperature",
  scd_temp_max: "scd4x_temperature",
  scd_hum_min: "scd4x_humidity",
  scd_hum_max: "scd4x_humidity",
  lux: "lux",
  uvi: "UVI",
  uva: "UVA",
  uvb: "UVB",
  broadband: "broadband",
  broad: "broadband",
  infrared: "infrared",
  ir: "infrared",
  sound: "sound",
  pm1: "pm1",
  pm25: "pm25",
  pm10: "pm10",
  aqi: "aqi",
  as_f1: "f1",
  as_f2: "f2",
  as_f3: "f3",
  as_f4: "f4",
  as_f5: "f5",
  as_f6: "f6",
  as_f7: "f7",
  as_f8: "f8",
  as_clear: "clear",
  as_nir: "nir",
  as_flicker: "flicker",
};

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [devices, setDevices] = useState(loadStoredDevices);
  const [selectedDeviceId, setSelectedDeviceId] = useState(loadSelectedDeviceId);
  const [tableData, setTableData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsRefDate, setAnalyticsRefDate] = useState(() => new Date());
  const [analyticsEndDate, setAnalyticsEndDate] = useState(() => new Date());
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [timeMode, setTimeMode] = useState("day");
  const [selectedAnalysisGroupKey, setSelectedAnalysisGroupKey] = useState("environment");
  const [selectedMetricKey, setSelectedMetricKey] = useState("temperature");
  const [latestRawRecord, setLatestRawRecord] = useState(null);
  // Date range picker states — default to today/this week/this month
  const todayStr = toLocalDateString(new Date());
  const thisWeekMonStr = toLocalDateString(getStartOfWeek(new Date()));
  const thisMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [selectedHour, setSelectedHour] = useState(() => new Date().getHours());
  const [selectedWeek, setSelectedWeek] = useState(getWeekInputValue(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(thisMonthStr);
  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) || null,
    [devices, selectedDeviceId]
  );
  const selectedHistoryType = useMemo(
    () => getHistoryTypeFromDeviceType(selectedDevice?.type),
    [selectedDevice]
  );

  useEffect(() => {
    saveStoredDevices(devices);
  }, [devices]);

  useEffect(() => {
    if (!devices.length) {
      setSelectedDeviceId("");
      return;
    }

    if (!devices.some((device) => device.id === selectedDeviceId)) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    saveSelectedDeviceId(selectedDeviceId);
  }, [selectedDeviceId]);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      if (!selectedDeviceId || !selectedHistoryType) {
        setTableData([]);
        setAnalyticsData([]);
        setTotalPages(1);
        setTotal(0);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setDbStats(null);

      try {
        const pickerValue = (timeMode === "day" || timeMode === "hour")
          ? selectedDay
          : timeMode === "week"
            ? selectedWeek
            : selectedMonth;
        const { from, to, refDate, endDate } = getDateRangeForMode(timeMode, pickerValue, selectedHour);

        const requestType = (selectedHistoryType === "air" || selectedAnalysisGroupKey === "dust")
          ? "air"
          : "environment";

        // Fetch DB-stored aggregate summary statistics for the selected device and time range
        const summaryPeriodType = timeMode;
        const summaryStartStr = toLocalIsoString(refDate);

        historyService.getAggregateMetrics({
          deviceId: selectedDeviceId,
          periodType: summaryPeriodType,
          exact: "true",
          limit: 100,
          page: 1,
          from: summaryStartStr,
          to: summaryStartStr,
        }).then((summaryResult) => {
          if (isCancelled) return;
          const stats = {};
          for (const row of (summaryResult.data || [])) {
            const code = row.metric_code?.toLowerCase();
            const fieldName = METRIC_CODE_TO_FIELD[code] || code;
            if (fieldName) {
              stats[fieldName] = {
                reversalCount: parseNumeric(row.reversal_count),
                avgDelta: parseNumeric(row.avg_delta),
                avgValue: parseNumeric(row.avg_value),
                minValue: parseNumeric(row.min_value),
                maxValue: parseNumeric(row.max_value),
              };
            }
          }
          setDbStats(stats);
        }).catch((err) => {
          console.warn("Failed to fetch database summary aggregate stats:", err);
          if (!isCancelled) setDbStats(null);
        });

        const historyResult = await historyService.getHistoryData({
          page: timeMode === "hour" ? 1 : currentPage,
          limit: timeMode === "hour" ? 500 : itemsPerPage,
          type: requestType,
          deviceId: selectedDeviceId,
          from,
          to,
        });
        if (isCancelled) return;

        const rawRecords = (historyResult.data || []).map(normalizeHistoryRecord);
        if (currentPage === 1) {
          setLatestRawRecord(rawRecords[0] || null);
        }

        if (timeMode === "hour") {
          setTableData(rawRecords);
          setAnalyticsData(rawRecords);
          setTotalPages(Math.ceil((historyResult.total || 0) / itemsPerPage) || 1);
          setTotal(historyResult.total || 0);

          setAnalyticsRefDate(refDate);
          setAnalyticsEndDate(endDate);
        } else {
          setTableData(rawRecords);
          setTotalPages(historyResult.totalPages || 1);
          setTotal(historyResult.total || 0);

          const aggregatePeriod = timeMode;
          const aggregateResult = await historyService.getAggregateMetrics({
            deviceId: selectedDeviceId,
            periodType: aggregatePeriod,
            limit: 2000,
            page: 1,
            from,
            to,
          });
          if (isCancelled) return;

          const periodMap = new Map();
          for (const row of (aggregateResult.data || [])) {
            const parsedStartRaw = parseApiDateTime(row.period_start);
            if (!parsedStartRaw) continue;
            const parsedStart = new Date(parsedStartRaw.getTime());
            const key = parsedStart.getTime();
            if (!periodMap.has(key)) {
              const parsedEndRaw = parseApiDateTime(row.period_end);
              const parsedEnd = parsedEndRaw ? new Date(parsedEndRaw.getTime()) : null;
              periodMap.set(key, {
                id: `agg-${key}`,
                createdAt: parsedStart.toISOString(),
                time: key,
                deviceId: row.device_id,
                period_end: parsedEnd?.toISOString() || row.period_end,
                sample_count: row.sample_count,
              });
            }
            const record = periodMap.get(key);
            const code = row.metric_code?.toLowerCase();
            const fieldName = METRIC_CODE_TO_FIELD[code] || code;
            if (fieldName) {
              record[fieldName] = parseNumeric(row.avg_value);
              record[`${fieldName}_min`] = parseNumeric(row.min_value);
              record[`${fieldName}_max`] = parseNumeric(row.max_value);
              record[`${fieldName}_avg_delta`] = parseNumeric(row.avg_delta);
              record[`${fieldName}_reversal_count`] = parseNumeric(row.reversal_count);
            }
          }

          const pivoted = Array.from(periodMap.values()).sort((a, b) => a.time - b.time);
          setAnalyticsData(pivoted);
          setAnalyticsRefDate(refDate);
          setAnalyticsEndDate(endDate || fromLocalDateTimeString(to) || new Date());
        }
      } catch (fetchError) {
        if (isCancelled) return;
        setError(fetchError.message || "Không thể tải lịch sử dữ liệu.");
        if (String(fetchError.message).includes("Unauthorized")) {
          setTimeout(() => navigate("/login"), 1500);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, itemsPerPage, navigate, selectedDeviceId, selectedHistoryType, timeMode, selectedDay, selectedWeek, selectedMonth, selectedAnalysisGroupKey, selectedHour]);

  const handleRegisterDevice = (device) => {
    setDevices((previous) => [...previous, device]);
    setSelectedDeviceId(device.id);
  };

  const handleUnregisterDevice = (deviceId) => {
    setDevices((previous) => previous.filter((device) => device.id !== deviceId));
  };

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDeviceId, timeMode, selectedDay, selectedWeek, selectedMonth, selectedAnalysisGroupKey, itemsPerPage, selectedHour]);

  const filteredAnalytics = useMemo(() => {
    if (!selectedDeviceId) {
      return analyticsData;
    }

    return analyticsData.filter((record) => record.deviceId === selectedDeviceId);
  }, [analyticsData, selectedDeviceId]);

  // Table data is raw history already fetched for the selected device/type,
  // so show it directly (no dependency on aggregate payload shape).
  const filteredTableData = useMemo(() => {
    if (timeMode === "hour") {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return tableData.slice(startIndex, startIndex + itemsPerPage);
    }
    return tableData;
  }, [tableData, timeMode, currentPage, itemsPerPage]);

  // Aggregate data is already pre-grouped by periodType from the API,
  // so no need to scope by the current time window.
  const scopedAnalytics = useMemo(
    () => getScopedRecords(filteredAnalytics, timeMode, analyticsEndDate),
    [filteredAnalytics, timeMode, analyticsEndDate]
  );

  const availableMetrics = useMemo(
    () =>
      METRICS.filter((metric) =>
        filteredAnalytics.some((record) => record[metric.key] !== null && record[metric.key] !== undefined) ||
        filteredTableData.some((record) => record[metric.key] !== null && record[metric.key] !== undefined)
      ),
    [filteredAnalytics, filteredTableData]
  );
  const availableAnalysisGroups = useMemo(() => {
    if (selectedHistoryType === "air") {
      return ANALYSIS_GROUPS.filter((group) => group.key === "dust");
    }
    if (selectedHistoryType === "environment") {
      return ANALYSIS_GROUPS;
    }
    return ANALYSIS_GROUPS.filter((group) => {
      if (group.key === "dust") return true;
      return group.metrics.some((metricKey) =>
        filteredAnalytics.some((record) => Number.isFinite(record[metricKey])) ||
        filteredTableData.some((record) => Number.isFinite(record[metricKey]))
      );
    });
  }, [filteredAnalytics, filteredTableData, selectedHistoryType]);

  useEffect(() => {
    if (!availableAnalysisGroups.length) {
      return;
    }

    if (!availableAnalysisGroups.some((group) => group.key === selectedAnalysisGroupKey)) {
      setSelectedAnalysisGroupKey(availableAnalysisGroups[0].key);
    }
  }, [availableAnalysisGroups, selectedAnalysisGroupKey]);

  const activeAnalysisGroup =
    availableAnalysisGroups.find((group) => group.key === selectedAnalysisGroupKey) ||
    availableAnalysisGroups[0] ||
    ANALYSIS_GROUPS[0];

  const recordColumns = useMemo(
    () => activeAnalysisGroup?.metrics || [],
    [activeAnalysisGroup]
  );
  const activeGroupMetrics = activeAnalysisGroup.metrics
    .map(getMetricMeta)
    .filter((metric) =>
      filteredAnalytics.some((record) => Number.isFinite(record[metric.key]))
    );

  useEffect(() => {
    const fallbackMetric = activeGroupMetrics[0]?.key || availableMetrics[0]?.key || "temperature";
    if (!activeGroupMetrics.some((metric) => metric.key === selectedMetricKey)) {
      setSelectedMetricKey(fallbackMetric);
    }
  }, [activeGroupMetrics, availableMetrics, selectedMetricKey]);

  const selectedMetric = getMetricMeta(selectedMetricKey);
  const hasEnvironmentPair = ENVIRONMENT_PAIR_KEYS.every((key) =>
    filteredAnalytics.some((record) => Number.isFinite(record[key]))
  );
  const isEnvironmentAnalysis = selectedAnalysisGroupKey === "environment" && hasEnvironmentPair;
  const modePointCount = useMemo(
    () => getModePointCount(timeMode, analyticsRefDate, analyticsEndDate),
    [timeMode, analyticsRefDate, analyticsEndDate]
  );

  const environmentSeries = useMemo(
    () => getPairedModeSeries(scopedAnalytics, timeMode, analyticsRefDate, analyticsEndDate),
    [scopedAnalytics, timeMode, analyticsRefDate, analyticsEndDate]
  );
  const temperatureStats = useMemo(
    () => getEnvMetricStats(scopedAnalytics, "temperature"),
    [scopedAnalytics]
  );
  const humidityStats = useMemo(
    () => getEnvMetricStats(scopedAnalytics, "humidity"),
    [scopedAnalytics]
  );
  const latestDewPoint = calculateDewPoint(latestRawRecord?.temperature ?? null, latestRawRecord?.humidity ?? null);
  const dewPointStatus = getDewPointStatus(latestDewPoint);
  const tempHumidityCorrelation = useMemo(
    () => calculateCorrelation(scopedAnalytics, "temperature", "humidity"),
    [scopedAnalytics]
  );
  const temperatureHeatmapData = useMemo(
    () => buildHeatmapData(scopedAnalytics, "temperature", timeMode, analyticsRefDate),
    [scopedAnalytics, timeMode, analyticsRefDate]
  );
  const humidityHeatmapData = useMemo(
    () => buildHeatmapData(scopedAnalytics, "humidity", timeMode, analyticsRefDate),
    [scopedAnalytics, timeMode, analyticsRefDate]
  );
  const groupHeatmapsData = useMemo(() => {
    const dataMap = {};
    activeGroupMetrics.forEach((metric) => {
      dataMap[metric.key] = buildHeatmapData(scopedAnalytics, metric.key, timeMode, analyticsRefDate);
    });
    return dataMap;
  }, [activeGroupMetrics, scopedAnalytics, timeMode, analyticsRefDate]);
  const metricStats = useMemo(
    () => getMetricStats(scopedAnalytics, selectedMetricKey, timeMode),
    [scopedAnalytics, selectedMetricKey, timeMode]
  );
  const trendSeries = useMemo(
    () => getModeSeries(scopedAnalytics, selectedMetricKey, timeMode, analyticsRefDate, analyticsEndDate),
    [scopedAnalytics, selectedMetricKey, timeMode, analyticsRefDate, analyticsEndDate]
  );

  const lineData = useMemo(
    () => ({
      labels: trendSeries.map((item) => item.label),
      datasets: activeGroupMetrics.map((metric) => {
        const series = getModeSeries(scopedAnalytics, metric.key, timeMode, analyticsRefDate, analyticsEndDate);
        return {
          label: metric.label,
          data: series.map((item) => item.average),
          borderColor: metric.color,
          backgroundColor: `${metric.color}22`,
          fill: false,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 5,
        };
      }),
    }),
    [activeGroupMetrics, scopedAnalytics, timeMode, analyticsRefDate, analyticsEndDate, trendSeries]
  );

  const environmentLineData = useMemo(
    () => ({
      labels: environmentSeries.map((item) => item.label),
      datasets: [
        {
          label: "Nhiệt độ",
          data: environmentSeries.map((item) => item.temperature.average),
          borderColor: getMetricMeta("temperature").color,
          backgroundColor: getMetricMeta("temperature").color,
          borderWidth: 2.5,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 5,
          yAxisID: "y",
        },
        {
          label: "Độ ẩm",
          data: environmentSeries.map((item) => item.humidity.average),
          borderColor: getMetricMeta("humidity").color,
          backgroundColor: getMetricMeta("humidity").color,
          borderWidth: 2.5,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 5,
          yAxisID: "y1",
        },
      ],
    }),
    [environmentSeries]
  );

  const environmentRangeData = useMemo(() => {
    const labels = environmentSeries.map((item) => item.label);
    const datasets = [];
    const tempSeries = environmentSeries.map((item) => ({
      label: item.label,
      min: item.temperature.min,
      max: item.temperature.max,
    }));
    const humiditySeries = environmentSeries.map((item) => ({
      label: item.label,
      min: item.humidity.min,
      max: item.humidity.max,
    }));

    appendMetricRangeDatasets(datasets, tempSeries, getMetricMeta("temperature"), "y");
    appendMetricRangeDatasets(
      datasets,
      humiditySeries,
      getMetricMeta("humidity"),
      "y1"
    );

    return { labels, datasets };
  }, [environmentSeries]);

  const usesSplitRangeCharts = SPLIT_RANGE_CHART_GROUPS.has(selectedAnalysisGroupKey);

  const groupRangeData = useMemo(() => {
    if (usesSplitRangeCharts) {
      return { labels: [], datasets: [] };
    }

    const datasets = [];
    let labels = [];

    const targetMetrics = selectedAnalysisGroupKey === "spectrometer"
      ? activeGroupMetrics.filter((metric) => metric.key === selectedMetricKey)
      : activeGroupMetrics;

    targetMetrics.forEach((metric) => {
      const series = getModeSeries(
        scopedAnalytics,
        metric.key,
        timeMode,
        analyticsRefDate,
        analyticsEndDate
      );
      if (!labels.length) {
        labels = series.map((item) => item.label);
      }
      appendMetricRangeDatasets(datasets, series, metric);
    });

    return { labels, datasets };
  }, [activeGroupMetrics, scopedAnalytics, timeMode, analyticsRefDate, analyticsEndDate, usesSplitRangeCharts, selectedAnalysisGroupKey, selectedMetricKey]);

  const splitMetricRangeCharts = useMemo(
    () =>
      usesSplitRangeCharts
        ? activeGroupMetrics.map((metric) => {
            const data = buildMetricRangeData(
              metric,
              scopedAnalytics,
              timeMode,
              analyticsRefDate,
              analyticsEndDate
            );
            const series = getModeSeries(scopedAnalytics, metric.key, timeMode, analyticsRefDate, analyticsEndDate);
            const vals = series.flatMap(item => [item.average, item.min, item.max]);
            const bounds = getMetricBounds(metric.key, vals);
            return {
              metric,
              data,
              bounds,
            };
          })
        : [],
    [activeGroupMetrics, scopedAnalytics, timeMode, analyticsRefDate, analyticsEndDate, usesSplitRangeCharts]
  );

  const activeMetricBounds = useMemo(() => {
    const series = getModeSeries(scopedAnalytics, selectedMetricKey, timeMode, analyticsRefDate, analyticsEndDate);
    const vals = series.flatMap(item => [item.average, item.min, item.max]);
    return getMetricBounds(selectedMetricKey, vals);
  }, [scopedAnalytics, selectedMetricKey, timeMode, analyticsRefDate, analyticsEndDate]);

  const chartOptions = useMemo(
    () =>
      withHistoryChartZoom(
        {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (context) => {
                  const index = context[0].dataIndex;
                  return trendSeries[index]?.fullLabel || context[0].label || "";
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: "#64748b" },
              grid: { color: "rgba(148, 163, 184, 0.12)" },
            },
            y: buildBoundedYScale(activeMetricBounds, {
              ticks: { color: "#64748b" },
              grid: { color: "rgba(148, 163, 184, 0.12)" },
            }),
          },
        },
        { y: [selectedMetricKey] }
      ),
    [activeMetricBounds, selectedMetricKey, trendSeries]
  );

  const combinedGroupBounds = useMemo(() => {
    if (usesSplitRangeCharts) return { min: undefined, max: undefined };

    const targetMetrics = selectedAnalysisGroupKey === "spectrometer"
      ? activeGroupMetrics.filter((metric) => metric.key === selectedMetricKey)
      : activeGroupMetrics;

    const metricKeys = targetMetrics.map((metric) => metric.key);
    const allVals = [];

    targetMetrics.forEach((metric) => {
      const series = getModeSeries(scopedAnalytics, metric.key, timeMode, analyticsRefDate, analyticsEndDate);
      series.forEach((item) => {
        if (Number.isFinite(item.average)) allVals.push(item.average);
        if (Number.isFinite(item.min)) allVals.push(item.min);
        if (Number.isFinite(item.max)) allVals.push(item.max);
      });
    });

    return getCombinedMetricBounds(metricKeys, allVals);
  }, [activeGroupMetrics, scopedAnalytics, timeMode, analyticsRefDate, analyticsEndDate, usesSplitRangeCharts, selectedAnalysisGroupKey, selectedMetricKey]);

  const environmentChartOptions = useMemo(() => {
    const temps = environmentSeries.map(item => item.temperature.average);
    const tempMaxs = environmentSeries.map(item => item.temperature.max);
    const tempMins = environmentSeries.map(item => item.temperature.min);
    const tempBounds = getMetricBounds("temperature", [...temps, ...tempMaxs, ...tempMins]);

    const hums = environmentSeries.map(item => item.humidity.average);
    const humMaxs = environmentSeries.map(item => item.humidity.max);
    const humMins = environmentSeries.map(item => item.humidity.min);
    const humBounds = getMetricBounds("humidity", [...hums, ...humMaxs, ...humMins]);

    return withHistoryChartZoom(
      {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: {
              filter: (item) => !["Nhiệt độ min", "Độ ẩm min"].includes(item.text),
              usePointStyle: true,
              boxWidth: 8,
            },
          },
          tooltip: {
            callbacks: {
              title: (context) => {
                const index = context[0].dataIndex;
                return environmentSeries[index]?.fullLabel || context[0].label || "";
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#64748b" },
            grid: { color: "rgba(148, 163, 184, 0.12)" },
          },
          y: buildBoundedYScale(tempBounds, {
            type: "linear",
            position: "left",
            title: { display: true, text: "Nhiệt độ (°C)" },
            ticks: { color: "#ef4444" },
            grid: { color: "rgba(148, 163, 184, 0.12)" },
          }),
          y1: buildBoundedYScale(humBounds, {
            type: "linear",
            position: "right",
            title: { display: true, text: "Độ ẩm (%)" },
            ticks: { color: "#2563eb" },
            grid: { drawOnChartArea: false },
          }),
        },
      },
      { y: ["temperature"], y1: ["humidity"] }
    );
  }, [environmentSeries]);

  const rangeChartLegendFilter = (item) => !String(item.text).endsWith(" min");

  const rangeChartTooltipCallbacks = useMemo(
    () => ({
      label: (context) => {
        const label = context.dataset.label || "";
        const isMin = label.endsWith(" min");
        const metricLabel = isMin ? label.slice(0, -4) : label;
        const value = context.parsed.y;
        const metricMeta = METRICS.find((m) => m.label === metricLabel);
        const decimals = metricMeta !== undefined ? metricMeta.decimals : 1;
        const unit = metricMeta?.unit ? ` ${metricMeta.unit}` : "";
        const formattedVal = value !== null && value !== undefined ? value.toFixed(decimals) : "-";
        return `${metricLabel} ${isMin ? "min" : "max"}: ${formattedVal}${unit}`;
      },
    }),
    []
  );

  const environmentRangeChartOptions = useMemo(
    () => ({
      ...environmentChartOptions,
      plugins: {
        ...environmentChartOptions.plugins,
        legend: {
          display: true,
          labels: {
            filter: rangeChartLegendFilter,
            usePointStyle: true,
            boxWidth: 8,
          },
          onClick: (e, legendItem, legend) => {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            const isVisible = ci.isDatasetVisible(index);
            ci.setDatasetVisibility(index, !isVisible);
            const nextDataset = ci.data.datasets[index + 1];
            if (nextDataset && String(nextDataset.label).endsWith(" min")) {
              ci.setDatasetVisibility(index + 1, !isVisible);
            }
            ci.update();
          },
        },
        tooltip: {
          callbacks: {
            ...rangeChartTooltipCallbacks,
            title: (context) => {
              const index = context[0].dataIndex;
              return environmentSeries[index]?.fullLabel || context[0].label || "";
            }
          },
        },
      },
      elements: {
        line: {
          tension: 0,
        },
        point: {
          radius: 0,
        },
      },
    }),
    [environmentChartOptions, rangeChartTooltipCallbacks]
  );

  const groupRangeChartOptions = useMemo(
    () => {
      const zoomMetrics = selectedAnalysisGroupKey === "spectrometer"
        ? activeGroupMetrics.filter((metric) => metric.key === selectedMetricKey)
        : activeGroupMetrics;

      return withHistoryChartZoom(
        {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              display: true,
              labels: {
                filter: rangeChartLegendFilter,
                usePointStyle: true,
                boxWidth: 8,
              },
              onClick: (e, legendItem, legend) => {
                const index = legendItem.datasetIndex;
                const ci = legend.chart;
                const isVisible = ci.isDatasetVisible(index);
                ci.setDatasetVisibility(index, !isVisible);
                const nextDataset = ci.data.datasets[index + 1];
                if (nextDataset && String(nextDataset.label).endsWith(" min")) {
                  ci.setDatasetVisibility(index + 1, !isVisible);
                }
                ci.update();
              },
            },
            tooltip: {
              callbacks: {
                ...rangeChartTooltipCallbacks,
                title: (context) => {
                  const index = context[0].dataIndex;
                  return trendSeries[index]?.fullLabel || context[0].label || "";
                }
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "#64748b" },
              grid: { color: "rgba(148, 163, 184, 0.12)" },
            },
            y: buildBoundedYScale(combinedGroupBounds, {
              ticks: { color: "#64748b" },
              grid: { color: "rgba(148, 163, 184, 0.12)" },
            }),
          },
          elements: {
            line: {
              tension: 0,
            },
            point: {
              radius: 0,
            },
          },
        },
        { y: zoomMetrics.map((metric) => metric.key) }
      );
    },
    [combinedGroupBounds, activeGroupMetrics, rangeChartTooltipCallbacks, selectedAnalysisGroupKey, selectedMetricKey, trendSeries]
  );

  const chartScopeKey = useMemo(
    () =>
      [
        selectedDeviceId,
        timeMode,
        selectedAnalysisGroupKey,
        selectedMetricKey,
        selectedDay,
        selectedWeek,
        selectedMonth,
      ].join("|"),
    [
      selectedDeviceId,
      timeMode,
      selectedAnalysisGroupKey,
      selectedMetricKey,
      selectedDay,
      selectedWeek,
      selectedMonth,
    ]
  );

  const environmentTrendChartRef = useRef(null);
  const environmentRangeChartRef = useRef(null);
  const trendChartRef = useRef(null);
  const groupRangeChartRef = useRef(null);

  useEffect(() => {
    [
      environmentTrendChartRef,
      environmentRangeChartRef,
      trendChartRef,
      groupRangeChartRef,
    ].forEach((chartRef) => {
      chartRef.current?.resetZoom?.();
    });
  }, [chartScopeKey]);

  const periodStats = useMemo(
    () => getPeriodStats(trendSeries, selectedMetricKey, timeMode),
    [trendSeries, selectedMetricKey, timeMode]
  );

  const selectedAnalysisPeriod = useMemo(
    () =>
      getStrongestPeriod(
        scopedAnalytics,
        selectedMetricKey,
        timeMode,
        analyticsRefDate,
        analyticsEndDate
      ),
    [scopedAnalytics, selectedMetricKey, timeMode, analyticsRefDate, analyticsEndDate]
  );

  const selectedAnalysisLabel = useMemo(() => {
    if (timeMode === "day") {
      return "giờ";
    }

    if (timeMode === "week" || timeMode === "month") {
      return "ngày";
    }

    return "mốc";
  }, [timeMode]);

  const displayReversalCount = useMemo(() => {
    if (dbStats && dbStats[selectedMetricKey]?.reversalCount !== undefined && dbStats[selectedMetricKey]?.reversalCount !== null) {
      return dbStats[selectedMetricKey].reversalCount;
    }
    return periodStats?.reversalCount ?? 0;
  }, [dbStats, selectedMetricKey, periodStats]);

  const displayReversalSubvalue = useMemo(() => {
    if (dbStats && dbStats[selectedMetricKey]?.reversalCount !== undefined && dbStats[selectedMetricKey]?.reversalCount !== null) {
      return `Đổi hướng tăng hoặc giảm giữa các ${selectedAnalysisLabel} liên tiếp`;
    }
    return `Đổi hướng tăng hoặc giảm giữa các ${selectedAnalysisLabel} liên tiếp`;
  }, [dbStats, selectedMetricKey, selectedAnalysisLabel]);



  const sidebarProps = {
    devices,
    selectedDeviceId,
    onSelectDevice: setSelectedDeviceId,
    onRegisterDevice: handleRegisterDevice,
    onUnregisterDevice: handleUnregisterDevice,
  };
  const hasHistoryData = filteredAnalytics.length > 0;
  const canShowFilters = Boolean(selectedDeviceId && selectedHistoryType);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="px-2 pb-8 pt-18 sm:px-4 sm:pt-20 lg:px-6">
        <div className="mx-auto w-full max-w-[1700px] rounded-[28px] border border-border/50 bg-card/80 shadow-2xl backdrop-blur-sm">
          <div className="flex min-h-[calc(100vh-7rem)] rounded-[28px]">
            <aside className="hidden border-r border-border/50 bg-card/70 rounded-l-[28px] w-64 shrink-0 lg:block">
              <div className="sticky top-[80px] h-[calc(100vh-120px)] z-10">
                <DeviceSidebar className="border-none bg-transparent backdrop-blur-none h-full rounded-l-[28px]" {...sidebarProps} />
              </div>
            </aside>

            <section className="min-w-0 flex-1 rounded-r-[28px] overflow-hidden">
              <div className="border-b border-border/50 bg-background/40 px-5 py-6 sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                      Lịch sử và phân tích <span className="text-primary">dữ liệu cảm biến</span>
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="rounded-xl border border-border/60 bg-background/70 px-4 py-2 text-sm font-medium lg:hidden"
                    >
                      Thiết bị
                    </button>
                    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bản ghi</p>
                      <p className="mt-1 text-xl font-bold text-primary">{total}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Thiết bị đang xét</p>
                      <p className="mt-1 text-sm font-semibold">
                        {selectedDeviceId || (devices.length ? "Tất cả thiết bị có dữ liệu" : "Chưa đăng ký")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-5 py-6 sm:px-8">
                {canShowFilters ? (
                  <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">Bộ lọc phân tích</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                          Chọn cảm biến và nhịp tổng hợp để xem hành vi dữ liệu.
                          </p>
                        </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-3">
                          <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Cụm phân tích</span>
                            <select
                              value={selectedAnalysisGroupKey}
                              onChange={(event) => setSelectedAnalysisGroupKey(event.target.value)}
                              className="bg-transparent outline-none"
                            >
                              {availableAnalysisGroups.map((group) => (
                                <option key={group.key} value={group.key}>
                                  {group.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          {activeGroupMetrics.length > 1 && (
                            <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                              <span className="text-muted-foreground">Chỉ số</span>
                              <select
                                value={selectedMetricKey}
                                onChange={(event) => setSelectedMetricKey(event.target.value)}
                                className="bg-transparent outline-none"
                              >
                                {activeGroupMetrics.map((metric) => (
                                  <option key={metric.key} value={metric.key}>
                                    {metric.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}

                          <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Thời gian</span>
                            <select
                              value={timeMode}
                              onChange={(event) => setTimeMode(event.target.value)}
                              className="bg-transparent outline-none"
                            >
                              {TIME_MODES.map((item) => (
                                <option key={item.key} value={item.key}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {(timeMode === "day" || timeMode === "hour" || timeMode === "week" || timeMode === "month") && (
                          <div className="flex flex-wrap gap-3">
                            {timeMode === "day" || timeMode === "hour" ? (
                              <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                                <span className="text-muted-foreground">Chọn ngày</span>
                                <input
                                  type="date"
                                  value={selectedDay}
                                  onChange={(event) => setSelectedDay(event.target.value)}
                                  className="bg-transparent outline-none"
                                />
                              </label>
                            ) : null}

                            {timeMode === "hour" ? (
                              <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                                <span className="text-muted-foreground">Chọn giờ</span>
                                <select
                                  value={selectedHour}
                                  onChange={(event) => setSelectedHour(Number(event.target.value))}
                                  className="bg-transparent outline-none"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>
                                      {String(i).padStart(2, "0")}:00
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}

                            {timeMode === "week" ? (
                              <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                                <span className="text-muted-foreground">Chọn tuần</span>
                                <input
                                  type="week"
                                  value={selectedWeek}
                                  onChange={(event) => setSelectedWeek(event.target.value)}
                                  className="bg-transparent outline-none"
                                />
                              </label>
                            ) : null}

                            {timeMode === "month" ? (
                              <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                                <span className="text-muted-foreground">Chọn tháng</span>
                                <input
                                  type="month"
                                  value={selectedMonth}
                                  onChange={(event) => setSelectedMonth(event.target.value)}
                                  className="bg-transparent outline-none"
                                />
                              </label>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {!filteredAnalytics.some((record) => record.deviceId) && devices.length ? (
                      <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                        API lịch sử hiện chưa trả về `deviceId`, nên phần phân tích đang dùng toàn bộ bản ghi dù bạn đã đăng ký thiết bị.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {loading ? (
                  <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-border/60 bg-background/60">
                    <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                  </div>
                ) : error ? (
                  <div className="rounded-3xl border border-red-500/40 bg-red-500/10 px-6 py-5 text-red-600 dark:text-red-300">
                    <p className="font-semibold">Lỗi tải dữ liệu: {error}</p>
                    {error.includes("Unauthorized") ? (
                      <p className="mt-2 text-sm">Đang chuyển về trang đăng nhập.</p>
                    ) : null}
                  </div>
                ) : !hasHistoryData ? (
                  <div className="rounded-3xl border border-border/60 bg-background/60 px-6 py-16 text-center">
                    <p className="text-xl font-semibold">Chưa có dữ liệu lịch sử</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Hãy chọn thiết bị khác hoặc đợi backend ghi nhận thêm bản ghi.
                    </p>
                  </div>
                ) : (
                  <>
                    {isEnvironmentAnalysis ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <StatCard
                            label={`Dữ liệu mới nhất · ${selectedMetric.label}`}
                            value={formatMetricValue(latestRawRecord?.[selectedMetric.key] ?? null, selectedMetric.key)}
                            subvalue={latestRawRecord ? `Thời điểm nhận: ${formatDateTime(latestRawRecord.time)}` : "Không có dữ liệu"}
                            accent={selectedMetric.color}
                          />
                          <StatCard
                            label={`Giá trị trung bình · ${selectedMetric.label}`}
                            value={formatMetricValue(metricStats?.average, selectedMetric.key)}
                            subvalue={(() => {
                              const minVal = formatMetricValue(metricStats?.min?.value, selectedMetric.key);
                              const minTime = metricStats?.min?.time ? ` (${formatStatTime(metricStats.min.time, timeMode)})` : "";
                              const maxVal = formatMetricValue(metricStats?.max?.value, selectedMetric.key);
                              const maxTime = metricStats?.max?.time ? ` (${formatStatTime(metricStats.max.time, timeMode)})` : "";
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <span>Min: {minVal}{minTime}</span>
                                  <span>Max: {maxVal}{maxTime}</span>
                                </div>
                              );
                            })()}
                            accent={selectedMetric.color}
                          />
                          <StatCard
                            label={`Biên độ trung bình theo ${selectedAnalysisLabel}`}
                            value={formatMetricValue(periodStats?.averageAbsDelta, selectedMetric.key)}
                            subvalue={periodStats?.strongestJump ? `Bước nhảy lớn nhất: ${formatSignedMetricValue(periodStats.strongestJump.delta, selectedMetric.key)} (${periodStats.strongestJump.label || "-"})` : "Không có bước nhảy"}
                            accent={selectedMetric.color}
                          />
                          <StatCard
                            label={`Số lần đảo chiều theo ${selectedAnalysisLabel}`}
                            value={displayReversalCount}
                            subvalue={displayReversalSubvalue}
                            accent={selectedMetric.color}
                          />
                        </div>

                        <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                          <h2 className="text-xl font-bold">Đồ thị xu hướng: Nhiệt độ & Độ ẩm</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Hiển thị nhiệt độ và độ ẩm theo thời gian. {CHART_ZOOM_HINT}
                          </p>
                          <div className="mt-5 h-[380px]">
                            <Line
                              key={`env-trend-${chartScopeKey}`}
                              ref={environmentTrendChartRef}
                              data={environmentLineData}
                              options={environmentChartOptions}
                            />
                          </div>
                        </div>

                        <div className={timeMode === "hour" ? "grid gap-6 grid-cols-1" : "grid gap-6 xl:grid-cols-2"}>
                          <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                            <div>
                              <h2 className="text-xl font-bold">Phân bố chu kỳ</h2>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Heatmap hiển thị đồng thời nhiệt độ và độ ẩm theo giờ trong ngày và thứ trong tuần.
                              </p>
                            </div>
                            <div className="mt-5 space-y-6">
                              <div>
                                <p className="mb-3 text-sm font-semibold text-red-600">Nhiệt độ</p>
                                <HeatmapGrid data={temperatureHeatmapData} metric={HEATMAP_METRICS[0]} />
                              </div>
                              <div>
                                <p className="mb-3 text-sm font-semibold text-blue-600">Độ ẩm</p>
                                <HeatmapGrid data={humidityHeatmapData} metric={HEATMAP_METRICS[1]} />
                              </div>
                            </div>
                          </div>

                          {timeMode !== "hour" && (
                            <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                              <h2 className="text-xl font-bold">Đỉnh và đáy theo chu kỳ</h2>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Dải đỏ nhạt thể hiện nhiệt độ max-min, dải xanh nhạt thể hiện độ ẩm max-min. {CHART_ZOOM_HINT}
                              </p>
                              <div className="mt-5 h-[320px]">
                                <Line
                                  key={`env-range-${chartScopeKey}`}
                                  ref={environmentRangeChartRef}
                                  data={environmentRangeData}
                                  options={environmentRangeChartOptions}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <StatCard
                        label={`Dữ liệu mới nhất · ${selectedMetric.label}`}
                        value={formatMetricValue(latestRawRecord?.[selectedMetric.key] ?? null, selectedMetric.key)}
                        subvalue={latestRawRecord ? `Thời điểm nhận: ${formatDateTime(latestRawRecord.time)}` : "Không có dữ liệu"}
                        accent={selectedMetric.color}
                      />
                      <StatCard
                        label={`Giá trị trung bình · ${selectedMetric.label}`}
                        value={formatMetricValue(metricStats?.average, selectedMetric.key)}
                        subvalue={(() => {
                          const minVal = formatMetricValue(metricStats?.min?.value, selectedMetric.key);
                          const minTime = metricStats?.min?.time ? ` (${formatStatTime(metricStats.min.time, timeMode)})` : "";
                          const maxVal = formatMetricValue(metricStats?.max?.value, selectedMetric.key);
                          const maxTime = metricStats?.max?.time ? ` (${formatStatTime(metricStats.max.time, timeMode)})` : "";
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span>Min: {minVal}{minTime}</span>
                              <span>Max: {maxVal}{maxTime}</span>
                            </div>
                          );
                        })()}
                        accent={selectedMetric.color}
                      />
                      <StatCard
                        label={`Biên độ trung bình theo ${selectedAnalysisLabel}`}
                        value={formatMetricValue(periodStats?.averageAbsDelta, selectedMetric.key)}
                        subvalue={periodStats?.strongestJump ? `Bước nhảy lớn nhất: ${formatSignedMetricValue(periodStats.strongestJump.delta, selectedMetric.key)} (${periodStats.strongestJump.label || "-"})` : "Không có bước nhảy"}
                        accent={selectedMetric.color}
                      />
                      <StatCard
                        label={`Số lần đảo chiều theo ${selectedAnalysisLabel}`}
                        value={displayReversalCount}
                        subvalue={displayReversalSubvalue}
                        accent={selectedMetric.color}
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                        <h2 className="text-xl font-bold">Đồ thị xu hướng {selectedMetric.label.toLowerCase()}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Dữ liệu được gộp {TIME_MODES.find((item) => item.key === timeMode)?.label.toLowerCase()} với {modePointCount} điểm
                          {timeMode === "day"
                            ? " (khung 0-2, 2-4, …, 22-24)"
                            : timeMode === "month"
                              ? " (tự điều chỉnh theo số ngày trong tháng)"
                              : ""}
                          ; thiếu dữ liệu sẽ để trống. {CHART_ZOOM_HINT}
                        </p>
                        <div className="mt-5 h-[320px]">
                          <Line
                            key={`trend-${chartScopeKey}`}
                            ref={trendChartRef}
                            data={lineData}
                            options={chartOptions}
                          />
                        </div>
                      </div>

                      <div className={timeMode === "hour" ? "grid gap-6 grid-cols-1" : "grid gap-6 xl:grid-cols-2"}>
                        <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                          <div>
                            <h2 className="text-xl font-bold">Phân bố chu kỳ</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Heatmap hiển thị các chỉ số theo giờ trong ngày và thứ trong tuần.
                            </p>
                          </div>
                          <div className="mt-5 space-y-6">
                            {(selectedAnalysisGroupKey === "spectrometer"
                              ? activeGroupMetrics.filter((metric) => metric.key === selectedMetricKey)
                              : activeGroupMetrics
                            ).map((metric) => {
                              const heatmapData = groupHeatmapsData[metric.key];
                              if (!heatmapData) return null;
                              return (
                                <div key={`group-heatmap-${metric.key}`}>
                                  <p className="mb-3 text-sm font-semibold" style={{ color: metric.color }}>
                                    {metric.label} {metric.unit ? `(${metric.unit})` : ""}
                                  </p>
                                  <HeatmapGrid data={heatmapData} metric={metric} />
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {timeMode !== "hour" && (
                          usesSplitRangeCharts ? (
                            <div className="space-y-6">
                              <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                                <div>
                                  <h2 className="text-xl font-bold">Đỉnh và đáy theo chu kỳ</h2>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Mỗi chỉ số có một đồ thị riêng, hiển thị dải max-min theo chu kỳ với góc nhọn. {CHART_ZOOM_HINT}
                                  </p>
                                </div>
                              </div>
                              <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                                {splitMetricRangeCharts.map(({ metric, data, bounds }) => {
                                  const chartOpts = withHistoryChartZoom(
                                    {
                                      ...groupRangeChartOptions,
                                      scales: {
                                        ...groupRangeChartOptions.scales,
                                        y: buildBoundedYScale(bounds, groupRangeChartOptions.scales?.y),
                                      },
                                    },
                                    { y: [metric.key] }
                                  );
                                  return (
                                    <div
                                      key={metric.key}
                                      className="rounded-3xl border border-border/60 bg-background/70 p-5"
                                    >
                                      <h3 className="text-base font-bold" style={{ color: metric.color }}>
                                        {metric.label}
                                      </h3>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        Dải max-min {metric.label.toLowerCase()}
                                        {metric.unit ? ` (${metric.unit})` : ""}
                                      </p>
                                      <div className="mt-4 h-[260px]">
                                        <Line
                                          key={`split-range-${chartScopeKey}-${metric.key}`}
                                          data={data}
                                          options={chartOpts}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                              <h2 className="text-xl font-bold">Đỉnh và đáy theo chu kỳ</h2>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Mỗi chỉ số trong cụm hiển thị dải max-min theo chu kỳ, cùng kiểu đồ thị vùng góc nhọn như nhiệt độ và độ ẩm. {CHART_ZOOM_HINT}
                              </p>
                              <div className="mt-5 h-[320px]">
                                <Line
                                  key={`group-range-${chartScopeKey}`}
                                  ref={groupRangeChartRef}
                                  data={groupRangeData}
                                  options={groupRangeChartOptions}
                                />
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                      </>
                    )}

                    <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h2 className="text-xl font-bold">Danh sách lịch sử chi tiết</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Bảng chi tiết vẫn giữ lại để đối soát từng bản ghi, nhưng đã gắn thêm lớp phân tích phía trên.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Hiển thị</span>
                            <select
                              value={itemsPerPage}
                              onChange={(event) => {
                                setItemsPerPage(Number(event.target.value));
                                setCurrentPage(1);
                              }}
                              className="bg-transparent outline-none"
                            >
                              {HISTORY_TABLE_PAGE_SIZES.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          </label>
                          <p className="text-sm text-muted-foreground">
                            Trang {currentPage} / {totalPages}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[1120px] border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-border/60 text-left text-muted-foreground">
                              <th className="px-3 py-3 font-medium">#</th>
                              <th className="px-3 py-3 font-medium">Thời gian</th>
                              <th className="px-3 py-3 font-medium">Thiết bị</th>
                              {recordColumns.map((column) => (
                                <th key={column} className="px-3 py-3 text-right font-medium">
                                  {getMetricMeta(column).label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTableData.map((item, index) => (
                              <tr key={item.id} className="border-b border-border/40 hover:bg-primary/5">
                                <td className="px-3 py-3 text-muted-foreground">
                                  {(currentPage - 1) * itemsPerPage + index + 1}
                                </td>
                                <td className="px-3 py-3">{formatDateTime(item.createdAt)}</td>
                                <td className="px-3 py-3">{item.deviceId || "-"}</td>
                                {recordColumns.map((column) => (
                                  <td key={`${item.id}-${column}`} className="px-3 py-3 text-right font-mono">
                                    {formatMetricValue(item[column], column)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                          disabled={currentPage === 1}
                          className="rounded-xl border border-border/60 bg-card px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Trước
                        </button>

                        {getPageNumbers(currentPage, totalPages).map((page, index) =>
                          page === "..." ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                              ...
                            </span>
                          ) : (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                                currentPage === page
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border/60 bg-card"
                              }`}
                            >
                              {page}
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                          disabled={currentPage === totalPages}
                          className="rounded-xl border border-border/60 bg-card px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {isMobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="Đóng quản lý thiết bị"
          />
          <div className="absolute left-0 top-0 h-full w-[min(82vw,320px)] border-r border-border/60 bg-card shadow-2xl">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md border border-border/70 bg-background/80 text-foreground shadow-sm"
              aria-label="Đóng quản lý thiết bị"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <DeviceSidebar className="h-full w-full" {...sidebarProps} />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed left-0 top-1/2 z-40 flex h-12 w-8 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-border/70 bg-card/95 text-foreground shadow-lg backdrop-blur lg:hidden"
        aria-label="Mở quản lý thiết bị"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <Footer />
    </div>
  );
};

