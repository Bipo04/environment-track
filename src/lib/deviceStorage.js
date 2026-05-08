const DEVICES_STORAGE_KEY = "envirotrack.dashboard.devices";
const SELECTED_DEVICE_STORAGE_KEY = "envirotrack.dashboard.selectedDeviceId";

const isBrowser = () => typeof window !== "undefined";

export const loadStoredDevices = () => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(DEVICES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load stored devices:", error);
    return [];
  }
};

export const saveStoredDevices = (devices) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices));
};

export const loadSelectedDeviceId = () => {
  if (!isBrowser()) {
    return "";
  }

  return window.localStorage.getItem(SELECTED_DEVICE_STORAGE_KEY) || "";
};

export const saveSelectedDeviceId = (deviceId) => {
  if (!isBrowser()) {
    return;
  }

  if (deviceId) {
    window.localStorage.setItem(SELECTED_DEVICE_STORAGE_KEY, deviceId);
    return;
  }

  window.localStorage.removeItem(SELECTED_DEVICE_STORAGE_KEY);
};
