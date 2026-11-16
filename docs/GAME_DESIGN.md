# Diseño del juego

## Visión

**Hondaluz** es un sandbox 2D de perspectiva lateral en el que el jugador explora, excava y
construye en un mundo generado a partir de una semilla. Pertenece al género de los sandbox de
supervivencia y construcción en 2D, con nombre, arte, criaturas y mundo propios.

## Identidad

- **Idea central: la luz es el recurso que más importa.** La superficie es amable y luminosa;
  cuanto más se desciende, más oscuro y valioso es todo. Progresar es aprender a llevar luz más
  abajo.
- **Tono:** cálido y contemplativo arriba, tenso y misterioso abajo.
- **Paleta:** índigos y violetas para la sombra y la profundidad; ámbar y naranja para la luz,
  la interfaz y todo lo que el jugador fabrica.
- **Arte:** pixel art generado por código, con cielos en bandas y siluetas en capas.
- **Tipografía:** Jersey 10.
- **Idioma:** español.

## Bucle de juego

1. Explorar la superficie y reunir materiales básicos.
2. Fabricar herramientas y fuentes de luz.
3. Descender, encontrar minerales y enfrentarse a lo que vive en la oscuridad.
4. Volver, mejorar el equipo y construir una base.
5. Llegar más hondo.

## Progresión prevista

| Etapa            | Materiales             | Desbloquea                                       |
| ---------------- | ---------------------- | ------------------------------------------------ |
| Superficie       | Madera, tierra, piedra | Mesa de trabajo, herramientas básicas, antorchas |
| Cuevas           | Minerales comunes      | Horno, herramientas de metal                     |
| Cavernas         | Minerales raros        | Yunque, armas y armaduras                        |
| Cuevas profundas | Recursos luminosos     | Equipo avanzado y fuentes de luz permanentes     |

## Biomas

El mundo se reparte en franjas de bosque, desierto, jungla y tundra; el jugador empieza
siempre en el bosque. Bajo todos ellos, a partir de unos 150 bloques de profundidad, empiezan
las cuevas profundas: pizarra oscura con vetas de cristal de hondaluz, que brilla por sí solo.
Cada bioma tiene sus bloques, su relieve y su vegetación: robles en el bosque, cactos sobre
la arena del desierto, árboles altos en la jungla de barro y pinos en la tundra nevada, cuyos
lagos están helados. Criaturas y fondos propios de cada bioma quedan para más adelante.

## Cuevas, agua y luz

Bajo la superficie se abren túneles y cavernas, más amplias cuanto más hondo. De vez en cuando
un pozo sinuoso baja desde la superficie: una boca de cueva. Los valles hondos son lagos; si
se les abre un hueco, el agua cae y se reparte, y la arena sin apoyo se desploma. En el agua
el jugador se hunde despacio y sube manteniendo el salto.

Bajo tierra no llega el sol: a pocos bloques de la superficie todo queda a oscuras salvo el
círculo del farol. Las antorchas (3 por cada madera) y los cristales de hondaluz iluminan a
su alrededor, y su luz no depende de la hora.

## Ciclo día y noche

Un día dura 12 minutos: amanecer, día, atardecer y noche. El día es seguro en la superficie. Al
caer la noche el mundo se oscurece y solo queda la luz del farol que lleva el jugador, y salen
las criaturas de superficie. Bajo tierra los topos acechan a cualquier hora.

## Supervivencia

El jugador tiene 100 de vida. Cada golpe lo empuja y le da un instante de invulnerabilidad;
tras unos segundos sin daño la vida se recupera poco a poco. Al caer, reaparece en el punto de
partida con todos sus objetos.

## Protagonista

Una figura pequeña con capucha de color ascua y túnica violeta que lleva un farol en la mano:
la luz que da nombre al juego viaja siempre con ella.

## Controles

| Acción              | Por defecto    | Táctil                           |
| ------------------- | -------------- | -------------------------------- |
| Moverse             | A / D          | Botones ◀ ▶                      |
| Saltar, nadar       | Espacio        | Botón ▲                          |
| Usar, minar, atacar | Clic izquierdo | Tocar el mundo en modo Minar     |
| Construir           | Clic derecho   | Tocar el mundo en modo Construir |
| Inventario          | E              | Botón Inv.                       |
| Pausa               | ESC            | Botón II                         |
| Barra rápida        | 1-9, rueda     | Tocar la ranura                  |

Las teclas se pueden reasignar en Opciones, donde también se ajusta el volumen.

## Sonido

Todo el sonido se genera en el propio juego. Cada acción suena según lo que toca: la tierra
suena blanda, la roca seca y la madera hueca. La música se compone sola: luminosa de día,
lenta y grave de noche, y casi silenciosa en las profundidades.

## Movimiento

Ágil y permisivo: salto de algo más de tres bloques cuya altura depende de cuánto se mantenga
la tecla, subida automática de escalones de un bloque para recorrer el terreno sin saltar
constantemente, y un pequeño margen para saltar justo al salir de un borde.

