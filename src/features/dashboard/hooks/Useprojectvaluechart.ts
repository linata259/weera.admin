import { useEffect, useState } from 'react';
import { ProjectValuePoint, DateRangeOption } from '../types';
import { fetchProjectValueChart } from '../services/dashboardService';



interface UseProjectValueChartResult {
  chartData: ProjectValuePoint[];
  isLoading: boolean;
  error: string | null;
}

export function useProjectValueChart(range: DateRangeOption): UseProjectValueChartResult {
  const [chartData, setChartData] = useState<ProjectValuePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    fetchProjectValueChart(range)
      .then((data) => {
        if (!isCancelled) setChartData(data);
      })
      .catch((err: unknown) => {
        if (!isCancelled) setError(err instanceof Error ? err.message : 'Failed to load project value data');
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [range]);

  return { chartData, isLoading, error };
}