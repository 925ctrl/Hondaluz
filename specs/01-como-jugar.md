# SPEC 01 — Guía «Cómo jugar» en diapositivas

> **Estado:** Implementado
> **Depende de:** Ninguna
> **Fecha:** 2026-11-15
> **Objetivo:** Añadir una guía «Cómo jugar» de seis diapositivas navegables, accesible desde el menú principal y desde el menú de pausa, que muestra las teclas que el jugador tiene asignadas.

## Alcance

**Dentro:**

- Botón «Cómo jugar» en el menú principal, entre «Seleccionar mundo» y «Opciones».
- Botón «Cómo jugar» en el menú de pausa, entre «Reanudar» y «Salir al menú».
- Seis diapositivas fijas sobre las mecánicas del MVP:
  1. Moverse y saltar (incluye una línea sobre los botones táctiles).
  2. Minar y construir.
  3. Inventario y barra rápida.
  4. Fabricar (recetas y estaciones como la mesa de trabajo).
  5. Combate y vida.
  6. Noche, antorchas y guardado automático.
- Cada diapositiva tiene título, de dos a cuatro frases cortas y las teclas relevantes como «chips» visuales hechos solo con CSS.
- Las teclas mostradas son las que el jugador tiene asignadas en ese momento (`SettingsStore`), formateadas con `formatInputCode`.
- Navegación: botones «Anterior» y «Siguiente», flechas izquierda/derecha del teclado y un punto clicable por diapositiva.
- Indicador de posición «N / 6» y punto activo marcado con `aria-current="step"`.
- Sin bucle: «Anterior» está desactivado en la diapositiva 1; en la 6, «Siguiente» se sustituye por «Terminar».
- «Volver» siempre visible; «Volver» y «Terminar» regresan al menú de origen (menú principal o panel de pausa).
- La guía siempre empieza en la diapositiva 1.
- En pausa, la guía se muestra dentro del mismo overlay de pausa; el juego sigue pausado mientras se lee.
- Pruebas e2e del flujo desde el menú principal y desde la pausa.
- Actualizar `docs/SYSTEMS.md` (tabla de pantallas) y `docs/ROADMAP.md` (lista del menú principal y tabla de pruebas e2e).

**Fuera de alcance (para futuros specs):**

- Mini-demos jugables o práctica interactiva dentro de la diapositiva.
- Iluminar la tecla cuando el jugador la pulsa.
- Iconos o imágenes del juego en las diapositivas (`ItemIcons`).
- Mostrar la guía automáticamente la primera vez, o recordar si ya se vio.
- Recordar la última diapositiva vista.
- Diapositiva dedicada a controles táctiles y gesto de deslizar para cambiar de diapositiva.
- Que ESC cierre solo la guía sin reanudar la partida.
- Contenido detallado por bioma, criatura, agua o arena.

## Modelo de datos

No hay datos persistidos ni cambios en el dominio. Se añade una tabla de contenido en la capa de presentación:

```ts
// src/presentation/ui/menus/howToPlaySlides.ts
import type { GameAction } from '../../../config/controls.config';

export interface HowToPlayKey {
  /** Acción reasignable: se muestra la tecla que el jugador tiene en uso. */
  readonly action?: GameAction;
  /** Entrada fija no reasignable, ya en texto (p. ej. '1-9', 'Rueda del ratón'). */
  readonly fixed?: string;
  /** Qué hace, p. ej. 'Saltar'. */
  readonly label: string;
}

export interface HowToPlaySlide {
  readonly title: string;
  readonly lines: readonly string[]; // 2–4 frases cortas
  readonly keys: readonly HowToPlayKey[];
}

export const HOW_TO_PLAY_SLIDES: readonly HowToPlaySlide[] = [/* 6 diapositivas */];
```

Cada `HowToPlayKey` tiene exactamente uno de `action` o `fixed`.

Cambios de tipos existentes:

```ts
// src/presentation/ui/menus/MenuContext.ts
export type MenuRoute =
  'main' | 'new-world' | 'select-world' | 'options' | 'credits' | 'how-to-play';
```

