/**
 * Reference data.
 *
 * IMPORTANT: Values are INDICATIVE, typical of 1.1 kV copper XLPE multi-core
 * armoured cables laid in air at ~40 degC ambient. Real projects must use the
 * cable manufacturer's datasheet and the applicable standard (e.g. IS 3961 /
 * IEC 60364-5-52). Keep all data here so it can be swapped in one place.
 */

/**
 * size (sq.mm) -> { ampacity: current rating in A, r: AC resistance ohm/km at 90 degC, x: reactance ohm/km }
 */
export const COPPER_XLPE_ARMOURED_AIR = {
  2.5: { ampacity: 30, r: 9.45, x: 0.11 },
  4: { ampacity: 40, r: 5.88, x: 0.107 },
  6: { ampacity: 51, r: 3.93, x: 0.1 },
  10: { ampacity: 70, r: 2.33, x: 0.094 },
  16: { ampacity: 94, r: 1.47, x: 0.09 },
  25: { ampacity: 120, r: 0.927, x: 0.086 },
  35: { ampacity: 147, r: 0.668, x: 0.083 },
  50: { ampacity: 180, r: 0.494, x: 0.083 },
  70: { ampacity: 226, r: 0.342, x: 0.082 },
  95: { ampacity: 275, r: 0.247, x: 0.082 },
  120: { ampacity: 317, r: 0.196, x: 0.08 },
  150: { ampacity: 358, r: 0.159, x: 0.08 },
  185: { ampacity: 410, r: 0.128, x: 0.08 },
  240: { ampacity: 483, r: 0.0977, x: 0.079 },
  300: { ampacity: 552, r: 0.079, x: 0.079 },
};

/** Common distribution transformer ratings (kVA). */
export const STANDARD_TRANSFORMER_KVA = [
  25, 63, 100, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500,
];

/** Default system settings used by the estimator. */
export const DEFAULT_SETTINGS = {
  voltage: 415,          // line-to-line volts for 3-phase systems
  phases: 3,             // 1 or 3
  diversityFactor: 1.0,  // >= 1, applied to the summed demand
  derating: 1.0,         // 0..1 group/ambient derating on the cable ampacity
  maxVdPct: 3.0,         // allowed voltage drop, % of supply voltage
  cableLengthM: 50,      // route length of the feeder
  maxRuns: 4,            // maximum parallel cable runs to consider
  maxLoading: 0.8,       // maximum transformer loading (0..1]
  futureMargin: 0.2,     // load growth allowance
};

/** Sorted cable sizes available in the reference table. */
export function cableSizes(table = COPPER_XLPE_ARMOURED_AIR) {
  return Object.keys(table).map(Number).sort((a, b) => a - b);
}
