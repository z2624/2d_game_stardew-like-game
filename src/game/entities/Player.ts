// 玩家实体 - 8方向移动

import Phaser from 'phaser';
import { Direction, TILE_SIZE, PLAYER_CONFIG, WESTERN_DIRECTIONS } from '@/game/constants';
import type { Position, InputState } from '@/types/index';

export class Player extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Graphics;
  private directionIndicator: Phaser.GameObjects.Graphics;
  private directionText: Phaser.GameObjects.Text;
  
  // 当前状态
  private currentDirection: Direction = Direction.S;
  private isMoving: boolean = false;
  private targetPosition: Position = { x: 0, y: 0 };
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
    
    super(scene, pixelX, pixelY);
    
    this.speed = PLAYER_CONFIG.SPEED;
    this.targetPosition = { x: pixelX, y: pixelY };
    this.gridPosition = { x, y };

    // 创建玩家精灵（彩色方块）
    this.sprite = scene.add.graphics();
    this.drawPlayerSprite();

    // 创建方向指示器
    this.directionIndicator = scene.add.graphics();
    this.drawDirectionIndicator();

    // 创建方向文字（调试用）
    this.directionText = scene.add.text(0, -TILE_SIZE, Direction.S, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
    }).setOrigin(0.5);
    this.directionText.setVisible(false); // 默认隐藏

    // 添加到容器
    this.add([this.sprite, this.directionIndicator, this.directionText]);

    // 设置物理属性
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(TILE_SIZE * 0.6, TILE_SIZE * 0.6);
    body.setOffset(-TILE_SIZE * 0.3, -TILE_SIZE * 0.3);

    // 启用深度排序
    this.setDepth(pixelY);

    scene.add.existing(this);
  }

  // 绘制玩家精灵
  private drawPlayerSprite(): void {
    this.sprite.clear();
    
    // 身体
    this.sprite.fillStyle(PLAYER_CONFIG.COLOR, 1);
    this.sprite.fillRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    
    // 边框
    this.sprite.lineStyle(2, 0xffffff, 1);
    this.sprite.strokeRect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  }

  // 绘制方向指示器
  private drawDirectionIndicator(): void {
    this.directionIndicator.clear();
    this.directionIndicator.fillStyle(0xffff00, 1);
    
    // 根据方向绘制箭头
    const arrowSize = 6;
    const offset = TILE_SIZE / 2 + 2;
    
    switch (this.currentDirection) {
      case Direction.N:
        this.directionIndicator.fillTriangle(0, -offset, -arrowSize/2, -offset + arrowSize, arrowSize/2, -offset + arrowSize);
        break;
      case Direction.S:
        this.directionIndicator.fillTriangle(0, offset, -arrowSize/2, offset - arrowSize, arrowSize/2, offset - arrowSize);
        break;
      case Direction.E:
        this.directionIndicator.fillTriangle(offset, 0, offset - arrowSize, -arrowSize/2, offset - arrowSize, arrowSize/2);
        break;
      case Direction.W:
        this.directionIndicator.fillTriangle(-offset, 0, -offset + arrowSize, -arrowSize/2, -offset + arrowSize, arrowSize/2);
        break;
      case Direction.NE:
        this.directionIndicator.fillTriangle(offset * 0.7, -offset * 0.7, offset * 0.7 - arrowSize, -offset * 0.7, offset * 0.7, -offset * 0.7 + arrowSize);
        break;
      case Direction.NW:
        this.directionIndicator.fillTriangle(-offset * 0.7, -offset * 0.7, -offset * 0.7 + arrowSize, -offset * 0.7, -offset * 0.7, -offset * 0.7 + arrowSize);
        break;
      case Direction.SE:
        this.directionIndicator.fillTriangle(offset * 0.7, offset * 0.7, offset * 0.7 - arrowSize, offset * 0.7, offset * 0.7, offset * 0.7 - arrowSize);
        break;
      case Direction.SW:
        this.directionIndicator.fillTriangle(-offset * 0.7, offset * 0.7, -offset * 0.7 + arrowSize, offset * 0.7, -offset * 0.7, offset * 0.7 - arrowSize);
        break;
    }
  }

  // 更新方向
  private updateDirection(): void {
    this.directionIndicator.clear();
    this.drawDirectionIndicator();
    this.directionText.setText(this.currentDirection);
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
    
    this.isMoving = input.up || input.down || input.left || input.right;
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
      
      // 归一化并应用速度
      const normalizedSpeed = this.speed * (delta / 1000) * 60;
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
    this.targetPosition = { x: this.x, y: this.y };
    this.setDepth(this.y);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setPosition(this.x, this.y);
  }

  // 显示/隐藏方向指示
  setDebugMode(enabled: boolean): void {
    this.directionText.setVisible(enabled);
  }
}
