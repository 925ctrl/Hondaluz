import { GAME_CONFIG } from '../../../config/game.config';
import { button, el, errorMessage } from '../dom';
import type { MenuContext } from './MenuContext';

export function renderMainMenuScreen(context: MenuContext): HTMLElement {
  const status = el('p', { class: 'status', attrs: { role: 'alert' } });

  const continueButton = button('Continuar', () => {
    void continueLastWorld(context, status);
  });
  continueButton.disabled = true;
  context.catalog
    .lastPlayed()
    .then((world) => {
      continueButton.disabled = world === undefined;
    })
    .catch((error: unknown) => {
      status.textContent = errorMessage(error);
    });

  return el('div', { class: 'menu' }, [
    el('h1', { class: 'logo', text: GAME_CONFIG.title }),
    el('p', { class: 'tagline', text: GAME_CONFIG.tagline }),
    el('nav', { class: 'menu-actions', attrs: { 'aria-label': 'Menú principal' } }, [
      button('Nueva partida', () => {
        context.navigate('new-world');
      }),
      continueButton,
      button('Seleccionar mundo', () => {
        context.navigate('select-world');
      }),
      button('Opciones', () => {
        context.navigate('options');
      }),
      button('Créditos', () => {
        context.navigate('credits');
      }),
    ]),
    status,
    el('p', { class: 'version', text: `v${GAME_CONFIG.version}` }),
  ]);
}

async function continueLastWorld(context: MenuContext, status: HTMLElement): Promise<void> {
  try {
    const last = await context.catalog.lastPlayed();
    if (!last) return;
    context.events.emit('world:play-requested', await context.catalog.open(last.id));
  } catch (error) {
    status.textContent = errorMessage(error);
  }
}
