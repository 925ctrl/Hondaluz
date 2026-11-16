import { el, type View } from '../dom';
import { renderCreditsScreen } from './CreditsScreen';
import { renderMainMenuScreen } from './MainMenuScreen';
import type { MenuContext, MenuRoute } from './MenuContext';
import { renderNewWorldScreen } from './NewWorldScreen';
import { renderOptionsScreen } from './OptionsScreen';
import { renderWorldSelectScreen } from './WorldSelectScreen';

const SCREENS: Readonly<Record<MenuRoute, (context: MenuContext) => HTMLElement>> = {
  main: renderMainMenuScreen,
  'new-world': renderNewWorldScreen,
  'select-world': renderWorldSelectScreen,
  options: renderOptionsScreen,
  credits: renderCreditsScreen,
};

/** Menú principal: un contenedor que muestra una pantalla cada vez. */
export function createMenuView(deps: Omit<MenuContext, 'navigate'>): View {
  const element = el('div', { class: 'screen' });
  const context: MenuContext = {
    ...deps,
    navigate: (route) => {
      element.replaceChildren(SCREENS[route](context));
      element.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    },
  };
  context.navigate('main');
  return { element };
}
