// Sound Sensor Card with animated equalizer bars
import { useState, useEffect, useRef } from 'react';

const DB_LEVELS = [
  { max: 30, label: 'Im lặng', color: '#22c55e', emoji: '🔇' },
  { max: 60, label: 'Thư viện', color: '#84cc16', emoji: '📚' },
  { max: 70, label: 'Hội thoại', color: '#eab308', emoji: '🗣️' },
  { max: 85, label: 'Văn phòng', color: '#f97316', emoji: '💼' },
  { max: 100, label: 'Công trường', color: '#ef4444', emoji: '🏗️' },
  { max: 999, label: 'Nhạc lớn', color: '#8b5cf6', emoji: '🎸' },
];

const getDbInfo = (db) => DB_LEVELS.find(l => db <= l.max) || DB_LEVELS[DB_LEVELS.length - 1];

// Animated equalizer bars
const EqualizerBars = ({ db }) => {
  const BAR_COUNT = 28;
  const [bars, setBars] = useState(() => Array(BAR_COUNT).fill(0).map(() => Math.random() * 0.3));
  const rafRef = useRef(null);
  const targetRef = useRef(bars);

  useEffect(() => {
    const intensity = Math.min(db / 110, 1);
    const animate = () => {
      targetRef.current = targetRef.current.map((v, i) => {
        const noise = (Math.random() - 0.5) * 0.3;
        const target = Math.max(0.05, Math.min(1, intensity + noise + Math.sin(Date.now() / 200 + i) * 0.15));
        return v + (target - v) * 0.15;
      });
      setBars([...targetRef.current]);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [db]);

  const getBarColor = (height) => {
    if (height < 0.4) return '#22c55e';
    if (height < 0.65) return '#eab308';
    if (height < 0.85) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="flex items-end justify-center gap-0.5 h-14 py-1">
      {bars.map((h, i) => (
        <div
          key={i}
          className="rounded-t-sm flex-1"
          style={{
            height: `${Math.max(4, h * 100)}%`,
            backgroundColor: getBarColor(h),
            boxShadow: h > 0.6 ? `0 0 6px ${getBarColor(h)}80` : 'none',
            transition: 'height 0.08s ease',
          }}
        />
      ))}
    </div>
  );
};

// dB scale with indicator
const DBScale = ({ db }) => {
  const clamp = Math.min(Math.max(db, 0), 110);
  const pct = (clamp / 110) * 100;
  return (
    <div className="relative">
      <div className="h-3 rounded-full overflow-hidden"
        style={{ background: 'linear-gradient(to right, #22c55e, #84cc16, #eab308, #f97316, #ef4444, #8b5cf6)' }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-5 -ml-1 rounded-sm bg-white shadow-lg"
        style={{ left: `${pct}%`, boxShadow: '0 0 8px rgba(255,255,255,0.9)', transition: 'left 0.5s ease' }}
      />
      <div className="flex justify-between text-[9px] text-muted-foreground mt-2">
        <span>0<br/><span className="text-[8px]">(Im lặng)</span></span>
        <span>30<br/><span className="text-[8px]">(Thư viện)</span></span>
        <span>70<br/><span className="text-[8px]">(Hội thoại)</span></span>
        <span>90<br/><span className="text-[8px]">(Công trường)</span></span>
        <span>110+<br/><span className="text-[8px]">(Nhạc lớn)</span></span>
      </div>
    </div>
  );
};

// sound prop comes from parent (useFakeSensorData or real WebSocket)
export const SoundCard = ({ sound = 65 }) => {
  const peakRef = useRef(sound);
  const avg1hRef = useRef(sound);
  const [peak, setPeak] = useState(sound);
  const [avg1h, setAvg1h] = useState(sound);

  // Update peak and rolling average whenever sound changes
  useEffect(() => {
    peakRef.current = Math.max(peakRef.current * 0.999, sound);
    avg1hRef.current = avg1hRef.current * 0.98 + sound * 0.02;
    setPeak(peakRef.current);
    setAvg1h(avg1hRef.current);
  }, [sound]);

  const info = getDbInfo(sound);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 flex flex-col gap-3 hover:border-green-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-400/10 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-green-500/10">
            <span className="text-lg">🎙️</span>
          </div>
          <span className="text-xs font-bold text-foreground/80 uppercase tracking-wide">Cảm Biến Âm Thanh</span>
        </div>
      </div>

      {/* Main dB value */}
      <div className="text-center">
        <p className="text-4xl font-extrabold" style={{ color: info.color }}>
          {sound.toFixed(0)} <span className="text-xl font-bold">dB</span>
        </p>
        <div
          className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${info.color}20`, color: info.color, border: `1px solid ${info.color}40` }}
        >
          <span>{info.emoji}</span>
          Mức: {info.label}
          <span className="w-2 h-2 rounded-full ml-0.5" style={{ backgroundColor: info.color }} />
        </div>
      </div>

      {/* Equalizer */}
      <EqualizerBars db={sound} />

      {/* dB Scale */}
      <DBScale db={sound} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center px-2 py-1.5 rounded-xl bg-background/60 border border-border/40">
          <p className="text-[10px] text-muted-foreground">Đỉnh điểm</p>
          <p className="text-sm font-bold text-red-400">{peak.toFixed(0)} dBa</p>
        </div>
        <div className="text-center px-2 py-1.5 rounded-xl bg-background/60 border border-border/40">
          <p className="text-[10px] text-muted-foreground">TB 1 giờ</p>
          <p className="text-sm font-bold text-blue-400">{avg1h.toFixed(0)} dBa</p>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/3 to-teal-500/3 pointer-events-none rounded-2xl" />
    </div>
  );
};
