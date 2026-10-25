import { useMemo } from 'react';
import { aggregate } from '@/domain/aggregate';
import { currentYearMonth } from '@/domain/months';
import { buildSeries, scenarioRange, type SeriesSet } from '@/domain/projection';
import { useScenarioStore } from '@/store/scenarioStore';

export function useSeries(): SeriesSet {
  const scenario = useScenarioStore((s) => s.scenario);
  const granularity = useScenarioStore((s) => s.view.granularity);
  return useMemo(() => {
    const monthly = buildSeries(scenario, scenarioRange(scenario, currentYearMonth()));
    return aggregate(monthly, granularity);
  }, [scenario, granularity]);
}