## Minar y construir

Se mina manteniendo el botón sobre un bloque al alcance; las grietas muestran el avance. Solo
se puede romper lo que tiene una cara al aire, así que excavar es abrirse camino, no perforar
a distancia. Lo minado salta al suelo y vuela hacia el jugador. Construir exige apoyar cada
bloque en otro: no se levantan estructuras flotando en el aire.

## Contenido actual

### Bloques

| Bloque                         | Dureza         | Herramienta             | Suelta         |
| ------------------------------ | -------------- | ----------------------- | -------------- |
| Pasto, tierra                  | 0,4 s / 0,35 s | A mano; el pico acelera | Tierra         |
| Tronco                         | 0,7 s          | A mano                  | Madera         |
| Hojas                          | 0,15 s         | A mano                  | Nada           |
| Tablones                       | 0,6 s          | A mano                  | Madera         |
| Piedra                         | 1,6 s          | Pico de nivel 1         | Piedra         |
| Mena de cobre                  | 2,4 s          | Pico de nivel 1         | Mena de cobre  |
| Mena de hierro                 | 4 s            | Pico de nivel 2         | Mena de hierro |
| Mesa de trabajo, horno, yunque | 0,6-1 s        | A mano                  | Se recuperan   |
| Arena (cae sin apoyo)          | 0,3 s          | A mano; el pico acelera | Arena          |
| Pasto de jungla, barro         | 0,45 s / 0,4 s | A mano; el pico acelera | Barro          |
| Nieve                          | 0,35 s         | A mano; el pico acelera | Tierra         |
| Hielo                          | 0,5 s          | A mano; el pico acelera | Hielo          |
| Cacto, hojas de jungla, agujas | 0,4 s / 0,15 s | A mano                  | Nada           |
| Pizarra                        | 2,4 s          | Pico de nivel 2         | Pizarra        |
| Cristal de hondaluz (luz 11)   | 3,5 s          | Pico de nivel 3         | Cristal        |
| Antorcha (luz 14)              | 0,1 s          | A mano                  | Antorcha       |
| Agua                           | —              | No se mina              | —              |

La dureza es el tiempo a mano; con un pico se divide por su potencia. Troncos, hojas, cactos,
antorchas y estaciones no son sólidos: el jugador pasa por delante. El agua tampoco, y se
puede construir dentro de ella.

### Herramientas

| Pico   | Nivel | Potencia | Rompe además            |
| ------ | ----- | -------- | ----------------------- |
| Madera | 1     | 2        | Piedra, mena de cobre   |
| Cobre  | 2     | 3,5      | Mena de hierro, pizarra |
| Hierro | 3     | 5,5      | Cristal de hondaluz     |

### Recetas

| Resultado         | Ingredientes                   | Estación        |
| ----------------- | ------------------------------ | --------------- |
| Mesa de trabajo   | 10 madera                      | A mano          |
| Pico de madera    | 8 madera                       | Mesa de trabajo |
| Horno             | 20 piedra                      | Mesa de trabajo |
| Lingote de cobre  | 3 menas de cobre               | Horno           |
| Yunque            | 5 lingotes de cobre            | Mesa de trabajo |
| Pico de cobre     | 8 lingotes de cobre, 4 madera  | Yunque          |
| Lingote de hierro | 3 menas de hierro              | Horno           |
| Pico de hierro    | 8 lingotes de hierro, 4 madera | Yunque          |
| 3 antorchas       | 1 madera                       | A mano          |

### Armas y consumibles

| Objeto           | Daño    | Recarga | Receta                                       |
| ---------------- | ------- | ------- | -------------------------------------------- |
| Espada de madera | 9       | 0,45 s  | 7 madera, mesa de trabajo                    |
| Espada de cobre  | 15      | 0,4 s   | 7 lingotes de cobre, yunque                  |
| Espada de hierro | 24      | 0,38 s  | 7 lingotes de hierro, yunque                 |
| Bálsamo          | Cura 40 | 1 s     | 2 polvo luminoso y 1 madera, mesa de trabajo |

### Criaturas

| Criatura          | Vida | Daño | Dónde y cuándo                                               | Suelta                |
| ----------------- | ---- | ---- | ------------------------------------------------------------ | --------------------- |
| Tocón errante     | 30   | 12   | Superficie, de noche. Camina y salta obstáculos              | 3 madera              |
| Polilla de ceniza | 18   | 9    | En el aire, de noche. Acude al jugador aleteando             | Polvo luminoso (75 %) |
| Topo de roca      | 45   | 16   | Bajo tierra, a partir de 20 bloques, siempre. Excava la roca | Mena de hierro (50 %) |

### Dónde está cada cosa

La vegetación crece en la superficie seca de cada bioma. El cobre aparece en la roca desde
unos 4 bloques bajo la superficie; el hierro, a partir de unos 28. Las cuevas empiezan a unos
12 bloques de hondo, y el cristal de hondaluz solo en las cuevas profundas.
