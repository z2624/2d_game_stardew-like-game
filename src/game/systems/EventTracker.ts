import { useGameStore } from '@/stores/gameStore';
import type { Position, Direction, AreaType } from '@/types/index';

// 事件类型
export type GameEventType =
  | 'game_start'
  | 'player_move'
  | 'player_sit'
  | 'player_stand'
  | 'area_change'
  | 'npc_talk'
  | 'sunset_gaze_start'
  | 'sunset_gaze_end'
  | 'item_pickup'
  | 'item_use'
  | 'system';

// 事件数据结构
export interface GameEvent {
  id: string;
  type: GameEventType;
  timestamp: number;
  data: Record<string, any>;
  playerPosition?: Position;
  area?: string;
}

// 后端 API 配置
const API_ENDPOINT = 'http://localhost:3000/api/events'; // 预留后端接口

export class EventTracker {
  private events: GameEvent[] = [];
  private maxEvents: number = 1000;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30秒批量推送
  private lastFlushTime: number = Date.now();

  constructor() {
    // 初始化时记录游戏启动
    this.trackEvent('game_start', {
      timestamp: new Date().toISOString(),
    });
    
    // 定期批量推送
    setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  // 记录事件
  trackEvent(type: GameEventType, data: Record<string, any> = {}): GameEvent {
    const event: GameEvent = {
      id: this.generateEventId(),
      type,
      timestamp: Date.now(),
      data,
      playerPosition: data.position,
      area: data.area,
    };

    this.events.push(event);
    
    // 限制事件数量
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // 控制台输出（开发调试）
    this.logEvent(event);

    // 检查是否需要立即推送
    if (this.shouldFlushImmediately(type)) {
      this.flushEvents();
    }

    return event;
  }

  // 记录玩家移动
  trackPlayerMove(position: Position, direction: Direction): void {
    this.trackEvent('player_move', {
      position,
      direction,
      x: position.x,
      y: position.y,
    });
  }

  // 记录区域切换
  trackAreaChange(from: AreaType, to: AreaType, position: Position): void {
    this.trackEvent('area_change', {
      from,
      to,
      position,
      fromName: this.getAreaName(from),
      toName: this.getAreaName(to),
    });
  }

  // 记录坐下
  trackPlayerSit(position: Position): void {
    this.trackEvent('player_sit', {
      position,
    });
  }

  // 记录站起
  trackPlayerStand(position: Position): void {
    this.trackEvent('player_stand', {
      position,
    });
  }

  // 记录日落凝视
  trackSunsetGazeStart(viewpointName: string, position: Position): void {
    this.trackEvent('sunset_gaze_start', {
      viewpointName,
      position,
    });
  }

  trackSunsetGazeEnd(viewpointName: string, duration: number, position: Position): void {
    this.trackEvent('sunset_gaze_end', {
      viewpointName,
      duration,
      position,
    });
  }

  // 记录 NPC 对话
  trackNPCTalk(npcId: string, npcName: string, position: Position): void {
    this.trackEvent('npc_talk', {
      npcId,
      npcName,
      position,
    });
  }

  // 获取所有事件
  getEvents(): GameEvent[] {
    return [...this.events];
  }

  // 获取最近的事件
  getRecentEvents(count: number = 10): GameEvent[] {
    return this.events.slice(-count);
  }

  // 按类型筛选事件
  getEventsByType(type: GameEventType): GameEvent[] {
    return this.events.filter(e => e.type === type);
  }

  // 清空事件
  clearEvents(): void {
    this.events = [];
  }

  // 批量推送到后端
  async flushEvents(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToFlush = this.events.splice(0, this.batchSize);
    
    try {
      // 开发阶段：仅打印到控制台
      console.log('[EventTracker] 批量推送事件:', eventsToFlush);
      
      // TODO: 接入实际后端 API
      // await this.pushToBackend(eventsToFlush);
      
      this.lastFlushTime = Date.now();
    } catch (error) {
      console.error('[EventTracker] 推送失败:', error);
      // 失败时恢复事件
      this.events.unshift(...eventsToFlush);
    }
  }

  // 推送到后端（预留）
  private async pushToBackend(events: GameEvent[]): Promise<void> {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  // 生成唯一事件 ID
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 控制台输出事件
  private logEvent(event: GameEvent): void {
    const time = new Date(event.timestamp).toLocaleTimeString();
    const emoji = this.getEventEmoji(event.type);
    
    console.log(
      `[${time}] ${emoji} [${event.type.toUpperCase()}]`,
      JSON.stringify(event.data, null, 2)
    );
  }

  // 获取事件表情
  private getEventEmoji(type: GameEventType): string {
    const emojiMap: Record<GameEventType, string> = {
      'game_start': '🎮',
      'player_move': '🚶',
      'player_sit': '🪑',
      'player_stand': '🧍',
      'area_change': '🗺️',
      'npc_talk': '💬',
      'sunset_gaze_start': '🌅',
      'sunset_gaze_end': '🌇',
      'item_pickup': '📦',
      'item_use': '✨',
      'system': '⚙️',
    };
    return emojiMap[type] || '📝';
  }

  // 获取区域名称
  private getAreaName(area: AreaType): string {
    const nameMap: Record<AreaType, string> = {
      'forest': '森林',
      'mountain': '山顶',
      'town': '城镇',
      'beach': '海滩',
      'water': '水域',
    };
    return nameMap[area] || area;
  }

  // 检查是否需要立即推送
  private shouldFlushImmediately(type: GameEventType): boolean {
    const immediateTypes: GameEventType[] = [
      'sunset_gaze_start',
      'sunset_gaze_end',
      'game_start',
    ];
    return immediateTypes.includes(type);
  }

  // 导出事件日志（用于调试）
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }

  // 保存到本地存储
  saveToLocalStorage(): void {
    try {
      localStorage.setItem('game_events', JSON.stringify(this.events));
    } catch (e) {
      console.error('[EventTracker] 本地存储失败:', e);
    }
  }

  // 从本地存储加载
  loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('game_events');
      if (data) {
        this.events = JSON.parse(data);
      }
    } catch (e) {
      console.error('[EventTracker] 本地加载失败:', e);
    }
  }
}

// 单例实例
let eventTrackerInstance: EventTracker | null = null;

export function getEventTracker(): EventTracker {
  if (!eventTrackerInstance) {
    eventTrackerInstance = new EventTracker();
  }
  return eventTrackerInstance;
}
