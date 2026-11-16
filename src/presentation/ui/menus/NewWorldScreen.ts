import { DEFAULT_WORLD_NAME, WORLD_NAME_MAX_LENGTH } from '../../../domain/entities/World';
import { SEED_MAX_LENGTH } from '../../../domain/value-objects/Seed';
import { button, el, errorMessage } from '../dom';
import type { MenuContext } from './MenuContext';

export function renderNewWorldScreen(context: MenuContext): HTMLElement {
  const nameInput = el('input', {
    attrs: {
      id: 'world-name',
      type: 'text',
      maxlength: String(WORLD_NAME_MAX_LENGTH),
      placeholder: DEFAULT_WORLD_NAME,
      autocomplete: 'off',
      'data-autofocus': '',
    },
  });
  const seedInput = el('input', {
    attrs: {
      id: 'world-seed',
      type: 'text',
      maxlength: String(SEED_MAX_LENGTH),
      placeholder: 'Aleatoria si se deja vacía',
      autocomplete: 'off',
    },
  });
  const status = el('p', { class: 'status', attrs: { role: 'alert' } });
  const submit = el('button', { class: 'btn', text: 'Crear mundo', attrs: { type: 'submit' } });

  const form = el('form', { class: 'panel' }, [
    el('h2', { text: 'Nueva partida' }),
    el('label', { text: 'Nombre del mundo', attrs: { for: 'world-name' } }),
    nameInput,
    el('label', { text: 'Semilla', attrs: { for: 'world-seed' } }),
    seedInput,
    el('p', {
      class: 'hint',
      text: 'La misma semilla genera siempre el mismo mundo.',
    }),
    status,
    el('div', { class: 'row' }, [
      button(
        'Volver',
        () => {
          context.navigate('main');
        },
        'btn btn-secondary',
      ),
      submit,
    ]),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit.disabled = true;
    context.catalog
      .create({ name: nameInput.value, seed: seedInput.value })
      .then((world) => {
        context.events.emit('world:play-requested', { world });
      })
      .catch((error: unknown) => {
        status.textContent = errorMessage(error);
        submit.disabled = false;
      });
  });
  return form;
}
