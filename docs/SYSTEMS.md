# Sistemas

Estado real de cada sistema. Se actualiza al cerrar cada fase.

## Implementados

### Eventos

`EventBus<GameEvents>` comunica interfaz y escenas.

| Evento                        | Emite                                       | Recibe          | Efecto                                                   |
| ----------------------------- | ------------------------------------------- | --------------- | -------------------------------------------------------- |
| `world:play-requested`        | Pantallas de menú                           | `MainMenuScene` | Inicia `WorldScene` con el mundo                         |
| `game:pause-toggle-requested` | HUD (tecla de pausa), menú de pausa         | `WorldScene`    | Pausa o reanuda                                          |
| `game:exit-requested`         | Menú de pausa                               | `WorldScene`    | Vuelve al menú principal                                 |
| `player:tile-changed`         | `HudSync`                                   | HUD             | Actualiza las coordenadas mostradas                      |
| `player:biome-changed`        | `HudSync`                                   | HUD             | Muestra el nombre del bioma en el que está el jugador    |
| `inventory:changed`           | Raíz de composición (aviso de `Inventory`)  | HUD             | Repinta barra rápida e inventario                        |
| `hud:hint`                    | `WorldScene` (aviso de `InteractionSystem`) | HUD             | Muestra un mensaje breve, como «necesitas un pico mejor» |
| `player:health-changed`       | `HudSync`                                   | HUD             | Actualiza la barra de vida                               |
| `player:died`                 | `WorldScene`                                | HUD             | Muestra la pantalla «Has caído»                          |
| `player:respawn-requested`    | HUD                                         | `WorldScene`    | Reaparece al jugador y reanuda el mundo                  |
| `clock:changed`               | `HudSync`                                   | HUD             | Actualiza día, hora y fase                               |

### Catálogo de mundos

`WorldCatalog` crea mundos (nombre y semilla validados), los lista por última partida, los abre
(carga su partida guardada y actualiza `lastPlayedAt`) y los borra junto con su partida. La
lista muestra el tiempo jugado de cada mundo. La semilla admite cualquier texto de hasta 32
caracteres; vacía, se genera una numérica. El entero que alimentará la generación es el hash
FNV-1a del texto.

### Persistencia

IndexedDB, base `hondaluz`, con tres almacenes: `worlds` (identidad y tiempo jugado),
`world_states` (posición y vida del jugador, inventario, hora y día) y `world_chunks` (chunks
cambiados, con sus bloques por id). Detalles de versionado en [ARCHITECTURE.md](ARCHITECTURE.md).

| Cuándo se guarda                         | Quién                                          |
| ---------------------------------------- | ---------------------------------------------- |
| Cada 15 s de partida                     | `WorldSaver.update` (`GAMEPLAY_CONFIG.saving`) |
| Al pausar, al salir al menú              | `WorldScene`                                   |
| Al ocultar la pestaña o cerrar la página | `WorldScene` (`visibilitychange`, `pagehide`)  |

Al abrir un mundo se restauran sus chunks, el inventario y la hora; el jugador vuelve a donde
estaba con su vida, salvo que guardara caído o que ese sitio ya no sea válido, y entonces
aparece en el punto de partida. No se guardan objetos sueltos ni criaturas. Borrar un mundo
borra también su partida.

### Pantalla

`computePixelViewport` calcula resolución interna y zoom; `game.ts` lo aplica al arrancar y en
cada cambio de tamaño de la ventana. Las escenas escuchan el evento `resize` de Phaser.

### Escenas

| Escena          | Responsabilidad                                                         |
| --------------- | ----------------------------------------------------------------------- |
| `PreloadScene`  | Genera fondos, atlas de bloques y sprite del jugador; inicia el menú    |
| `MainMenuScene` | Fondo animado del menú; inicia la partida al recibir el evento          |
| `WorldScene`    | Crea los sistemas del mundo abierto y los actualiza en orden cada frame |

### Fondo con parallax

`ParallaxBackdrop` dibuja el cielo en bandas, estrellas, tres capas de colinas y, opcionalmente,
ascuas. Usa texturas en escala de grises que cada escena tiñe con una `BackdropPalette`. Está
fijo a la pantalla; la escena le indica el desplazamiento (el tiempo en el menú, la cámara en
el mundo).

