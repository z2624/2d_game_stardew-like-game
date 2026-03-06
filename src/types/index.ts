// TypeScript 类型定义

import { Direction, AreaType, TileType } from '@/game/constants';

// 基础坐标
export interface Position {
  x: number;
  y: number;
}

// 格子坐标
export interface GridPosition {
  gx: number;
  gy: number;
}

// NPC 数据
export interface NPCData {
  id: string;
  name: string;
  role: string;
  color: number;
  position: Position;
  currentDirection: Direction;
  isMoving: boolean;
  targetPosition?: Position;
}

// 玩家数据
export interface PlayerData {
  id: string;
  position: Position;
  direction: Direction;
  isMoving: boolean;
  targetPosition?: Position;
}

// 游戏时间
export interface GameTime {
  hour: number;
  minute: number;
  day: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  year: number;
}

// 地图瓦片
export interface Tile {
  type: TileType;
  walkable: boolean;
  x: number;
  y: number;
}

// 地图区域
export interface Area {
  type: AreaType;
  name: string;
  bounds: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  anchorPoints: Position[];
}

// 观景点
export interface Viewpoint {
  x: number;
  y: number;
  name: string;
  area: AreaType;
}

// 日落事件
export interface SunsetEvent {
  detected: boolean;
  timestamp: number;
  viewpointName?: string;
  duration: number;  // 凝视持续时间（毫秒）
}

// 游戏状态
export interface GameState {
  player: PlayerData;
  npcs: NPCData[];
  gameTime: GameTime;
  isPaused: boolean;
  currentArea: AreaType;
  sunsetEvents: SunsetEvent[];
}

// NPC 事件
export interface NPCEvent {
  type: 'talk' | 'gift' | 'quest';
  npcId: string;
  npcName: string;
  content?: string;
}

// 键盘输入状态
export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean;  // 互动键
}

// 日落检测状态
export interface SunsetDetectionState {
  isDetecting: boolean;
  startTime: number;
  currentViewpoint: Viewpoint | null;
  progress: number;  // 0-1 进度
}

// LLM API 响应
export interface LLMResponse {
  text: string;
  error?: string;
}

// 地图生成配置
export interface MapGenConfig {
  width: number;
  height: number;
  seed?: number;
}

// 游戏配置
export interface GameConfig {
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  debug: boolean;
}
