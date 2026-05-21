import { useEffect, useRef, useState, useMemo } from "react";
import { Activity, ArrowDownRight, ArrowUpRight } from "lucide-react";
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

const AIR_TAB_CONFIG = {
  pm25: {
    label: "Bụi mịn PM2.5",
    title: "Biểu đồ bụi mịn PM2.5",
    subtitle: "",
    datasets: [
      {
        key: "pm25",
        label: "Nồng độ PM2.5",
        color: "#0ea5e9", // Sky blue
        unit: " µg/m³",
        yAxisID: "y",
      },
      {
        key: "pm25_aqi",
        label: "PM2.5 AQI",
        color: "#f59e0b", // Amber
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
        color: "#6366f1", // Indigo
        unit: " µg/m³",
        yAxisID: "y",
      },
      {
        key: "pm10_aqi",
        label: "PM10 AQI",
        color: "#10b981", // Emerald
        unit: "",
        yAxisID: "y1",
      },
    ],
    axisLabel: "PM10 (µg/m³)",
    secondaryAxisLabel: "AQI",
  },
};

const MIN_CHART_SPAN = {
  pm25: 10,
  pm10: 20,
  pm25_aqi: 30,
  pm10_aqi: 30,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const walk = (current, min, max, step) => {
  const delta = (Math.random() - 0.5) * 2 * step;
  return Math.min(max, Math.max(min, current + delta));
};

const calculateAqi = (val, breakpoints) => {
  for (let i = 0; i < breakpoints.length; i++) {
    const bp = breakpoints[i];
    if (val <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (val - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }
  return 500;
};

const calculatePm25Aqi = (pm25) => {
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

const calculatePm10Aqi = (pm10) => {
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

// Generates beautiful realistic historical seed data
const buildAirSeedHistory = (baseSnapshot) => {
  const points = [];
  const now = Date.now();
  const totalPoints = 30; // 30 points
  const step = 5 * 60 * 1000; // 5 min interval

  let currentPm25 = baseSnapshot?.pm25 || 18.5;
  let currentPm10 = baseSnapshot?.pm10 || 32.4;

  for (let index = 0; index <= totalPoints; index += 1) {
    const time = now - (totalPoints - index) * step;

    currentPm25 = clamp(walk(currentPm25, 4, 90, 2), 4, 90);
    currentPm10 = clamp(walk(currentPm10, 8, 140, 3.5), 8, 140);

    points.push({
      time,
      pm25: Number(currentPm25.toFixed(1)),
      pm10: Number(currentPm10.toFixed(1)),
      pm25_aqi: calculatePm25Aqi(currentPm25),
      pm10_aqi: calculatePm10Aqi(currentPm10),
    });
  }

  return points;
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

  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const roundMetricValue = (key, value) => {
  const numericValue = Number(value) || 0;
  if (key.includes("aqi")) {
    return Math.round(numericValue);
  }
  return Number(numericValue.toFixed(1));
};

const getTrendDeadzone = (key) => {
  if (key.includes("aqi")) return 0.5;
  return 0.1;
};

const formatMetricValue = (key, value) => {
  const numericValue = Number(value) || 0;
  if (key.includes("aqi")) {
    return `${Math.round(numericValue)} AQI`;
  }
  return `${numericValue.toFixed(1)} µg/m³`;
};

const formatDelta = (key, value) => {
  if (Math.abs(value) < getTrendDeadzone(key)) {
    value = 0;
  }
  const absValue = Math.abs(value);
  const prefix = value >= 0 ? "+" : "-";

  if (key.includes("aqi")) {
    return `${prefix}${Math.round(absValue)}`;
  }
  return `${prefix}${absValue.toFixed(1)} µg/m³`;
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

const formatAxisTimestamp = (time) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(time);

const getMetricSeries = (entries, key) => entries.map((entry) => Number(entry[key]) || 0);

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
  const minSpan = Math.max(...axisDatasets.map((dataset) => MIN_CHART_SPAN[dataset.key] || 10));
  const finalSpan = Math.max(dataSpan, minSpan);
  const midpoint = (minValue + maxValue) / 2;
  const padding = finalSpan * 0.15;

  return {
    min: Math.max(0, midpoint - finalSpan / 2 - padding),
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

const getStatWindow = (entries, key) => {
  const series = getMetricSeries(entries, key);
  const values = series.length ? series : [0];
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
    current: values[values.length - 1] ?? 0,
  };
};

const describeVolatility = (value, low, high) => {
  if (value <= low) return "Thấp";
  if (value <= high) return "Trung bình";
  return "Cao";
};

const findDailyPeak = (history, key) => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const todayEntries = history.filter((entry) => entry.time >= dayStart.getTime());
  const source = todayEntries.length ? todayEntries : history.slice(-50);

  return source.reduce(
    (peak, entry) => (entry[key] > peak[key] ? entry : peak),
    source[0] || history[history.length - 1]
  );
};

const getAirQualityStatus = (aqi) => {
  if (aqi <= 50) return "Tốt";
  if (aqi <= 100) return "Trung bình";
  if (aqi <= 150) return "Kém";
  if (aqi <= 200) return "Xấu";
  if (aqi <= 300) return "Rất xấu";
  return "Nguy hại";
};

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
              ? formatMetricValue(dataset.key, latestEntry[dataset.key])
              : formatDelta(dataset.key, getTrend(chartHistory, dataset.key))}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const DeviceHeader = ({ selectedDevice }) => {
  if (!selectedDevice) return null;
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
const AIR_STANDARD_RANGES = {
  pm25: {
    y: { min: 0, max: 150 },
    y1: { min: 0, max: 300 },
  },
  pm10: {
    y: { min: 0, max: 200 },
    y1: { min: 0, max: 300 },
  },
};

export const AirSensorDashboard = ({
  devices = [],
  selectedDevice = null,
  selectedDeviceSnapshot = null,
}) => {
  const [historyByDevice, setHistoryByDevice] = useState({});
  const [selectedTab, setSelectedTab] = useState("pm25");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const lastSampleKey = useRef("");
  const chartRef = useRef(null);
  const lastRecordedTime = useRef(0);
  const lastDeviceId = useRef("");

  const currentSnapshot = useMemo(() => {
    const rawPm25 = selectedDeviceSnapshot?.pm25 ?? 0;
    const rawPm10 = selectedDeviceSnapshot?.pm10 ?? 0;

    return {
      pm25: rawPm25,
      pm10: rawPm10,
      pm25_aqi: selectedDeviceSnapshot?.pm25_aqi ?? calculatePm25Aqi(rawPm25),
      pm10_aqi: selectedDeviceSnapshot?.pm10_aqi ?? calculatePm10Aqi(rawPm10),
      timestamp: selectedDeviceSnapshot?.timestamp || new Date().toLocaleString(),
    };
  }, [selectedDeviceSnapshot]);

  // Handle system dark mode detection
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

  // Initialize seed history on device change
  useEffect(() => {
    if (!selectedDevice) {
      lastSampleKey.current = "";
      return;
    }

    setHistoryByDevice((previous) => {
      if (previous[selectedDevice.id]) {
        return previous;
      }
      // Populate seed history
      const seed = buildAirSeedHistory({
        pm25: currentSnapshot.pm25,
        pm10: currentSnapshot.pm10,
      });
      return {
        ...previous,
        [selectedDevice.id]: seed,
      };
    });
  }, [selectedDevice, currentSnapshot]);

  // Log incoming snapshots to history
  useEffect(() => {
    if (!selectedDevice) return;

    if (selectedDevice.id !== lastDeviceId.current) {
      lastDeviceId.current = selectedDevice.id;
      lastRecordedTime.current = 0;
    }

    // Build key to prevent duplicate entries
    const sampleKey = [
      selectedDevice.id,
      currentSnapshot.pm25,
      currentSnapshot.pm10,
      currentSnapshot.pm25_aqi,
      currentSnapshot.pm10_aqi,
      currentSnapshot.timestamp,
    ].join("|");

    if (sampleKey === lastSampleKey.current) return;

    const now = Date.now();
    if (lastRecordedTime.current !== 0 && now - lastRecordedTime.current < 1000) {
      return;
    }

    lastSampleKey.current = sampleKey;
    lastRecordedTime.current = now;

    setHistoryByDevice((previous) => {
      const prevList = previous[selectedDevice.id] || [];
      const nextEntry = {
        time: Date.now(),
        pm25: roundMetricValue("pm25", currentSnapshot.pm25),
        pm10: roundMetricValue("pm10", currentSnapshot.pm10),
        pm25_aqi: roundMetricValue("pm25_aqi", currentSnapshot.pm25_aqi),
        pm10_aqi: roundMetricValue("pm10_aqi", currentSnapshot.pm10_aqi),
      };

      // Limit data window to 7 days
      const filtered = [...prevList, nextEntry].filter(
        (entry) => entry.time >= Date.now() - HISTORY_WINDOW
      );

      return {
        ...previous,
        [selectedDevice.id]: filtered.slice(-2000),
      };
    });
  }, [selectedDevice, currentSnapshot]);

  const history = selectedDevice ? historyByDevice[selectedDevice.id] || [] : [];
  
  const displayHistory = useMemo(() => {
    if (history.length) return history;
    return [
      {
        time: Date.now(),
        pm25: currentSnapshot.pm25,
        pm10: currentSnapshot.pm10,
        pm25_aqi: currentSnapshot.pm25_aqi,
        pm10_aqi: currentSnapshot.pm10_aqi,
      },
    ];
  }, [history, currentSnapshot]);

  const chartHistory = useMemo(() => displayHistory.slice(-20), [displayHistory]);
  const sparklineHistory = useMemo(() => displayHistory.slice(-18), [displayHistory]);
  
  const latestEntry = useMemo(() => displayHistory[displayHistory.length - 1], [displayHistory]);
  const tabDefinition = AIR_TAB_CONFIG[selectedTab];

  // Analysis table metrics calculation
  const dailyMaxPm25 = useMemo(() => findDailyPeak(displayHistory, "pm25"), [displayHistory]);
  const dailyMaxPm10 = useMemo(() => findDailyPeak(displayHistory, "pm10"), [displayHistory]);

  const compactInsightRows = useMemo(() => {
    if (selectedTab === "pm10") {
      const pm10Stats = getStatWindow(chartHistory, "pm10");
      const pm10Trend = getTrend(chartHistory, "pm10", latestEntry.pm10);
      const volatility = describeVolatility(pm10Stats.max - pm10Stats.min, 10, 25);

      return [
        {
          metric: "Chất lượng không khí",
          value: getAirQualityStatus(latestEntry.pm10_aqi),
          note: `Chất lượng không khí theo chỉ số PM10 AQI.`,
        },
        {
          metric: "Nồng độ PM10 tối đa",
          value: `${dailyMaxPm10.pm10.toFixed(1)} µg/m³`,
          note: `Cực đại lúc ${formatTimestamp(dailyMaxPm10.time)}.`,
        },
        {
          metric: "Biến động nồng độ",
          value: volatility,
          note: `Biên độ dao động nồng độ: ${(pm10Stats.max - pm10Stats.min).toFixed(1)} µg/m³.`,
        },
        {
          metric: "Xu hướng ngắn hạn",
          value: pm10Trend === 0 ? "Ổn định" : pm10Trend > 0 ? "Tăng dần" : "Giảm dần",
          note: `Nồng độ thay đổi ${pm10Trend === 0 ? "ổn định" : `${pm10Trend > 0 ? "tăng" : "giảm"} ${Math.abs(pm10Trend).toFixed(1)} µg/m³`} trong 20 mẫu qua.`,
        },
      ];
    } else {
      const pm25Stats = getStatWindow(chartHistory, "pm25");
      const pm25Trend = getTrend(chartHistory, "pm25", latestEntry.pm25);
      const volatility = describeVolatility(pm25Stats.max - pm25Stats.min, 5, 15);

      return [
        {
          metric: "Chất lượng không khí",
          value: getAirQualityStatus(latestEntry.pm25_aqi),
          note: `Chất lượng không khí theo chỉ số PM2.5 AQI.`,
        },
        {
          metric: "Nồng độ PM2.5 tối đa",
          value: `${dailyMaxPm25.pm25.toFixed(1)} µg/m³`,
          note: `Cực đại lúc ${formatTimestamp(dailyMaxPm25.time)}.`,
        },
        {
          metric: "Biến động nồng độ",
          value: volatility,
          note: `Biên độ dao động nồng độ: ${(pm25Stats.max - pm25Stats.min).toFixed(1)} µg/m³.`,
        },
        {
          metric: "Xu hướng ngắn hạn",
          value: pm25Trend === 0 ? "Ổn định" : pm25Trend > 0 ? "Tăng dần" : "Giảm dần",
          note: `Nồng độ thay đổi ${pm25Trend === 0 ? "ổn định" : `${pm25Trend > 0 ? "tăng" : "giảm"} ${Math.abs(pm25Trend).toFixed(1)} µg/m³`} trong 20 mẫu qua.`,
        },
      ];
    }
  }, [selectedTab, chartHistory, latestEntry, dailyMaxPm10, dailyMaxPm25]);

  // Chart configuration
  const chartData = useMemo(() => {
    return {
      labels: chartHistory.map((entry) => formatAxisTimestamp(entry.time)),
      datasets: tabDefinition.datasets.map((dataset, index) => ({
        label: dataset.label,
        data: chartHistory.map((entry) => entry[dataset.key]),
        borderColor: dataset.color,
        backgroundColor: (context) => {
          const { chart } = context;
          const { ctx, chartArea } = chart;
          if (!chartArea) return withAlpha(dataset.color, 0.18);
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, withAlpha(dataset.color, 0.28));
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
        tension: 0.1, // Smooth curve
        yAxisID: dataset.yAxisID,
        metricKey: dataset.key,
        unit: dataset.unit,
      })),
    };
  }, [chartHistory, tabDefinition, isDarkMode]);

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
            boxWidth: 8,
            boxHeight: 8,
            padding: 18,
            color: isDarkMode ? "#dbe8ff" : "#1f2937",
            font: {
              family: "Space Grotesk, Segoe UI, sans-serif",
              size: 11,
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
          padding: 12,
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
                context.parsed.y
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
              size: 10,
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
            callback: (value) => value.toFixed(1),
            font: {
              family: "Space Grotesk, Segoe UI, sans-serif",
              size: 10,
            },
          },
          title: {
            display: true,
            text: tabDefinition.axisLabel,
            color: isDarkMode ? "#dbe8ff" : "#0f172a",
            font: {
              family: "Plus Jakarta Sans, Space Grotesk, sans-serif",
              size: 11,
              weight: 700,
            },
          },
        },
        y1: {
          position: "right",
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: isDarkMode ? "#90a3bf" : "#526075",
            callback: (value) => Math.round(value),
            font: {
              family: "Space Grotesk, Segoe UI, sans-serif",
              size: 10,
            },
          },
          title: {
            display: true,
            text: tabDefinition.secondaryAxisLabel,
            color: isDarkMode ? "#dbe8ff" : "#0f172a",
            font: {
              family: "Plus Jakarta Sans, Space Grotesk, sans-serif",
              size: 11,
              weight: 700,
            },
          },
        },
      },
    };
  }, [tabDefinition, isDarkMode]);

  const pm10HistoryData = useMemo(() => sparklineHistory.map((item) => item.pm10), [sparklineHistory]);
  const pm25HistoryData = useMemo(() => sparklineHistory.map((item) => item.pm25), [sparklineHistory]);

  return (
    <section className="relative overflow-hidden">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute left-[10%] top-16 h-56 w-56 rounded-full bg-blue-400/10 blur-[120px] dark:bg-blue-500/8" />
        <div className="absolute right-[6%] top-32 h-64 w-64 rounded-full bg-indigo-400/8 blur-[130px] dark:bg-indigo-500/8" />
        <div className="absolute bottom-16 left-1/3 h-72 w-72 rounded-full bg-emerald-400/8 blur-[150px] dark:bg-emerald-500/6" />
      </div>

      <div className="container relative px-3 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-6">
        <div className="p-2 sm:p-4 lg:p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <DeviceHeader selectedDevice={selectedDevice} />
          </div>

          {/* Cards section (Top display) */}
          <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2">
            <PM10Card
              pm10={latestEntry.pm10}
              aqi={latestEntry.pm10_aqi}
              history={pm10HistoryData}
            />
            <PM25Card
              pm25={latestEntry.pm25}
              aqi={latestEntry.pm25_aqi}
              history={pm25HistoryData}
            />
          </div>

          {/* Graphs & Analysis section (Bottom display) */}
          <div className="mt-6 flex flex-col gap-4 lg:mt-8">
            {/* Main chart card */}
            <section className="min-w-0 rounded-lg border border-border/60 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    {tabDefinition.title}
                  </h2>

                  <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:justify-self-end">
                    <div className="flex min-w-max flex-nowrap justify-start gap-2 sm:justify-end">
                      {Object.entries(AIR_TAB_CONFIG).map(([key, tab]) => (
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
                    title="Xu hướng thay đổi"
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

            {/* Analysis card */}
            <aside className="min-w-0 rounded-lg border border-border/60 bg-card p-4 shadow-sm sm:p-5 lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Tổng hợp thông số
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    Bảng phân tích
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Đánh giá các ngưỡng cảnh báo quan trọng dựa trên biến động bụi mịn.
                  </p>
                </div>
              </div>

              {/* Table list */}
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
