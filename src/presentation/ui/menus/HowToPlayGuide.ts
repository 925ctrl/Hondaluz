import type { SettingsStore } from '../../../application/use-cases/settings/SettingsStore';
import { formatInputCode } from '../../input/formatInputCode';
import { button, el } from '../dom';
import { HOW_TO_PLAY_SLIDES, type HowToPlayKey, type HowToPlaySlide } from './howToPlaySlides';

export interface HowToPlayGuideDeps {
  readonly settings: SettingsStore;
  /** Vuelve al menú desde el que se abrió la guía. */
  readonly onClose: () => void;
}

/**
 * Guía «Cómo jugar» en diapositivas. Siempre empieza en la primera. Solo se rehace la zona
 * de contenido al cambiar de diapositiva, para que el foco siga en el control usado.
 */
export function renderHowToPlayGuide({ settings, onClose }: HowToPlayGuideDeps): HTMLElement {
  const total = HOW_TO_PLAY_SLIDES.length;
  let index = 0;

  const content = el('div', { class: 'slide', attrs: { 'aria-live': 'polite' } });
  const position = el('p', { class: 'slide-position' });
  const dots = HOW_TO_PLAY_SLIDES.map((slide, dotIndex) => {
    const dot = button(
      '',
      () => {
        show(dotIndex);
      },
      'slide-dot',
    );
    dot.setAttribute('aria-label', `Diapositiva ${String(dotIndex + 1)}: ${slide.title}`);
    return dot;
  });

  const previous = button(
    'Anterior',
    () => {
      show(index - 1);
    },
    'btn btn-secondary',
  );
  const next = button('Siguiente', () => {
    if (index === total - 1) onClose();
    else show(index + 1);
  });
  next.setAttribute('data-autofocus', '');

  const root = el(
    'div',
    { class: 'how-to-play', attrs: { role: 'region', 'aria-label': 'Cómo jugar' } },
    [
      el('h2', { text: 'Cómo jugar' }),
      content,
      position,
      el('div', { class: 'slide-dots' }, dots),
      el('div', { class: 'row' }, [previous, next, button('Volver', onClose, 'btn btn-secondary')]),
    ],
  );

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(index - 1);
    }
  });

  function show(target: number): void {
    const slide = HOW_TO_PLAY_SLIDES[target];
    if (!slide) return;
    index = target;
    content.replaceChildren(...renderSlide(slide, settings));
    position.textContent = `${String(index + 1)} / ${String(total)}`;
    dots.forEach((dot, dotIndex) => {
      if (dotIndex === index) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    previous.disabled = index === 0;
    next.textContent = index === total - 1 ? 'Terminar' : 'Siguiente';
  }

  show(0);
  return root;
}

function renderSlide(slide: HowToPlaySlide, settings: SettingsStore): HTMLElement[] {
  return [
    el('h3', { text: slide.title }),
    ...slide.lines.map((line) => el('p', { text: line })),
    el(
      'ul',
      { class: 'slide-keys' },
      slide.keys.map((key) =>
        el('li', {}, [
          ...keyLabels(key, settings).map((label) => el('kbd', { class: 'key-chip', text: label })),
          el('span', { text: key.label }),
        ]),
      ),
    ),
  ];
}

/** Lo que se ve en los chips: las teclas en uso de la acción, o la entrada fija. */
function keyLabels(key: HowToPlayKey, settings: SettingsStore): string[] {
  if (key.fixed !== undefined) return [key.fixed];
  const codes = settings.codesFor(key.action);
  return codes.length > 0 ? codes.map(formatInputCode) : ['Sin asignar'];
}
