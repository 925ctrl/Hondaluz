import type { GameAction } from '../../../config/controls.config';
import type { HowToPlaySceneId } from '../HowToPlayScenes';

/** Una entrada que la guía muestra como chip: reasignable (`action`) o fija (`fixed`). */
export type HowToPlayKey =
  | { readonly action: GameAction; readonly fixed?: never; readonly label: string }
  | { readonly fixed: string; readonly action?: never; readonly label: string };

export interface HowToPlaySlide {
  readonly title: string;
  /** De dos a cuatro frases cortas. Describen mecánicas, nunca teclas literales. */
  readonly lines: readonly string[];
  readonly keys: readonly HowToPlayKey[];
  /** Escena que ilustra la diapositiva. */
  readonly scene: HowToPlaySceneId;
  /** Texto alternativo de la escena: describe lo que ocurre en ella. */
  readonly sceneAlt: string;
}

/** Las diapositivas de «Cómo jugar», en orden. */
export const HOW_TO_PLAY_SLIDES: readonly HowToPlaySlide[] = [
  {
    title: 'Moverse y saltar',
    lines: [
      'Recorre el mundo a izquierda y derecha y salta para subir a los bloques.',
      'En el agua te hundes despacio; mantén el salto para nadar hacia arriba.',
      'En pantallas táctiles usa los botones que aparecen en pantalla.',
    ],
    keys: [
      { action: 'moveLeft', label: 'Izquierda' },
      { action: 'moveRight', label: 'Derecha' },
      { action: 'jump', label: 'Saltar' },
    ],
    scene: 'move',
    sceneAlt: 'El personaje camina sobre la hierba y da un salto.',
  },
  {
    title: 'Minar y construir',
    lines: [
      'Mantén el botón de usar sobre un bloque cercano para minarlo.',
      'Los bloques duros piden un pico mejor.',
      'Elige un bloque en la mano y colócalo junto a otro bloque.',
    ],
    keys: [
      { action: 'primaryUse', label: 'Minar (mantener)' },
      { action: 'secondaryUse', label: 'Colocar' },
    ],
    scene: 'mine',
    sceneAlt:
      'Un pico golpea un bloque de piedra hasta romperlo y después se coloca un bloque de tierra en su lugar.',
  },
  {
    title: 'Inventario y barra rápida',
    lines: [
      'Lo que recoges va al inventario.',
      'La barra rápida decide qué llevas en la mano.',
      'En el inventario, un clic coge un montón y otro lo suelta; el clic derecho coge la mitad.',
    ],
    keys: [
      { action: 'inventory', label: 'Inventario' },
      { fixed: '1-9', label: 'Elegir ranura' },
      { fixed: 'Rueda del ratón', label: 'Cambiar ranura' },
    ],
    scene: 'hotbar',
    sceneAlt:
      'Una barra rápida con varios objetos en la que la ranura seleccionada avanza de una en una.',
  },
  {
    title: 'Fabricar',
    lines: [
      'La lista de recetas está junto al inventario.',
      'Algunas recetas necesitan una estación cerca, como la mesa de trabajo.',
      'Las recetas bloqueadas indican qué te falta.',
    ],
    keys: [{ action: 'inventory', label: 'Abrir recetas' }],
    scene: 'craft',
    sceneAlt: 'Sobre una mesa de trabajo, un montón de madera se convierte en un pico de madera.',
  },
  {
    title: 'Combate y vida',
    lines: [
      'Ataca con el arma que tengas en la mano o usa un consumible.',
      'Cada golpe te empuja; tras unos segundos sin daño la vida se recupera.',
      'Si caes, reapareces en el punto de partida con todos tus objetos.',
    ],
    keys: [{ action: 'primaryUse', label: 'Atacar o usar' }],
    scene: 'combat',
    sceneAlt:
      'El personaje golpea con una espada a un tocón errante, que parpadea al recibir el golpe.',
  },
  {
    title: 'Noche, antorchas y guardado automático',
    lines: [
      'De noche salen criaturas y solo te alumbra tu farol.',
      'Bajo tierra no llega el sol: coloca antorchas para ver.',
      'La partida se guarda sola cada poco tiempo, al pausar y al salir.',
    ],
    keys: [{ action: 'pause', label: 'Pausar (también guarda)' }],
    scene: 'night',
    sceneAlt:
      'De noche, una antorcha colocada en el suelo ilumina a su alrededor junto al personaje.',
  },
];
