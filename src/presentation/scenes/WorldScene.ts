import Phaser from 'phaser';
import { FixedStepLoop } from '../../application/simulation/FixedStepLoop';
import { stepWorld } from '../../application/simulation/stepWorld';
import type { WorldSession } from '../../application/use-cases/world/WorldSession';
import { GAME_CONFIG } from '../../config/game.config';
import { GAMEPLAY_CONFIG } from '../../config/gameplay.config';
import { WORLD_CONFIG } from '../../config/world.config';
import type { WorldMeta } from '../../domain/entities/World';
import type { WorldSave } from '../../domain/repositories/WorldSaveRepository';
import type { WorldSaver } from '../../application/use-cases/world/WorldSaver';
import { heightInTiles, widthInTiles } from '../../domain/world/WorldDimensions';
import { DayNightView } from '../effects/DayNightView';
import { LightingOverlay } from '../effects/LightingOverlay';
import { ParallaxBackdrop } from '../effects/ParallaxBackdrop';
import { DroppedItemsView } from '../entities/DroppedItemsView';
import { EnemiesView } from '../entities/EnemiesView';
import { PlayerView } from '../entities/PlayerView';
import { SwingView } from '../entities/SwingView';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { CombinedInput, TouchInput, VirtualControls } from '../input/TouchInput';
import { moodFor } from '../audio/music';
import { installDebugHooks } from '../debug/debugHooks';
import { ParticleView } from '../effects/ParticleView';
import { WorldEffects } from '../effects/WorldEffects';
import { HudSync } from '../systems/HudSync';
import { InteractionSystem } from '../systems/InteractionSystem';
import { PlayerMovementSystem } from '../systems/PlayerMovementSystem';
import { DAY_BACKDROP } from '../theme/palette';
import { BlockCursor } from '../world/BlockCursor';
import { ChunkLayer } from '../world/ChunkLayer';
import { SCENE_KEYS, type SceneDeps } from './SceneDeps';

export interface WorldSceneData {
  readonly world: WorldMeta;
  readonly save?: WorldSave;
}

/** Orden de dibujo: lo de mayor profundidad se pinta encima. */
const DEPTHS = {
  drops: 8,
  enemies: 9,
  player: 10,
  swing: 11,
  particles: 12,
  light: 15,
  cursor: 20,
} as const;
/** Fracción del avance de la cámara que se traslada al fondo lejano. */
const BACKDROP_PARALLAX = 0.3;
/** Las colinas del fondo se apoyan un poco por debajo del centro, tras el terreno cercano. */
const backdropHorizon = (height: number): number => Math.round(height / 2) + 32;
/** Altura del farol sobre los pies del jugador, en píxeles. */
const LANTERN_HEIGHT = 12;

/** Lo que la escena crea al abrir un mundo y actualiza en cada frame. */
interface WorldRuntime {
  readonly session: WorldSession;
  readonly backdrop: ParallaxBackdrop;
  readonly dayNight: DayNightView;
  readonly lighting: LightingOverlay;
  readonly chunks: ChunkLayer;
  readonly loop: FixedStepLoop;
  readonly movement: PlayerMovementSystem;
  readonly interaction: InteractionSystem;
  readonly playerView: PlayerView;
  readonly dropsView: DroppedItemsView;
  readonly enemiesView: EnemiesView;
  readonly swingView: SwingView;
  readonly hud: HudSync;
  readonly saver: WorldSaver;
  readonly particles: ParticleView;
  readonly effects: WorldEffects;
  dead: boolean;
}

/**
 * Escena de juego. Crea los sistemas del mundo abierto y los coordina en cada frame;
 * las reglas viven en el dominio y en los casos de uso.
 */
export class WorldScene extends Phaser.Scene {
  private runtime: WorldRuntime | undefined;
  private paused = false;

  constructor(private readonly deps: SceneDeps) {
    super(SCENE_KEYS.world);
  }

