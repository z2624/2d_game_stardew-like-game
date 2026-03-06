// 玩家实体 - 使用素材包精灵图

import Phaser from 'phaser';
import { Direction, TILE_SIZE, PLAYER_CONFIG, WESTERN_DIRECTIONS } from '@/game/constants';
import type { Position, InputState } from '@/types/index';

export class Player extends Phaser.GameObjects.Sprite {
  // 当前状态
  private currentDirection: Direction = Direction.S;
  private isMoving: boolean = false;
  private gridPosition: Position = { x: 0, y: 0 };
  
  // 移动速度
  private speed: number;
  
  // 输入状态
  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // 转换为像素坐标
    const pixelX = x * TILE_SIZE + TILE_SIZE / 2;
    const pixelY = y * TILE_SIZE + TILE_SIZE / 2;
    
    super(scene, pixelX, pixelY, 'player-idle', 0);
    
    this.speed = PLAYER_CONFIG.SPEED;
    this.gridPosition = { x, y };

    // 设置锚点（角色脚底）
    this.setOrigin(0.5, 0.8);
    
    // 设置缩放以适应瓦片尺寸（素材帧是96x64，需要缩小）
    this.setScale(0.3);

    // 设置物理属性
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(20, 20);
    body.setOffset(-10, -5);

    // 启用深度排序
    this.setDepth(pixelY);

    // 播放待机动画
    this.play('player-idle');

    scene.add.existing(this);
  }

  // 处理输入
  handleInput(input: InputState): void {
    this.inputState = input;
    
    // 计算8方向
    let newDirection = this.currentDirection;
    
    if (input.up && input.left) {
      newDirection = Direction.NW;
    } else if (input.up && input.right) {
      newDirection = Direction.NE;
    } else if (input.down && input.left) {
      newDirection = Direction.SW;
    } else if (input.down && input.right) {
      newDirection = Direction.SE;
    } else if (input.up) {
      newDirection = Direction.N;
    } else if (input.down) {
      newDirection = Direction.S;
    } else if (input.left) {
      newDirection = Direction.W;
    } else if (input.right) {
      newDirection = Direction.E;
    }
    
    // 只有移动时才更新方向
    if (input.up || input.down || input.left || input.right) {
      this.currentDirection = newDirection;
      this.updateDirection();
    }
    
    const wasMoving = this.isMoving;
    this.isMoving = input.up || input.down || input.left || input.right;
    
    // 切换动画状态
    if (this.isMoving && !wasMoving) {
      this.play('player-walk', true);
    } else if (!this.isMoving && wasMoving) {
      this.play('player-idle', true);
    }
  }

  // 更新方向（翻转精灵图）
  private updateDirection(): void {
    // 根据方向水平翻转精灵图
    // 素材只有正面，向左走时需要翻转
    const shouldFlipX = this.currentDirection === Direction.W || 
                        this.currentDirection === Direction.NW || 
                        this.currentDirection === Direction.SW;
    
    this.setFlipX(shouldFlipX);
  }

  // 更新玩家位置
  update(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (this.isMoving) {
      // 计算移动向量
      let vx = 0;
      let vy = 0;
      
      switch (this.currentDirection) {
        case Direction.N:  vx = 0; vy = -1; break;
        case Direction.S:  vx = 0; vy = 1; break;
        case Direction.E:  vx = 1; vy = 0; break;
        case Direction.W:  vx = -1; vy = 0; break;
        case Direction.NE: vx = 0.707; vy = -0.707; break;
        case Direction.NW: vx = -0.707; vy = -0.707; break;
        case Direction.SE: vx = 0.707; vy = 0.707; break;
        case Direction.SW: vx = -0.707; vy = 0.707; break;
      }
      
      // 应用速度
      body.setVelocity(vx * this.speed, vy * this.speed);
      
      // 更新深度（基于Y坐标）
      this.setDepth(this.y);
    } else {
      body.setVelocity(0, 0);
    }
    
    // 更新格子位置
    this.gridPosition.x = Math.floor(this.x / TILE_SIZE);
    this.gridPosition.y = Math.floor(this.y / TILE_SIZE);
  }

  // 获取当前方向
  getDirection(): Direction {
    return this.currentDirection;
  }

  // 获取格子位置
  getGridPosition(): Position {
    return { ...this.gridPosition };
  }

  // 获取像素位置
  getPixelPosition(): Position {
    return { x: this.x, y: this.y };
  }

  // 检查是否朝向西方
  isFacingWest(): boolean {
    return WESTERN_DIRECTIONS.includes(this.currentDirection);
  }

  // 检查是否在移动
  getIsMoving(): boolean {
    return this.isMoving;
  }

  // 设置网格位置（传送）
  setGridPosition(x: number, y: number): void {
    this.gridPosition = { x, y };
    this.x = x * TILE_SIZE + TILE_SIZE / 2;
    this.y = y * TILE_SIZE + TILE_SIZE / 2;
    this.setDepth(this.y);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setPosition(this.x, this.y);
  }
}
