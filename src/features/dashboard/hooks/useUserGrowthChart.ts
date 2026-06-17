import { useEffect, useState } from 'react';
import { UserGrowthPoint } from '../types';
import { fetchUserGrowthChart } from '../services/dashboardService';


interface UseUserGrowthChartResult {
  data: UserGrowthPoint[];
  isLoading: boolean;
  error: string | null;
}

/** Trailing 12 months, independent of the day-range toggle. */
export function useUserGrowthChart(): UseUserGrowthChartResult {
  const [data, setData] = useState<UserGrowthPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchUserGrowthChart()
      .then((result) => {
        if (!isCancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!isCancelled) setError(err instanceof Error ? err.message : 'Failed to load user growth data');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}