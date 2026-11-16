import { GAME_CONFIG } from '../../../config/game.config';
import { button, el } from '../dom';
import type { MenuContext } from './MenuContext';

export function renderCreditsScreen(context: MenuContext): HTMLElement {
  return el('div', { class: 'panel' }, [
    el('h2', { text: 'Créditos' }),
    el('p', { text: `${GAME_CONFIG.title} es un juego original de exploración y construcción.` }),
    el('p', { class: 'hint', text: 'Motor: Phaser 3 · Tipografía: Jersey 10 (SIL OFL 1.1)' }),
    el('p', {
      class: 'hint',
      text: 'El arte, los sonidos y la música se generan por código dentro del propio juego.',
    }),
    el('div', { class: 'row' }, [
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
