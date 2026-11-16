import type { EventBus } from '../../core/events/EventBus';
import type { WorldMeta } from '../../domain/entities/World';
import type { WorldSave } from '../../domain/repositories/WorldSaveRepository';
import type { DayPhase } from '../../domain/world/WorldClock';

/** Eventos que cruzan entre la interfaz y las escenas. La interfaz pide; las escenas ejecutan. */
export interface GameEvents {
  /** Jugar un mundo; `save` es su partida guardada, si la tiene. */
  'world:play-requested': { world: WorldMeta; save?: WorldSave };
  'game:pause-toggle-requested': undefined;
  'game:exit-requested': undefined;
  /** Ha cambiado el contenido del inventario o la ranura seleccionada. */
  'inventory:changed': undefined;
  /** Mensaje breve para el jugador sobre algo que no ha podido hacer. */
  'hud:hint': { text: string };
  /** Ha cambiado la vida del jugador (valores redondeados). */
  'player:health-changed': { current: number; max: number };
  /** El jugador ha perdido toda la vida. */
  'player:died': undefined;
  /** La interfaz pide que el jugador vuelva a la vida. */
  'player:respawn-requested': undefined;
  /** Ha cambiado la hora mostrada o la fase del día. */
  'clock:changed': { day: number; hour: number; phase: DayPhase };
  /** El jugador ha pasado a otro bloque. Coordenadas en bloques. */
  'player:tile-changed': { x: number; y: number };
  'player:biome-changed': { name: string };
}

export type GameEventBus = EventBus<GameEvents>;