### Contenido

`Registry<T>` valida ids (formato y duplicados) al arrancar. `createBlockRegistry` exige además
que el aire sea el índice 0 y que todo bloque sólido tenga aspecto. `createGameContent` comprueba
además las referencias cruzadas (bloques que colocan los objetos, botín de los bloques,
ingredientes, resultados y estaciones de las recetas) y los dibujos. El contenido actual está
resumido en [GAME_DESIGN.md](GAME_DESIGN.md).

### Biomas

| Bioma            | Dónde                                  | Superficie / suelo / roca | Lagos | Vegetación                |
| ---------------- | -------------------------------------- | ------------------------- | ----- | ------------------------- |
| Bosque           | Franja central (aparición), peso 3     | Pasto / tierra / piedra   | Agua  | Robles de copa redonda    |
| Desierto         | Franjas, peso 2; relieve 0,55          | Arena / arena / piedra    | Agua  | Cactos                    |
| Jungla           | Franjas, peso 2; relieve 1,35          | Pasto de jungla / barro   | Agua  | Árboles altos y frondosos |
| Tundra           | Franjas, peso 2; relieve 1,1           | Nieve / tierra / piedra   | Hielo | Pinos                     |
| Cuevas profundas | Desde la fila 250, con borde irregular | Pizarra                   | —     | Vetas de cristal          |

Las definiciones están en `src/content/biomes`. Las franjas de superficie miden entre 180 y 320
bloques (`WORLD_CONFIG.terrain.biomes`) y nunca se repite el bioma de la vecina.

### Generación de terreno

`TerrainGenerator` calcula la altura de la superficie de cada columna sumando tres octavas de
ruido de valor con semilla, escaladas por el relieve del bioma, y rellena la superficie, una
capa de suelo de grosor variable y la roca de cada bioma. No guarda estado: cualquier chunk se
genera de forma independiente y siempre igual. Los parámetros están en `WORLD_CONFIG.terrain`.
El punto de aparición es la columna seca más cercana al centro.

Sobre ese terreno se aplican los pasos de generación, por este orden:

| Paso         | Qué hace                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `caves`      | Túneles (bandas finas de ruido 2D) y cavernas (más grandes cuanto más hondo), siempre bajo 12 bloques de techo; bocas de cueva sinuosas desde la superficie, lejos de la aparición y de los lagos |
| `oreVeins`   | Cobre e hierro en la roca de cualquier bioma; las vetas del bioma, como el cristal en lo hondo                                                                                                    |
| `lakes`      | Llena los valles bajo `waterLevel` con el lago del bioma; las laderas lo contienen                                                                                                                |
| `vegetation` | Como mucho una planta por franja de columnas, sobre superficie seca y lejos de las bocas                                                                                                          |

Sus parámetros están en `WORLD_CONFIG.caves`, `WORLD_CONFIG.ores` y en cada bioma. Bajo la
superficie natural, `backgroundAt` da la pared de fondo que se dibuja tras los huecos.

### Agua y arena

`TileSimulation` mueve los bloques con `physics`: la arena cae y se hunde en el agua; el agua
cae, se desliza hacia donde puede seguir cayendo y se reparte cuando la empuja agua desde
arriba. Solo se simulan los bloques que despiertan al cambiar algo a su lado, en pasos de
0,06 s y con 400 como mucho por paso (`WORLD_CONFIG.tiles`); un lago en reposo no cuesta nada.
Se puede construir dentro del agua: el bloque la desplaza.

### Iluminación

Cada bloque recibe luz del cielo y de los bloques luminosos (`LightField`), de 0 a 15. El cielo
llega entero a todo lo que está a la intemperie y entra en los huecos perdiendo 1 por bloque de
aire y 3 por bloque sólido. `LightingOverlay` oscurece cada bloque según su luz y la hora (de
noche el cielo da un 24 %), sobre la zona visible y un margen. Recalcula al moverse la zona o
cambiar un bloque, y abre el hueco del farol del jugador en cada frame. Los valores están en
`GAME_CONFIG.lighting` y `WORLD_CONFIG.light`.

