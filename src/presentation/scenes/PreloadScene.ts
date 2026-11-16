import Phaser from 'phaser';
import { WORLD_CONFIG } from '../../config/world.config';
import { generateBackdropTextures } from '../effects/backdropTextures';
import { generateEnemyAtlas } from '../entities/enemyTextures';
import { generatePlayerTexture } from '../entities/playerTextures';
import { generateLightTexture } from '../effects/lightTexture';
import { GAME_CONFIG } from '../../config/game.config';
import { generateHowToPlayScenes } from '../display/howToPlayScenes';
import { generateItemAtlas } from '../world/itemTextures';
import { generateTileset } from '../world/tileTextures';
import { SCENE_KEYS, type SceneDeps } from './SceneDeps';

/** Prepara los recursos compartidos antes de mostrar el menú. */
export class PreloadScene extends Phaser.Scene {
  constructor(private readonly deps: SceneDeps) {
    super(SCENE_KEYS.preload);
  }

  create(): void {
    generateBackdropTextures(this.textures);
    const { content, icons, scenes } = this.deps;
    generateTileset(this.textures, content.blocks, WORLD_CONFIG.tileSize);
    generateItemAtlas(this.textures, content, WORLD_CONFIG.tileSize, icons);
    generatePlayerTexture(this.textures);
    generateEnemyAtlas(this.textures, content.enemies);
    generateLightTexture(this.textures, GAME_CONFIG.lighting.lanternRadius);
    generateHowToPlayScenes(this.textures, content, scenes);
    this.scene.start(SCENE_KEYS.mainMenu);
  }
}
