import { useDeviceMqttData } from "@/hooks/useDeviceMqttData";
import { EnvironmentSensorDashboard } from "./dashboard/EnvironmentSensorDashboard";

export const DashboardSection = (props) => {
  const deviceId = props.selectedDevice?.id?.trim();

  const { data: mergedSnapshot, active: sensorActive } = useDeviceMqttData({
    deviceId,
    enabled: Boolean(deviceId),
  });

  return (
    <EnvironmentSensorDashboard
      {...props}
      selectedDeviceSnapshot={mergedSnapshot}
      sensorActive={sensorActive}
    />
  );
};
