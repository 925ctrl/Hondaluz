# SPEC 02 — Escenas animadas en la guía «Cómo jugar»

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-16
> **Objetivo:** Mostrar en cada diapositiva de «Cómo jugar» una escena corta en pixel art, animada en bucle y hecha con los sprites reales del juego, que ilustra la mecánica que se explica.

## Alcance

**Dentro:**

- Una escena animada por diapositiva, de 2 a 4 fotogramas, encima del texto (orden: título, escena, frases, chips).
- Contenido de cada escena:
  1. Moverse y saltar: el jugador camina sobre hierba y salta.
  2. Minar y construir: un pico rompe un bloque de piedra y después se coloca un bloque.
  3. Inventario y barra rápida: una barra rápida con iconos de objetos en la que la ranura seleccionada avanza.
  4. Fabricar: una mesa de trabajo con madera que se convierte en un pico de madera.
  5. Combate y vida: el jugador golpea con una espada a un `stump`, que parpadea al recibir el golpe.
  6. Noche, antorchas y guardado automático: escena nocturna en la que una antorcha ilumina a su alrededor.
- Las escenas se componen en `PreloadScene` a partir de las texturas que ya genera (tileset, atlas de objetos, jugador, enemigos, luz). El arte sigue teniendo un único origen.
- Cada escena se guarda como una tira horizontal de fotogramas en data URL, en un almacén `HowToPlayScenes`, igual que `ItemIcons`.
- La animación es solo CSS (`steps()` sobre `background-position`): sin timers ni `dispose`.
- Con `prefers-reduced-motion: reduce` se ve el primer fotograma fijo.
- Cada escena lleva un texto alternativo que describe lo que ocurre (`role="img"` y `aria-label`).
- Las escenas se ven igual en la guía abierta desde el menú principal y desde la pausa.
- Si una escena no está en el almacén, la diapositiva se muestra sin ella y sin errores.
- Pruebas e2e de presencia, texto alternativo y movimiento reducido.
- Actualizar `docs/SYSTEMS.md` y `docs/ARCHITECTURE.md` (sección del arte generado e iconos).

**Fuera de alcance (para futuros specs):**

- Archivos de imagen estáticos (PNG, capturas) en `public/`.
- Escenas interactivas o que reaccionan a las teclas pulsadas.
- Animaciones con JavaScript (timers, `requestAnimationFrame`) o más de 4 fotogramas.
- Control para pausar la animación dentro de la guía (más allá de `prefers-reduced-motion`).
- Imágenes en otras pantallas (créditos, opciones, selección de mundo).
- Cambiar el texto o el número de diapositivas de SPEC 01.

## Modelo de datos

No hay datos persistidos ni cambios en el dominio. Todo vive en la capa de presentación.

```ts
// src/presentation/ui/HowToPlayScenes.ts
export type HowToPlaySceneId = 'move' | 'mine' | 'hotbar' | 'craft' | 'combat' | 'night';

export interface HowToPlaySceneStrip {
  /** Tira horizontal de fotogramas, como data URL. */
  readonly url: string;
  /** Número de fotogramas de la tira (2–4). */
  readonly frames: number;
}

/** Escenas de la guía como imágenes para la interfaz HTML. Las genera la precarga. */
export class HowToPlayScenes {
  set(id: HowToPlaySceneId, strip: HowToPlaySceneStrip): void;
  get(id: HowToPlaySceneId): HowToPlaySceneStrip | undefined;
}
```

Cambios en `HowToPlaySlide` (`src/presentation/ui/menus/howToPlaySlides.ts`):

```ts
export interface HowToPlaySlide {
  readonly title: string;
  readonly lines: readonly string[];
  readonly keys: readonly HowToPlayKey[];
  /** Escena que ilustra la diapositiva. */
  readonly scene: HowToPlaySceneId;
  /** Texto alternativo de la escena, p. ej. 'El personaje camina sobre la hierba y salta.' */
  readonly sceneAlt: string;
}
```

Convenciones de las escenas:

- Tamaño nativo de cada fotograma: 96 × 48 px (6 × 3 bloques de 16 px).
- Se muestran escaladas ×3 con `image-rendering: pixelated`.
- Duración: 300 ms por fotograma.
- `HowToPlayGuideDeps` gana `scenes: HowToPlayScenes`; `MenuContext`, `DomGameUi` y `createPauseMenu` lo reciben y lo pasan.

## Plan de implementación

