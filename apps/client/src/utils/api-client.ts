import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          // Use apiClient instead of axios to ensure baseURL is used
          const response = await apiClient.post('/api/auth/refresh', {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => apiClient.post('/auth/register', userData),

  // Flights
  searchFlights: (params: any) =>
    apiClient.post('/flights/search', params),
  
  getFlight: (id: string) =>
    apiClient.get(`/flights/${id}`),

  // Bookings
  createBooking: (bookingData: any) =>
    apiClient.post('/bookings', bookingData),
  
  getUserBookings: () =>
    apiClient.get('/bookings'),

  // Payments
  createPaymentIntent: (amount: number, currency: string) =>
    apiClient.post('/payments/intent', { amount, currency }),

  // User
  getUserProfile: () =>
    apiClient.get('/users/profile'),
  
  updateUserProfile: (data: any) =>
    apiClient.put('/users/profile', data),
};

export default apiClient;