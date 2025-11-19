import { useState, useEffect, useCallback } from 'react';
import { conciergeApi } from '../services/api';

interface Deal {
  id: string;
  type: string;
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
   destination?: string;
  expiresAt: string;
  score?: number;
  tags?: string[];
}

export const useDeals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await conciergeApi.getDeals();
      setDeals(response.data.data?.deals || []);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to fetch deals';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const getBundles = useCallback(async (preferences: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await conciergeApi.getBundles(preferences);
      return response.data.data?.bundles || [];
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to fetch bundles';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createPriceWatch = useCallback(async (watchData: { dealId: string; userId: string; alertPrice: number; destination?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const safePrice = Math.max(1, watchData.alertPrice || 1);
      const response = await conciergeApi.createWatch({
        user_id: watchData.userId,
        destination: watchData.destination || watchData.dealId,
        budget_ceiling: safePrice,
        min_fit_score: 60,
        notify_on_inventory_below: 5
      });
      return { success: true, watch: response.data.data?.watch };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to create watch';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  return {
    deals,
    loading,
    error,
    fetchDeals,
    getBundles,
    createPriceWatch
  };
};
