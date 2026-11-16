import type { GameEventBus } from '../../../application/events/GameEvents';
import { button, el, type View } from '../dom';

export function createPauseMenu(events: GameEventBus): View {
  const resume = button('Reanudar', () => {
    events.emit('game:pause-toggle-requested');
  });
  resume.setAttribute('data-autofocus', '');
  const element = el('div', { class: 'overlay' }, [
    el('div', { class: 'panel', attrs: { role: 'dialog', 'aria-label': 'Pausa' } }, [
      el('h2', { text: 'Pausa' }),
      el('div', { class: 'menu-actions' }, [
        resume,
        button(
          'Salir al menú',
          () => {
            events.emit('game:exit-requested');
          },
          'btn btn-secondary',
        ),
      ]),
    ]),
  ]);
  return { element };
}
