import { useCallback, useEffect, useState } from 'react';
import { fetchRecentActivity } from '../services/dashboardService';
import { ActivityItem } from '../types';
import { readDashboardCache, writeDashboardCache } from '../../../utils/dashboardCache';

interface UseRecentActivityResult {
  activity: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRecentActivity(limit = 10): UseRecentActivityResult {
  const cacheKey = `recentActivity::${limit}`;
  const [activity, setActivity] = useState<ActivityItem[]>(
    () => readDashboardCache<ActivityItem[]>(cacheKey) ?? [],
  );
  const [isLoading, setIsLoading] = useState(
    () => readDashboardCache<ActivityItem[]>(cacheKey) === null,
  );
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => setRefetchToken((token) => token + 1), []);

  useEffect(() => {
    let isCancelled = false;
    setError(null);

    fetchRecentActivity(limit)
      .then((data) => {
        if (!isCancelled) {
          setActivity(data);
          writeDashboardCache(cacheKey, data);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load recent activity');
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, refetchToken]);

  return { activity, isLoading, error, refetch };
}
