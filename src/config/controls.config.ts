/**
 * Acciones del juego y sus entradas por defecto. El jugador puede reasignarlas en Opciones;
 * lo que esté en uso lo da `SettingsStore`, no esta tabla.
 * Un código es un `KeyboardEvent.code` o `Mouse<botón>`; la lógica solo conoce acciones.
 */
export const GAME_ACTIONS = [
  'moveLeft',
  'moveRight',
  'jump',
  'inventory',
  'primaryUse',
  'secondaryUse',
  'interact',
  'pause',
] as const;

export type GameAction = (typeof GAME_ACTIONS)[number];
export type InputCode = string;

export interface ControlBinding {
  readonly label: string;
  readonly codes: readonly InputCode[];
}

export const DEFAULT_CONTROLS: Readonly<Record<GameAction, ControlBinding>> = {
  moveLeft: { label: 'Mover izquierda', codes: ['KeyA'] },
  moveRight: { label: 'Mover derecha', codes: ['KeyD'] },
  jump: { label: 'Saltar', codes: ['Space'] },
  inventory: { label: 'Inventario', codes: ['KeyE'] },
  primaryUse: { label: 'Usar objeto', codes: ['Mouse0'] },
  secondaryUse: { label: 'Acción secundaria', codes: ['Mouse2'] },
  interact: { label: 'Interactuar', codes: ['KeyF'] },
  pause: { label: 'Pausar', codes: ['Escape'] },
};

export const HOTBAR_SLOT_CODES: readonly InputCode[] = [
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
];
