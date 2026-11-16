import type { GameEventBus } from '../../../application/events/GameEvents';
import type { SettingsStore } from '../../../application/use-cases/settings/SettingsStore';
import { button, el, type View } from '../dom';
import { renderHowToPlayGuide } from './HowToPlayGuide';

/** Menú de pausa. «Cómo jugar» se abre dentro del mismo panel y «Volver» lo restaura. */
export function createPauseMenu(events: GameEventBus, settings: SettingsStore): View {
  const resume = button('Reanudar', () => {
    events.emit('game:pause-toggle-requested');
  });
  resume.setAttribute('data-autofocus', '');
  const pauseContent = [
    el('h2', { text: 'Pausa' }),
    el('div', { class: 'menu-actions' }, [
      resume,
      button(
        'Cómo jugar',
        () => {
          showGuide();
        },
        'btn btn-secondary',
      ),
      button(
        'Salir al menú',
        () => {
          events.emit('game:exit-requested');
        },
        'btn btn-secondary',
      ),
    ]),
  ];
  const panel = el(
    'div',
    { class: 'panel', attrs: { role: 'dialog', 'aria-label': 'Pausa' } },
    pauseContent,
  );

  function showGuide(): void {
    const guide = renderHowToPlayGuide({ settings, onClose: showPause });
    panel.classList.add('panel-wide');
    panel.replaceChildren(guide);
    guide.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }

  function showPause(): void {
    panel.classList.remove('panel-wide');
    panel.replaceChildren(...pauseContent);
    resume.focus();
  }

  return { element: el('div', { class: 'overlay' }, [panel]) };
}
