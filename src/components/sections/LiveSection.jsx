import { useMemo } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import GaugeCard from './GaugeCard';

export const LiveSection = () => {
  const sensorData = useWebSocket();

  // Hàm chuyển đổi giá trị để phù hợp với thang đo gauge (0-1)
  const normalizeTemperature = (temp) => {
    // Temp: -10 to 60 °C (total: 70)
    return Math.min(Math.max((temp + 10) / 70, 0), 1);
  };

  const normalizeHumidity = (humidity) => {
    // Humidity: 0-100%
    return Math.min(humidity / 100, 1);
  };

  const normalizeLux = (lux) => {
    // Lux: 0 to 40000
    return Math.min(lux / 40000, 1);
  };

  const normalizeBroadband = (value) => {
    // Broadband: 0 to 65535 (TSL2591 16-bit)
    return Math.min(value / 65535, 1);
  };

  const normalizeInfrared = (value) => {
    // Infrared: 0 to 65535 (TSL2591 16-bit)
    return Math.min(value / 65535, 1);
  };

  const normalizeUVI = (uv) => {
    // UVI: 0 to 11
    return Math.min(uv / 11, 1);
  };

  const normalizeUVAB = (value) => {
    // UVA/UVB: 0 to 20
    return Math.min(value / 20, 1);
  };

  const gauges = useMemo(() => [
    {
      title: 'Temperature (°C)',
      id: 'temperature-gauge',
      colors: ['#00FF00', '#FFBF00', '#FF0000'],
      percent: normalizeTemperature(sensorData.temperature),
      value: sensorData.temperature.toFixed(1) + '°C',
    },
    {
      title: 'Humidity (%)',
      id: 'humidity-gauge',
      colors: ['#FF0000', '#FFBF00', '#00FF00'],
      percent: normalizeHumidity(sensorData.humidity),
      value: sensorData.humidity.toFixed(1) + '%',
    },
    {
      title: 'Light (Lux)',
      id: 'lux-gauge',
      colors: ['#FFBF00', '#00FF00'],
      percent: normalizeLux(sensorData.lux),
      value: sensorData.lux,
    },
    {
      title: 'Broadband',
      id: 'broadband-gauge',
      colors: ['#FFBF00', '#00FF00'],
      percent: normalizeBroadband(sensorData.broadband),
      value: sensorData.broadband,
    },
    {
      title: 'Infrared',
      id: 'infrared-gauge',
      colors: ['#FFBF00', '#00FF00'],
      percent: normalizeInfrared(sensorData.infrared),
      value: sensorData.infrared,
    },
    {
      title: 'UV Index',
      id: 'uvi-gauge',
      colors: ['#00FF00', '#FFBF00', '#FF0000'],
      percent: normalizeUVI(sensorData.UVI),
      value: sensorData.UVI.toFixed(2),
    },
    {
      title: 'UVA',
      id: 'uva-gauge',
      colors: ['#00FF00', '#FFBF00', '#FF0000'],
      percent: normalizeUVAB(sensorData.UVA),
      value: sensorData.UVA.toFixed(2),
    },
    {
      title: 'UVB',
      id: 'uvb-gauge',
      colors: ['#00FF00', '#FFBF00', '#FF0000'],
      percent: normalizeUVAB(sensorData.UVB),
      value: sensorData.UVB.toFixed(2),
    },
  ], [sensorData]);

  return (
    <section className="py-24 px-4 relative bg-secondary/30">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">
          Thông số môi trường hiện tại ở văn phòng{' '}
          <span className="text-primary">Khoa KTMT</span>
        </h1>
        <p className="text-center text-muted-foreground mb-12">
          Last update: {sensorData.timestamp || new Date().toLocaleString()}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {gauges.map((gauge) => (
            <GaugeCard key={gauge.id} gauge={gauge} />
          ))}
        </div>
      </div>
    </section>
  );
};
