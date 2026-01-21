import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const WebSocketContext = createContext(null);

// WebSocket configuration
const WS_CONFIG = {
  url: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333',
  path: '/ws-live-data',
};

export const WebSocketProvider = ({ children }) => {
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

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    console.log(`🔌 Connecting to WebSocket: ${WS_CONFIG.url}${WS_CONFIG.path}`);
    
    const newSocket = io(WS_CONFIG.url, {
      path: WS_CONFIG.path,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
    });

    newSocket.on('mqttData', (data) => {
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

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('⚠️ WebSocket connection error:', error);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket reconnected after ${attemptNumber} attempts`);
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Disconnecting WebSocket...');
      newSocket.disconnect();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ sensorData, socket }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context.sensorData;
};