`createPauseMenu(events)` pasa a `createPauseMenu(events, settings)` para que la guía pueda leer las teclas.

## Plan de implementación

1. Crear `src/presentation/ui/menus/howToPlaySlides.ts` con los tipos y las seis diapositivas. Asignación de teclas:
   - 1: `moveLeft`, `moveRight`, `jump`.
   - 2: `primaryUse` (mantener para minar), `secondaryUse` (colocar).
   - 3: `inventory`, fijo `1-9`, fijo `Rueda del ratón`.
   - 4: `inventory` (la lista de recetas está junto al inventario).
   - 5: `primaryUse` (atacar o usar consumible).
   - 6: `pause` (pausar también guarda).
2. Crear `src/presentation/ui/menus/HowToPlayGuide.ts` con `renderHowToPlayGuide({ settings, onClose }): HTMLElement`.
   - Estado local: índice de la diapositiva actual.
   - Renderiza título, frases, chips de teclas, puntos, indicador «N / 6» y los botones.
   - Las teclas de cada `action` salen de `settings.codesFor(action).map(formatInputCode)`.
   - El listener de flechas va en el propio elemento raíz de la guía, no en `document`, para no necesitar `dispose`.
   - Contenedor con `role="region"` y `aria-label="Cómo jugar"`; el texto de la diapositiva en una zona `aria-live="polite"`.
   - «Siguiente» (o «Terminar») lleva `data-autofocus`; tras cambiar de diapositiva el foco se mantiene en el botón usado.
3. Añadir estilos en `src/styles/ui.css`: chips de tecla, puntos de progreso y punto activo. Reutilizar `.panel`, `.btn` y `.btn-secondary`.
4. Añadir la ruta `'how-to-play'` en `MenuContext.ts` y en `SCREENS` de `MenuView.ts`, que llama a `renderHowToPlayGuide` con `onClose: () => context.navigate('main')` dentro de un `.panel`.
5. Añadir el botón «Cómo jugar» en `MainMenuScreen.ts`, entre «Seleccionar mundo» y «Opciones».
6. Cambiar `PauseMenu.ts`: recibe `settings`, añade el botón «Cómo jugar», y al pulsarlo sustituye el contenido del panel de pausa por la guía. `onClose` restaura el contenido de pausa y devuelve el foco a «Reanudar». Actualizar la llamada en `DomGameUi.ts`.
7. Añadir pruebas e2e en `tests/e2e/how-to-play.spec.ts` (ver criterios de aceptación).
8. Actualizar `docs/SYSTEMS.md` (fila «Cómo jugar» → `ui/menus/HowToPlayGuide.ts`) y `docs/ROADMAP.md` (mencionar «cómo jugar» en el menú principal y la nueva spec e2e en la tabla de pruebas).

## Criterios de aceptación

- [ ] El menú principal muestra el botón «Cómo jugar» entre «Seleccionar mundo» y «Opciones».
- [ ] Al pulsarlo se ve la diapositiva 1 con el indicador «1 / 6».
- [ ] En la diapositiva 1 «Anterior» está desactivado.
- [ ] «Siguiente» avanza una diapositiva y «Anterior» retrocede una.
- [ ] Las flechas derecha e izquierda del teclado avanzan y retroceden igual que los botones.
- [ ] Pulsar el punto N muestra la diapositiva N, y ese punto tiene `aria-current="step"`.
- [ ] En la diapositiva 6 no hay botón «Siguiente» y sí hay botón «Terminar».
- [ ] La flecha derecha en la diapositiva 6 no hace nada.
- [ ] «Terminar» y «Volver» desde el menú principal regresan al menú principal.
- [ ] Volver a abrir la guía muestra de nuevo la diapositiva 1.
- [ ] Con los controles por defecto, la diapositiva 1 muestra «A», «D» y «Espacio».
- [ ] Tras reasignar «Saltar» a W en Opciones, la diapositiva 1 muestra «W» y no «Espacio».
- [ ] La diapositiva 1 contiene una frase sobre los botones táctiles.
- [ ] Las seis diapositivas tienen los títulos del alcance, en ese orden.
- [ ] En partida, el menú de pausa muestra «Cómo jugar» entre «Reanudar» y «Salir al menú».
- [ ] Desde la pausa, «Volver» y «Terminar» regresan al panel de pausa con el foco en «Reanudar».
- [ ] Con la guía abierta en pausa, el juego sigue pausado.
- [ ] Con la guía abierta en pausa, ESC reanuda la partida y oculta el overlay.
- [ ] No hay errores en consola durante ninguno de estos flujos.
- [ ] `npm run check` pasa.

