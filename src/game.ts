import Phaser from 'phaser';
import type { GameEvents } from './application/events/GameEvents';
import { WorldCatalog } from './application/use-cases/world/WorldCatalog';
import { createSessionFactory } from './bootstrap/sessionFactory';
import { GAME_CONFIG } from './config/game.config';
import { GAMEPLAY_CONFIG } from './config/gameplay.config';
import { WORLD_CONFIG } from './config/world.config';
import { WorldSaver } from './application/use-cases/world/WorldSaver';
import { SettingsStore } from './application/use-cases/settings/SettingsStore';
import { LocalStorageSettingsRepository } from './infrastructure/persistence/repositories/LocalStorageSettingsRepository';
import { AudioEngine } from './presentation/audio/AudioEngine';
import { BIOME_DEFINITIONS } from './content/biomes';
import { BLOCK_DEFINITIONS } from './content/blocks';
import { ENEMY_DEFINITIONS } from './content/enemies';
import { ITEM_DEFINITIONS } from './content/items';
import { RECIPE_DEFINITIONS } from './content/recipes';
import { EventBus } from './core/events/EventBus';
import { createGameContent } from './domain/catalog/GameContent';
import { openDatabase } from './infrastructure/persistence/IndexedDbDatabase';
import { IndexedDbWorldRepository } from './infrastructure/persistence/repositories/IndexedDbWorldRepository';
import { IndexedDbWorldSaveRepository } from './infrastructure/persistence/repositories/IndexedDbWorldSaveRepository';
import { computePixelViewport } from './presentation/display/PixelViewport';
import { MainMenuScene } from './presentation/scenes/MainMenuScene';
import { PreloadScene } from './presentation/scenes/PreloadScene';
import type { SceneDeps } from './presentation/scenes/SceneDeps';
import { WorldScene } from './presentation/scenes/WorldScene';
import { DomGameUi } from './presentation/ui/DomGameUi';
import { ItemIcons } from './presentation/ui/ItemIcons';

/** Raíz de composición: el único lugar donde se construyen y conectan las dependencias. */
export function startGame(gameParent: HTMLElement, uiRoot: HTMLElement): Phaser.Game {
  const events = new EventBus<GameEvents>();
  const database = openDatabase(indexedDB, GAME_CONFIG.persistence.databaseName);
  const settings = new SettingsStore(
    new LocalStorageSettingsRepository(() => localStorage, GAME_CONFIG.persistence.settingsKey),
  );
  const audio = new AudioEngine(settings.current);
  settings.subscribe((next) => {
    audio.setVolumes(next);
  });
  // Los navegadores solo dejan sonar el audio tras un gesto del jugador.
  for (const type of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(
      type,
      () => {
        audio.unlock();
      },
      { capture: true, passive: true },
    );
  }
  const content = createGameContent({
    blocks: BLOCK_DEFINITIONS,
    items: ITEM_DEFINITIONS,
    recipes: RECIPE_DEFINITIONS,
    enemies: ENEMY_DEFINITIONS,
    biomes: BIOME_DEFINITIONS,
  });
  const saves = new IndexedDbWorldSaveRepository(database, content.blocks, WORLD_CONFIG.dimensions);
  const catalog = new WorldCatalog({
    repository: new IndexedDbWorldRepository(database),
    saves,
    now: () => Date.now(),
    random: () => Math.random(),
    createId: () => crypto.randomUUID(),
  });
  const icons = new ItemIcons();
  const sceneDeps: SceneDeps = {
    events,
    ui: new DomGameUi(uiRoot, { events, catalog, content, icons, settings }),
    settings,
    audio,
    debug: new URLSearchParams(window.location.search).has('e2e'),
    content,
    icons,
    createSession: createSessionFactory(
      content,
      () => {
        events.emit('inventory:changed');
      },
      () => Math.random(),
    ),
    createSaver: (session, onError) =>
      new WorldSaver(session, saves, GAMEPLAY_CONFIG.saving, onError),
  };

  const viewport = computePixelViewport(window.innerWidth, window.innerHeight, GAME_CONFIG.display);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: gameParent,
    title: GAME_CONFIG.title,
    version: GAME_CONFIG.version,
    backgroundColor: GAME_CONFIG.display.backgroundColor,
    banner: false,
    pixelArt: true,
    roundPixels: true,
    disableContextMenu: true,
    // Sin audio hasta la Fase 8: evita crear un AudioContext que aún no se usa.
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.NONE,
      width: viewport.width,
      height: viewport.height,
      zoom: viewport.zoom,
    },
    scene: [new PreloadScene(sceneDeps), new MainMenuScene(sceneDeps), new WorldScene(sceneDeps)],
  });

  window.addEventListener('resize', () => {
    const next = computePixelViewport(window.innerWidth, window.innerHeight, GAME_CONFIG.display);
    game.scale.setZoom(next.zoom);
    game.scale.resize(next.width, next.height);
  });
  return game;
}
