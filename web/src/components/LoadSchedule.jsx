import { useRef } from 'react';
import { parseScheduleCsv } from '@voltwise/engine';

const NUMERIC_FIELDS = [
  { key: 'quantity', label: 'Quantity', min: 1, step: 1, digits: 0 },
  { key: 'ratedKw', label: 'Rated power (kW)', min: 0.01, step: 0.1, digits: 2 },
  { key: 'powerFactor', label: 'Power factor', min: 0.1, max: 1, step: 0.01, digits: 2 },
  { key: 'demandFactor', label: 'Demand factor', min: 0.01, max: 1, step: 0.05, digits: 2 },
];

/**
 * Editable load schedule. Every cell writes straight back into the schedule
 * state, so the estimate re-runs on each keystroke.
 */
export function LoadSchedule({ loads, onRowChange, onAdd, onRemove, onImport, onError }) {
  const fileRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseScheduleCsv(text);
      onImport(parsed);
    } catch (err) {
      onError(`Could not read ${file.name}: ${err.message}`);
    }
  };

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h4>Load schedule</h4>
          <div className="caption" style={{ marginTop: '0.2rem' }}>
            Edit any cell, add equipment, or import a CSV. Changes recalculate instantly.
          </div>
        </div>
        <div className="btn-row">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="visually-hidden"
            id="csv-input"
          />
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            ↑ Import CSV
          </button>
          <button type="button" className="btn" onClick={onAdd}>
            + Add load
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', marginTop: '0.9rem' }}>
        <table className="schedule">
          <thead>
            <tr>
              <th>Equipment / load</th>
              <th>Qty</th>
              <th>Rated (kW)</th>
              <th>PF</th>
              <th>Demand factor</th>
              <th>Phase</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loads.map((load, index) => (
              <tr key={index}>
                <td className="name-cell">
                  <input
                    type="text"
                    value={load.name}
                    aria-label={`Load ${index + 1} name`}
                    onChange={(e) => onRowChange(index, { name: e.target.value })}
                  />
                </td>
                {NUMERIC_FIELDS.map((field) => (
                  <td key={field.key} style={{ minWidth: field.key === 'quantity' ? 66 : 96 }}>
                    <input
                      type="number"
                      value={load[field.key]}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      aria-label={`${field.label} for ${load.name || `load ${index + 1}`}`}
                      onChange={(e) => onRowChange(index, { [field.key]: e.target.value === '' ? '' : Number(e.target.value) })}
                    />
                  </td>
                ))}
                <td style={{ minWidth: 74 }}>
                  <select
                    value={load.phases}
                    aria-label={`Phases for ${load.name || `load ${index + 1}`}`}
                    onChange={(e) => onRowChange(index, { phases: Number(e.target.value) })}
                  >
                    <option value={1}>1-φ</option>
                    <option value={3}>3-φ</option>
                  </select>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-danger"
                    title="Remove row"
                    onClick={() => onRemove(index)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {loads.length === 0 ? (
              <tr>
                <td colSpan={7} className="note" style={{ padding: '1rem 0.5rem' }}>
                  No loads yet — add a row or import a CSV to begin.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
