import Phaser from 'phaser';
import { Player } from '@/game/entities/Player';
import { NPC } from '@/game/entities/NPC';
import { MapGenerator } from '@/game/map/MapGenerator';
import { DayNightSystem } from '@/game/systems/DayNightSystem';
import { SunsetDetector } from '@/game/systems/SunsetDetector';
import { EventTracker } from '@/game/systems/EventTracker';
import { useGameStore } from '@/stores/gameStore';
import {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  NPC_CONFIG,
  NPC_SPAWN_POINTS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '@/game/constants';
import type { InputState } from '@/types/index';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private mapGenerator!: MapGenerator;
  private tileMap!: Phaser.GameObjects.Group;
  private dayNightSystem!: DayNightSystem;
  private sunsetDetector!: SunsetDetector;
  private eventTracker!: EventTracker;
  
  // 输入
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  
  // 状态
  private lastGridPosition = { x: -1, y: -1 };
  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // 初始化地图
    this.initMap();
    
    // 初始化玩家
    this.initPlayer();
    
    // 初始化 NPC
    this.initNPCs();
    
    // 初始化系统
    this.initSystems();
    
    // 初始化输入
    this.initInput();
    
    // 初始化 UI
    this.initUI();
    
    // 设置碰撞
    this.setupCollisions();
    
    // 记录游戏开始事件
    this.eventTracker.trackEvent('game_start', {
      playerPosition: this.player.getGridPosition(),
    });
  }

  update(time: number, delta: number): void {
    // 更新输入状态
    this.updateInput();
    
    // 更新玩家
    this.player.handleInput(this.inputState);
    this.player.update(time, delta);
    
    // 更新 NPC
    this.npcs.forEach(npc => npc.update(time, delta, this.mapGenerator));
    
    // 更新系统
    this.dayNightSystem.update(time, delta);
    this.sunsetDetector.update(time, delta);
    
    // 更新游戏状态
    this.updateGameStore();
    
    // 检测区域变化
    this.checkAreaChange();
  }

  private initMap(): void {
    this.tileMap = this.add.group();
    this.mapGenerator = new MapGenerator();
    const mapData = this.mapGenerator.generate();

    // 渲染地图瓦片
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = mapData[y][x];
        const sprite = this.add.sprite(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          tile.type
        );
        sprite.setDepth(y * TILE_SIZE);
        this.tileMap.add(sprite);
      }
    }

    // 设置世界边界
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private initPlayer(): void {
    // 在中心位置创建玩家 (25, 25)
    this.player = new Player(this, 25, 25);
    
    // 设置相机跟随
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private initNPCs(): void {
    // 使用前6个 NPC 配置
    const npcConfigs = NPC_SPAWN_POINTS.slice(0, 6);
    
    npcConfigs.forEach((config, index) => {
      const color = NPC_CONFIG.COLORS[index % NPC_CONFIG.COLORS.length];
      
      const npc = new NPC(this, config.x, config.y, {
        id: `npc-${index}`,
        name: config.name,
        role: config.role,
        color: color,
      });
      
      // 设置交互
      npc.setInteractionCallback(() => {
        this.handleNPCInteraction(npc);
      });
      
      this.npcs.push(npc);
    });
  }

  private initSystems(): void {
    // 昼夜系统
    this.dayNightSystem = new DayNightSystem(this);
    
    // 日落检测系统
    this.sunsetDetector = new SunsetDetector(
      this,
      this.player,
      this.mapGenerator
    );
    
    // 事件追踪系统
    this.eventTracker = new EventTracker();
  }

  private initInput(): void {
    // 方向键
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    // WASD
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    
    // 交互键
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private initUI(): void {
    // 时间显示
    const timeText = this.add.text(10, 10, '', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    });
    timeText.setScrollFactor(0);
    timeText.setDepth(1000);
    
    // 监听时间变化
    this.events.on('time-update', (timeStr: string) => {
      timeText.setText(timeStr);
    });
    
    // 区域显示
    const areaText = this.add.text(10, 40, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    });
    areaText.setScrollFactor(0);
    areaText.setDepth(1000);
    
    this.events.on('area-change', (areaName: string) => {
      areaText.setText(`区域: ${areaName}`);
    });
    
    // 日落凝视提示
    const sunsetText = this.add.text(400, 100, '', {
      fontSize: '20px',
      color: '#ff9800',
      backgroundColor: '#000000aa',
      padding: { x: 12, y: 6 },
    });
    sunsetText.setOrigin(0.5);
    sunsetText.setScrollFactor(0);
    sunsetText.setDepth(1001);
    sunsetText.setVisible(false);
    
    this.events.on('sunset-detected', (viewpointName: string) => {
      sunsetText.setText(`🌅 正在凝视日落 - ${viewpointName}`);
      sunsetText.setVisible(true);
    });
    
    this.events.on('sunset-end', () => {
      sunsetText.setVisible(false);
    });
  }

  private setupCollisions(): void {
    // 玩家与 NPC 碰撞
    this.npcs.forEach(npc => {
      this.physics.add.collider(this.player, npc);
    });
    
    // 玩家与世界边界碰撞已在 Player 类中设置
  }

  private updateInput(): void {
    this.inputState = {
      up: this.cursors.up!.isDown || this.wasd.W.isDown,
      down: this.cursors.down!.isDown || this.wasd.S.isDown,
      left: this.cursors.left!.isDown || this.wasd.A.isDown,
      right: this.cursors.right!.isDown || this.wasd.D.isDown,
      action: this.input.keyboard!.checkDown(
        this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        500
      ),
    };
  }

  private updateGameStore(): void {
    const store = useGameStore.getState();
    const gridPos = this.player.getGridPosition();
    
    // 只在状态变化时更新
    if (
      gridPos.x !== store.playerPosition.x ||
      gridPos.y !== store.playerPosition.y
    ) {
      store.setPlayerPosition(gridPos);
    }
    
    if (this.player.getDirection() !== store.playerDirection) {
      store.setPlayerDirection(this.player.getDirection());
    }
  }

  private checkAreaChange(): void {
    const gridPos = this.player.getGridPosition();
    
    if (
      gridPos.x !== this.lastGridPosition.x ||
      gridPos.y !== this.lastGridPosition.y
    ) {
      this.lastGridPosition = { ...gridPos };
      
      // 触发移动事件
      this.eventTracker.trackEvent('player_move', {
        position: gridPos,
        direction: this.player.getDirection(),
      });
    }
  }

  private handleNPCInteraction(npc: NPC): void {
    const npcData = npc.getData();
    
    // 显示对话
    npc.showSpeechBubble(`你好，我是${npcData.name}！`);
    
    // 追踪事件
    this.eventTracker.trackEvent('npc_talk', {
      npcId: npcData.id,
      npcName: npcData.name,
      playerPosition: this.player.getGridPosition(),
    });
    
    // 更新游戏状态
    useGameStore.getState().setInteractingNPC(npcData.id);
  }

  getPlayer(): Player {
    return this.player;
  }

  getNPCs(): NPC[] {
    return this.npcs;
  }

  getMapGenerator(): MapGenerator {
    return this.mapGenerator;
  }

  getDayNightSystem(): DayNightSystem {
    return this.dayNightSystem;
  }

  getEventTracker(): EventTracker {
    return this.eventTracker;
  }
}