Mundo actual: 2048 × 384 bloques (64 × 12 chunks de 32 bloques), bloques de 16 px. Generar
un chunk completo cuesta unos 0,5 ms.

### Mundo y chunks

`WorldMap` sirve bloques por coordenada global, genera chunks bajo demanda y avisa de cada
bloque que cambia. `ChunkLayer` calcula en cada frame qué chunks toca la vista más un margen,
pinta los que entran (uno por frame como máximo al desplazarse), recicla los que salen y
repinta los bloques cambiados. Después pide a `WorldMap` descartar los datos más allá de un
margen mayor.

### Jugador y movimiento

| Pieza                  | Responsabilidad                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `KeyboardMouseInput`   | Traduce teclas y botones a acciones según las teclas asignadas en Opciones                 |
| `TouchInput`           | Botones en pantalla y toques sobre el mundo (minar o construir, según el modo)             |
| `PlayerMovementSystem` | Acciones → intención; avanza al jugador a paso fijo; interpola la posición a dibujar       |
| `Player`               | Aceleración, gravedad, salto variable, margen al borde, salto anticipado, escalones y nado |
| `moveBox`              | Colisión de una caja contra la rejilla de bloques                                          |
| `PlayerView`           | Sprite, orientación y animación (quieto, correr, saltar, caer)                             |

Los valores de movimiento están en `PLAYER_TUNING`.

### Cámara

Sigue al sprite del jugador con suavizado (`GAME_CONFIG.camera.followLerp`), respeta los
límites del mundo y admite zoom.

### Minería

`MiningService` acumula progreso sobre el bloque apuntado: `segundos × potencia / dureza`. Al
llegar a 1 quita el bloque y suelta su botín. El progreso se pierde al cambiar de bloque o
soltar el botón. Un bloque es minable si tiene dureza, está al alcance (5 bloques) y tiene al
menos una cara al aire. La potencia sale de la regla `miningPower`: la de la herramienta en la
mano si es del tipo adecuado, o 1 a mano; 0 si el bloque exige un nivel que no se alcanza.

### Objetos sueltos y recogida

`DroppedItems` simula los objetos caídos: gravedad y colisión con el terreno, atracción hacia
el jugador cuando está cerca y recogida al tocarlo. Si el inventario no admite el objeto, se
queda en el suelo.

### Inventario

`Inventory` tiene 36 ranuras; las 9 primeras son la barra rápida y una de ellas es la
seleccionada (el objeto en la mano). Apila hasta `maxStack`, completa montones antes de ocupar
ranuras vacías, y permite mover, fusionar, intercambiar, dividir y eliminar.

### Construcción

`BlockPlacer.place` coloca el bloque del objeto en la mano si la casilla está libre (aire o
líquido), al
alcance, no solapa al jugador y toca al menos un bloque sólido. Devuelve el motivo cuando
rechaza la colocación, y solo gasta el objeto si la coloca.

### Fabricación

`CraftingService.options` devuelve todas las recetas con su estado: si la estación requerida
está al alcance (`blocksNear`) y qué ingredientes faltan. `craft` vuelve a comprobarlo, retira
los ingredientes y entrega el resultado; lo que no cabe en el inventario cae a los pies del
jugador. Las estaciones son bloques normales: basta colocarlas y acercarse.

### Interacción

`InteractionSystem` convierte el puntero en el bloque apuntado, llama a minería (botón
primario) y construcción (botón secundario, con un intervalo mínimo entre bloques), y
actualiza `BlockCursor`, que muestra el contorno del bloque y las grietas de progreso.

### Vida y combate

`Health` guarda la vida y una ventana de invulnerabilidad tras cada daño. `CombatService`:

- **Ataque**: con un arma en la mano, golpea una caja delante del jugador (hacia donde
  apunta el ratón), daña y empuja a las criaturas que toca y empieza la recarga del arma.
- **Contacto**: una criatura que toca al jugador le hace su daño y lo empuja; el jugador queda
  sin control un instante y parpadea mientras es invulnerable.
- **Muertes**: las criaturas sin vida desaparecen y sueltan su botín según su probabilidad.
- **Consumibles**: curan si falta vida y se gastan.
- **Regeneración**: tras unos segundos sin daño, la vida se recupera poco a poco.

