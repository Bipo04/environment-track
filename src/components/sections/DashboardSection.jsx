import { useFakeSensorData } from '@/hooks/useFakeSensorData';
import { TempHumidCard } from './dashboard/TempHumidCard';
import { LightCard } from './dashboard/LightCard';
import { UVCard } from './dashboard/UVCard';
import { SoundCard } from './dashboard/SoundCard';
import { DeviceSidebar } from './dashboard/DeviceSidebar';
import TemperatureChart from './TemperatureChart';

export const DashboardSection = () => {
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
