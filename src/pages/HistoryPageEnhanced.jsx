import { useEffect, useMemo, useState } from "react";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

const ANALYTICS_PAGE_SIZE = 100;
const ANALYTICS_MAX_PAGES = 8;

const METRICS = [
  { key: "temperature", label: "Nhiệt độ", unit: "°C", color: "#ef4444", decimals: 1 },
  { key: "humidity", label: "Độ ẩm", unit: "%", color: "#06b6d4", decimals: 1 },
  { key: "lux", label: "Ánh sáng", unit: "lux", color: "#f59e0b", decimals: 0 },
  { key: "UVI", label: "UVI", unit: "", color: "#8b5cf6", decimals: 2 },
  { key: "UVA", label: "UVA", unit: "", color: "#a855f7", decimals: 2 },
  { key: "UVB", label: "UVB", unit: "", color: "#c084fc", decimals: 2 },
  { key: "broadband", label: "Broadband", unit: "", color: "#f97316", decimals: 0 },
  { key: "infrared", label: "Hồng ngoại", unit: "", color: "#ec4899", decimals: 0 },
  { key: "sound", label: "Âm thanh", unit: "dB", color: "#22c55e", decimals: 1 },
  { key: "pm1", label: "PM1.0", unit: "µg/m3", color: "#64748b", decimals: 1 },
  { key: "pm25", label: "PM2.5", unit: "µg/m3", color: "#475569", decimals: 1 },
  { key: "pm10", label: "PM10", unit: "µg/m3", color: "#334155", decimals: 1 },
  { key: "aqi", label: "AQI", unit: "", color: "#0f766e", decimals: 0 },
];

const TIME_MODES = [
  { key: "hour", label: "Theo giờ" },
  { key: "day", label: "Theo ngày" },
  { key: "week", label: "Theo tuần" },
  { key: "month", label: "Theo tháng" },
];

const MODE_POINT_LIMITS = {
  hour: 24,
  day: 14,
  week: 16,
  month: 6,
};

const MODE_DISTRIBUTION_STEPS = {
  hour: 2,
  day: 2,
  week: 2,
  month: 1,
};

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

const getDeviceId = (record) =>
  String(
    record?.deviceId ??
      record?.device_id ??
      record?.device ??
      record?.sensorId ??
      record?.sensor_id ??
      record?.deviceInfo?.id ??
      ""
  ).trim();

