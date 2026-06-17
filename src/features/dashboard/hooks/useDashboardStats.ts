import { useCallback, useEffect, useState } from 'react';

import { DashboardStats, DateRangeOption } from '../types';
import { fetchDashboardStats } from '../services/dashboardService';



interface UseDashboardStatsResult {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardStats(range: DateRangeOption): UseDashboardStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => setRefetchToken((token) => token + 1), []);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchDashboardStats(range)
      .then((data) => {
        if (!isCancelled) setStats(data);
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard stats');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [range, refetchToken]);

  return { stats, isLoading, error, refetch };
}