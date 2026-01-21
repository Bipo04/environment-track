import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useWebSocket } from '@/contexts/WebSocketContext';

// Đăng ký các component của Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TemperatureChart = () => {
  const sensorData = useWebSocket(); // Lấy dữ liệu từ WebSocket Context
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [timeLabels, setTimeLabels] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const prevTimestampRef = useRef('');

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  // Thêm dữ liệu khi có dữ liệu mới từ MQTT
  useEffect(() => {
    if (sensorData.timestamp !== prevTimestampRef.current && 
        sensorData.timestamp !== 'Waiting for connection...' &&
        sensorData.timestamp !== 'Reconnecting...' &&
        sensorData.timestamp !== 'Connection error' &&
        sensorData.timestamp !== 'Disconnected' &&
        sensorData.timestamp !== 'Offline' &&
        !(sensorData.temperature === 0 && sensorData.humidity === 0)) {
      
      prevTimestampRef.current = sensorData.timestamp;
      
      const now = new Date();
      const newTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      setTimeLabels(prevLabels => {
        const newLabels = [...prevLabels, newTime];
        return newLabels.slice(-20); // Giữ tối đa 20 điểm
      });

      setTemperatureData(prevData => {
        const newData = [...prevData, parseFloat(sensorData.temperature)];
        return newData.slice(-20);
      });

      setHumidityData(prevData => {
        const newData = [...prevData, parseFloat(sensorData.humidity)];
        return newData.slice(-20);
      });
    }
  }, [sensorData]);

  // Reset dữ liệu
  const resetData = () => {
    setTimeLabels([]);
    setTemperatureData([]);
    setHumidityData([]);
  };

  // Tính toán min/max động cho nhiệt độ
  const getTemperatureRange = () => {
    if (temperatureData.length === 0) {
      return { min: -10, max: 40 };
    }
    const min = Math.min(...temperatureData);
    const max = Math.max(...temperatureData);
    const range = max - min;
    const buffer = range > 0 ? range * 0.2 : 5; // 20% buffer hoặc 5 độ tối thiểu
    return {
      min: Math.floor(min - buffer),
      max: Math.ceil(max + buffer)
    };
  };

  // Tính toán min/max động cho độ ẩm
  const getHumidityRange = () => {
    if (humidityData.length === 0) {
      return { min: 0, max: 100 };
    }
    const min = Math.min(...humidityData);
    const max = Math.max(...humidityData);
    const range = max - min;
    const buffer = range > 0 ? range * 0.2 : 10; // 20% buffer hoặc 10% tối thiểu
    return {
      min: Math.max(0, Math.floor(min - buffer)),
      max: Math.min(100, Math.ceil(max + buffer))
    };
  };

  // Cấu hình dữ liệu cho biểu đồ
  const chartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Nhiệt độ (°C)',
        data: temperatureData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(255, 99, 132)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Độ ẩm (%)',
        data: humidityData,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(54, 162, 235)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };

  // Lấy range động
  const tempRange = getTemperatureRange();
  const humidRange = getHumidityRange();

  // Cấu hình options cho biểu đồ
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',
        labels: {
          font: {
            size: 14,
            weight: 'bold'
          },
          usePointStyle: true,
          padding: 20,
          boxWidth: 15,
          boxHeight: 15,
          color: isDarkMode ? '#ffffff' : '#000000'
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
              label += context.dataset.yAxisID === 'y' ? '°C' : '%';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: false,
        min: tempRange.min,
        max: tempRange.max,
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value) {
            return value + '°C';
          },
          font: {
            size: 12
          },
          color: 'rgb(255, 99, 132)',
        },
        title: {
          display: true,
          text: 'Nhiệt độ (°C)',
          font: {
            size: 16,
            weight: 'bold'
          },
          color: 'rgb(255, 99, 132)',
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: false,
        min: humidRange.min,
        max: humidRange.max,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 12
          },
          color: 'rgb(54, 162, 235)',
        },
        title: {
          display: true,
          text: 'Độ ẩm (%)',
          font: {
            size: 16,
            weight: 'bold'
          },
          color: 'rgb(54, 162, 235)',
        }
      },
      x: {
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45,
          color: isDarkMode ? '#ffffff' : '#000000'
        },
        title: {
          display: true,
          text: 'Thời gian',
          font: {
            size: 14,
            weight: 'bold'
          },
          color: isDarkMode ? '#ffffff' : '#000000'
        }
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8 bg-card/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-border/50">
      <div className="text-center mb-8">
        <h2 className="text-foreground text-3xl md:text-4xl font-bold mb-6">
          Biểu Đồ Nhiệt Độ & Độ Ẩm <span className="text-primary">Realtime</span>
        </h2>
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="inline-flex items-center gap-3 bg-background/90 backdrop-blur px-8 py-4 rounded-xl shadow-lg border border-primary/20 hover:-translate-y-1 transition-all hover:border-primary/50">
            <span className="text-foreground text-lg font-semibold">🌡️ Nhiệt độ:</span>
            <span className="text-primary text-3xl font-extrabold tracking-wide">{sensorData.temperature.toFixed(1)}°C</span>
          </div>
          <div className="inline-flex items-center gap-3 bg-background/90 backdrop-blur px-8 py-4 rounded-xl shadow-lg border border-primary/20 hover:-translate-y-1 transition-all hover:border-primary/50">
            <span className="text-foreground text-lg font-semibold">💧 Độ ẩm:</span>
            <span className="text-primary text-3xl font-extrabold tracking-wide">{sensorData.humidity.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 mb-6 flex-wrap">
        <button 
          onClick={resetData} 
          className="px-6 py-2.5 border border-border bg-background/50 backdrop-blur rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg text-foreground hover:bg-background/80 hover:-translate-y-0.5 active:translate-y-0"
        >
          🔄 Reset
        </button>
        <div className="flex items-center gap-2 bg-background/50 backdrop-blur px-4 py-2 rounded-lg border border-border">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
          <span className="text-foreground/80 text-sm font-medium">
            {sensorData.timestamp}
          </span>
        </div>
      </div>

      <div className="bg-background/70 backdrop-blur rounded-xl p-6 shadow-lg border border-border/50 h-[450px]">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="mt-6 text-center space-y-1">
        <p className="text-foreground/80 text-sm">
          📊 Hiển thị {temperatureData.length} điểm dữ liệu gần nhất (tối đa 20)
        </p>
        <p className="text-foreground/80 text-sm">
          ⏱ Tự động thêm dữ liệu khi nhận từ MQTT
        </p>
      </div>
    </div>
  );
};

export default TemperatureChart;
