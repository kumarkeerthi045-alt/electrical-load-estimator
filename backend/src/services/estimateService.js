import { estimate } from '@voltwise/engine';
import { ValidationError } from '@voltwise/engine';

/** Compute a report and add the metadata clients show next to it. */
export function buildReport({ loads = [], settings = {} } = {}) {
  if (!Array.isArray(loads)) throw new ValidationError('loads must be an array');
  const report = estimate({ loads, settings });
  return {
    ...report,
    meta: {
      engine: 'voltwise-engine@1.0.0',
      generatedAt: new Date().toISOString(),
      loadCount: report.breakdown.length,
    },
  };
}
