import { useCallback, useEffect, useState } from 'react';
import { fetchRecentActivity } from '../services/dashboardService';
import { ActivityItem } from '../types';


interface UseRecentActivityResult {
  activity: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRecentActivity(limit = 10): UseRecentActivityResult {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const refetch = useCallback(() => setRefetchToken((token) => token + 1), []);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchRecentActivity(limit)
      .then((data) => {
        if (!isCancelled) setActivity(data);
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
  }, [limit, refetchToken]);

  return { activity, isLoading, error, refetch };
}