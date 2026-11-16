# Hoja de ruta

Cada fase se cierra solo cuando `npm run check` pasa (lint, formato, build, pruebas unitarias,
de integración y e2e) y se cumplen sus criterios de aceptación.

## Fase 1 — Fundación técnica ✅

- [x] Vite, Phaser 3 y TypeScript estricto.
- [x] ESLint con reglas de dependencias por capa, y Prettier.
- [x] Escenas, bus de eventos tipado y raíz de composición.
- [x] Menú principal: nueva partida, continuar, seleccionar mundo, opciones y créditos.
- [x] Creación de mundos con semilla, guardados en IndexedDB con versión de formato.
- [x] Escena de juego con pausa y vuelta al menú.
- [x] Vitest y Playwright configurados y con pruebas reales.
- [x] Documentación inicial.

## Fase 2 — Mundo y jugador ✅

- [x] La misma semilla genera exactamente el mismo terreno (prueba unitaria y e2e).
- [x] El mundo se genera y dibuja por chunks; los lejanos se descargan y su memoria queda
      acotada (pruebas unitarias y de integración).
- [x] El jugador se mueve, salta y colisiona con el terreno sin atravesarlo (prueba de
      integración que recorre tres mundos comprobando cada paso).
- [x] Sube solo los escalones de un bloque; salto de altura variable, con margen al borde.
- [x] La cámara sigue al jugador con suavizado y respeta los límites del mundo.
- [x] Las acciones se leen a través de `InputSource`, no de teclas concretas.
- [x] Registro de contenido con validación y `src/content/blocks`.
- [x] 60 FPS recorriendo el mundo (medido en Chromium sin interfaz, 1280×720).

Movido a fases posteriores: arena, agua y árboles (Fase 6, con los biomas) y persistencia de la
posición del jugador (Fase 7).

## Fase 3 — Interacción ✅

- [x] Minar respeta alcance, dureza y progreso visible, y el bloque suelta su botín.
- [x] Solo se minan bloques con una cara al aire; no los enterrados tras otros.
- [x] Los objetos se recogen automáticamente y se apilan; si no caben, se quedan en el suelo.
- [x] Barra rápida con selección por 1-9, rueda o clic; inventario con E.
- [x] Inventario: mover, fusionar, intercambiar, dividir y eliminar montones, con descripción.
- [x] Colocar valida objeto, casilla libre, alcance, apoyo y que no solape al jugador.
- [x] Minería y construcción usan el inventario solo a través de `ItemStore` y
      `HeldItemSource`.
- [x] Un clic sobre la interfaz no actúa sobre el mundo.

Las paredes de fondo de los huecos llegaron en la Fase 6 y el guardado, en la Fase 7.

## Fase 4 — Progresión ✅

- [x] Recetas definidas como datos; fabricar consume materiales y entrega el resultado.
- [x] Las recetas de estación solo se pueden hacer con la estación al alcance.
- [x] Las recetas bloqueadas se muestran indicando qué falta; filtro de disponibles.
- [x] Tres estaciones colocables: mesa de trabajo, horno y yunque.
- [x] Las herramientas cambian la velocidad de minería y qué bloques se pueden romper.
- [x] Minerales en la roca (cobre cerca de la superficie, hierro en profundidad) y árboles.
- [x] Cadena de mejora: picos de madera, cobre y hierro.
- [x] Una prueba comprueba que toda receta es alcanzable con objetos obtenibles.

Adelantado de la Fase 6: árboles y pasos de generación componibles. Pendiente: armas y
armaduras (Fase 5, con el combate).

## Fase 5 — Supervivencia ✅

- [x] Vida, daño, invulnerabilidad temporal, retroceso y regeneración tras unos segundos.
- [x] Muerte y reaparición en el punto de partida, conservando los objetos.
- [x] Tres enemigos originales: Tocón errante (terrestre), Polilla de ceniza (voladora) y Topo
      de roca (subterráneo, excava la piedra).
- [x] IA modular: un archivo por comportamiento y un registro; los enemigos eligen uno por id.
- [x] Combate cuerpo a cuerpo con tres espadas, recarga, retroceso y botín.
- [x] Bálsamo curativo fabricado con lo que sueltan las polillas.
- [x] Reloj del mundo configurable en un solo lugar: amanecer, día, atardecer y noche.
- [x] La noche oscurece el mundo (salvo la luz del farol del jugador), cambia el cielo y trae
      criaturas de superficie; los topos aparecen bajo tierra a cualquier hora.

Pendiente: armas a distancia y armaduras (fases posteriores). El reloj y la vida se guardan
desde la Fase 7; las criaturas no se guardan.

## Fase 6 — Mundo avanzado ✅

- [x] Cinco biomas registrados como definiciones (bosque, desierto, jungla, tundra y cuevas
      profundas); una prueba añade un sexto sin tocar el generador.
- [x] Cuevas, cavernas y bocas de cueva; lagos de agua (de hielo en la tundra) en los valles;
      arena; vegetación propia de cada bioma (robles, cactos, árboles de jungla y pinos).
- [x] El agua fluye y la arena cae, simuladas solo cerca de los bloques que cambian.
- [x] El jugador nada: se hunde despacio, sube manteniendo el salto y sale a la orilla.
- [x] Los huecos bajo tierra muestran la pared de tierra o roca, no el cielo.
- [x] Iluminación por bloques (cielo y bloques luminosos) que se recalcula solo al cambiar la
      zona visible o algún bloque; antorchas y cristales de hondaluz emiten luz.

