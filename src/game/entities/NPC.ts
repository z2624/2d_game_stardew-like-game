// NPC 实体 - 使用素材包精灵图

import Phaser from 'phaser';
import { Direction, TILE_SIZE, NPC_CONFIG } from '@/game/constants';
import type { NPCData, Position } from '@/types/index';

export class NPC extends Phaser.GameObjects.Sprite {
  // NPC 数据
  private npcId: string;
  private npcName: string;
  private npcRole: string;
  private npcIndex: number;  // 0-5，对应不同发型
  private currentDirection: Direction = Direction.S;
  private isMoving: boolean = false;
  private gridPosition: Position = { x: 0, y: 0 };
  
  // AI 状态
  private idleTimer: number = 0;
  private moveTimer: number = 0;
  private targetGridPosition: Position | null = null;
  
  // 移动参数
  private speed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,  // 格子坐标
    y: number,
    config: {
      id: string;
      name: string;
      role: string;
      index: number;  // 0-5，对应不同发型
    }
  ) {
    // 转换为像素坐标
    const pixelX = x * TILE_SIZE + TILE_SIZE / 2;
    const pixelY = y * TILE_SIZE + TILE_SIZE / 2;
    
    super(scene, pixelX, pixelY, `npc-${config.index}-idle`, 0);
    
    this.npcId = config.id;
    this.npcName = config.name;
    this.npcRole = config.role;
    this.npcIndex = config.index;
    this.speed = NPC_CONFIG.MOVEMENT_SPEED;
    this.gridPosition = { x, y };

    // 设置锚点
    this.setOrigin(0.5, 0.5);
    
    // 设置缩放 - 32x32 素材放大到合适尺寸
    this.setScale(0.8);

    // 设置物理属性
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(16, 16);
    body.setOffset(-8, -8);
    body.immovable = true;

    // 设置深度
    this.setDepth(pixelY);

    // 播放待机动画
    this.play(`npc-${this.npcIndex}-idle`);

    // 设置交互
    this.setInteractive();

    scene.add.existing(this);

    // 初始化随机空闲时间
    this.resetIdleTimer();
  }

  // 更新方向（翻转精灵图）
  private updateDirection(dx: number, dy: number): void {
    // 计算8方向
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      if (dy < -0.3 && dx > 0.3) {
        this.currentDirection = Direction.NE;
      } else if (dy < -0.3 && dx < -0.3) {
        this.currentDirection = Direction.NW;
      } else if (dy > 0.3 && dx > 0.3) {
        this.currentDirection = Direction.SE;
      } else if (dy > 0.3 && dx < -0.3) {
        this.currentDirection = Direction.SW;
      } else if (Math.abs(dy) > Math.abs(dx)) {
        this.currentDirection = dy < 0 ? Direction.N : Direction.S;
      } else {
        this.currentDirection = dx > 0 ? Direction.E : Direction.W;
      }
      
      // 根据方向水平翻转精灵图
      const shouldFlipX = this.currentDirection === Direction.W || 
                          this.currentDirection === Direction.NW || 
                          this.currentDirection === Direction.SW;
      
      this.setFlipX(shouldFlipX);
    }
  }

  // 重置空闲计时器
  private resetIdleTimer(): void {
    this.idleTimer = Phaser.Math.Between(
      NPC_CONFIG.IDLE_TIME,
      NPC_CONFIG.IDLE_TIME * 3
    );
  }

  // AI 更新
  update(time: number, delta: number, mapGenerator?: any): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    if (this.isMoving) {
      // 正在移动，检查是否到达目标
      if (this.targetGridPosition) {
        const targetX = this.targetGridPosition.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = this.targetGridPosition.y * TILE_SIZE + TILE_SIZE / 2;
        
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 2) {
          // 到达目标
          this.x = targetX;
          this.y = targetY;
          body.setVelocity(0, 0);
          this.isMoving = false;
          this.targetGridPosition = null;
          this.resetIdleTimer();
          
          // 切换回待机动画
          this.play(`npc-${this.npcIndex}-idle`, true);
        } else {
          // 继续移动
          const vx = (dx / distance) * this.speed;
          const vy = (dy / distance) * this.speed;
          body.setVelocity(vx, vy);
          this.updateDirection(dx, dy);
        }
      }
      
      // 更新深度
      this.setDepth(this.y);
    } else {
      // 空闲状态
      this.idleTimer -= delta;
      
      if (this.idleTimer <= 0) {
        // 随机选择一个新目标
        this.chooseRandomDestination(mapGenerator);
      }
    }
    
    // 更新格子位置
    this.gridPosition.x = Math.floor(this.x / TILE_SIZE);
    this.gridPosition.y = Math.floor(this.y / TILE_SIZE);
  }

  // 选择随机目的地
  private chooseRandomDestination(mapGenerator?: any): void {
    const directions = [
      { dx: 0, dy: -1 },  // N
      { dx: 1, dy: -1 },  // NE
      { dx: 1, dy: 0 },   // E
      { dx: 1, dy: 1 },   // SE
      { dx: 0, dy: 1 },   // S
      { dx: -1, dy: 1 },  // SW
      { dx: -1, dy: 0 },  // W
      { dx: -1, dy: -1 }, // NW
    ];
    
    // 尝试几次找到可走的点
    for (let i = 0; i < 10; i++) {
      const dir = Phaser.Utils.Array.GetRandom(directions);
      const newX = this.gridPosition.x + dir.dx * Phaser.Math.Between(2, 5);
      const newY = this.gridPosition.y + dir.dy * Phaser.Math.Between(2, 5);
      
      // 检查是否可行走
      if (mapGenerator?.isWalkable(newX, newY) ?? true) {
        this.targetGridPosition = { x: newX, y: newY };
        this.isMoving = true;
        
        // 切换行走动画
        this.play(`npc-${this.npcIndex}-walk`, true);
        return;
      }
    }
    
    // 如果没有找到有效目标，继续空闲
    this.resetIdleTimer();
  }

  // 获取 NPC ID
  getId(): string {
    return this.npcId;
  }

  // 获取名字
  getName(): string {
    return this.npcName;
  }

  // 获取角色
  getRole(): string {
    return this.npcRole;
  }

  // 获取格子位置
  getGridPosition(): Position {
    return { ...this.gridPosition };
  }

  // 获取像素位置
  getPixelPosition(): Position {
    return { x: this.x, y: this.y };
  }

  // 获取当前方向
  getDirection(): Direction {
    return this.currentDirection;
  }

  // 检查是否在移动
  getIsMoving(): boolean {
    return this.isMoving;
  }

  // 获取 NPC 数据
  getData(): NPCData {
    return {
      id: this.npcId,
      name: this.npcName,
      role: this.npcRole,
      color: 0xffffff,
      position: { ...this.gridPosition },
      currentDirection: this.currentDirection,
      isMoving: this.isMoving,
      targetPosition: this.targetGridPosition ?? undefined,
    };
  }

  // 设置交互回调
  setInteractionCallback(callback: () => void): void {
    this.on('pointerdown', callback);
  }

  // 显示对话气泡
  showSpeechBubble(text: string, duration: number = 3000): void {
    // 移除旧的气泡
    const existingBubble = this.scene.children.getByName(`bubble-${this.npcId}`);
    if (existingBubble) {
      existingBubble.destroy();
    }

    // 创建气泡背景
    const bubbleWidth = Math.min(text.length * 8 + 20, 200);
    const bubbleHeight = 30;
    
    const bubbleY = this.y - 30;
    
    const bubble = this.scene.add.graphics();
    bubble.setName(`bubble-${this.npcId}`);
    bubble.fillStyle(0xffffff, 1);
    bubble.fillRoundedRect(this.x - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 5);
    bubble.lineStyle(2, 0x000000, 1);
    bubble.strokeRoundedRect(this.x - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleWidth, bubbleHeight, 5);

    // 创建文字
    const bubbleText = this.scene.add.text(this.x, bubbleY, text, {
      fontSize: '10px',
      color: '#000000',
      align: 'center',
      wordWrap: { width: bubbleWidth - 10 },
    }).setOrigin(0.5);
    bubbleText.setName(`bubbleText-${this.npcId}`);

    // 定时移除
    this.scene.time.delayedCall(duration, () => {
      bubble.destroy();
      bubbleText.destroy();
    });
  }
}
