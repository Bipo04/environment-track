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
  co2: 0,
  f1: 0,
  f2: 0,
  f3: 0,
  f4: 0,
  f5: 0,
  f6: 0,
  f7: 0,
  f8: 0,
  clear: 0,
  nir: 0,
  flicker: 0,
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

export const useDeviceMqttData = ({ deviceId, enabled = true } = {}) => {
  const [sensorData, setSensorData] = useState(EMPTY_SENSOR_DATA);

  useEffect(() => {
    if (!enabled || !deviceId) {
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
      const topics = [
        `env_v2/${deviceId}/+`,
        `dust_v2/${deviceId}/data`
      ];
      client.subscribe(topics, (error) => {
        if (error) {
          console.error("Subscribe error:", error);
        } else {
          console.log(`Subscribed to topics: ${topics.join(", ")}`);
        }
      });
    });

    client.on("message", (receivedTopic, message) => {
      const rawStr = message.toString().trim();

      // Check if this is dust sensor data (CSV format: pm25,aqi25,pm10,aqi10)
      if (receivedTopic === `dust_v2/${deviceId}/data`) {
        const parts = rawStr.split(",").map(part => part.trim());
        if (parts.length >= 4) {
          const pm25 = parseNumeric(parts[0]);
          const pm25_aqi = parseNumeric(parts[1]);
          const pm10 = parseNumeric(parts[2]);
          const pm10_aqi = parseNumeric(parts[3]);

          setSensorData((prev) => ({
            ...prev,
            pm25,
            pm25_aqi,
            pm10,
            pm10_aqi,
            timestamp: new Date().toLocaleString(),
            topic: receivedTopic,
          }));
        }
        return;
      }

      // Check if this is env_v2 sensor data (JSON format: env_v2/<deviceId>/<sensorName>)
      const envTopicPrefix = `env_v2/${deviceId}/`;
      if (receivedTopic.startsWith(envTopicPrefix)) {
        const sensorName = receivedTopic.substring(envTopicPrefix.length);
        try {
          const payload = JSON.parse(rawStr);
          const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;

          setSensorData((prev) => {
            const merged = { ...prev };

            if (sensorName === "aht30") {
              merged.temperature = parseNumeric(data?.temperature ?? data?.temp);
              merged.humidity = parseNumeric(data?.humidity ?? data?.humid);
            } else if (sensorName === "tsl2561") {
              merged.lux = Math.round(parseNumeric(data?.lux ?? data?.light));
              merged.broadband = Math.round(parseNumeric(data?.broadband ?? data?.bb ?? data?.visible));
              merged.infrared = Math.round(parseNumeric(data?.infrared ?? data?.fr ?? data?.ir));
            } else if (sensorName === "veml6075") {
              merged.UVI = parseNumeric(data?.UVI ?? data?.uvi ?? data?.uvIndex);
              merged.UVA = parseNumeric(data?.UVA ?? data?.uva ?? data?.uvA);
              merged.UVB = parseNumeric(data?.UVB ?? data?.uvb ?? data?.uvB);
            } else if (sensorName === "sound") {
              merged.sound = parseNumeric(data?.sound ?? data?.noise);
            } else if (sensorName === "scd4x") {
              merged.co2 = parseNumeric(data?.co2);
              merged.temperature = parseNumeric(data?.temperature ?? data?.temp);
              merged.humidity = parseNumeric(data?.humidity ?? data?.humid);
            } else if (sensorName === "as7341") {
              merged.f1 = parseNumeric(data?.f1);
              merged.f2 = parseNumeric(data?.f2);
              merged.f3 = parseNumeric(data?.f3);
              merged.f4 = parseNumeric(data?.f4);
              merged.f5 = parseNumeric(data?.f5);
              merged.f6 = parseNumeric(data?.f6);
              merged.f7 = parseNumeric(data?.f7);
              merged.f8 = parseNumeric(data?.f8);
              merged.clear = parseNumeric(data?.clear);
              merged.nir = parseNumeric(data?.nir);
              merged.flicker = parseNumeric(data?.flicker);
            }

            merged.timestamp = data?.timestamp || data?.time || new Date().toLocaleString();
            merged.topic = receivedTopic;
            return merged;
          });
        } catch (error) {
          console.error(`Parse error for topic ${receivedTopic}:`, error);
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
  }, [enabled, deviceId]);

  return sensorData;
};