1. Crear `src/presentation/ui/HowToPlayScenes.ts` con el tipo `HowToPlaySceneId`, `HowToPlaySceneStrip` y el almacén. Instanciarlo en `src/game.ts` y añadirlo a `SceneDeps`.
2. Añadir `scene` y `sceneAlt` a las seis diapositivas de `howToPlaySlides.ts`, en el orden del alcance.
3. Crear `src/presentation/display/howToPlayScenes.ts` con `generateHowToPlayScenes(textures, content, scenes)`. Compone cada tira en un canvas leyendo las texturas ya generadas y la guarda con `toDataURL()`. Empezar por la escena `move`.
4. Completar las escenas `mine`, `hotbar` y `craft`.
5. Completar las escenas `combat` y `night`.
6. Llamar a `generateHowToPlayScenes` en `PreloadScene.create`, después de generar tileset, objetos, jugador, enemigos y luz.
7. En `HowToPlayGuide.ts`, `renderSlide` añade tras el título un `div.slide-scene` con `role="img"`, `aria-label` = `sceneAlt`, la tira como `background-image` y `--frames` como propiedad CSS. Si `scenes.get` devuelve `undefined`, no se añade.
8. Pasar `scenes` por `MenuContext`/`MenuView`, `DomGameUi` y `createPauseMenu`.
9. Añadir en `src/styles/ui.css` los estilos de `.slide-scene`: tamaño ×3, `image-rendering: pixelated`, `@keyframes` con `steps(var(--frames))`, y `animation: none` bajo `@media (prefers-reduced-motion: reduce)`.
10. Ampliar `tests/e2e/how-to-play.spec.ts` y añadir una prueba unitaria de `HowToPlayScenes` (ver criterios).
11. Actualizar `docs/SYSTEMS.md` (la guía usa `HowToPlayScenes`) y `docs/ARCHITECTURE.md` (las escenas de la guía salen de las mismas texturas, como los iconos).

## Criterios de aceptación

- [ ] Las seis diapositivas, abiertas desde el menú principal, muestran un elemento `.slide-scene` entre el título y las frases.
- [ ] Cada `.slide-scene` tiene `role="img"` y un `aria-label` no vacío y distinto en cada diapositiva.
- [ ] El `background-image` de cada `.slide-scene` es una data URL `data:image/png`.
- [ ] El valor de `--frames` de cada escena está entre 2 y 4.
- [ ] Sin movimiento reducido, `.slide-scene` tiene una animación activa (`animation-name` distinto de `none`).
- [ ] Con `prefers-reduced-motion: reduce` emulado, `animation-name` de `.slide-scene` es `none`.
- [ ] Desde el menú de pausa, la guía también muestra la escena en la diapositiva 1.
- [ ] La escena se ve nítida: `image-rendering` de `.slide-scene` es `pixelated`.
- [ ] Si una escena falta en `HowToPlayScenes`, la diapositiva se renderiza sin `.slide-scene` y sin errores (prueba unitaria o de integración del render).
- [ ] La navegación de SPEC 01 (botones, flechas, puntos, «Terminar», «Volver») sigue pasando sus pruebas e2e.
- [ ] No hay errores en consola durante ninguno de estos flujos.
- [ ] `npm run check` pasa.

## Decisiones

- **Sí:** escenas de pixel art compuestas con los sprites reales. Coherente con el juego y con un único origen del arte.
- **No:** PNG o capturas en `public/`. Rompen el «arte generado por código» y se desactualizan.
- **No:** solo iconos de `ItemIcons`. «Moverse y saltar» no tiene objeto que mostrar.
- **Sí:** animación corta en bucle (2–4 fotogramas). Más visual que una imagen fija, con coste contenido.
- **Sí:** composición en `PreloadScene` y almacén `HowToPlayScenes`, como `ItemIcons`. Las texturas de bloques y del jugador solo existen allí; la guía no conoce Phaser.
- **No:** que la guía dibuje sola desde los datos de sprites. Exige exportar los sprites del jugador y no tiene acceso a los bloques procedurales.
- **Sí:** animación solo con CSS `steps()`. Sin timers que limpiar; encaja con la decisión de SPEC 01 de no tener `dispose`.
- **No:** animación con JavaScript. Necesitaría pararla al cerrar la guía.
- **Sí:** primer fotograma fijo con `prefers-reduced-motion: reduce`. Accesibilidad sin un control nuevo.
- **Sí:** escena encima del texto. Funciona igual en pantallas estrechas y táctiles.
- **Sí:** texto alternativo descriptivo por escena. La escena aporta información, no es decoración.
- **Sí:** misma guía con escenas en menú principal y pausa. Una sola implementación.
- **Sí:** si falta una escena, se omite. La guía sigue siendo útil solo con texto.
- **Sí (por defecto, revisable):** fotogramas de 96 × 48 px, escala ×3 y 300 ms. Valores elegidos al redactar; ajustar al revisar si no encajan en el panel.

## Riesgos

| Riesgo                                                            | Mitigación                                                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Las escenas ensanchan el panel o desbordan en pantallas pequeñas  | `max-width: 100%` en `.slide-scene` con proporción fija; la prueba táctil existente revisa el diseño móvil. |
| `steps(var(--frames))` no se resuelve en algún navegador          | Fijar la animación por número de fotogramas con clases (`.frames-2`…`.frames-4`) si la prueba e2e falla.    |
| Componer seis tiras alarga la precarga                            | Son 6 canvas pequeños (≤ 384 × 48 px); medir con `performance.spec.ts`, que ya existe.                      |
| Un cambio en los sprites deja una escena incoherente con el texto | Las escenas leen las texturas en uso; el texto alternativo describe la acción, no el aspecto exacto.        |

## Qué **no** entra en este spec

- Imágenes estáticas o capturas en `public/`.
- Escenas interactivas o que reaccionan a la entrada.
- Animaciones con JavaScript o de más de 4 fotogramas.
- Botón para pausar la animación.
- Imágenes en otras pantallas del menú.
- Cambios en el texto o el número de diapositivas.

Cada uno de esos, si llega, va en su propio spec.