## Decisiones

- **Sí:** solo navegación (botones, flechas, puntos). Cubre «interactivo» con coste bajo.
- **No:** mini-demos jugables ni teclas que se iluminan al pulsarlas. Más coste y acoplamiento con la entrada; otro spec si llega.
- **Sí:** seis diapositivas, una por mecánica del MVP. Equilibrio entre cobertura y mantenimiento.
- **No:** una diapositiva por sistema (biomas, agua, criaturas). Demasiado texto que mantener.
- **Sí:** teclas leídas de `SettingsStore`. Si el jugador reasigna, la guía no miente; ya existen `codesFor` y `formatInputCode`.
- **No:** teclas de `DEFAULT_CONTROLS`. Más simple pero incorrecto tras reasignar.
- **Sí:** accesible desde menú principal y pausa. El jugador la necesita sobre todo en partida.
- **No:** mostrarla automáticamente la primera vez ni persistir nada. Evita añadir campos a `Settings` y su versionado.
- **Sí:** en pausa, la guía sustituye el contenido del panel de pausa. Reutiliza el overlay y no toca `GameUi` ni `WorldScene`.
- **No:** que ESC cierre solo la guía. Exigiría interceptar ESC antes que `WorldScene`; ESC sigue reanudando.
- **Sí:** la guía es una función que devuelve `HTMLElement` con `onClose`. Encaja en `SCREENS` de `MenuView` y en `PauseMenu` sin una segunda implementación.
- **Sí:** listener de flechas en el elemento raíz de la guía. Se libera al quitar el elemento, sin `dispose`.
- **Sí:** chips de tecla solo con CSS. Sin iconos para no acoplar el menú a `ItemIcons`.
- **Sí:** sin bucle; «Terminar» en la última. La secuencia tiene un final claro.
- **Sí:** contenido en `howToPlaySlides.ts` dentro de `presentation`. Es texto de interfaz, no contenido de juego; `content/` está reservado a definiciones del dominio.
- **Sí:** una línea sobre táctil en la diapositiva 1. Sin diapositiva propia ni gesto de deslizar.

## Riesgos

| Riesgo                                                                 | Mitigación                                                                                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| El teclado de Phaser captura las flechas durante la pausa              | La escena está pausada; si aun así se capturan, la prueba e2e de flechas en pausa lo detecta.                                                 |
| Una acción reasignada sin teclas (`codesFor` vacío) deja el chip vacío | Mostrar «Sin asignar» cuando no hay códigos.                                                                                                  |
| El texto de las diapositivas se desincroniza al cambiar mecánicas      | Las teclas salen de `SettingsStore`; el texto solo describe mecánicas, no teclas literales.                                                   |
| El foco se pierde al rehacer la diapositiva                            | Re-renderizar solo la zona de contenido y mantener los botones; la prueba e2e comprueba que las flechas siguen funcionando tras varios pasos. |

## Qué **no** entra en este spec

- Mini-demos o práctica jugable.
- Teclas que se iluminan al pulsarlas.
- Iconos o imágenes del juego.
- Mostrar la guía la primera vez o recordar la última diapositiva.
- Diapositiva táctil y gesto de deslizar.
- ESC que cierre solo la guía.

Cada uno de esos, si llega, va en su propio spec.
