import Phaser from 'phaser';
import { TILE_SIZE } from '@/game/constants';

// 素材路径配置
const ASSET_PATH = 'assets/reference/assets_reference/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 加载瓦片地图集
    this.load.image('tileset', `${ASSET_PATH}/Tileset/spr_tileset_sunnysideworld_16px.png`);
    this.load.image('tileset-forest', `${ASSET_PATH}/Tileset/spr_tileset_sunnysideworld_forest_32px.png`);

    // 加载玩家角色精灵图（基础发型）
    this.load.spritesheet('player-idle', `${ASSET_PATH}/Characters/Human/IDLE/base_idle_strip9.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('player-walk', `${ASSET_PATH}/Characters/Human/WALKING/base_walk_strip8.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('player-run', `${ASSET_PATH}/Characters/Human/RUN/base_run_strip8.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });

    // 加载6个NPC的精灵图（使用不同发型）
    const npcHairstyles = ['bowlhair', 'curlyhair', 'longhair', 'mophair', 'shorthair', 'spikeyhair'];
    npcHairstyles.forEach((style, index) => {
      this.load.spritesheet(`npc-${index}-idle`, `${ASSET_PATH}/Characters/Human/IDLE/${style}_idle_strip9.png`, {
        frameWidth: 96,
        frameHeight: 64,
      });
      this.load.spritesheet(`npc-${index}-walk`, `${ASSET_PATH}/Characters/Human/WALKING/${style}_walk_strip8.png`, {
        frameWidth: 96,
        frameHeight: 64,
      });
    });

    // 加载环境装饰物
    this.load.image('tree-01', `${ASSET_PATH}/Environment/spr_deco_tree_01/layers/35b80d4c-f4cb-4aa8-a423-b9a9470fb6ef/5e39c3d9-52ff-4624-b0da-f5504f2cbc21.png`);
    this.load.image('tree-02', `${ASSET_PATH}/Environment/spr_deco_tree_02/layers/203e8642-ec7b-4c07-8f7e-dc272e6c2b2e/affae896-cb65-4059-ba4d-00e3ccbac2ed.png`);
    this.load.image('well', `${ASSET_PATH}/Environment/spr_deco_well/layers/c3d011a3-e1d2-4f14-83d7-d21b9f689713/5f572a2a-2ccd-424d-9c49-b9ad5058389a.png`);
    this.load.image('windmill', `${ASSET_PATH}/Environment/spr_deco_windmill/layers/01dd11e2-59a3-44fc-ac1c-5d256c0f2154/b90537ea-f3de-4216-bf90-ef7f1d40bef6.png`);
    this.load.image('house', `${ASSET_PATH}/Environment/spr_deco_cook_chinmney/layers/31ab948f-42c9-47ce-9cb7-456406ed0139/2f91b825-bbff-494c-9303-1a8999664c1d.png`);
    this.load.image('campfire', `${ASSET_PATH}/Environment/spr_deco_campfire/layers/d292d1cc-d3d3-4222-9506-b1c7072c523c/fdf24dcd-2f84-46c6-aad2-188692f35fc5.png`);

    // 加载进度事件
    this.load.on('progress', (value: number) => {
      console.log(`Loading: ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      console.log('All assets loaded');
    });

    // 加载错误处理
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`Failed to load: ${file.key}`);
    });
  }

  create(): void {
    // 创建动画
    this.createAnimations();

    // 切换到游戏场景
    this.scene.start('GameScene');
  }

  private createAnimations(): void {
    // 玩家动画
    this.anims.create({
      key: 'player-idle',
      frames: this.anims.generateFrameNumbers('player-idle', { start: 0, end: 8 }),
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: 'player-walk',
      frames: this.anims.generateFrameNumbers('player-walk', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: 'player-run',
      frames: this.anims.generateFrameNumbers('player-run', { start: 0, end: 7 }),
      frameRate: 16,
      repeat: -1,
    });

    // NPC 动画（6个NPC，每个有自己的发型）
    for (let i = 0; i < 6; i++) {
      this.anims.create({
        key: `npc-${i}-idle`,
        frames: this.anims.generateFrameNumbers(`npc-${i}-idle`, { start: 0, end: 8 }),
        frameRate: 8,
        repeat: -1,
      });

      this.anims.create({
        key: `npc-${i}-walk`,
        frames: this.anims.generateFrameNumbers(`npc-${i}-walk`, { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }
}
