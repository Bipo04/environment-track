// History API Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333';

export const historyService = {
  /**
   * Get historical sensor data with pagination
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 20)
   * @returns {Promise<Object>} Paginated data response
   */
  getHistoryData: async (page = 1, limit = 20) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `${API_BASE_URL}/history-data?page=${page}&limit=${limit}`,
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
