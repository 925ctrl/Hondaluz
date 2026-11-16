import type { GameEventBus } from '../../../application/events/GameEvents';
import type { GameContent } from '../../../domain/catalog/GameContent';
import type { WorldSession } from '../../../application/use-cases/world/WorldSession';
import type { SettingsStore } from '../../../application/use-cases/settings/SettingsStore';
import { HOTBAR_SLOT_CODES, type GameAction } from '../../../config/controls.config';
import type { VirtualControls } from '../../input/TouchInput';
import { formatInputCode } from '../../input/formatInputCode';
import { createCraftingPanel } from '../crafting/CraftingPanel';
import { el, type View } from '../dom';
import { createInventoryPanel } from '../inventory/InventoryPanel';
import type { SlotContext } from '../inventory/slotElement';
import { createHotbar } from './Hotbar';
import { createTouchControls } from './TouchControls';
import type { DayPhase } from '../../../domain/world/WorldClock';
import { button } from '../dom';

const PHASE_LABELS: Readonly<Record<DayPhase, string>> = {
  dawn: 'Amanecer',
  day: 'De día',
  dusk: 'Atardecer',
  night: 'Noche',
};
/** Por debajo de esta fracción de vida la barra avisa del peligro. */
const LOW_HEALTH = 0.3;

/** Tiempo que permanece visible un aviso. */
const HINT_SECONDS = 2.5;

export interface WorldHudDeps extends SlotContext {
  readonly content: GameContent;
  readonly session: WorldSession;
  readonly events: GameEventBus;
  readonly settings: SettingsStore;
  readonly touch: VirtualControls;
}

/**
 * Interfaz de la partida: datos del mundo, barra rápida e inventario. Mientras está montada
 * atiende las teclas de interfaz (pausa, inventario y selección de ranura).
 */
