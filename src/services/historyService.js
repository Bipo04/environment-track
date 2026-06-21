import { apiUrl } from "./apiConfig";

const buildHistorySearchParams = ({ page = 1, limit = 20, type, deviceId, periodType, metricCode, metricTypeId, from, to, exact } = {}) => {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (type) searchParams.set("type", type);
  if (deviceId) searchParams.set("deviceId", deviceId);
  if (periodType) searchParams.set("periodType", periodType);
  if (metricCode) searchParams.set("metricCode", metricCode);
  if (metricTypeId) searchParams.set("metricTypeId", String(metricTypeId));
  if (from) searchParams.set("from", from);
  if (to) searchParams.set("to", to);
  if (exact) searchParams.set("exact", exact);

  return searchParams;
};

const authHeaders = () => {
  const token = localStorage.getItem("authToken");
  if (!token) throw new Error("No authentication token found");

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const requestJson = async (path, params) => {
  const response = await fetch(`${apiUrl(path)}?${buildHistorySearchParams(params)}`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized - Please login again");
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const historyService = {
  /**
   * Raw EnvSensor history for table/detail views.
   */
  getHistoryData: async (params = {}) => {
    try {
      return await requestJson("/history-data", params);
    } catch (error) {
      console.error("Error fetching history data:", error);
      throw error;
    }
  },

  /**
   * Aggregated metrics from AggregateMetric table for charts/analytics.
   * @param {object} params - { deviceId, periodType, metricCode, page, limit }
   */
  getAggregateMetrics: async (params = {}) => {
    try {
      return await requestJson("/history-data/aggregate-metrics", params);
    } catch (error) {
      console.error("Error fetching aggregate metrics:", error);
      throw error;
    }
  },
};

