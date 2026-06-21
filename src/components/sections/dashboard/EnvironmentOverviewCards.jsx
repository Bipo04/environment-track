import { Activity, Droplets, Minus, Sparkles, SunMedium, Thermometer, TriangleAlert, Volume2, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clamp,
  withAlpha,
  getProgressRatio,
  formatNumber,
  formatMetricValue,
} from "./EnvironmentSensorDashboard";

export const OverviewSurface = ({
  icon: Icon,
  title,
  accent,
  children,
  variant = "default",
  bodyClassName = "",
  onHide,
  dimmed = false,
}) => {
  const isPanel = variant === "panel";

  return (
    <article
      className={cn(
        "flex h-full min-h-0 flex-col text-foreground shadow-sm sm:min-h-[280px] transition-all duration-300 relative overflow-hidden",
        isPanel
          ? "border border-border/70 bg-card/90 px-3 py-3 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.3)] sm:px-4 sm:py-4 lg:px-5 lg:py-5 dark:border-slate-800/90 dark:bg-slate-900/80 dark:shadow-[0_30px_70px_-48px_rgba(15,23,42,0.92)]"
          : "border border-border/70 bg-card/90 p-4 sm:p-5 dark:border-slate-800/90 dark:bg-slate-900/80",
      )}
    >
      {/* 1. Global Dimming Overlay (z-30) - Covers the ENTIRE card area */}
      {dimmed && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-[0.5px] dark:bg-slate-950/60">
          <span className="rounded-md bg-black/90 dark:bg-slate-950/95 px-4 py-2 text-[12px] font-extrabold uppercase tracking-widest text-red-500 border border-red-500/50 shadow-2xl animate-pulse">
            Mất kết nối
          </span>
        </div>
      )}

      {isPanel ? (
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-muted-foreground dark:text-slate-400 w-full mb-2.5 sm:mb-3">
          <span>{title}</span>
          {onHide && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHide();
              }}
              className="rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative z-50 pointer-events-auto"
              title="Ẩn thẻ"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2.5 sm:mb-3">
          <span>{title}</span>
        </div>
      )}

      {/* 3. Body Content Area */}
      <div 
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          dimmed && "opacity-40 grayscale-[60%] dark:opacity-30 pointer-events-none select-none"
        )}
      >
        <div className={cn("flex flex-1 flex-col", bodyClassName)}>
          {children}
        </div>
      </div>
    </article>
  );
};