  create(data: WorldSceneData): void {
    const { events, ui } = this.deps;
    const { tileSize, dimensions, chunks, simulation } = WORLD_CONFIG;
    const session = this.deps.createSession(data.world, data.save);
    const saver = this.deps.createSaver(session, (error) => {
      console.error('No se pudo guardar la partida.', error);
      events.emit('hud:hint', { text: 'No se pudo guardar la partida' });
    });
    const { settings, audio } = this.deps;
    const touch = new VirtualControls();
    const input = new CombinedInput([
      new TouchInput(this.game.canvas, touch),
      new KeyboardMouseInput(window, this.game.canvas, settings),
    ]);
    const particles = new ParticleView(this, DEPTHS.particles);
    const effects = new WorldEffects(this.deps.content.blocks, audio, particles, () => {
      this.cameras.main.shake(140, 0.006);
    });

    const backdrop = new ParallaxBackdrop(this, DAY_BACKDROP, backdropHorizon);
    const chunkLayer = new ChunkLayer(this, session.map, { tileSize, ...chunks });
    const lighting = new LightingOverlay(
      this,
      session.map,
      this.deps.content.blocks.all,
      DEPTHS.light,
      {
        tileSize,
        ...GAME_CONFIG.lighting,
        light: WORLD_CONFIG.light,
      },
    );
    const movement = new PlayerMovementSystem(session.player, input, session.map, tileSize);
    const interaction = new InteractionSystem(
      session,
      input,
      new BlockCursor(this, tileSize, DEPTHS.cursor),
      { tileSize, ...GAMEPLAY_CONFIG.interaction },
      (text) => {
        events.emit('hud:hint', { text });
      },
    );
    const playerView = new PlayerView(this, DEPTHS.player);
    playerView.sync(session.player, movement.feetX, movement.feetY);

    const camera = this.cameras.main;
    camera.setBounds(
      0,
      0,
      widthInTiles(dimensions) * tileSize,
      heightInTiles(dimensions) * tileSize,
    );
    camera.setZoom(GAME_CONFIG.camera.zoom);
    const { followLerp } = GAME_CONFIG.camera;
    camera.startFollow(playerView.sprite, true, followLerp, followLerp);

    const runtime: WorldRuntime = {
      session,
      backdrop,
      dayNight: new DayNightView(backdrop),
      lighting,
      chunks: chunkLayer,
      loop: new FixedStepLoop(simulation.stepSeconds, simulation.maxStepsPerFrame),
      movement,
      interaction,
      playerView,
      dropsView: new DroppedItemsView(this, GAMEPLAY_CONFIG.drops.size, DEPTHS.drops),
      enemiesView: new EnemiesView(this, DEPTHS.enemies),
      swingView: new SwingView(this, DEPTHS.swing),
      hud: new HudSync(session, events),
      saver,
      particles,
      effects,
      dead: false,
    };
    this.runtime = runtime;
    this.paused = false;
    chunkLayer.update(this.viewRect(), true);
    ui.showWorldHud(session, touch);
    const removeDebugHooks = this.deps.debug
      ? installDebugHooks(session, this.deps.content)
      : () => undefined;
    runtime.hud.update();

    const onResize = (size: Phaser.Structs.Size): void => {
      backdrop.layout(size.width, size.height);
      lighting.layout(size.width, size.height);
      runtime.dayNight.invalidate();
    };
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    const subscriptions = [
      events.on('game:pause-toggle-requested', () => {
        this.setPaused(!this.paused);
      }),
      events.on('game:exit-requested', () => {
        // La copia se toma ahora; la escritura termina en segundo plano, ya en el menú.
        void saver.save();
        this.scene.start(SCENE_KEYS.mainMenu);
      }),
      events.on('player:respawn-requested', () => {
        if (!runtime.dead) return;
        session.respawnPlayer();
        runtime.dead = false;
        playerView.sprite.setVisible(true);
        runtime.hud.invalidate();
      }),
    ];

    // Al ocultar la pestaña o cerrar la página se guarda: puede que no se vuelva.
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') void saver.save();
    };
    const onPageHide = (): void => {
      void saver.save();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      this.scale.off(Phaser.Scale.Events.RESIZE, onResize);
      subscriptions.forEach((unsubscribe) => {
        unsubscribe();
      });
      input.dispose();
      chunkLayer.destroy();
      particles.destroy();
      audio.stopMusic();
      removeDebugHooks();
      lighting.destroy();
      session.tiles.dispose();
      this.runtime = undefined;
      ui.clear();
    });
  }

  override update(_time: number, delta: number): void {
    const runtime = this.runtime;
    if (!runtime) return;
    const { session, movement } = runtime;
    const deltaSeconds = delta / 1000;

    // Mientras el jugador está caído el mundo se detiene hasta que pida reaparecer.
    const alpha = runtime.dead
      ? 0
      : runtime.loop.advance(deltaSeconds, (stepSeconds) => {
          movement.step(stepSeconds);
          stepWorld(session, stepSeconds);
        });
    movement.interpolate(alpha, deltaSeconds);
    runtime.saver.update(deltaSeconds);

    const { player } = session;
    runtime.playerView.sync(player, movement.feetX, movement.feetY);
    // Parpadea mientras es invulnerable tras recibir un golpe.
    runtime.playerView.sprite.setAlpha(
      player.health.isInvulnerable && Math.floor(this.time.now / 80) % 2 === 0 ? 0.35 : 1,
    );
    runtime.dropsView.sync(session.drops.items);
    runtime.enemiesView.sync(session.enemies.all);
    runtime.swingView.sync(
      session.combat.swing,
      movement.feetX,
      movement.feetY - player.height * 0.55,
    );

    const view = this.viewRect();
    runtime.chunks.update(view);
    if (!runtime.dead) runtime.interaction.update(deltaSeconds, view.x, view.y);
    runtime.backdrop.scrollTo(this.cameras.main.scrollX * BACKDROP_PARALLAX);
    const { daylight } = session.clock;
    runtime.dayNight.update(daylight);
    runtime.lighting.update(
      view,
      daylight,
      runtime.dead
        ? []
        : [{ x: movement.feetX - view.x, y: movement.feetY - LANTERN_HEIGHT - view.y }],
      deltaSeconds,
    );
    runtime.hud.update();

    for (const happening of session.happenings.drain()) runtime.effects.handle(happening);
    runtime.effects.follow(player);
    runtime.particles.update(deltaSeconds);
    const feetTileX = Math.floor(movement.feetX / session.tileSize);
    const depth = Math.floor(movement.feetY / session.tileSize) - session.map.surfaceAt(feetTileX);
    this.deps.audio.updateMusic(moodFor(daylight, depth));

    if (!runtime.dead && player.health.isDead) {
      this.deps.audio.play('death');
      runtime.dead = true;
      runtime.playerView.sprite.setVisible(false);
      this.deps.events.emit('player:died');
    }
  }

  /** Zona del mundo que muestra la cámara, en píxeles. */
  private viewRect(): { x: number; y: number; width: number; height: number } {
    const camera = this.cameras.main;
    return {
      x: camera.scrollX,
      y: camera.scrollY,
      width: camera.width / camera.zoom,
      height: camera.height / camera.zoom,
    };
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) void this.runtime?.saver.save();
    if (paused) this.scene.pause();
    else this.scene.resume();
    this.deps.ui.setPauseVisible(paused);
  }
}
