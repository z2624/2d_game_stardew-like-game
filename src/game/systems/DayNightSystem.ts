import Phaser from 'phaser';
import { useGameStore } from '@/stores/gameStore';
import { GAME_TIME_CONFIG } from '@/game/constants';

// 时间状态
enum TimeOfDay {
  SUNRISE = 'sunrise',   // 日出 6:00-8:00
  MORNING = 'morning',   // 上午 8:00-12:00
  NOON = 'noon',         // 正午 12:00-14:00
  AFTERNOON = 'afternoon', // 下午 14:00-17:00
  SUNSET = 'sunset',     // 日落 17:00-19:00
  NIGHT = 'night',       // 夜晚 19:00-6:00
}

// 滤镜配置
interface FilterConfig {
  color: number;
  alpha: number;
  brightness: number;
  saturation: number;
}

export class DayNightSystem {
  private scene: Phaser.Scene;
  private overlay!: Phaser.GameObjects.Rectangle;
  private currentTime: Date = new Date();
  private currentHour: number = 12;
  private currentMinute: number = 0;
  private timeOfDay: TimeOfDay = TimeOfDay.NOON;
  
  // 滤镜颜色配置
  private readonly FILTERS: Record<TimeOfDay, FilterConfig> = {
    [TimeOfDay.SUNRISE]: {
      color: 0xffa07a,    // 浅橙色
      alpha: 0.3,
      brightness: 1.1,
      saturation: 1.1,
    },
    [TimeOfDay.MORNING]: {
      color: 0xffffff,    // 正常
      alpha: 0,
      brightness: 1.0,
      saturation: 1.0,
    },
    [TimeOfDay.NOON]: {
      color: 0xffffff,    // 正常
      alpha: 0,
      brightness: 1.0,
      saturation: 1.0,
    },
    [TimeOfDay.AFTERNOON]: {
      color: 0xffeebb,    // 暖黄色
      alpha: 0.1,
      brightness: 1.0,
      saturation: 1.0,
    },
    [TimeOfDay.SUNSET]: {
      color: 0xff5722,    // 橙红色
      alpha: 0.4,
      brightness: 0.9,
      saturation: 1.2,
    },
    [TimeOfDay.NIGHT]: {
      color: 0x1a237e,    // 深蓝色
      alpha: 0.5,
      brightness: 0.6,
      saturation: 0.8,
    },
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initOverlay();
    this.updateTimeFromRealWorld();
  }

  private initOverlay(): void {
    // 创建全屏滤镜层
    this.overlay = this.scene.add.rectangle(
      400, 300, 800, 600, 0x000000, 0
    );
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(999);
    this.overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  update(time: number, delta: number): void {
    // 每秒更新一次现实时间
    if (Math.floor(time / 1000) % 1 === 0) {
      this.updateTimeFromRealWorld();
    }
  }

  private updateTimeFromRealWorld(): void {
    this.currentTime = new Date();
    this.currentHour = this.currentTime.getHours();
    this.currentMinute = this.currentTime.getMinutes();
    
    // 确定时段
    const newTimeOfDay = this.determineTimeOfDay();
    
    if (newTimeOfDay !== this.timeOfDay) {
      this.timeOfDay = newTimeOfDay;
      this.applyFilter();
    }
    
    // 更新游戏状态
    this.updateGameStore();
    
    // 发送事件
    this.scene.events.emit('time-update', this.getTimeString());
  }

  private determineTimeOfDay(): TimeOfDay {
    const hour = this.currentHour;
    
    if (hour >= 6 && hour < 8) {
      return TimeOfDay.SUNRISE;
    } else if (hour >= 8 && hour < 12) {
      return TimeOfDay.MORNING;
    } else if (hour >= 12 && hour < 14) {
      return TimeOfDay.NOON;
    } else if (hour >= 14 && hour < 17) {
      return TimeOfDay.AFTERNOON;
    } else if (hour >= 17 && hour < 19) {
      return TimeOfDay.SUNSET;
    } else {
      return TimeOfDay.NIGHT;
    }
  }

  private applyFilter(): void {
    const config = this.FILTERS[this.timeOfDay];
    
    // 创建渐变效果
    this.scene.tweens.add({
      targets: this.overlay,
      fillAlpha: config.alpha,
      fillColor: config.color,
      duration: 2000,
      ease: 'Power2',
    });
    
    // 更新相机效果
    this.scene.cameras.main.setAlpha(1);
  }

  private updateGameStore(): void {
    const store = useGameStore.getState();
    store.setGameTime({
      hour: this.currentHour,
      minute: this.currentMinute,
    });
    store.setIsSunset(this.timeOfDay === TimeOfDay.SUNSET);
  }

  private getTimeString(): string {
    const hour = this.currentHour.toString().padStart(2, '0');
    const minute = this.currentMinute.toString().padStart(2, '0');
    const timeName = this.getTimeName();
    return `${hour}:${minute} ${timeName}`;
  }

  private getTimeName(): string {
    switch (this.timeOfDay) {
      case TimeOfDay.SUNRISE: return '🌅 日出';
      case TimeOfDay.MORNING: return '☀️ 上午';
      case TimeOfDay.NOON: return '☀️ 正午';
      case TimeOfDay.AFTERNOON: return '🌤️ 下午';
      case TimeOfDay.SUNSET: return '🌇 日落';
      case TimeOfDay.NIGHT: return '🌙 夜晚';
      default: return '';
    }
  }

  // 公共方法
  isSunset(): boolean {
    return this.timeOfDay === TimeOfDay.SUNSET;
  }

  isNight(): boolean {
    return this.timeOfDay === TimeOfDay.NIGHT;
  }

  getCurrentTime(): { hour: number; minute: number } {
    return {
      hour: this.currentHour,
      minute: this.currentMinute,
    };
  }

  getTimeOfDay(): TimeOfDay {
    return this.timeOfDay;
  }
}
