import Phaser from 'phaser';
import { TILE_SIZE } from '@/game/constants';

// 颜色定义
const COLORS = {
  player: 0x3498db,
  npc: [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xffa07a, 0xdda0dd],
  tiles: {
    grass: 0x7cb342,
    tree: 0x33691e,
    water: 0x29b6f6,
    sand: 0xffe082,
    dirt: 0x8d6e63,
    stone: 0x9e9e9e,
    house: 0x795548,
    path: 0xd7ccc8,
    viewpoint: 0xff5722,
  },
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 生成彩色占位图作为纹理
    this.generateTextures();
  }

  create(): void {
    // 切换到游戏场景
    this.scene.start('GameScene');
  }

  private generateTextures(): void {
    // 玩家纹理
    this.createPlayerTexture();
    
    // NPC 纹理
    this.createNPCTextures();
    
    // 瓦片纹理
    this.createTileTextures();
  }

  private createPlayerTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    
    // 身体
    graphics.fillStyle(COLORS.player, 1);
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // 边框
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // 方向指示器（南方）
    graphics.fillStyle(0xffff00, 1);
    graphics.fillTriangle(
      TILE_SIZE / 2, TILE_SIZE + 2,
      TILE_SIZE / 2 - 4, TILE_SIZE - 4,
      TILE_SIZE / 2 + 4, TILE_SIZE - 4
    );
    
    graphics.generateTexture('player', TILE_SIZE, TILE_SIZE + 6);
    graphics.destroy();
  }

  private createNPCTextures(): void {
    COLORS.npc.forEach((color, index) => {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      
      // 身体（圆形）
      graphics.fillStyle(color, 1);
      graphics.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2 - 2);
      
      // 边框
      graphics.lineStyle(2, 0xffffff, 0.8);
      graphics.strokeCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2 - 2);
      
      // 方向指示点
      graphics.fillStyle(0xffffff, 1);
      graphics.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2 + TILE_SIZE / 4, 3);
      
      graphics.generateTexture(`npc-${index}`, TILE_SIZE, TILE_SIZE);
      graphics.destroy();
    });
  }

  private createTileTextures(): void {
    const tileTypes = [
      { name: 'grass', color: COLORS.tiles.grass },
      { name: 'tree', color: COLORS.tiles.tree },
      { name: 'water', color: COLORS.tiles.water },
      { name: 'sand', color: COLORS.tiles.sand },
      { name: 'dirt', color: COLORS.tiles.dirt },
      { name: 'stone', color: COLORS.tiles.stone },
      { name: 'house', color: COLORS.tiles.house },
      { name: 'path', color: COLORS.tiles.path },
      { name: 'viewpoint', color: COLORS.tiles.viewpoint },
    ];

    tileTypes.forEach(({ name, color }) => {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      
      // 基础填充
      graphics.fillStyle(color, 1);
      graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      
      // 特殊效果
      if (name === 'grass') {
        // 添加一些草的细节
        graphics.fillStyle(0x558b2f, 0.3);
        graphics.fillRect(4, 4, 4, 4);
        graphics.fillRect(20, 12, 4, 4);
        graphics.fillRect(12, 20, 4, 4);
      } else if (name === 'tree') {
        // 树干
        graphics.fillStyle(0x5d4037, 1);
        graphics.fillRect(12, 12, 8, 20);
        // 树冠
        graphics.fillStyle(0x2e7d32, 1);
        graphics.fillCircle(16, 10, 12);
      } else if (name === 'water') {
        // 水波纹
        graphics.fillStyle(0x4fc3f7, 0.5);
        graphics.fillRect(4, 8, 12, 2);
        graphics.fillRect(16, 20, 10, 2);
      } else if (name === 'viewpoint') {
        // 观景点标记
        graphics.lineStyle(2, 0xffeb3b, 1);
        graphics.strokeRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
        graphics.fillStyle(0xffeb3b, 0.5);
        graphics.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, 6);
      }
      
      graphics.generateTexture(name, TILE_SIZE, TILE_SIZE);
      graphics.destroy();
    });
  }
}
