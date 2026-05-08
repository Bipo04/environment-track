// History API Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333';

export const historyService = {
  /**
   * Get historical sensor data with pagination
   * @param {Object} params
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} [params.type] - Sensor type: environment | air
   * @param {string} [params.deviceId] - Device identifier
   * @returns {Promise<Object>} Paginated data response
   */
  getHistoryData: async ({ page = 1, limit = 20, type, deviceId } = {}) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const searchParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (type) {
        searchParams.set('type', type);
      }

      if (deviceId) {
        searchParams.set('deviceId', deviceId);
      }

      const response = await fetch(
        `${API_BASE_URL}/history-data?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please login again');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching history data:', error);
      throw error;
    }
  },
};