export const RingGauge = ({
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
      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className="relative h-[72px] w-[104px]">
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
        <div className="absolute inset-0 flex items-center justify-center pt-6">
          <p className="text-[1.05rem] font-semibold leading-none tracking-[-0.03em]" style={{ color: accent }}>
            {valueText}
          </p>
        </div>
      </div>
      <div className="mt-1 flex w-full items-center justify-between px-1 text-[10px] text-muted-foreground">
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

export const MetricBarRow = ({
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

export const SoundBars = ({ value, accent, isDarkMode, count = 10 }) => {
  const totalBars = Math.max(8, Math.min(12, count));
  const level = clamp(value / 2000, 0, 1);
  const activeBars = Math.max(2, Math.round(level * totalBars));

  return (
    <div className="flex h-[60px] items-end justify-center gap-2">
      {Array.from({ length: totalBars }).map((_, index) => {
        const height = 12 + ((index + 1) / totalBars) * 36;
        const intensity = 0.28 + (index / Math.max(totalBars - 1, 1)) * 0.72;
        const isActive = index < activeBars;

        return (
          <span
            key={`sound-bar-${index}`}
            className={cn(
              "w-2.5 rounded-none",
              !isActive && "bg-slate-200/90 dark:bg-slate-800"
            )}
            style={{
              height: `${height}px`,
              background: isActive
                ? `linear-gradient(180deg, ${withAlpha(accent, Math.min(0.45 + intensity * 0.45, 0.92))}, ${withAlpha(accent, Math.min(0.62 + intensity * 0.38, 1))})`
                : undefined,
              boxShadow: isActive ? `0 0 14px ${withAlpha(accent, intensity * 0.12)}` : "none",
              opacity: isActive ? 1 : 0.88,
            }}
          />
        );
      })}
    </div>
  );
};

export const StatusBanner = ({
  accent,
  label,
  note,
  icon: Icon = Activity,
  withDivider = false,
  className = "",
}) => (
  <div
    className={cn(
      "flex h-[72px] flex-col overflow-hidden pt-2",
      withDivider && "border-t border-border/60 dark:border-slate-800/90",
      className
    )}
  >
    <div className="flex items-start gap-2.5">
      <div className="min-h-0 flex-1">
        <p className="text-xs font-semibold" style={{ color: accent }}>
          {label}
        </p>
        <p className="mt-0.5 max-h-[48px] overflow-hidden text-xs leading-5 text-muted-foreground dark:text-slate-400">
          {note}
        </p>
      </div>
    </div>
  </div>
);

export const DataChip = ({ icon: Icon, label, value, accent }) => (
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

export const TemperatureHumidityOverviewCard = ({
  temperature,
  humidity,
  temperatureStatus,
  humidityStatus,
  isDarkMode,
  onHide,
  dimmed = false,
}) => {
  return (
    <OverviewSurface
      icon={Thermometer}
      title="Nhiệt độ & Độ ẩm"
      accent="#ff9b43"
      variant="panel"
      bodyClassName="flex flex-1 flex-col"
      onHide={onHide}
      dimmed={dimmed}
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 my-auto">
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

      <div className="mt-auto h-[88px] border-t border-border/60 dark:border-slate-800/90">
        <div className="grid h-full grid-cols-2 gap-2 sm:gap-3">
          <StatusBanner
            accent={temperatureStatus.accent}
            label={temperatureStatus.label}
            note={temperatureStatus.note}
            icon={Thermometer}
            className="h-full pt-2"
          />
          <StatusBanner
            accent={humidityStatus.accent}
            label={humidityStatus.label}
            note={humidityStatus.note}
            icon={Droplets}
            className="h-full pt-2"
          />
        </div>
      </div>
    </OverviewSurface>
  );
};

export const LightOverviewCard = ({ lux, bb, fr, status, onHide, dimmed = false }) => (
  <OverviewSurface
    icon={SunMedium}
    title="Cường độ ánh sáng"
    accent="#facc15"
    variant="panel"
    bodyClassName="flex flex-1 flex-col"
    onHide={onHide}
    dimmed={dimmed}
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

export const UvOverviewCard = ({ uva, uvb, uvi, status, onHide, dimmed = false }) => (
  <OverviewSurface
    icon={Sparkles}
    title="Cảm biến UV"
    accent="#a855f7"
    variant="panel"
    bodyClassName="flex flex-1 flex-col"
    onHide={onHide}
    dimmed={dimmed}
  >
    <div className="space-y-5">
      <MetricBarRow
        label="UVA"
        value={formatNumber(uva, 0)}
        suffix=""
        accent="#9333ea"
        ratio={getProgressRatio("uva", uva)}
        variant="panel"
      />
      <MetricBarRow
        label="UVB"
        value={formatNumber(uvb, 0)}
        suffix=""
        accent="#a78bfa"
        ratio={getProgressRatio("uvb", uvb)}
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

export const SoundOverviewCard = ({ sound, status, values, isDarkMode, onHide, dimmed = false }) => (
  <OverviewSurface
    icon={Volume2}
    title="Âm thanh"
    accent="#22d3ee"
    variant="panel"
    bodyClassName="flex flex-1 flex-col"
    onHide={onHide}
    dimmed={dimmed}
  >
    <div className="flex flex-1 flex-col items-center justify-center text-center my-auto">
      <p className="text-[2.6rem] font-semibold leading-none tracking-[-0.06em] text-cyan-400">
        {formatNumber(sound, 0)}
      </p>
      <p className="mt-1 text-sm uppercase tracking-[0.24em] text-muted-foreground dark:text-slate-400">RMS</p>
      <div className="mt-3 w-full">
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

export const Co2OverviewCard = ({ co2, scd4xTemperature, scd4xHumidity, isDarkMode, onHide, dimmed = false }) => {
  const getCo2Status = (value) => {
    if (value <= 600) return { label: "Rất tốt", note: "Không khí phòng rất trong lành, mức CO₂ lý tưởng.", accent: "#22c55e" };
    if (value <= 1000) return { label: "Bình thường", note: "Chất lượng không khí phòng ổn định, an toàn.", accent: "#34d399" };
    if (value <= 1500) return { label: "Cần thông gió", note: "Phòng hơi bí khí, nên mở cửa hoặc thông gió.", accent: "#f59e0b" };
    return { label: "Ngột ngạt", note: "Mức CO₂ phòng quá cao, cần thông gió khẩn cấp.", accent: "#ef4444" };
  };

  const status = getCo2Status(co2);
  const percent = clamp(co2 / 2000, 0, 1);
  const clamped = clamp(percent, 0, 1);
  const arcLength = 100;
  const dashValue = clamped * arcLength;
  const trackColor = isDarkMode ? "rgba(30, 41, 59, 0.78)" : "rgba(100, 116, 139, 0.55)";

  return (
    <OverviewSurface
      icon={Wind}
      title="CO₂ — Khí Carbonic"
      accent={status.accent}
      variant="panel"
      bodyClassName="flex flex-1 flex-col"
      onHide={onHide}
      dimmed={dimmed}
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-[130px] flex flex-col items-center">
          <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Nồng độ CO₂</p>
          <div className="relative h-[72px] w-[104px]">
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
                stroke={status.accent}
                strokeWidth="10"
                strokeLinecap="butt"
                pathLength="100"
                strokeDasharray={`${dashValue} 100`}
                style={{ filter: `drop-shadow(0 0 6px ${withAlpha(status.accent, 0.3)})` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pt-6">
              <p className="text-[1.05rem] font-semibold leading-none tracking-[-0.03em]" style={{ color: status.accent }}>
                {formatNumber(co2, 0)}
              </p>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-3 w-full px-1 text-[10px] text-muted-foreground">
            <span className="text-left">0</span>
            <span className="text-center">ppm</span>
            <span className="text-right">2000</span>
          </div>
        </div>
      </div>

      {Number.isFinite(scd4xTemperature) && Number.isFinite(scd4xHumidity) && (
        <div className="mt-2 flex w-full justify-around border-t border-border/40 pt-2 text-xs">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Nhiệt độ</span>
            <span className="font-semibold text-foreground mt-0.5">{formatNumber(scd4xTemperature, 1)}°C</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Độ ẩm</span>
            <span className="font-semibold text-foreground mt-0.5">{formatNumber(scd4xHumidity, 0)}%</span>
          </div>
        </div>
      )}

      <StatusBanner
        accent={status.accent}
        label={status.label}
        note={status.note}
        icon={Wind}
        withDivider
        className="mt-auto w-full"
      />
    </OverviewSurface>
  );
};

// Màu sắc tương ứng với từng kênh phổ AS7341
const SPECTRAL_CHANNELS = [
  { key: "f1", label: "415nm", color: "#7c3aed", name: "Tím" },
  { key: "f2", label: "445nm", color: "#4f46e5", name: "Chàm" },
  { key: "f3", label: "480nm", color: "#2563eb", name: "Lam" },
  { key: "f4", label: "515nm", color: "#0891b2", name: "Lục lam" },
  { key: "f5", label: "555nm", color: "#16a34a", name: "Lục" },
  { key: "f6", label: "590nm", color: "#ca8a04", name: "Vàng" },
  { key: "f7", label: "630nm", color: "#ea580c", name: "Đỏ cam" },
  { key: "f8", label: "680nm", color: "#dc2626", name: "Đỏ" },
];

export const SpectralOverviewCard = ({ f1, f2, f3, f4, f5, f6, f7, f8, clear, nir, flicker, onHide, dimmed = false }) => {
  const values = { f1, f2, f3, f4, f5, f6, f7, f8 };

  return (
    <OverviewSurface
      icon={Sparkles}
      title="Quang phổ"
      accent="#8b5cf6"
      variant="panel"
      bodyClassName="flex flex-1 flex-col"
      onHide={onHide}
      dimmed={dimmed}
    >
      {/* Kênh phổ dưới dạng lưới hiển thị giá trị trực tiếp */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-1">
        {SPECTRAL_CHANNELS.map(({ key, label, color, name }) => {
          const val = values[key] || 0;
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="h-2 w-2 rounded-full shrink-0" 
                  style={{ 
                    backgroundColor: color, 
                    boxShadow: `0 0 8px ${color}` 
                  }} 
                />
                <span className="text-[11px] font-medium text-muted-foreground/80 dark:text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
              </div>
              <span className="text-sm font-bold font-mono" style={{ color }}>
                {val}
              </span>
            </div>
          );
        })}
      </div>

      {/* Thông số phụ */}
      <div className="mt-4 space-y-3 border-t border-border/60 pt-4 dark:border-slate-800/90">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground dark:text-slate-400">Clear</span>
          <span className="text-sm font-semibold" style={{ color: "#facc15" }}>{formatMetricValue("clear", clear)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground dark:text-slate-400">NIR</span>
          <span className="text-sm font-semibold" style={{ color: "#f97316" }}>{formatMetricValue("nir", nir)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground dark:text-slate-400">Flicker</span>
          <span className="text-sm font-semibold" style={{ color: "#a78bfa" }}>{formatMetricValue("flicker", flicker)}</span>
        </div>
      </div>
    </OverviewSurface>
  );
};