Al morir, la escena detiene el mundo y el HUD ofrece reaparecer en el punto de partida.

### Criaturas

`EnemyRoster` mueve cada criatura con su comportamiento:

| Comportamiento | Movimiento                                                                                |
| -------------- | ----------------------------------------------------------------------------------------- |
| `walker`       | Gravedad y colisión; persigue al jugador si lo ve y salta los obstáculos; si no, deambula |
| `flyer`        | Sin gravedad; vuela hacia el jugador con aleteo y rebota en los bloques                   |
| `burrower`     | Atraviesa la roca hacia el jugador; fuera de ella cae por su peso                         |

`EnemySpawner` intenta cada 1,5 s colocar una criatura elegida por peso entre las que pueden
aparecer a esa hora, a 26-40 bloques del jugador, en su zona: sobre el suelo, en el aire sobre
la superficie o dentro de la roca a la profundidad mínima. Hay un límite de 2 criaturas de día
y 6 de noche, y las que quedan a más de 70 bloques desaparecen.

### Ciclo día y noche

`WorldClock` avanza con el tiempo de juego. Un día dura 12 minutos y un mundo nuevo empieza
por la mañana. `DayNightView` cambia los colores del fondo y `LightingOverlay` reduce la luz
del cielo de noche, sin tocar la de antorchas y cristales. Los valores están en
`GAMEPLAY_CONFIG.dayCycle` y `GAME_CONFIG.lighting`.

### Sonido y efectos

`AudioEngine` sintetiza los efectos de `SOUND_BANK` y compone la música en el momento. Hay
tres ambientes (día, noche y profundidades), que se funden al cambiar; el menú usa el de la
noche. `WorldEffects` convierte los sucesos del mundo en sonido y partículas:

| Suceso             | Sonido                                  | Partículas y otros          |
| ------------------ | --------------------------------------- | --------------------------- |
| Bloque roto        | Según el material: tierra, roca, madera | Trozos del color del bloque |
| Bloque colocado    | Golpe sordo                             | Polvo                       |
| Objeto recogido    | Dos notas agudas                        | —                           |
| Golpe de arma      | Silbido                                 | —                           |
| Criatura golpeada  | Impacto                                 | Chispas                     |
| Criatura derrotada | Caída                                   | Nube de polvo               |
| Jugador herido     | Quejido                                 | Sacudida de cámara          |
| Consumible, receta | Arpegio / dos notas                     | —                           |
| Caer al agua       | Chapoteo                                | Salpicadura                 |
| Caer derrotado     | Descenso grave                          | —                           |

Los volúmenes de música y efectos se ajustan en Opciones (`GAME_CONFIG.persistence.settingsKey`
en `localStorage`).

### Interfaz

`DomGameUi` monta una pantalla base (menú o HUD) y, encima, el menú de pausa. Cada pantalla es
una función que devuelve un elemento; las que registran listeners globales devuelven también
`dispose`.

| Pantalla                                                  | Archivo                          |
| --------------------------------------------------------- | -------------------------------- |
| Menú principal                                            | `ui/menus/MainMenuScreen.ts`     |
| Nueva partida                                             | `ui/menus/NewWorldScreen.ts`     |
| Seleccionar mundo                                         | `ui/menus/WorldSelectScreen.ts`  |
| Opciones (volumen y reasignación de teclas)               | `ui/menus/OptionsScreen.ts`      |
| Controles táctiles                                        | `ui/hud/TouchControls.ts`        |
| Créditos                                                  | `ui/menus/CreditsScreen.ts`      |
| Pausa                                                     | `ui/menus/PauseMenu.ts`          |
| HUD del mundo (datos, bioma, vida, reloj, muerte, teclas) | `ui/hud/WorldHud.ts`             |
| Barra rápida                                              | `ui/hud/Hotbar.ts`               |
| Inventario                                                | `ui/inventory/InventoryPanel.ts` |
| Fabricación                                               | `ui/crafting/CraftingPanel.ts`   |

## Pendientes

Armas a distancia, armaduras, criaturas y fondos propios de cada bioma, guardado del mundo y
audio.
Ver [ROADMAP.md](ROADMAP.md).
