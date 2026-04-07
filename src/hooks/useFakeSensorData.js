import { useState, useEffect, useRef } from 'react';

// Simulate smooth random walk for a value
const walk = (current, min, max, step) => {
  const delta = (Math.random() - 0.5) * 2 * step;
  return Math.min(max, Math.max(min, current + delta));
};

export const useFakeSensorData = () => {
  const [data, setData] = useState({
    temperature: 28.5,
    humidity: 65,
    lux: 850,
    broadband: 32000,
    infrared: 8000,
    UVI: 6.5,
    UVA: 1.8,
    UVB: 0.12,
    sound: 68,
    timestamp: new Date().toLocaleString(),
  });

  const ref = useRef(data);

  useEffect(() => {
    const interval = setInterval(() => {
      ref.current = {
        temperature: walk(ref.current.temperature, 20, 40, 0.3),
        humidity:    walk(ref.current.humidity,    30, 90, 1),
        lux:         walk(ref.current.lux,         200, 5000, 80),
        broadband:   walk(ref.current.broadband,   5000, 55000, 1500),
        infrared:    walk(ref.current.infrared,    1000, 20000, 400),
        UVI:         walk(ref.current.UVI,         0, 11, 0.2),
        UVA:         walk(ref.current.UVA,         0, 5, 0.05),
        UVB:         walk(ref.current.UVB,         0, 1, 0.01),
        sound:       walk(ref.current.sound,       40, 95, 3),
        timestamp:   new Date().toLocaleString(),
      };
      setData({ ...ref.current });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return data;
};
