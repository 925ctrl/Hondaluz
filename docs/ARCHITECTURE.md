# Arquitectura

Este documento describe el código que existe. Lo que aún no está implementado aparece marcado
como **previsto**, con la fase en la que llegará.

## Capas

```text
src/
├── main.ts            Punto de entrada: estilos, contenedores y arranque
├── game.ts            Raíz de composición: construye y conecta todas las dependencias
├── config/            Constantes: pantalla, controles, mundo, jugador, persistencia
├── core/              Utilidades sin dependencias: EventBus, Registry, errores, PRNG
├── domain/            Reglas del juego: mundo por chunks, física, jugador, repositorios
├── application/       Casos de uso, sesión de mundo, bucle de paso fijo y eventos
├── infrastructure/    IndexedDB, serializadores y generación procedural
├── presentation/      Phaser (escenas, sistemas, vistas, texturas) e interfaz DOM
├── bootstrap/         Montaje de dependencias reutilizable sin Phaser (parte de la raíz de composición)
├── content/           Definiciones de contenido: bloques, objetos, recetas y dibujos
└── styles/            CSS de la interfaz
```

### Regla de dependencias

Las dependencias solo apuntan hacia dentro:

```text
presentation ──▶ application ──▶ domain ──▶ core
infrastructure ───────────────▶ domain ──▶ core
content ──────────────────────▶ domain ──▶ core
```

- `core`, `domain` y `application` no importan Phaser ni tocan el DOM.
- `infrastructure` no importa `presentation`.
- `config` no importa nada y puede usarse desde cualquier capa.
- `content` solo conoce los tipos de definición del dominio; el dominio no conoce `content`.
- Solo `game.ts` y `bootstrap/` conocen a la vez infraestructura y el resto de capas.

La regla se comprueba automáticamente con `no-restricted-imports` en `eslint.config.js`, de
modo que una importación prohibida hace fallar `npm run lint`.

## Contratos actuales

| Contrato                                            | Ubicación                              | Papel                                                                           |
| --------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| `EventBus<E>`                                       | `core/events`                          | Bus tipado; cada suscripción devuelve su función de baja                        |
| `GameEvents`                                        | `application/events`                   | Eventos entre interfaz y escenas                                                |
| `WorldMeta`, `Seed`                                 | `domain`                               | Identidad de un mundo y su semilla                                              |
| `WorldRepository`                                   | `domain/repositories`                  | Puerto de persistencia de mundos                                                |
| `WorldSaveRepository`, `WorldSave`                  | `domain/repositories`                  | Puerto del guardado de partidas: estado y chunks cambiados                      |
| `WorldSaver`                                        | `application/use-cases/world`          | Guarda en segundo plano, cada cierto tiempo y cuando se le pide                 |
| `WorldCatalog`                                      | `application/use-cases/world`          | Crear, listar, abrir y borrar mundos                                            |
| `GameUi`                                            | `presentation/ui`                      | Lo único que las escenas saben de la interfaz                                   |
| `SceneDeps`                                         | `presentation/scenes`                  | Dependencias inyectadas en las escenas                                          |
| `RandomSource`                                      | `core/utils`                           | Firma única de aleatoriedad determinista                                        |
| `Registry<T>`                                       | `core/registry`                        | Contenido por id estable, validado al arrancar                                  |
| `BlockDefinition`                                   | `domain/world`                         | Datos de un bloque, incluido su aspecto                                         |
| `WorldGenerator`                                    | `domain/world`                         | Genera un chunk a partir de sus coordenadas                                     |
| `WorldMap` / `TileQuery`                            | `domain/world`                         | Bloques del mundo, avisos de cambio y consulta de solidez y líquidos            |
| `Player`, `PlayerIntent`                            | `domain/entities`                      | Reglas de movimiento, independientes de la entrada                              |
| `WorldSession`                                      | `application/use-cases/world`          | Estado vivo de una partida                                                      |
| `InputSource`                                       | `presentation/input`                   | Entrada expresada en acciones del juego (teclado, ratón y tacto)                |
| `HappeningLog`, `Happening`                         | `domain/events`                        | Sucesos del mundo que la presentación cuenta con sonido y partículas            |
| `Settings`, `SettingsStore`                         | `domain/settings`, `application`       | Teclas y volúmenes del jugador, validados y persistidos                         |
| `ItemDefinition`, `RecipeDefinition`, `GameContent` | `domain/items`, `domain/catalog`       | Contenido validado con sus referencias cruzadas                                 |
| `ItemStore`, `HeldItemSource`, `ItemPouch`          | `domain/inventory`                     | Lo único que minería, recogida, construcción y fabricación saben del inventario |
| `Inventory`                                         | `domain/inventory`                     | Ranuras, montones y objeto en la mano                                           |
| `MiningService`, `BlockPlacer`, `CraftingService`   | `application/use-cases`                | Reglas de minar, construir y fabricar                                           |
| `PixelSprite`                                       | `domain/catalog`                       | Dibujo de pixel art como datos, validado al arrancar                            |
| `Health`                                            | `domain/combat`                        | Vida con invulnerabilidad temporal, para jugador y criaturas                    |
| `EnemyDefinition`, `Enemy`, `EnemyRoster`           | `domain/enemies`                       | Criaturas como datos, su estado y su conjunto                                   |
| `EnemyBehavior`                                     | `domain/enemies/behaviors`             | Una IA por archivo, elegida por id desde la definición                          |
| `WorldClock`                                        | `domain/world`                         | Única fuente de la hora y de la luz del día                                     |
| `BiomeDefinition`                                   | `domain/world`                         | Un bioma como datos; se registra sin tocar el generador                         |
| `TileSimulation`                                    | `domain/world`                         | Agua que fluye y arena que cae, solo en los bloques activos                     |
| `LightField`                                        | `domain/world`                         | Luz del cielo y de los bloques en una zona, propagada por la rejilla            |
| `CombatService`, `EnemySpawner`                     | `application/use-cases/combat`         | Ataques, daño, muertes y botín; aparición y retirada de criaturas               |
| `stepWorld`                                         | `application/simulation`               | Orden fijo en que avanza cada paso del mundo                                    |
| `ChunkFeature`                                      | `infrastructure/procedural-generation` | Paso de generación que se suma al terreno base                                  |
| `BiomeLayout`                                       | `infrastructure/procedural-generation` | Reparte los biomas de superficie en franjas y sitúa los de profundidad          |

