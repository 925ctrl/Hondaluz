import type { GameAction } from '../../../config/controls.config';
import type { VirtualControls } from '../../input/TouchInput';
import { el } from '../dom';

/** Acciones de la interfaz que también se ofrecen como botones táctiles. */
export interface TouchUiActions {
  readonly inventory: () => void;
  readonly pause: () => void;
}

/** Se muestra en pantallas táctiles, o en cuanto se toca la pantalla por primera vez. */
const isTouchScreen = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/**
 * Controles en pantalla: moverse y saltar (se mantienen pulsados), cambiar entre minar y
 * construir, inventario y pausa. Se apoyan en `VirtualControls`, que la entrada táctil lee.
 */
export function createTouchControls(controls: VirtualControls, ui: TouchUiActions): HTMLElement {
  const hold = (label: string, action: GameAction, name: string): HTMLButtonElement => {
    const control = el('button', {
      class: 'touch-btn',
      text: label,
      attrs: { type: 'button', 'aria-label': name, 'data-testid': `touch-${action}` },
    });
    const down = (event: Event): void => {
      event.preventDefault();
      controls.press(action);
    };
    const up = (event: Event): void => {
      event.preventDefault();
      controls.release(action);
    };
    control.addEventListener('touchstart', down, { passive: false });
    control.addEventListener('touchend', up, { passive: false });
    control.addEventListener('touchcancel', up, { passive: false });
    return control;
  };
  const tap = (
    label: string,
    name: string,
    onTap: () => void,
    testId: string,
  ): HTMLButtonElement => {
    const control = el('button', {
      class: 'touch-btn',
      text: label,
      attrs: { type: 'button', 'aria-label': name, 'data-testid': testId },
    });
    control.addEventListener('click', onTap);
    return control;
  };

  const mode = tap(
    'Minar',
    'Cambiar entre minar y construir',
    () => {
      controls.mode = controls.mode === 'mine' ? 'build' : 'mine';
      mode.textContent = controls.mode === 'mine' ? 'Minar' : 'Construir';
      mode.setAttribute('aria-pressed', String(controls.mode === 'build'));
    },
    'touch-mode',
  );
  mode.setAttribute('aria-pressed', 'false');

  const element = el(
    'div',
    { class: 'touch-controls', attrs: { 'data-testid': 'touch-controls' } },
    [
      el('div', { class: 'touch-group' }, [
        hold('◀', 'moveLeft', 'Mover a la izquierda'),
        hold('▶', 'moveRight', 'Mover a la derecha'),
      ]),
      el('div', { class: 'touch-group' }, [
        mode,
        tap('Inv.', 'Inventario', ui.inventory, 'touch-inventory'),
        tap('II', 'Pausa', ui.pause, 'touch-pause'),
        hold('▲', 'jump', 'Saltar'),
      ]),
    ],
  );
  element.hidden = !isTouchScreen();
  window.addEventListener(
    'touchstart',
    () => {
      element.hidden = false;
    },
    { once: true, passive: true },
  );
  return element;
}
