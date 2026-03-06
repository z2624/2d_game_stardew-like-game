import Phaser from 'phaser';
import { TILE_SIZE } from '@/game/constants';

// 素材路径配置 - 从 public 目录访问（必须以 / 开头）
const ASSET_PATH = '/assets/Sunnyside_World_ASSET_PACK_V2.1/Sunnyside_World_Assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 加载瓦片地图集
    this.load.image('tileset', `${ASSET_PATH}/Tileset/spr_tileset_sunnysideworld_16px.png`);

    // 加载玩家角色精灵图（基础身体）
    // 素材帧尺寸: 32x32 像素
    this.load.spritesheet('player-idle', `${ASSET_PATH}/Characters/Human/IDLE/base_idle_strip9.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('player-walk', `${ASSET_PATH}/Characters/Human/WALKING/base_walk_strip8.png`, {
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
