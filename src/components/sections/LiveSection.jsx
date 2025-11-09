import GaugeChart from 'react-gauge-chart';
import useMqttService from '@/hooks/useMqttService';

export const LiveSection = () => {
  const sensorData = useMqttService();

  // Hàm chuyển đổi giá trị để phù hợp với thang đo gauge (0-1)
  const normalizeTemperature = (temp) => {
    // Giả sử thang đo từ -10 đến 50 độ C
    return (temp + 10) / 60;
  };

  const normalizeHumidity = (humidity) => {
    // Độ ẩm từ 0-100%
    return humidity / 100;
  };

  const normalizeLux = (lux) => {
    // Giả sử thang đo từ 0 đến 10000 lux
    return Math.min(lux / 10000, 1);
  };

  const normalizeUV = (uv) => {
    // Giả sử thang đo UV từ 0 đến 12
    return uv / 12;
  };

  const gauges = [
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
      value: sensorData.lux.toFixed(0),
    },
    {
      title: 'Broadband',
      id: 'broadband-gauge',
      colors: ['#FFBF00', '#00FF00'],
      percent: normalizeLux(sensorData.broadband / 100),
      value: sensorData.broadband.toFixed(1),
    },
    {
      title: 'Infrared',
      id: 'infrared-gauge',
      colors: ['#FFBF00', '#00FF00'],
      percent: normalizeLux(sensorData.infrared / 100),
      value: sensorData.infrared.toFixed(1),
    },
    {
      title: 'UV Index',
      id: 'uvi-gauge',
      colors: ['#00FF00', '#FFBF00', '#FF0000'],
      percent: normalizeUV(sensorData.UVI),
      value: sensorData.UVI.toFixed(1),
    },
    {
      title: 'UVA',
      id: 'uva-gauge',
      colors: ['#00FF00', '#FFBF00', '#FF0000'],
      percent: normalizeUV(sensorData.UVA / 10),
      value: sensorData.UVA.toFixed(1),
    },
    {
      title: 'UVB',
      id: 'uvb-gauge',
      colors: ['#00FF00', '#FFBF00', '#FF0000'],
      percent: normalizeUV(sensorData.UVB / 10),
      value: sensorData.UVB.toFixed(1),
    },
  ];

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
            <div
              key={gauge.id}
              className="bg-card p-6 rounded-lg shadow-lg border border-border/50"
            >
              <h2 className="text-lg font-semibold text-center mb-4">
                {gauge.title}
              </h2>
              <GaugeChart
                id={gauge.id}
                nrOfLevels={5}
                colors={gauge.colors}
                arcWidth={0.3}
                percent={gauge.percent}
                textColor="hsl(var(--foreground))"
                formatTextValue={() => gauge.value}
                animate={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
