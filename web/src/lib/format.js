export const fmt = (value, digits = 1) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

export const pct = (fraction, digits = 0) => `${fmt(fraction * 100, digits)}%`;

export const cableLabel = (cable) => {
  if (!cable) return '—';
  const runs = cable.runs > 1 ? `${cable.runs} parallel runs of ` : '';
  return `${runs}3.5-core × ${cable.sizeSqmm} mm²`;
};

/** Build the results CSV the app downloads (same idea as the Streamlit export). */
export function resultsCsv(report) {
  const header = 'Equipment,Connected (kW),Demand (kW),Reactive (kVAr),Demand share (%),Phases';
  const rows = report.breakdown.map((l) => [
    `"${l.name.replace(/"/g, '""')}"`,
    l.connectedKw,
    l.demandKw,
    l.demandKvar,
    l.shareOfDemandPct,
    l.phases,
  ].join(','));
  const summary = [
    '',
    `Connected load (kW),${report.summary.connectedKw}`,
    `Maximum demand (kVA),${report.summary.maxDemandKva}`,
    `Overall power factor,${report.summary.overallPf}`,
    `Feeder current (A),${report.feeder.current}`,
    `Cable,"${cableLabel(report.cable)}"`,
    `Cable derated capacity (A),${report.cable?.deratedCapacityA ?? ''}`,
    `Voltage drop (%),${report.cable?.voltageDropPct ?? ''}`,
    `Transformer (kVA),${report.transformer?.kva ?? ''}`,
  ];
  return [header, ...rows, ...summary].join('\n');
}

export function download(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