### Flujo entre interfaz y escenas

La interfaz **pide** mediante eventos y las escenas **ejecutan**:

1. `MainMenuScene` llama a `ui.showMainMenu()`.
2. El jugador crea o elige un mundo; la pantalla usa `WorldCatalog` (que al abrir carga la
   partida guardada) y emite `world:play-requested` con el mundo y su guardado.
3. `MainMenuScene` recibe el evento e inicia `WorldScene`, que restaura la partida.
4. `WorldScene` muestra el HUD; ESC emite `game:pause-toggle-requested` y la escena se pausa.

Las escenas se dan de baja de todos los eventos al cerrarse (`SHUTDOWN`).

## Decisiones

### La interfaz es DOM + CSS, no una escena de Phaser

Menús, HUD, inventario y crafting se construyen con HTML sobre el canvas. Motivos: campos de
texto reales (semilla, nombre), accesibilidad por teclado y lectores de pantalla, y pruebas e2e
que localizan elementos por rol y texto. Por eso no existe una `UIScene`: no tendría nada que
dibujar. Los iconos de objetos (Fase 3) se exportarán desde las mismas texturas del juego para
mantener un solo origen del arte.

### Escalado pixel-perfect con zoom entero

`computePixelViewport` elige un zoom entero según la altura de la ventana y ajusta la
resolución interna para cubrirla, siempre con dimensiones pares. No hay barras negras ni
sprites borrosos; en ventanas más grandes se ve algo más de mundo. La altura objetivo está en
`config/game.config.ts`.

### Arte generado por código

No hay imágenes en `public/assets`. Las texturas se dibujan en `PreloadScene` a partir de datos
y de un PRNG con semilla fija, lo que garantiza arte original y facilita variar paletas. Si en
el futuro se incorporan sprites dibujados a mano, `PreloadScene` es el único punto a cambiar.

### Sin `BootScene`

No hay configuración previa a la carga, así que `PreloadScene` es la primera escena. Se añadirá
una `BootScene` solo cuando haya algo real que hacer antes de precargar.

### Persistencia versionada desde el primer día

- **Estructura** de la base de datos: lista `SCHEMA_MIGRATIONS` en `IndexedDbDatabase.ts`; la
  versión de IndexedDB es la longitud de la lista.
