// Auth API Service
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333';

export const authService = {
  /**
   * Login user with email and password
   * @param {string} username - User username (email)
   * @param {string} password - User password
   * @returns {Promise<Object>} User data and token
   */
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Đăng nhập thất bại');
      }

      const data = await response.json();
      
      const token = data.token || data.access_token;
      if (token) {
        localStorage.setItem('authToken', token);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem('authToken');
  },

  /**
   * Get current auth token
   * @returns {string|null} Auth token
   */
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
};
