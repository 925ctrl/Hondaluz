import {
  GAME_ACTIONS,
  DEFAULT_CONTROLS,
  HOTBAR_SLOT_CODES,
  type GameAction,
} from '../../../config/controls.config';
import { RESERVED_CODES } from '../../../domain/settings/Settings';
import { formatInputCode } from '../../input/formatInputCode';
import { button, el } from '../dom';
import type { MenuContext } from './MenuContext';

/**
 * Opciones: volumen de música y efectos, y teclas de cada acción. Para cambiar una tecla se
 * pulsa su botón y después la tecla o el botón del ratón nuevos; ESC cancela.
 */
export function renderOptionsScreen(context: MenuContext): HTMLElement {
  const { settings } = context;
  const status = el('p', {
    class: 'hint',
    attrs: { role: 'status', 'data-testid': 'options-status' },
  });
  const tbody = el('tbody');

  const render = (): void => {
    const rows = GAME_ACTIONS.map((action) => bindingRow(action));
    const firstSlot = formatInputCode(HOTBAR_SLOT_CODES[0] ?? '');
    const lastSlot = formatInputCode(HOTBAR_SLOT_CODES.at(-1) ?? '');
    rows.push(
      el('tr', {}, [
        el('th', { text: 'Seleccionar ranuras', attrs: { scope: 'row' } }),
        el('td', { text: `${firstSlot}-${lastSlot}` }),
      ]),
    );
    tbody.replaceChildren(...rows);
  };

  const bindingRow = (action: GameAction): HTMLElement => {
    const label = DEFAULT_CONTROLS[action].label;
    const keys = settings.codesFor(action).map(formatInputCode).join(' / ');
    const change = button(
      keys,
      () => {
        capture(action, change);
      },
      'btn btn-key',
    );
    change.setAttribute('aria-label', `${label}: ${keys}. Cambiar`);
    change.dataset.testid = `bind-${action}`;
    return el('tr', {}, [
      el('th', { text: label, attrs: { scope: 'row' } }),
      el('td', {}, [change]),
    ]);
  };

  /** Espera la siguiente tecla o botón del ratón y la asigna a la acción. */
  const capture = (action: GameAction, control: HTMLButtonElement): void => {
    control.textContent = 'Pulsa una tecla…';
    status.textContent = 'Pulsa la tecla o el botón del ratón nuevos. ESC cancela.';
    const abort = new AbortController();
    const finish = (code: string | null): void => {
      abort.abort();
      if (!control.isConnected) return;
      if (code !== null && RESERVED_CODES.has(code)) {
        status.textContent = `${formatInputCode(code)} está reservada para la barra rápida.`;
      } else if (code !== null) {
        settings.rebind(action, code);
        status.textContent = `${DEFAULT_CONTROLS[action].label}: ${formatInputCode(code)}.`;
      } else {
        status.textContent = '';
      }
      render();
    };
    // El clic (o la tecla) que abrió la captura ya ha pasado por `window`: no se recoge.
    window.addEventListener(
      'keydown',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        finish(event.code === 'Escape' && action !== 'pause' ? null : event.code);
      },
      { signal: abort.signal, capture: true },
    );
    window.addEventListener(
      'mousedown',
      (event) => {
        event.preventDefault();
        finish(`Mouse${String(event.button)}`);
      },
      { signal: abort.signal, capture: true },
    );
  };

  const volume = (label: string, key: 'musicVolume' | 'sfxVolume'): HTMLElement => {
    const id = `volume-${key}`;
    const input = el('input', {
      attrs: {
        id,
        type: 'range',
        min: '0',
        max: '100',
        step: '5',
        value: String(Math.round(settings.current[key] * 100)),
      },
    });
    input.addEventListener('input', () => {
      settings.setVolumes({ [key]: Number(input.value) / 100 });
    });
    return el('div', { class: 'field' }, [el('label', { text: label, attrs: { for: id } }), input]);
  };

  render();
  return el('div', { class: 'panel' }, [
    el('h2', { text: 'Opciones' }),
    el('h3', { text: 'Sonido' }),
    volume('Música', 'musicVolume'),
    volume('Efectos', 'sfxVolume'),
    el('h3', { text: 'Controles' }),
    el('table', { class: 'controls' }, [tbody]),
    status,
    el('div', { class: 'row' }, [
      button(
        'Restablecer teclas',
        () => {
          settings.resetControls();
          status.textContent = 'Teclas restablecidas.';
          render();
        },
        'btn btn-secondary',
      ),
      button(
        'Volver',
        () => {
          context.navigate('main');
        },
        'btn btn-secondary',
      ),
    ]),
  ]);
}