- **Formato** de cada registro: campo `schemaVersion` y lista de migraciones en
  `worldSerializer.ts` (mundos, hoy en la versión 2) y `saveSerializer.ts` (estado y chunks).
  Lo leído del disco se valida como dato no fiable. Un mundo corrupto se omite de la lista con
  un aviso; una partida corrupta impide abrir ese mundo, con el error en el menú, para no
  sobrescribirla empezando de cero.

### Guardado incremental y en segundo plano

`WorldMap` anota los chunks cambiados desde el último guardado. `WorldSaver.save` copia, en
el mismo frame, el estado (`WorldSession.captureState`) y esos chunks, y encadena la escritura
tras la anterior para que los guardados lleguen al disco en orden. Si una escritura falla, sus
chunks vuelven a quedar pendientes y el HUD lo avisa. `IndexedDbWorldSaveRepository` escribe
identidad, estado y chunks en una sola transacción de tres almacenes (`worlds`,
`world_states` y `world_chunks`, con clave `[worldId, chunkKey]`). Al abrir un mundo se cargan
todos sus chunks guardados; como el resto se regenera con la semilla, el guardado crece solo
con lo que el jugador cambia.

### Simulación a paso fijo, separada del dibujo

`FixedStepLoop` avanza la física a 60 pasos por segundo con independencia de los FPS de
pantalla, y la vista interpola entre pasos. Así el movimiento es reproducible (las pruebas
simulan miles de pasos sin navegador) y fluido en pantallas de más de 60 Hz.

### Colisión propia contra la rejilla

No se usa el motor de físicas de Phaser. `moveBox` resuelve la caja del jugador contra los
bloques, eje a eje, consultando solo las celdas que cruza. Evita crear un cuerpo por bloque,
funciona igual en las pruebas y no depende del render.

### Chunks: datos y dibujo separados

- **Datos** (`WorldMap`): un `Uint16Array` por chunk, generado la primera vez que se consulta
  y descartable cuando queda lejos, porque el generador determinista lo reproduce igual.
  Los chunks con bloques cambiados (por el jugador, el agua o la arena) no se descartan.
- **Dibujo** (`ChunkLayer`): una textura de canvas por chunk visible, pintada una sola vez y
  devuelta a una reserva al salir de la vista. Los chunks de cielo vacío no consumen textura.

### Índices de bloque solo en memoria

En memoria, los chunks guardan el índice del bloque en el registro, que depende del orden de
registro. En disco, cada chunk lleva su paleta de ids de bloque y los bloques se refieren a
ella. Así, añadir o reordenar bloques no corrompe partidas antiguas, y un bloque retirado del
juego se carga como aire, con un aviso. Los objetos del inventario se guardan por id; los
desconocidos se descartan al cargar.

### El aspecto de un bloque es un dato

`BlockDefinition.visual` describe colores y textura; `tileTextures.ts` lo convierte en un
atlas con varias variantes por bloque. Un bloque nuevo no necesita tocar código de dibujo.

### El inventario detrás de dos contratos pequeños

`MiningService` y `DroppedItems` solo necesitan guardar objetos (`ItemStore`); `BlockPlacer`
solo necesita saber qué se lleva en la mano y gastarlo (`HeldItemSource`). `Inventory`
implementa ambos, pero ninguno de esos sistemas lo importa. Un cofre o un NPC que entregue
objetos podrán reutilizar las mismas reglas.

### Los casos de uso devuelven resultados; la vista decide qué repintar

`MiningService.update` devuelve el bloque roto y `BlockPlacer.place` el resultado de la
colocación. `InteractionSystem` usa esa respuesta para pedir a `ChunkLayer` que repinte solo
el bloque afectado y sus vecinos. El dominio no emite eventos de dibujo ni conoce la vista.

### Los iconos de la interfaz salen de las texturas del juego

`generateItemAtlas` crea el atlas de objetos para Phaser y entrega cada icono como imagen a
`ItemIcons`, que usa la interfaz HTML. El arte tiene un único origen.

### El ratón solo actúa sobre el mundo si se pulsa en el canvas

`KeyboardMouseInput` escucha los botones en el canvas, no en la ventana, y el HUD deja pasar
el ratón salvo en sus controles. Así un clic en el inventario nunca mina lo que hay detrás.

### Pasos de generación componibles