const normalizeHistoryRecord = (record, index) => {
  const createdAt =
    record?.createdAt ||
    record?.created_at ||
    record?.timestamp ||
    record?.time ||
    new Date().toISOString();

  return {
    id: record?._id || record?.id || `${createdAt}-${index}`,
    createdAt,
    time: new Date(createdAt).getTime(),
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
    pm25: parseNumeric(record?.pm25 ?? record?.PM25 ?? record?.pm2_5 ?? record?.pm_25),
    pm10: parseNumeric(record?.pm10 ?? record?.PM10 ?? record?.pm_10),
    aqi: parseNumeric(record?.aqi ?? record?.AQI),
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

const groupByPeriod = (records, metricKey, mode) => {
  const grouped = new Map();

  records.forEach((record) => {
    const value = record[metricKey];
    if (value === null || value === undefined) {
      return;
    }

    const date = new Date(record.time);
    let bucketKey = "";
    let label = "";

    if (mode === "hour") {
      bucketKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      label = `${date.getHours().toString().padStart(2, "0")}:00`;
    } else if (mode === "day") {
      bucketKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      label = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    } else if (mode === "week") {
      const start = getStartOfWeek(date);
      bucketKey = start.toISOString();
      label = `Tuần ${start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
    } else {
      bucketKey = `${date.getFullYear()}-${date.getMonth()}`;
      label = `T${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    if (!grouped.has(bucketKey)) {
      grouped.set(bucketKey, {
        label,
        values: [],
        peak: { value, time: record.time },
      });
    }

    const bucket = grouped.get(bucketKey);
    bucket.values.push(value);

    if (value > bucket.peak.value) {
      bucket.peak = { value, time: record.time };
    }
  });

  return Array.from(grouped.values()).map((bucket) => {
    const values = bucket.values;
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return {
      label: bucket.label,
      average,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      peak: bucket.peak,
    };
  });
};

const getStrongestPeriod = (records, metricKey, mode) => {
  const groups = groupByPeriod(records, metricKey, mode).filter((item) => Number.isFinite(item.average));
  if (!groups.length) {
    return null;
  }

  return groups.reduce((best, item) => (item.average > best.average ? item : best), groups[0]);
};

const getModeSeries = (records, metricKey, mode) => {
  const limit = MODE_POINT_LIMITS[mode] || 12;
  const grouped = groupByPeriod(records, metricKey, mode).filter((item) => Number.isFinite(item.average));
  return grouped.slice(-limit);
};

const getDistributionSeries = (series, mode) => {
  const step = MODE_DISTRIBUTION_STEPS[mode] || 1;
  return series.filter((_, index) => index % step === 0);
};

const getPeriodStats = (series) => {
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
  let reversalCount = 0;

  for (let index = 1; index < points.length; index += 1) {
    const delta = points[index].value - points[index - 1].value;
    deltas.push({
      delta,
      label: points[index].label,
    });

    if (index >= 2) {
      const previousDelta = points[index - 1].value - points[index - 2].value;
      if ((delta > 0 && previousDelta < 0) || (delta < 0 && previousDelta > 0)) {
        reversalCount += 1;
      }
    }
  }

  const average = points.reduce((sum, item) => sum + item.value, 0) / points.length;
  const averageAbsDelta = deltas.length
    ? deltas.reduce((sum, item) => sum + Math.abs(item.delta), 0) / deltas.length
    : 0;
  const strongestJump = deltas.length
    ? deltas.reduce((best, item) => (Math.abs(item.delta) > Math.abs(best.delta) ? item : best), deltas[0])
    : null;

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

const getMetricStats = (records, metricKey) => {
  const points = records
    .map((record) => ({ value: record[metricKey], time: record.time }))
    .filter((point) => point.value !== null && point.value !== undefined);

  if (!points.length) {
    return null;
  }

  const values = points.map((point) => point.value);
  const deltas = [];
  let reversalCount = 0;

  for (let index = 1; index < points.length; index += 1) {
    const delta = points[index].value - points[index - 1].value;
    deltas.push({
      delta,
      time: points[index].time,
      from: points[index - 1].value,
      to: points[index].value,
    });

    if (index >= 2) {
      const previousDelta = points[index - 1].value - points[index - 2].value;
      if ((delta > 0 && previousDelta < 0) || (delta < 0 && previousDelta > 0)) {
        reversalCount += 1;
      }
    }
  }

  const absoluteDeltas = deltas.map((item) => Math.abs(item.delta));
  const latest = points[points.length - 1];
  const peak = points.reduce((best, point) => (point.value > best.value ? point : best), points[0]);
  const low = points.reduce((best, point) => (point.value < best.value ? point : best), points[0]);
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

const chartOptions = {
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
    {subvalue ? <p className="mt-2 text-sm text-muted-foreground">{subvalue}</p> : null}
  </div>
);

export const HistoryPage = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [devices, setDevices] = useState(loadStoredDevices);
  const [selectedDeviceId, setSelectedDeviceId] = useState(loadSelectedDeviceId);
  const [tableData, setTableData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [timeMode, setTimeMode] = useState("day");
  const [selectedMetricKey, setSelectedMetricKey] = useState("temperature");
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

      try {
        const baseParams = {
          page: currentPage,
          limit: itemsPerPage,
          type: selectedHistoryType,
          deviceId: selectedDeviceId || undefined,
        };
        const current = await historyService.getHistoryData(baseParams);
        if (isCancelled) {
          return;
        }

        setTableData((current.data || []).map(normalizeHistoryRecord));
        setTotalPages(current.totalPages || 1);
        setTotal(current.total || 0);

        const totalAnalyticsPages = Math.min(current.totalPages || 1, ANALYTICS_MAX_PAGES);
        const pages = [current];

        for (let page = 2; page <= totalAnalyticsPages; page += 1) {
          const nextPage = await historyService.getHistoryData({
            ...baseParams,
            page,
            limit: ANALYTICS_PAGE_SIZE,
          });
          pages.push(nextPage);
        }

        if (isCancelled) {
          return;
        }

        const merged = pages.flatMap((page) => page.data || []).map(normalizeHistoryRecord);
        merged.sort((left, right) => left.time - right.time);
        setAnalyticsData(merged);
      } catch (fetchError) {
        if (isCancelled) {
          return;
        }

        setError(fetchError.message || "Không thể tải lịch sử dữ liệu.");
        if (String(fetchError.message).includes("Unauthorized")) {
          setTimeout(() => navigate("/login"), 1500);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, itemsPerPage, navigate, selectedDeviceId, selectedHistoryType]);

  const handleRegisterDevice = (device) => {
    setDevices((previous) => [...previous, device]);
    setSelectedDeviceId(device.id);
  };

  const handleUnregisterDevice = (deviceId) => {
    setDevices((previous) => previous.filter((device) => device.id !== deviceId));
  };

  const analyticsHasDeviceIds = analyticsData.some((record) => record.deviceId);

  const filteredAnalytics = useMemo(() => {
    if (!selectedDeviceId || !analyticsHasDeviceIds) {
      return analyticsData;
    }

    return analyticsData.filter((record) => record.deviceId === selectedDeviceId);
  }, [analyticsData, analyticsHasDeviceIds, selectedDeviceId]);

  const filteredTableData = useMemo(() => {
    if (!selectedDeviceId || !analyticsHasDeviceIds) {
      return tableData;
    }

    return tableData.filter((record) => record.deviceId === selectedDeviceId);
  }, [tableData, analyticsHasDeviceIds, selectedDeviceId]);

  const recordColumns = useMemo(
    () => getRecordColumns(selectedHistoryType, filteredTableData),
    [filteredTableData, selectedHistoryType]
  );

  const availableMetrics = useMemo(
    () =>
      METRICS.filter((metric) =>
        filteredAnalytics.some((record) => record[metric.key] !== null && record[metric.key] !== undefined)
      ),
    [filteredAnalytics]
  );

  useEffect(() => {
    if (!availableMetrics.some((metric) => metric.key === selectedMetricKey)) {
      setSelectedMetricKey(availableMetrics[0]?.key || "temperature");
    }
  }, [availableMetrics, selectedMetricKey]);

  const selectedMetric = getMetricMeta(selectedMetricKey);
  const metricStats = useMemo(
    () => getMetricStats(filteredAnalytics, selectedMetricKey),
    [filteredAnalytics, selectedMetricKey]
  );
  const trendSeries = useMemo(
    () => getModeSeries(filteredAnalytics, selectedMetricKey, timeMode),
    [filteredAnalytics, selectedMetricKey, timeMode]
  );

  const lineData = useMemo(
    () => ({
      labels: trendSeries.map((item) => item.label),
      datasets: [
        {
          label: selectedMetric.label,
          data: trendSeries.map((item) => item.average),
          borderColor: selectedMetric.color,
          backgroundColor: `${selectedMetric.color}22`,
          fill: true,
          tension: 0.35,
          pointRadius: 2.5,
        },
      ],
    }),
    [selectedMetric, trendSeries]
  );

  const periodStats = useMemo(() => getPeriodStats(trendSeries), [trendSeries]);

  const selectedAnalysisPeriod = useMemo(
    () => getStrongestPeriod(filteredAnalytics, selectedMetricKey, timeMode),
    [filteredAnalytics, selectedMetricKey, timeMode]
  );

  const selectedAnalysisLabel = useMemo(() => {
    if (timeMode === "hour") {
      return "giờ";
    }

    if (timeMode === "week") {
      return "tuần";
    }

    if (timeMode === "month") {
      return "tháng";
    }

    return "ngày";
  }, [timeMode]);

  const distributionSeries = useMemo(
    () => getDistributionSeries(trendSeries, timeMode),
    [timeMode, trendSeries]
  );

  const distributionData = {
    labels: distributionSeries.map((item) => item.label),
    datasets: [
      {
        label: `${selectedMetric.label} trung bình`,
        data: distributionSeries.map((item) => item.average),
        backgroundColor: `${selectedMetric.color}99`,
        borderRadius: 10,
      },
    ],
  };

  const peakLowDistributionData = {
    labels: distributionSeries.map((item) => item.label),
    datasets: [
      {
        label: `${selectedMetric.label} cao nhất`,
        data: distributionSeries.map((item) => item.max),
        backgroundColor: `${selectedMetric.color}66`,
        borderColor: selectedMetric.color,
        borderWidth: 1,
        borderRadius: 10,
      },
      {
        label: `${selectedMetric.label} thấp nhất`,
        data: distributionSeries.map((item) => item.min),
        backgroundColor: "rgba(59, 130, 246, 0.55)",
        borderColor: "rgba(37, 99, 235, 1)",
        borderWidth: 1,
        borderRadius: 10,
      },
    ],
  };

  const sidebarProps = {
    devices,
    selectedDeviceId,
    onSelectDevice: setSelectedDeviceId,
    onRegisterDevice: handleRegisterDevice,
    onUnregisterDevice: handleUnregisterDevice,
  };
  const hasHistoryData = filteredAnalytics.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="px-2 pb-8 pt-18 sm:px-4 sm:pt-20 lg:px-6">
        <div className="mx-auto w-full max-w-[1700px] rounded-[28px] border border-border/50 bg-card/80 shadow-2xl backdrop-blur-sm">
          <div className="flex min-h-[calc(100vh-7rem)] overflow-hidden rounded-[28px]">
            <aside className="hidden border-r border-border/50 bg-card/70 lg:block">
              <DeviceSidebar {...sidebarProps} />
            </aside>

            <section className="min-w-0 flex-1">
              <div className="border-b border-border/50 bg-linear-to-r from-sky-500/10 via-transparent to-emerald-500/10 px-5 py-6 sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      Sensor History Intelligence
                    </p>
                    <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
                      Lịch sử và phân tích <span className="text-primary">dữ liệu cảm biến</span>
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Trang này dùng chung danh sách thiết bị với dashboard qua localStorage. Ngoài bảng lịch sử,
                      nó phân tích xu hướng theo giờ, ngày, tuần và chỉ ra biên độ biến động, thời điểm đạt đỉnh
                      và các lần đảo chiều cho từng cảm biến.
                    </p>
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
                {hasHistoryData ? (
                <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold">Bộ lọc phân tích</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                          Chọn cảm biến và nhịp tổng hợp nhẹ hơn để xem hành vi dữ liệu rõ hơn.
                          </p>
                        </div>

                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
                          <span className="text-muted-foreground">Metric</span>
                          <select
                            value={selectedMetricKey}
                            onChange={(event) => setSelectedMetricKey(event.target.value)}
                            className="bg-transparent outline-none"
                          >
                            {availableMetrics.map((metric) => (
                              <option key={metric.key} value={metric.key}>
                                {metric.label}
                              </option>
                            ))}
                          </select>
                        </label>

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
                    </div>

                    {!analyticsHasDeviceIds && devices.length ? (
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
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <StatCard
                        label={`${selectedAnalysisLabel} hiện tại · ${selectedMetric.label}`}
                        value={formatMetricValue(periodStats?.latest.value, selectedMetric.key)}
                        subvalue={`Kỳ gần nhất: ${periodStats?.latest.label || "-"}`}
                        accent={selectedMetric.color}
                      />
                      <StatCard
                        label={`Giá trị trung bình theo ${selectedAnalysisLabel}`}
                        value={formatMetricValue(periodStats?.average, selectedMetric.key)}
                        subvalue={`Trung bình của các ${selectedAnalysisLabel} trong phạm vi đang phân tích`}
                        accent={selectedMetric.color}
                      />
                      <StatCard
                        label={`Biên độ trung bình theo ${selectedAnalysisLabel}`}
                        value={formatMetricValue(periodStats?.averageAbsDelta, selectedMetric.key)}
                        subvalue={`Trung bình |${selectedAnalysisLabel} sau - ${selectedAnalysisLabel} trước|`}
                        accent={selectedMetric.color}
                      />
                      <StatCard
                        label={`Số lần đảo chiều theo ${selectedAnalysisLabel}`}
                        value={periodStats?.reversalCount ?? 0}
                        subvalue={`Đổi hướng tăng hoặc giảm giữa các ${selectedAnalysisLabel} liên tiếp`}
                        accent={selectedMetric.color}
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                        <h2 className="text-xl font-bold">Đồ thị xu hướng {selectedMetric.label.toLowerCase()}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Dữ liệu được gộp {TIME_MODES.find((item) => item.key === timeMode)?.label.toLowerCase()} với tối đa {MODE_POINT_LIMITS[timeMode]} điểm.
                        </p>
                        <div className="mt-5 h-[320px]">
                          <Line data={lineData} options={chartOptions} />
                        </div>
                      </div>

                      <div className="grid gap-6 xl:grid-cols-2">
                        <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                          <h2 className="text-xl font-bold">Phân bố chu kỳ</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Dữ liệu được lấy cùng mode đã chọn và hiển thị theo giá trị trung bình.
                          </p>
                          <div className="mt-5 h-[320px]">
                            <Bar data={distributionData} options={chartOptions} />
                          </div>
                        </div>

                        <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                          <h2 className="text-xl font-bold">Đỉnh và đáy theo chu kỳ</h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Mỗi mốc thời gian có hai cột liền kề: một cột cao nhất và một cột thấp nhất.
                          </p>
                          <div className="mt-5 h-[320px]">
                            <Bar data={peakLowDistributionData} options={chartOptions} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      <div className="rounded-3xl border border-border/60 bg-background/70 p-5">
                        <h2 className="text-xl font-bold">Bảng phân tích chuyên sâu</h2>
                        <div className="mt-5 overflow-x-auto">
                          <table className="w-full min-w-[680px] border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-border/60 text-left text-muted-foreground">
                                <th className="px-3 py-3 font-medium">Chỉ số</th>
                                <th className="px-3 py-3 font-medium">Kết quả</th>
                                <th className="px-3 py-3 font-medium">Ý nghĩa</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-border/40">
                                <td className="px-3 py-3 font-medium">Đỉnh theo {selectedAnalysisLabel}</td>
                                <td className="px-3 py-3">
                                  {selectedAnalysisPeriod?.label || "-"}
                                  {" · "}
                                  {formatMetricValue(selectedAnalysisPeriod?.average, selectedMetric.key)}
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">Mốc {selectedAnalysisLabel} có trung bình cao nhất trong dữ liệu hiện có.</td>
                              </tr>
                              <tr className="border-b border-border/40">
                                <td className="px-3 py-3 font-medium">Giá trị cao nhất tuyệt đối</td>
                                <td className="px-3 py-3">
                                  {formatMetricValue(metricStats?.max.value, selectedMetric.key)}
                                  {" · "}
                                  {formatDateTime(metricStats?.max.time)}
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">Đỉnh tuyệt đối của cảm biến trong toàn bộ tập dữ liệu đang xét.</td>
                              </tr>
                              <tr className="border-b border-border/40">
                                <td className="px-3 py-3 font-medium">Giá trị thấp nhất tuyệt đối</td>
                                <td className="px-3 py-3">
                                  {formatMetricValue(metricStats?.min.value, selectedMetric.key)}
                                  {" · "}
                                  {formatDateTime(metricStats?.min.time)}
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">Đáy tuyệt đối của cảm biến trong toàn bộ tập dữ liệu đang xét.</td>
                              </tr>
                              <tr className="border-b border-border/40">
                                <td className="px-3 py-3 font-medium">Cú nhảy mạnh nhất</td>
                                <td className="px-3 py-3">
                                  {periodStats?.strongestJump
                                    ? `${formatMetricValue(periodStats.strongestJump.delta, selectedMetric.key)} · ${periodStats.strongestJump.label}`
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">Khoảng chênh lớn nhất giữa 2 {selectedAnalysisLabel} liên tiếp.</td>
                              </tr>
                              <tr className="border-b border-border/40">
                                <td className="px-3 py-3 font-medium">Biên độ trung bình</td>
                                <td className="px-3 py-3">
                                  {formatMetricValue(periodStats?.averageAbsDelta, selectedMetric.key)}
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">Trung bình |{selectedAnalysisLabel} sau - {selectedAnalysisLabel} trước| trên chuỗi đã gộp.</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-3 font-medium">Số lần đảo chiều</td>
                                <td className="px-3 py-3">
                                  {periodStats?.reversalCount ?? 0}
                                </td>
                                <td className="px-3 py-3 text-muted-foreground">Số lần chuỗi trung bình theo {selectedAnalysisLabel} đổi hướng tăng sang giảm hoặc ngược lại.</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

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
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
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
