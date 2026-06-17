import { useEffect, useState } from 'react';
import { BreakdownSlice, DateRangeOption } from '../types';
import { fetchTopJobLocations } from '../services/dashboardService';

interface UseTopJobLocationsResult {
  data: BreakdownSlice[];
  isLoading: boolean;
  error: string | null;
}

/** Now respects the page-wide date range toggle. */
export function useTopJobLocations(range: DateRangeOption, limit = 4): UseTopJobLocationsResult {
  const [data, setData] = useState<BreakdownSlice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchTopJobLocations(range, limit)
      .then((result) => {
        if (!isCancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!isCancelled) setError(err instanceof Error ? err.message : 'Failed to load job locations');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [range, limit]);

  return { data, isLoading, error };
}