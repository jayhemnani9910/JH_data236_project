import { useState, useCallback } from 'react';
import { authApi, userApi } from '../services/api';
import { useAuth as useAuthContext } from '../contexts/AuthContext';

interface UpdateResult {
  success: boolean;
  error?: string;
  user?: any;
}

export const useAuth = () => {
  const authContext = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login(email, password);
      const { user: userData, accessToken, refreshToken } = response.data.data || {};
      if (!userData || !accessToken) {
        throw new Error('Invalid credentials');
      }
      authContext.login(accessToken, userData, refreshToken);
      return { success: true };
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  const register = useCallback(async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.register(userData);
      const { user: newUser, accessToken, refreshToken } = response.data.data || {};
      if (!newUser || !accessToken) {
        throw new Error('Registration failed');
      }
      authContext.login(accessToken, newUser, refreshToken);
      return { success: true, user: newUser };
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  const logout = useCallback(async () => {
    setError(null);
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      authContext.logout();
    }
  }, [authContext]);

  const updateProfile = useCallback(async (updates: Partial<any>): Promise<UpdateResult> => {
    if (!authContext.user) {
      return { success: false, error: 'Not authenticated' };
    }
    setLoading(true);
    setError(null);
    try {
      const response = await userApi.updateUser(authContext.user.id, updates);
      const updatedUser = response.data.data?.user;
      if (updatedUser) {
        authContext.updateUser(updatedUser);
        return { success: true, user: updatedUser };
      }
      throw new Error('Unable to update profile');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Update failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  const checkAuth = useCallback(() => {
    if (!authContext.user) {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('accessToken');
      if (storedUser && storedToken) {
        try {
          const parsedUser = JSON.parse(storedUser);
          const refreshToken = localStorage.getItem('refreshToken');
          authContext.login(storedToken, parsedUser, refreshToken);
        } catch {
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    }
  }, [authContext]);

  return {
    user: authContext.user,
    loading: authContext.loading || loading,
    error,
    login,
    logout,
    register,
    updateProfile,
    checkAuth,
    isAuthenticated: authContext.isAuthenticated,
  };
};
