import { useEffect, useState } from 'react';
import { BreakdownSlice, DateRangeOption } from '../types';
import { fetchTopJobCategories } from '../services/dashboardService';

interface UseTopJobCategoriesResult {
  data: BreakdownSlice[];
  isLoading: boolean;
  error: string | null;
}

/** Now respects the page-wide date range toggle. */
export function useTopJobCategories(range: DateRangeOption, limit = 3): UseTopJobCategoriesResult {
  const [data, setData] = useState<BreakdownSlice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchTopJobCategories(range, limit)
      .then((result) => {
        if (!isCancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!isCancelled) setError(err instanceof Error ? err.message : 'Failed to load job categories');
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