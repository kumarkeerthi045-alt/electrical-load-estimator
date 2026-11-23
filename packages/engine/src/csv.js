/**
 * CSV import/export for load schedules.
 *
 * Column names are accepted in either snake_case (the original Python export)
 * or camelCase, so a schedule saved from the old Streamlit app imports as-is.
 */
import { ValidationError } from './core.js';

const COLUMN_ALIASES = {
  name: ['name', 'load', 'description'],
  quantity: ['quantity', 'qty', 'count'],
  ratedKw: ['rated_kw', 'ratedkw', 'kw', 'rated'],
  powerFactor: ['power_factor', 'powerfactor', 'pf'],
  demandFactor: ['demand_factor', 'demandfactor', 'df'],
  phases: ['phases', 'phase'],
};

const HEADER = 'name,quantity,rated_kw,power_factor,demand_factor,phases';

function splitRow(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(field); field = ''; }
    else field += ch;
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function resolveColumns(header) {
  const map = {};
  header.forEach((raw, index) => {
    const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(key) && map[canonical] === undefined) map[canonical] = index;
    }
  });
  return map;
}

/**
 * Parse a load-schedule CSV into plain load objects.
 * @param {string} text
 * @returns {Array<object>}
 */
export function parseScheduleCsv(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new ValidationError('The CSV file is empty');
  }
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = splitRow(lines[0]);
  const cols = resolveColumns(header);
  const missing = ['name', 'quantity', 'ratedKw'].filter((c) => cols[c] === undefined);
  if (missing.length) {
    throw new ValidationError(
      `CSV is missing the required column(s): ${missing.join(', ')}. Expected header: ${HEADER}`,
    );
  }

  const loads = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitRow(lines[i]);
    const pick = (key, fallback) => {
      const index = cols[key];
      if (index === undefined) return fallback;
      const value = cells[index];
      return value === undefined || value === '' ? fallback : value;
    };
    loads.push({
      name: pick('name', `Load ${i}`),
      quantity: Number(pick('quantity', 1)),
      ratedKw: Number(pick('ratedKw', 0)),
      powerFactor: Number(pick('powerFactor', 0.85)),
      demandFactor: Number(pick('demandFactor', 1)),
      phases: Number(pick('phases', 3)),
    });
  }
  if (!loads.length) throw new ValidationError('The CSV has a header but no load rows');
  return loads;
}

/** Serialise load objects back to CSV (same header the Python app used). */
export function toScheduleCsv(loads = []) {
  const rows = loads.map((l) => [
    `"${String(l.name ?? '').replace(/"/g, '""')}"`,
    l.quantity ?? 1,
    l.ratedKw ?? 0,
    l.powerFactor ?? 0.85,
    l.demandFactor ?? 1,
    l.phases ?? 3,
  ].join(','));
  return [HEADER, ...rows].join('\n');
}