export function createWorldHud(deps: WorldHudDeps): View {
  const { session, events, settings } = deps;
  const { inventory, meta } = session;
  const keyOf = (action: GameAction): string => formatInputCode(settings.codesFor(action)[0] ?? '');

  const position = el('span', { attrs: { 'data-testid': 'hud-position' } });
  const biome = el('span', { attrs: { 'data-testid': 'hud-biome' } });
  const hotbar = createHotbar(inventory, deps);
  const panel = createInventoryPanel(inventory, deps, () => {
    setInventoryOpen(false);
  });
  const crafting = createCraftingPanel(session, deps);
  const hint = el('p', { class: 'hud-hint', attrs: { role: 'status', 'data-testid': 'hud-hint' } });
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  const panelLayer = el('div', { class: 'hud-layer' }, [
    el('div', { class: 'hud-panels' }, [panel.element, crafting.element]),
  ]);
  panelLayer.hidden = true;

  const clock = el('span', { attrs: { 'data-testid': 'hud-clock' } });
  const vitals = createHealthBar();
  const death = createDeathScreen(() => {
    death.hidden = true;
    events.emit('player:respawn-requested');
  });

  const element = el('div', { class: 'hud', attrs: { 'data-testid': 'world-hud' } }, [
    el('div', { class: 'hud-tag' }, [
      el('strong', { text: meta.name }),
      el('span', { text: `Semilla ${meta.seed.text}` }),
      position,
      biome,
      clock,
    ]),
    vitals.element,
    el('div', { class: 'hud-tag hud-right' }, [
      el('span', { text: `${keyOf('inventory')} · Inventario` }),
      el('span', { text: `${keyOf('pause')} · Pausa` }),
    ]),
    createTouchControls(deps.touch, {
      inventory: () => {
        setInventoryOpen(panelLayer.hidden);
      },
      pause: () => {
        if (panelLayer.hidden) events.emit('game:pause-toggle-requested');
        else setInventoryOpen(false);
      },
    }),
    hint,
    hotbar.element,
    panelLayer,
    death,
  ]);

  function setInventoryOpen(open: boolean): void {
    panelLayer.hidden = !open;
    if (open) renderPanels();
  }

  function renderPanels(): void {
    panel.render();
    crafting.render();
  }

  const subscriptions = [
    events.on('player:biome-changed', ({ name }) => {
      biome.textContent = name;
    }),
    events.on('player:tile-changed', ({ x, y }) => {
      position.dataset.x = String(x);
      position.dataset.y = String(y);
      position.textContent = `X ${String(x)} · Y ${String(y)}`;
      // Al moverse cambian las estaciones cercanas y, con ellas, lo que se puede fabricar.
      if (!panelLayer.hidden) crafting.render();
    }),
    events.on('hud:hint', ({ text }) => {
      hint.textContent = text;
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => {
        hint.textContent = '';
      }, HINT_SECONDS * 1000);
    }),
    events.on('player:health-changed', ({ current, max }) => {
      vitals.set(current, max);
    }),
    events.on('clock:changed', ({ day, hour, phase }) => {
      clock.dataset.phase = phase;
      clock.textContent = `Día ${String(day)} · ${String(hour).padStart(2, '0')}:00 · ${PHASE_LABELS[phase]}`;
    }),
    events.on('player:died', () => {
      setInventoryOpen(false);
      death.hidden = false;
      death.querySelector('button')?.focus();
    }),
    events.on('inventory:changed', () => {
      hotbar.render();
      if (!panelLayer.hidden) renderPanels();
    }),
  ];

  const abort = new AbortController();
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.repeat) return;
      const slot = HOTBAR_SLOT_CODES.indexOf(event.code);
      if (slot >= 0) {
        inventory.select(slot);
      } else if (settings.codesFor('inventory').includes(event.code)) {
        setInventoryOpen(panelLayer.hidden);
      } else if (settings.codesFor('pause').includes(event.code)) {
        event.preventDefault();
        // La tecla de pausa cierra primero el inventario si está abierto.
        if (panelLayer.hidden) events.emit('game:pause-toggle-requested');
        else setInventoryOpen(false);
      }
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    'wheel',
    (event) => {
      if (!panelLayer.hidden || event.deltaY === 0) return;
      const count = inventory.hotbarSize;
      inventory.select((inventory.selectedIndex + Math.sign(event.deltaY) + count) % count);
    },
    { signal: abort.signal, passive: true },
  );

  return {
    element,
    dispose: () => {
      subscriptions.forEach((unsubscribe) => {
        unsubscribe();
      });
      abort.abort();
      clearTimeout(hintTimer);
    },
  };
}

function createHealthBar(): { element: HTMLElement; set(current: number, max: number): void } {
  const fill = el('div', { class: 'health-fill' });
  const label = el('span', { class: 'health-label' });
  const element = el(
    'div',
    { class: 'health', attrs: { 'data-testid': 'health', role: 'meter', 'aria-label': 'Vida' } },
    [el('div', { class: 'health-track' }, [fill]), label],
  );
  return {
    element,
    set: (current, max) => {
      const ratio = max > 0 ? current / max : 0;
      fill.style.width = `${String(Math.round(ratio * 100))}%`;
      element.classList.toggle('low', ratio <= LOW_HEALTH);
      element.dataset.current = String(current);
      element.setAttribute('aria-valuemin', '0');
      element.setAttribute('aria-valuemax', String(max));
      element.setAttribute('aria-valuenow', String(current));
      label.textContent = `${String(current)} / ${String(max)}`;
    },
  };
}

function createDeathScreen(onRespawn: () => void): HTMLElement {
  const screen = el('div', { class: 'overlay death' }, [
    el('div', { class: 'panel', attrs: { role: 'dialog', 'aria-label': 'Has caído' } }, [
      el('h2', { text: 'Has caído' }),
      el('p', { text: 'Vuelves al punto de partida. Conservas tus objetos.' }),
      el('div', { class: 'menu-actions' }, [button('Reaparecer', onRespawn)]),
    ]),
  ]);
  screen.hidden = true;
  return screen;
}