`TerrainGenerator` genera el terreno base con los bloques de cada bioma y aplica después una
lista de `ChunkFeature`, en este orden: `caves` (túneles, cavernas y bocas), `oreVeins`
(minerales comunes en cualquier roca y vetas propias del bioma), `lakes` y `vegetation`. Cada
paso debe depender solo de la semilla y de coordenadas globales, para que un chunk pueda dibujar
su parte de algo que nace en el chunk vecino (por ejemplo, la copa de un árbol). El borrador
del chunk (`ChunkDraft`) da a cada paso la superficie y el bioma de cualquier bloque.

### La herramienta se deduce de lo que se lleva en la mano

`MiningService` consulta `HeldItemSource` y aplica la regla pura `miningPower`: la potencia de
la herramienta cuenta solo si es del tipo que trabaja el bloque, y el bloque puede exigir un
nivel mínimo. La vista no decide nada: solo muestra un aviso cuando `needsBetterTool` es cierto.

### El arte del contenido viaja con su definición

Bloques y objetos describen su aspecto como datos: colores y grano (`GrainVisual`) o un dibujo
píxel a píxel (`PixelSprite`). Objetos de la misma familia comparten forma y cambian de
paleta (`pickaxeSprite`, `barSprite`), así que un pico nuevo es una línea.

### IA de criaturas: comportamientos como funciones registradas

Cada criatura es una definición de datos (vida, daño, velocidad, detección, zona de aparición,
botín y fotogramas) que nombra su comportamiento. Los comportamientos son funciones sobre la
criatura y un contexto (`walker`, `flyer`, `burrower`), cada una en su archivo, y
`ENEMY_BEHAVIORS` las asocia a su id. No hay una clase de enemigo con todos los casos: una
criatura nueva con un comportamiento existente es solo una definición.

### Un único reloj y un único orden de simulación

`WorldClock` guarda la hora; la duración del día y las fases están solo en
`GAMEPLAY_CONFIG.dayCycle`. `stepWorld` fija el orden de cada paso: agua y arena, objetos
sueltos, criaturas, combate, aparición y reloj. El jugador se mueve antes, con su entrada, en la
presentación. Mientras está caído, la escena deja de avanzar el mundo.

### El clic primario lo decide el objeto de la mano

`CombatService.useHeld` responde `swung`, `consumed`, `busy` o `none`. Solo con `none` la
interacción pasa a minar. Así la presentación no conoce qué objetos son armas o consumibles.

### Los biomas son datos; el generador no los conoce por nombre

`BiomeDefinition` dice dónde aparece un bioma (franja de superficie con un peso, o capa de
profundidad desde una fila), sus bloques (superficie, suelo, roca y lago), su relieve, su
vegetación y sus vetas. `TerrainGenerator` convierte los ids en índices al construirse y
`BiomeLayout` reparte las franjas desde el centro: el bioma de aparición en medio y, a cada
lado, otros elegidos por peso sin repetir el vecino. El relieve se mezcla en los límites para
que la superficie no dé saltos. `createBiomeRegistry` valida las referencias al arrancar.

### Las paredes de fondo se deducen, no se guardan

`WorldGenerator.backgroundAt` devuelve el material que habría en un hueco bajo la superficie
natural (el suelo o la roca del bioma), o aire donde se ve el cielo. `ChunkLayer` lo pinta,
velado, detrás de todo bloque no sólido. No ocupa memoria ni guardado, pero no se puede
editar: no hay capa de paredes que minar o colocar.

### Los cambios de bloques se anuncian

`WorldMap.onTileChange` avisa de cada bloque cambiado, venga del jugador, del agua o de la
arena. `ChunkLayer` acumula los cambios y repinta esos bloques y sus vecinos una vez por frame;
`TileSimulation` despierta los vecinos, y `LightingOverlay` marca la luz para recalcularla.
Nadie tiene que acordarse de avisar a la vista tras minar o construir.

### Agua y arena: bloques activos, sin niveles

`TileSimulation` solo procesa los bloques que han despertado, de abajo arriba, en pasos de
`WORLD_CONFIG.tiles.stepSeconds` y con un máximo por paso. La arena cae a través del aire y se
hunde en los líquidos. El agua cae si tiene aire debajo; si no, se desliza a un lado cuando
allí puede seguir cayendo o cuando la empuja agua desde arriba. Así se conserva, se nivela y
se detiene sin ir y venir. Un bloque guarda solo su índice, así que el agua no tiene niveles
parciales y puede quedar a escalones de un bloque.

