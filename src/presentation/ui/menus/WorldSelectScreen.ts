import type { WorldMeta } from '../../../domain/entities/World';
import { button, el, errorMessage } from '../dom';
import type { MenuContext } from './MenuContext';

const DATE_FORMAT = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' });

export function renderWorldSelectScreen(context: MenuContext): HTMLElement {
  const list = el('ul', { class: 'world-list' });
  const status = el('p', { class: 'status', attrs: { role: 'alert' } });
  const fail = (error: unknown): void => {
    status.textContent = errorMessage(error);
  };

  const refresh = (): void => {
    context.catalog
      .list()
      .then((worlds) => {
        list.replaceChildren(
          ...(worlds.length === 0
            ? [el('li', { class: 'hint', text: 'Todavía no has creado ningún mundo.' })]
            : worlds.map((world) => renderWorldRow(world, context, refresh, fail))),
        );
      })
      .catch(fail);
  };
  refresh();

  return el('div', { class: 'panel panel-wide' }, [
    el('h2', { text: 'Seleccionar mundo' }),
    list,
    status,
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

function renderWorldRow(
  world: WorldMeta,
  context: MenuContext,
  refresh: () => void,
  fail: (error: unknown) => void,
): HTMLElement {
  const play = button('Jugar', () => {
    context.catalog
      .open(world.id)
      .then((opened) => {
        context.events.emit('world:play-requested', opened);
      })
      .catch(fail);
  });

  // Borrar es irreversible: el primer clic pide confirmación y el segundo borra.
  let confirming = false;
  const remove = button(
    'Borrar',
    () => {
      if (!confirming) {
        confirming = true;
        remove.textContent = '¿Seguro?';
        return;
      }
      context.catalog.remove(world.id).then(refresh).catch(fail);
    },
    'btn btn-danger',
  );
  remove.addEventListener('blur', () => {
    confirming = false;
    remove.textContent = 'Borrar';
  });

  return el('li', { class: 'world-row' }, [
    el('div', { class: 'world-info' }, [
      el('strong', { text: world.name }),
      el('span', {
        class: 'hint',
        text: `Semilla ${world.seed.text} · ${formatPlayed(world.playedSeconds)} · ${DATE_FORMAT.format(world.lastPlayedAt)}`,
      }),
    ]),
    play,
    remove,
  ]);
}

/** Tiempo jugado en horas y minutos, como «1 h 05 min» o «12 min». */
export function formatPlayed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0
    ? `${String(hours)} h ${String(rest).padStart(2, '0')} min`
    : `${String(minutes)} min`;
}
