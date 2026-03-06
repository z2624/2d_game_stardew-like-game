import { create } from 'zustand';
import type { Position, Direction } from '@/types/index';

// 游戏时间
interface GameTime {
  hour: number;
  minute: number;
}

// 天气类型
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'stormy';

// 游戏状态接口
interface GameState {
  // 玩家状态
  playerPosition: Position;
  playerDirection: Direction;
  isMoving: boolean;
  isSitting: boolean;
  
  // 环境状态
  currentTime: GameTime;
  currentWeather: WeatherType;
  isSunset: boolean;
  
  // 交互状态
  interactingNPC: string | null;
  isGazingSunset: boolean;
  currentViewpoint: string | null;
  
  // 统计
  playTime: number; // 秒
  sunsetGazeCount: number;
  totalSunsetGazeTime: number; // 毫秒
  
  // 动作
  setPlayerPosition: (position: Position) => void;
  setPlayerDirection: (direction: Direction) => void;
  setIsMoving: (isMoving: boolean) => void;
  setIsSitting: (isSitting: boolean) => void;
  
  setGameTime: (time: GameTime) => void;
  setWeather: (weather: WeatherType) => void;
  setIsSunset: (isSunset: boolean) => void;
  
  setInteractingNPC: (npcId: string | null) => void;
  setIsGazingSunset: (isGazing: boolean, viewpoint?: string) => void;
  
  incrementPlayTime: (seconds: number) => void;
  recordSunsetGaze: (duration: number) => void;
  
  // 重置
  reset: () => void;
}

// 初始状态
const initialState = {
  playerPosition: { x: 25, y: 25 },
  playerDirection: 'S' as Direction,
  isMoving: false,
  isSitting: false,
  
  currentTime: { hour: 12, minute: 0 },
  currentWeather: 'sunny' as WeatherType,
  isSunset: false,
  
  interactingNPC: null,
  isGazingSunset: false,
  currentViewpoint: null,
  
  playTime: 0,
  sunsetGazeCount: 0,
  totalSunsetGazeTime: 0,
};

// 创建 Zustand Store
export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  
  // 玩家位置
  setPlayerPosition: (position) => {
    set({ playerPosition: position });
  },
  
  // 玩家朝向
  setPlayerDirection: (direction) => {
    set({ playerDirection: direction });
  },
  
  // 移动状态
  setIsMoving: (isMoving) => {
    set({ isMoving });
  },
  
  // 坐下状态
  setIsSitting: (isSitting) => {
    set({ isSitting });
  },
  
  // 游戏时间
  setGameTime: (time) => {
    set({ currentTime: time });
  },
  
  // 天气
  setWeather: (weather) => {
    set({ currentWeather: weather });
  },
  
  // 日落状态
  setIsSunset: (isSunset) => {
    set({ isSunset });
  },
  
  // NPC 交互
  setInteractingNPC: (npcId) => {
    set({ interactingNPC: npcId });
  },
  
  // 日落凝视
  setIsGazingSunset: (isGazing, viewpoint) => {
    const state = get();
    
    if (isGazing && !state.isGazingSunset) {
      // 开始凝视
      set({ 
        isGazingSunset: true, 
        currentViewpoint: viewpoint || null,
        sunsetGazeCount: state.sunsetGazeCount + 1,
      });
    } else if (!isGazing && state.isGazingSunset) {
      // 结束凝视
      set({ 
        isGazingSunset: false, 
        currentViewpoint: null,
      });
    }
  },
  
  // 增加游戏时间
  incrementPlayTime: (seconds) => {
    set((state) => ({ playTime: state.playTime + seconds }));
  },
  
  // 记录日落凝视时间
  recordSunsetGaze: (duration) => {
    set((state) => ({
      totalSunsetGazeTime: state.totalSunsetGazeTime + duration,
    }));
  },
  
  // 重置状态
  reset: () => {
    set(initialState);
  },
}));

// 选择器函数（用于优化重渲染）
export const selectPlayerPosition = (state: GameState) => state.playerPosition;
export const selectPlayerDirection = (state: GameState) => state.playerDirection;
export const selectIsMoving = (state: GameState) => state.isMoving;
export const selectCurrentTime = (state: GameState) => state.currentTime;
export const selectIsSunset = (state: GameState) => state.isSunset;
export const selectIsGazingSunset = (state: GameState) => state.isGazingSunset;
export const selectCurrentViewpoint = (state: GameState) => state.currentViewpoint;
export const selectInteractingNPC = (state: GameState) => state.interactingNPC;
export const selectGameStats = (state: GameState) => ({
  playTime: state.playTime,
  sunsetGazeCount: state.sunsetGazeCount,
  totalSunsetGazeTime: state.totalSunsetGazeTime,
});
