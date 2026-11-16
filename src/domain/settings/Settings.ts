import {
  DEFAULT_CONTROLS,
  GAME_ACTIONS,
  HOTBAR_SLOT_CODES,
  type GameAction,
  type InputCode,
} from '../../config/controls.config';

/** Preferencias del jugador, comunes a todos los mundos. */
export interface Settings {
  /** Entradas de cada acción, en el orden en que se muestran. */
  readonly bindings: Readonly<Record<GameAction, readonly InputCode[]>>;
  /** Volúmenes de 0 a 1. */
  readonly musicVolume: number;
  readonly sfxVolume: number;
}

/** Puerto de almacenamiento de las preferencias. */
export interface SettingsRepository {
  load(): unknown;
  save(settings: Settings): void;
}

export const DEFAULT_SETTINGS: Settings = {
  bindings: Object.fromEntries(
    GAME_ACTIONS.map((action) => [action, DEFAULT_CONTROLS[action].codes]),
  ) as Record<GameAction, readonly InputCode[]>,
  musicVolume: 0.5,
  sfxVolume: 0.7,
};

/** Códigos que no se pueden asignar a una acción: los reserva la barra rápida. */
export const RESERVED_CODES: ReadonlySet<InputCode> = new Set(HOTBAR_SLOT_CODES);

const clampVolume = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/**
 * Convierte lo leído del almacenamiento en preferencias válidas: lo que falte o no se entienda
 * toma su valor por defecto, y ningún código queda asignado a dos acciones.
 */
export function normalizeSettings(raw: unknown): Settings {
  const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const rawBindings =
    typeof record.bindings === 'object' && record.bindings !== null
      ? (record.bindings as Record<string, unknown>)
      : {};
  const used = new Set<InputCode>();
  const bindings = {} as Record<GameAction, readonly InputCode[]>;
  for (const action of GAME_ACTIONS) {
    const codes = rawBindings[action];
    const valid = Array.isArray(codes)
      ? codes.filter(
          (code): code is InputCode =>
            typeof code === 'string' && code !== '' && !RESERVED_CODES.has(code) && !used.has(code),
        )
      : [];
    const chosen =
      valid.length > 0 ? valid : DEFAULT_SETTINGS.bindings[action].filter((c) => !used.has(c));
    chosen.forEach((code) => used.add(code));
    bindings[action] = chosen;
  }
  return {
    bindings,
    musicVolume: clampVolume(record.musicVolume, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: clampVolume(record.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
  };
}

/**
 * Asigna un código a una acción. Si otra acción lo usaba, recibe a cambio el código que
 * tenía la primera, de modo que ninguna se queda sin tecla.
 */
export function rebind(settings: Settings, action: GameAction, code: InputCode): Settings {
  if (RESERVED_CODES.has(code)) return settings;
  const previous = settings.bindings[action][0];
  const bindings = { ...settings.bindings };
  for (const other of GAME_ACTIONS) {
    if (other === action || !bindings[other].includes(code)) continue;
    const rest = bindings[other].filter((c) => c !== code);
    bindings[other] =
      previous !== undefined && !rest.includes(previous) ? [previous, ...rest] : rest;
  }
  bindings[action] = [code];
  return { ...settings, bindings };
}
