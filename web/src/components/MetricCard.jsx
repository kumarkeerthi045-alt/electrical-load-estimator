import { fmt } from '../lib/format.js';

export function MetricCard({ label, value, unit, foot }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {unit ? <span style={{ fontSize: '0.9rem', color: '#8da2b9', marginLeft: '0.3rem' }}>{unit}</span> : null}
      </div>
      <div className="metric-foot">{foot}</div>
    </div>
  );
}

export function SectionHead({ number, title, sub }) {
  return (
    <div className="section-head">
      <div className="section-num">{number}</div>
      <div className="section-title">{title}</div>
      {sub ? <div className="section-sub">{sub}</div> : null}
    </div>
  );
}

export function MiniMetric({ label, value }) {
  return (
    <div>
      <div className="metric-label">{label}</div>
      <div style={{ fontSize: '1.18rem', fontWeight: 800, color: '#f2f8ff' }}>{value}</div>
    </div>
  );
}

/** Horizontal bar chart of demand contribution — no chart library needed. */
export function DemandChart({ breakdown }) {
  const rows = [...breakdown].sort((a, b) => b.demandKw - a.demandKw);
  const max = Math.max(...rows.map((r) => r.demandKw), 0.0001);

  return (
    <div className="chart">
      {rows.map((row) => (
        <div className="chart-row" key={`${row.name}-${row.quantity}`}>
          <div className="chart-label" title={row.name}>{row.name}</div>
          <div className="chart-track">
            <div
              className="chart-fill"
              style={{ width: `${Math.max((row.demandKw / max) * 100, 1.5)}%` }}
            />
          </div>
          <div className="chart-value">{fmt(row.demandKw, 1)}</div>
        </div>
      ))}
      {rows.length === 0 ? <div className="note">Add loads to see the demand split.</div> : null}
    </div>
  );
}
