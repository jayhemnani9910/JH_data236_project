import { useState, useEffect, useCallback } from 'react';
import { bookingApi } from '../services/api';

interface Booking {
  id: string;
  userId: string;
  type: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: any[];
}

export const useBookings = (userId?: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.getUserBookings(userId);
      const payload = response.data.data;
      const normalized =
        Array.isArray(payload) ? payload : (payload?.bookings || []);
      setBookings(normalized);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to fetch bookings';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createBooking = useCallback(async (bookingData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.createBooking(bookingData);
      const newBooking = response.data.data;
      if (newBooking) {
        setBookings((prev) => [newBooking, ...prev]);
        return { success: true, booking: newBooking };
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Booking failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const getBooking = useCallback(async (bookingId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await bookingApi.getBooking(bookingId);
      return response.data.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to fetch booking';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    error,
    fetchBookings,
    createBooking,
    getBooking
  };
};
