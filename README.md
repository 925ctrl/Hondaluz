# Hondaluz

Sandbox 2D de exploración, minería y construcción para navegador, con mundo procedural y
pixel art generado por código. Hecho con TypeScript, Phaser 3 y Vite.

> Estado: **las ocho fases del MVP están completadas**. Se puede explorar un mundo procedural con
> cinco biomas, cuevas, lagos y luz por bloques; minar, construir, fabricar, nadar, combatir a
> tres criaturas y sobrevivir a la noche con antorchas, con sonido y música propios. La
> partida se guarda sola, las teclas se pueden reasignar y hay controles táctiles básicos. El
> plan completo está en [docs/ROADMAP.md](docs/ROADMAP.md).

## Requisitos

- Node.js 20.19 o superior (probado con Node 26).

## Uso

```bash
npm install
npx playwright install chromium   # solo la primera vez, para las pruebas e2e
npm run dev                        # servidor de desarrollo
```

| Comando            | Qué hace                                              |
| ------------------ | ----------------------------------------------------- |
| `npm run dev`      | Servidor de desarrollo con recarga                    |
| `npm run build`    | Comprueba tipos y genera `dist/`                      |
| `npm run preview`  | Sirve el build de producción                          |
| `npm run lint`     | ESLint, incluidas las reglas de dependencias por capa |
| `npm run format`   | Formatea con Prettier                                 |
| `npm run test`     | Pruebas unitarias y de integración (Vitest)           |
| `npm run test:e2e` | Pruebas en navegador contra el build (Playwright)     |
| `npm run check`    | Todo lo anterior; debe pasar antes de cerrar una fase |

## Controles

Definidos en `src/config/controls.config.ts`:

| Acción                                                    | Entrada                              |
| --------------------------------------------------------- | ------------------------------------ |
| Moverse                                                   | A / D                                |
| Saltar                                                    | Espacio                              |
| Atacar con el arma de la mano, usar un consumible o minar | Clic izquierdo (mantener para minar) |
| Colocar el bloque de la mano                              | Clic derecho                         |
| Elegir ranura de la barra rápida                          | 1-9 o rueda del ratón                |
| Abrir o cerrar el inventario                              | E                                    |
| Pausar                                                    | ESC                                  |

En el inventario, un clic coge un montón y otro lo suelta en la ranura elegida; el clic derecho
coge solo la mitad. A su lado está la lista de recetas: las bloqueadas indican qué falta.

## Documentación

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): capas, reglas de dependencia y decisiones.
- [docs/SYSTEMS.md](docs/SYSTEMS.md): sistemas que existen hoy y cómo se conectan.
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md): visión, identidad y progresión.
- [docs/ROADMAP.md](docs/ROADMAP.md): fases, criterios de aceptación y estado.
