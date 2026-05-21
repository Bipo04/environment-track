import { useEffect, useState } from "react";
import mqtt from "mqtt";

const MQTT_CONFIG = {
  server: import.meta.env.VITE_MQTT_SERVER || "ws://broker.hivemq.com:8000/mqtt",
  username: import.meta.env.VITE_MQTT_USERNAME || "",
  password: import.meta.env.VITE_MQTT_PASSWORD || "",
};

const EMPTY_SENSOR_DATA = {
  temperature: 0,
  humidity: 0,
  lux: 0,
  broadband: 0,
  infrared: 0,
  UVI: 0,
  UVA: 0,
  UVB: 0,
  sound: 0,
  pm1: 0,
  pm25: 0,
  pm10: 0,
  pm25_aqi: 0,
  pm10_aqi: 0,
  aqi: 0,
  timestamp: "",
  topic: "",
};

const parseNumeric = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const normalizePayload = (data, topic) => ({
  temperature: parseNumeric(data?.temperature ?? data?.temp),
  humidity: parseNumeric(data?.humidity ?? data?.humid),
  lux: Math.round(parseNumeric(data?.lux ?? data?.light)),
  broadband: Math.round(parseNumeric(data?.broadband ?? data?.bb ?? data?.visible)),
  infrared: Math.round(parseNumeric(data?.infrared ?? data?.fr ?? data?.ir)),
  UVI: parseNumeric(data?.UVI ?? data?.uvi ?? data?.uvIndex ?? data?.uv_index),
  UVA: parseNumeric(data?.UVA ?? data?.uva ?? data?.uvA ?? data?.uv_a),
  UVB: parseNumeric(data?.UVB ?? data?.uvb ?? data?.uvB ?? data?.uv_b),
  sound: parseNumeric(data?.sound ?? data?.noise ?? data?.db),
  pm1: parseNumeric(data?.pm1 ?? data?.PM1),
  pm25: parseNumeric(data?.pm25 ?? data?.PM25 ?? data?.pm2_5 ?? data?.pm2dot5),
  pm10: parseNumeric(data?.pm10 ?? data?.PM10),
  pm25_aqi: parseNumeric(data?.pm25_aqi ?? data?.pm25Aqi ?? data?.pm2_5_aqi),
  pm10_aqi: parseNumeric(data?.pm10_aqi ?? data?.pm10Aqi),
  aqi: parseNumeric(data?.aqi ?? data?.AQI),
  timestamp: data?.timestamp || data?.time || new Date().toLocaleString(),
  topic,
});

export const useDeviceMqttData = ({ topic, enabled = true } = {}) => {
  const [sensorData, setSensorData] = useState(EMPTY_SENSOR_DATA);

  useEffect(() => {
    if (!enabled || !topic) {
      setSensorData(EMPTY_SENSOR_DATA);
      return undefined;
    }

    const client = mqtt.connect(MQTT_CONFIG.server, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      clean: true,
      reconnectPeriod: 1000,
    });

    client.on("connect", () => {
      console.log("Connected to MQTT broker");
      client.subscribe(topic, (error) => {
        if (error) {
          console.error("Subscribe error:", error);
        } else {
          console.log(`Subscribed to topic: ${topic}`);
        }
      });
    });

    client.on("message", (receivedTopic, message) => {
      if (receivedTopic !== topic) {
        return;
      }

      const rawStr = message.toString().trim();
      const isJson = rawStr.startsWith("{") || rawStr.startsWith("[");

      // Check if this is comma-separated air sensor data: "pm2.5, pm2.5_aqi, pm10, pm10_aqi"
      if (!isJson && (receivedTopic.startsWith("dust_v2/") || rawStr.includes(","))) {
        const parts = rawStr.split(",").map(part => part.trim());
        if (parts.length >= 4) {
          const pm25 = parseNumeric(parts[0]);
          const pm25_aqi = parseNumeric(parts[1]);
          const pm10 = parseNumeric(parts[2]);
          const pm10_aqi = parseNumeric(parts[3]);
          setSensorData({
            ...EMPTY_SENSOR_DATA,
            pm25,
            pm25_aqi,
            pm10,
            pm10_aqi,
            timestamp: new Date().toLocaleString(),
            topic: receivedTopic,
          });
          return;
        }
      }

      try {
        const payload = JSON.parse(rawStr);
        const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
        console.log("Received data:", data);
        setSensorData(normalizePayload(data, receivedTopic));
      } catch (error) {
        // Fallback check: if parsing as JSON failed, check if it's comma-separated text
        const parts = rawStr.split(",").map(part => part.trim());
        if (parts.length >= 4) {
          const pm25 = parseNumeric(parts[0]);
          const pm25_aqi = parseNumeric(parts[1]);
          const pm10 = parseNumeric(parts[2]);
          const pm10_aqi = parseNumeric(parts[3]);
          setSensorData({
            ...EMPTY_SENSOR_DATA,
            pm25,
            pm25_aqi,
            pm10,
            pm10_aqi,
            timestamp: new Date().toLocaleString(),
            topic: receivedTopic,
          });
        } else {
          console.error("Parse error:", error);
        }
      }
    });

    client.on("error", (error) => {
      console.error("MQTT connection error:", error);
    });

    client.on("reconnect", () => {
      console.log("Reconnecting to MQTT broker...");
    });

    client.on("close", () => {
      console.log("Disconnected from MQTT broker");
    });

    return () => {
      client.end();
      console.log("MQTT client stopped");
    };
  }, [enabled, topic]);

  return sensorData;
};