### Luz por bloques, recalculada solo cuando cambia algo

`LightField.compute` calcula dos canales sobre una zona: el **cielo** baja sin perderse por
las columnas abiertas y el de **bloques** sale de los que emiten (`BlockDefinition.light`).
Ambos se reparten por niveles perdiendo 1 por bloque no sólido y `WORLD_CONFIG.light.solidFalloff`
por bloque sólido. `LightingOverlay` pide la zona visible con un margen de `MAX_LIGHT` bloques,
alineada a una rejilla de 8, y solo recalcula al moverse esa zona o al cambiar un bloque dentro
(como mucho cada `refreshSeconds`). Después pinta un píxel de sombra por bloque, que combina la
luz de bloques con la del cielo según la hora (`GAME_CONFIG.lighting`), y cada frame compone
esa sombra con el hueco del farol del jugador. El cielo de fondo sigue en `DayNightView`.

### Audio propio con Web Audio, sin archivos

El audio de Phaser sigue desactivado (`audio.noAudio`): `AudioEngine` usa Web Audio
directamente. Los efectos son datos (`SOUND_BANK`: capas de oscilador o ruido con un barrido
y una envolvente) y la música es generativa (`music.ts`): una nota de fondo y una melodía que
camina por la escala del ambiente. Así todo el sonido es original y no pesa en la descarga. El
contexto se crea con el primer gesto del jugador, como exigen los navegadores; antes, todo se
ignora en silencio.

### Los sucesos del mundo se anotan; la presentación los cuenta

Los casos de uso anotan lo que pasa (bloque roto, objeto recogido, golpe, criatura derrotada…)
en `HappeningLog`, un buzón de la sesión. Cada frame, `WorldScene` lo vacía y `WorldEffects`
lo traduce en sonido, partículas y sacudidas de cámara. Las reglas no saben nada de efectos, y
un efecto nuevo no toca las reglas.

### Preferencias del jugador

`SettingsStore` (aplicación) guarda teclas y volúmenes, los valida con `normalizeSettings` y
avisa de cada cambio; `LocalStorageSettingsRepository` los persiste. Al reasignar, `rebind`
da a la otra acción la tecla que se libera, de modo que ninguna se queda sin tecla; las de la
barra rápida (1-9) están reservadas. `DEFAULT_CONTROLS` en `controls.config.ts` es solo el
valor por defecto.

### Varias fuentes de entrada a la vez

`CombinedInput` une `KeyboardMouseInput` y `TouchInput`. Los botones táctiles del HUD pulsan
`VirtualControls`, que la entrada táctil lee como acciones; tocar el mundo apunta y usa según
el modo (minar o construir). Los sistemas siguen conociendo solo `InputSource`.

### Ganchos de prueba solo bajo demanda

Con `?e2e` en la dirección, `WorldScene` instala `window.hondaluz` (adelantar la hora, dar
objetos, hacer aparecer criaturas). Sirve para que las pruebas de navegador lleguen a la noche
o a un combate en segundos. Sin ese parámetro no existe, y nada del juego depende de él.

### Tipografía

La interfaz usa Jersey 10 (licencia SIL OFL), empaquetada con `@fontsource/jersey-10`. Se
eligió tras comparar varias fuentes pixel por la legibilidad de cifras y acentos.

## Contratos previstos

Se implementarán junto con su primer uso real, no antes:

Ninguno por ahora.

## Riesgos técnicos

| Riesgo                                          | Mitigación prevista                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Coste de render y colisión con miles de bloques | Resuelto: textura por chunk, colisión por rejilla y repintado solo del bloque editado                |
| Iluminación                                     | Resuelto: propagación por rejilla en la zona visible (~0,3 ms), solo cuando cambia, nunca por frame  |
| Agua que fluye sin parar                        | Solo se simulan bloques despiertos, con un máximo por paso; las reglas se detienen al nivelarse      |
| Guardados grandes                               | Resuelto: solo se guardan los chunks que difieren del mundo generado y solo cuando cambian           |
| Pérdida de determinismo                         | Toda la generación usa `RandomSource`; `hashString` está fijado por una prueba                       |
| Tamaño del bundle de Phaser (~1,2 MB)           | Aceptado en el MVP; se puede aplazar su carga tras el primer render si llega a medirse como problema |
