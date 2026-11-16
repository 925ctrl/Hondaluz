/** Una pantalla o panel montado en la interfaz. `dispose` libera sus listeners globales. */
export interface View {
  readonly element: HTMLElement;
  dispose?(): void;
}

interface ElementOptions {
  readonly class?: string;
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.class !== undefined) element.className = options.class;
  if (options.text !== undefined) element.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    element.setAttribute(name, value);
  }
  element.append(...children);
  return element;
}

export function button(label: string, onClick: () => void, className = 'btn'): HTMLButtonElement {
  const element = el('button', { class: className, text: label, attrs: { type: 'button' } });
  element.addEventListener('click', onClick);
  return element;
}

/** Texto apto para mostrar al jugador a partir de un error cualquiera. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.';
}
