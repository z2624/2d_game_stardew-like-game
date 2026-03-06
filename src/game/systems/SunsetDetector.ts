import Phaser from 'phaser';
import { Player } from '@/game/entities/Player';
import { MapGenerator } from '@/game/map/MapGenerator';
import { useGameStore } from '@/stores/gameStore';
import {
  WESTERN_DIRECTIONS,
  SUNSET_CONFIG,
  VIEWPOINTS,
  Direction,
  TILE_SIZE,
} from '@/game/constants';
import type { Viewpoint, SunsetEvent } from '@/types/index';

export class SunsetDetector {
  private scene: Phaser.Scene;
  private player: Player;
  private mapGenerator: MapGenerator;
  
  // 检测状态
  private isDetecting: boolean = false;
  private detectionStartTime: number = 0;
  private currentViewpoint: Viewpoint | null = null;
  private lastDirection: Direction = Direction.S;
  private stayTimer: number = 0;
  private progressBar: Phaser.GameObjects.Graphics | null = null;
  
  // 事件追踪
  private sunsetEvents: SunsetEvent[] = [];
  private isGazing: boolean = false;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    mapGenerator: MapGenerator
  ) {
    this.scene = scene;
    this.player = player;
    this.mapGenerator = mapGenerator;
    
    this.initProgressBar();
  }

  private initProgressBar(): void {
    this.progressBar = this.scene.add.graphics();
    this.progressBar.setScrollFactor(0);
    this.progressBar.setDepth(1002);
    this.progressBar.setVisible(false);
  }

  update(time: number, delta: number): void {
    // 检查是否满足日落凝视条件
    const canDetect = this.checkDetectionConditions();
    
    if (canDetect) {
      if (!this.isDetecting) {
        // 开始检测
        this.startDetection(time);
      } else {
        // 继续检测
        this.continueDetection(time, delta);
      }
    } else {
      if (this.isDetecting) {
        // 中断检测
        this.stopDetection();
      }
    }
    
    // 更新进度条
    this.updateProgressBar();
  }

  private checkDetectionConditions(): boolean {
    // 条件1: 玩家朝向西方
    const isFacingWest = this.player.isFacingWest();
    
    // 条件2: 玩家在观景点范围内
    const viewpoint = this.findNearbyViewpoint();
    
    // 条件3: 玩家没有移动
    const isStationary = !this.player.getIsMoving();
    
    return isFacingWest && viewpoint !== null && isStationary;
  }

  private findNearbyViewpoint(): Viewpoint | null {
    const playerPos = this.player.getGridPosition();
    
    for (const vp of VIEWPOINTS) {
      const distance = Math.sqrt(
        Math.pow(playerPos.x - vp.x, 2) + 
        Math.pow(playerPos.y - vp.y, 2)
      );
      
      if (distance <= SUNSET_CONFIG.VIEWPOINT_RANGE) {
        return vp;
      }
    }
    
    return null;
  }

  private startDetection(time: number): void {
    this.isDetecting = true;
    this.detectionStartTime = time;
    this.currentViewpoint = this.findNearbyViewpoint();
    this.stayTimer = 0;
    
    // 显示进度条
    this.progressBar?.setVisible(true);
    
    // 更新游戏状态
    useGameStore.getState().setIsGazingSunset(true, this.currentViewpoint?.name);
    
    console.log(`[SunsetDetector] 开始日落检测 - ${this.currentViewpoint?.name}`);
  }

  private continueDetection(time: number, delta: number): void {
    // 检查玩家是否移动或改变方向
    const currentDirection = this.player.getDirection();
    if (currentDirection !== this.lastDirection) {
      if (!WESTERN_DIRECTIONS.includes(currentDirection)) {
        this.stopDetection();
        return;
      }
    }
    this.lastDirection = currentDirection;
    
    // 检查是否还在观景点附近
    const viewpoint = this.findNearbyViewpoint();
    if (viewpoint?.name !== this.currentViewpoint?.name) {
      this.stopDetection();
      return;
    }
    
    // 累加停留时间
    this.stayTimer += delta;
    
    // 检查是否达到所需时间
    if (this.stayTimer >= SUNSET_CONFIG.REQUIRED_STAY_TIME && !this.isGazing) {
      this.triggerSunsetEvent();
    }
  }

  private stopDetection(): void {
    if (this.isGazing) {
      // 结束凝视
      this.endSunsetGaze();
    }
    
    this.isDetecting = false;
    this.stayTimer = 0;
    this.progressBar?.setVisible(false);
    
    // 更新游戏状态
    useGameStore.getState().setIsGazingSunset(false);
    
    this.scene.events.emit('sunset-end');
    
    console.log('[SunsetDetector] 停止日落检测');
  }

  private triggerSunsetEvent(): void {
    this.isGazing = true;
    
    const event: SunsetEvent = {
      detected: true,
      timestamp: Date.now(),
      viewpointName: this.currentViewpoint?.name,
      duration: 0,
    };
    
    this.sunsetEvents.push(event);
    
    // 发送事件
    this.scene.events.emit('sunset-detected', this.currentViewpoint?.name);
    
    console.log(`[SunsetDetector] 🌅 触发日落事件 - ${this.currentViewpoint?.name}`);
  }

  private endSunsetGaze(): void {
    const lastEvent = this.sunsetEvents[this.sunsetEvents.length - 1];
    if (lastEvent) {
      lastEvent.duration = this.stayTimer;
    }
    
    this.isGazing = false;
    
    console.log(`[SunsetDetector] 结束日落凝视，持续 ${this.stayTimer}ms`);
  }

  private updateProgressBar(): void {
    if (!this.progressBar || !this.isDetecting) return;
    
    this.progressBar.clear();
    
    // 计算进度
    const progress = Math.min(this.stayTimer / SUNSET_CONFIG.REQUIRED_STAY_TIME, 1);
    
    // 背景条
    this.progressBar.fillStyle(0x000000, 0.5);
    this.progressBar.fillRect(350, 550, 100, 10);
    
    // 进度条
    const color = this.isGazing ? 0xff9800 : 0x4caf50;
    this.progressBar.fillStyle(color, 1);
    this.progressBar.fillRect(350, 550, 100 * progress, 10);
    
    // 边框
    this.progressBar.lineStyle(2, 0xffffff, 1);
    this.progressBar.strokeRect(350, 550, 100, 10);
    
    // 提示文字
    if (!this.isGazing) {
      this.progressBar.fillStyle(0xffffff, 1);
    }
  }

  // 公共方法
  isGazingSunset(): boolean {
    return this.isGazing;
  }

  getCurrentViewpoint(): Viewpoint | null {
    return this.currentViewpoint;
  }

  getSunsetEvents(): SunsetEvent[] {
    return [...this.sunsetEvents];
  }

  getStayProgress(): number {
    if (!this.isDetecting) return 0;
    return Math.min(this.stayTimer / SUNSET_CONFIG.REQUIRED_STAY_TIME, 1);
  }
}