Pendiente: criaturas y fondos propios de cada bioma, y agua con niveles parciales (hoy se
mueve por bloques enteros y puede quedar a escalones de un bloque). La luz no se guarda: se
recalcula del mundo.

## Fase 7 — Persistencia ✅

- [x] Se guardan posición, vida, inventario, hora y día, tiempo jugado y los chunks cambiados,
      con los bloques por id para que reordenar o retirar bloques no corrompa partidas.
- [x] Guardado incremental: solo se escriben los chunks cambiados desde el último guardado,
      todo en una transacción. Automático cada 15 s, al pausar, al salir y al ocultar la página.
- [x] El guardado no bloquea el juego: el frame solo copia los datos (menos de 8 ms con 200
      chunks cambiados, prueba de integración) y el disco trabaja en segundo plano.
- [x] Un mundo de la versión 1 (sin tiempo jugado) se migra al cargarlo (prueba unitaria).
- [x] Un guardado ilegible no se sobrescribe: el menú muestra el error en lugar de empezar de
      cero.

No se guardan los objetos sueltos ni las criaturas: al volver, el suelo está limpio y las
criaturas reaparecen según la hora.

## Fase 8 — Pulido ✅

- [x] Partículas al romper y colocar bloques, golpear y derrotar criaturas y caer al agua;
      sacudida de cámara al recibir daño.
- [x] Efectos de sonido y música originales, sintetizados en el navegador: la música es
      generativa y cambia con la hora y la profundidad (día, noche, profundidades).
- [x] Opciones: reasignación de teclas y botones del ratón (sin dejar ninguna acción sin
      tecla), volumen de música y de efectos; se recuerdan entre sesiones.
- [x] Controles táctiles básicos: botones para moverse, saltar, inventario y pausa, y tocar el
      mundo para minar o construir según el modo.
- [x] Rendimiento medido en Chromium sin interfaz, 1280×720 (`tests/e2e/performance.spec.ts`):

  | Escenario              | FPS | Frame p95 | Peor frame | Frames > 50 ms |
  | ---------------------- | --- | --------- | ---------- | -------------- |
  | Caminar de día (5 s)   | 60  | 16,7 ms   | 16,8 ms    | 0              |
  | Caminar de noche (5 s) | 60  | 16,7 ms   | 16,8 ms    | 0              |
  | Minar sin parar (3 s)  | 60  | 16,7 ms   | 16,8 ms    | 0              |

  Costes medidos en las pruebas: generar un chunk, ~0,5 ms; recalcular la luz, ~0,3 ms;
  copiar un guardado con 200 chunks cambiados, menos de 8 ms.

- [x] Suite e2e de los diez flujos del MVP:

  | Flujo                                  | Prueba                                           |
  | -------------------------------------- | ------------------------------------------------ |
  | 1. Menú principal, opciones y créditos | `menu-flow.spec.ts`, `options.spec.ts`           |
  | 2. Crear un mundo con semilla          | `menu-flow.spec.ts` (misma semilla, mismo mundo) |
  | 3. Moverse, saltar y seguir la cámara  | `menu-flow.spec.ts`, `touch.spec.ts`             |
  | 4. Minar y recoger materiales          | `interaction.spec.ts`                            |
  | 5. Inventario                          | `interaction.spec.ts`                            |
  | 6. Colocar bloques                     | `interaction.spec.ts`                            |
  | 7. Fabricar                            | `crafting.spec.ts`                               |
  | 8. Combatir y recoger el botín         | `combat.spec.ts`                                 |
  | 9. Ciclo de día y noche                | `combat.spec.ts`, `survival.spec.ts`             |
  | 10. Guardar y continuar la partida     | `saving.spec.ts`, `menu-flow.spec.ts`            |

  Todas exigen que no haya errores en la consola. Las de combate, noche y rendimiento usan
  ganchos de prueba (`window.hondaluz`), que solo existen con `?e2e` en la dirección.

## Criterios del MVP

| Criterio                                    | Estado                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| El juego se ejecuta en navegador            | ✅                                                                                              |
| Menú principal funcional                    | ✅                                                                                              |
| Crear un mundo con semilla                  | ✅                                                                                              |
| Terreno procedural                          | ✅                                                                                              |
| Movimiento y salto                          | ✅                                                                                              |
| La cámara sigue al jugador                  | ✅                                                                                              |
| Carga y descarga de chunks                  | ✅                                                                                              |
| Minar bloques y recoger materiales          | ✅                                                                                              |
| Inventario funcional                        | ✅                                                                                              |
| Colocar bloques                             | ✅                                                                                              |
| Crafting                                    | ✅                                                                                              |
| Enemigos                                    | ✅                                                                                              |
| Ciclo día/noche                             | ✅                                                                                              |
| Guardar y recuperar partida                 | ✅                                                                                              |
| Sin errores críticos en consola             | ✅ (verificado en e2e)                                                                          |
| Las pruebas principales pasan               | ✅                                                                                              |
| Contenido ampliable sin reescribir sistemas | ✅ Bloques, objetos, herramientas, recetas, criaturas y biomas se añaden solo con su definición |
