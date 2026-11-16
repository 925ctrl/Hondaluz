import type { GameEventBus } from '../../../application/events/GameEvents';
import type { SettingsStore } from '../../../application/use-cases/settings/SettingsStore';
import { button, el, type View } from '../dom';
import type { HowToPlayScenes } from '../HowToPlayScenes';
import { renderHowToPlayGuide } from './HowToPlayGuide';
import { renderOptions } from './OptionsScreen';

/**
 * Menú de pausa. «Cómo jugar» y «Opciones» se abren dentro del mismo panel y «Volver» lo
 * restaura.
 */
export function createPauseMenu(
  events: GameEventBus,
  settings: SettingsStore,
  scenes: HowToPlayScenes,
): View {
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
        'Opciones',
        () => {
          showOptions();
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
    const guide = renderHowToPlayGuide({ settings, scenes, onClose: showPause });
    panel.classList.add('panel-wide');
    panel.replaceChildren(guide);
    guide.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }

  function showOptions(): void {
    panel.replaceChildren(...renderOptions({ settings, onClose: showPause }));
    panel.querySelector<HTMLElement>('input, button')?.focus();
  }

  function showPause(): void {
    panel.classList.remove('panel-wide');
    panel.replaceChildren(...pauseContent);
    resume.focus();
  }

  return { element: el('div', { class: 'overlay' }, [panel]) };
}
