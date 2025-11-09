import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

// Cấu hình MQTT từ biến môi trường
const MQTT_CONFIG = {
  server: import.meta.env.VITE_MQTT_SERVER || 'ws://broker.hivemq.com:8000/mqtt',
  username: import.meta.env.VITE_MQTT_USERNAME || '',
  password: import.meta.env.VITE_MQTT_PASSWORD || '',
  topic: import.meta.env.VITE_MQTT_TOPIC || 'sensor/data',
};

const useMqttService = () => {
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
    // Kết nối MQTT broker
    const client = mqtt.connect(MQTT_CONFIG.server, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      clean: true,
      reconnectPeriod: 1000,
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      client.subscribe(MQTT_CONFIG.topic, (err) => {
        if (err) {
          console.error('Subscribe error:', err);
        } else {
          console.log(`Subscribed to topic: ${MQTT_CONFIG.topic}`);
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received data:', data);
        
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
      } catch (error) {
        console.error('Parse error:', error);
      }
    });

    client.on('error', (error) => {
      console.error('MQTT connection error:', error);
    });

    client.on('reconnect', () => {
      console.log('Reconnecting to MQTT broker...');
    });

    client.on('close', () => {
      console.log('Disconnected from MQTT broker');
    });

    return () => {
      if (client) {
        client.end();
        console.log('MQTT client stopped');
      }
    };
  }, []);

  return sensorData;
};

export default useMqttService;
