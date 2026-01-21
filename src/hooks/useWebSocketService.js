import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// WebSocket configuration
const WS_CONFIG = {
  url: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333',
  path: '/ws-live-data',
};

const useWebSocketService = () => {
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    lux: 0,
    broadband: 0,
    infrared: 0,
    UVI: 0,
    UVA: 0,
    UVB: 0,
    timestamp: new Date().toLocaleString(),
  });

  useEffect(() => {
    console.log(`Connecting to WebSocket: ${WS_CONFIG.url}${WS_CONFIG.path}`);
    
    const socket = io(WS_CONFIG.url, {
      path: WS_CONFIG.path,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
    });

    socket.on('mqttData', (data) => {
      console.log('📡 Received sensor data:', data);
      
      setSensorData({
        temperature: parseFloat(data.temperature) || 0,
        humidity: parseFloat(data.humidity) || 0,
        lux: parseInt(data.lux) || 0,
        broadband: parseInt(data.broadband) || 0,
        infrared: parseInt(data.infrared) || 0,
        UVI: parseFloat(data.UVI) || 0,
        UVA: parseFloat(data.UVA) || 0,
        UVB: parseFloat(data.UVB) || 0,
        timestamp: new Date().toLocaleString(),
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
    });

    return () => {
      console.log('Disconnecting WebSocket...');
      socket.disconnect();
    };
  }, []);

  return sensorData;
};

export default useWebSocketService;
