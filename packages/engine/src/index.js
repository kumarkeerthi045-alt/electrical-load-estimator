/**
 * @voltwise/engine — electrical load, cable and transformer sizing.
 *
 * Shared by the Express API (server-side estimates) and the React web client
 * (instant local preview). The Flutter app ships a line-for-line Dart port of
 * the same rules in `mobile/lib/core/engine.dart`.
 */
export {
  Load,
  SQRT3,
  ValidationError,
  estimate,
  lineCurrent,
  round,
  selectCable,
  selectTransformer,
  summarise,
  toLoads,
  voltageDropPercent,
} from './core.js';

export {
  COPPER_XLPE_ARMOURED_AIR,
  DEFAULT_SETTINGS,
  STANDARD_TRANSFORMER_KVA,
  cableSizes,
} from './tables.js';

export { parseScheduleCsv, toScheduleCsv } from './csv.js';
