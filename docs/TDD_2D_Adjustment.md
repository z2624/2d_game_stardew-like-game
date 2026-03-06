# 2D 版本 TDD 调整说明 (3D→2D 转换)

**原文档**: TDD.md (V1.0)  
**基于 PRD**: V2.1 逻辑闭环版  
**调整日期**: 2026-03-06  
**调整者**: Kimi Claw the Cat  

---

## 核心变更概览

| 技术模块 | 原 3D (Three.js) | 2D 调整 (Phaser 3) | 影响评估 |
|---------|-----------------|-------------------|---------|
| **坐标系** | Vector3 (x, y, z) | Vector2 (gridX, gridY) + tileSize | 高 - 所有位置相关代码需调整 |
| **相机** | 透视相机 + 鼠标控制朝向 | 俯视角相机跟随玩家 | 中 - 简化控制逻辑 |
| **日落检测** | 镜头方向向量点积 | 角色 8 方向朝向检测 | 中 - 检测逻辑简化 |
| **地形** | 三层 Y 轴高度 (0-15) | 单层瓦片地图 (50x50 格) | 高 - 完全重构地形系统 |
| **导航** | NavMesh 3D 路径规划 | 直线移动 (后期可加 A*) | 低 - 简化实现 |
| **渲染** | Three.js Scene + GLB 模型 | Phaser 3 Scene + Sprite Sheet | 高 - 完全替换渲染层 |
| **动画** | GLB 骨骼动画 | Sprite Sheet 帧动画 | 中 - 美术资源格式变化 |
| **UI 框架** | React + shadcn/ui 叠加 | Phaser 内置 UI 或 HTML 叠加 | 中 - 需要适配方案 |

---

## 详细技术调整

### 1. 坐标系统

#### 1.1 原 3D 坐标
```typescript
// 原 Three.js
interface Vector3 {
  x: number;  // 浮点数，单位：米
  y: number;  // 高度层：0-5（低）、5-10（中）、10-15（高）
  z: number;  // 浮点数，单位：米
}

// 区域边界示例
const AREA_BOUNDS = {
  beach_low: { minX: -50, maxX: 50, minZ: -50, maxZ: 50, y: 0 },
  village_mid: { minX: -40, maxX: 40, minZ: -40, maxZ: 40, y: 5 },
  peak_high: { minX: -30, maxX: 30, minZ: -30, maxZ: 30, y: 12 }
};
```

#### 1.2 2D 格子坐标
```typescript
// 2D Phaser 3 坐标系
interface GridPosition {
  x: number;  // 整数，格子坐标 (0-49)
  y: number;  // 整数，格子坐标 (0-49)，注意：Y 向下增长
}

// 像素坐标转换
const TILE_SIZE = 32;  // 每格 32 像素

function gridToPixel(grid: GridPosition): { x: number, y: number } {
  return {
    x: grid.x * TILE_SIZE + TILE_SIZE / 2,  // 中心点
    y: grid.y * TILE_SIZE + TILE_SIZE / 2
  };
}

function pixelToGrid(pixel: { x: number, y: number }): GridPosition {
  return {
    x: Math.floor(pixel.x / TILE_SIZE),
    y: Math.floor(pixel.y / TILE_SIZE)
  };
}

// 地图尺寸：50x50 格 = 1600x1600 像素
const MAP_CONFIG = {
  width: 50,      // 格子数
  height: 50,     // 格子数
  tileSize: 32,   // 像素
  pixelWidth: 50 * 32,   // 1600px
  pixelHeight: 50 * 32   // 1600px
};
```

#### 1.3 区域定义（2D 版）
```typescript
// 原三层垂直地形 → 单层水平分区
// 布局：森林/山顶（上）、城镇（中）、海滩（下）

enum AreaType2D {
  PEAK = 'peak',        // 山顶/森林区（偏上 Y: 0-15）
  VILLAGE = 'village',  // 草原居住区（中 Y: 15-35）
  SHOP = 'shop',        // 商店（中）
  WORKSHOP = 'workshop', // 工作坊（中）
  BEACH = 'beach',      // 海边沙滩（偏下 Y: 35-50）
  SECRET = 'secret'     // 秘密基地（山顶角落）
}

interface Area2D {
  id: string;
  name: string;
  type: AreaType2D;
  bounds: {
    x: number;      // 起始格子 X
    y: number;      // 起始格子 Y
    width: number;  // 宽度（格）
    height: number; // 高度（格）
  };
  anchorPoints: AnchorPoint2D[];
  semanticTags: string[];
}

// 50x50 格地图区域划分
const AREAS_2D: Area2D[] = [
  {
    id: 'peak_high',
    name: '山顶高台',
    type: 'peak',
    bounds: { x: 15, y: 0, width: 20, height: 15 },  // 上部中间
    anchorPoints: [
      { id: 'peak_observatory', name: '观星台', x: 25, y: 5, type: 'work_spot' },
      { id: 'peak_explore', name: '探索点', x: 30, y: 10, type: 'interaction_spot' },
      { id: 'peak_gather', name: '采集点', x: 20, y: 8, type: 'work_spot' }
    ],
    semanticTags: ['spiritual', 'quiet', 'high']
  },
  {
    id: 'secret_high',
    name: '秘密基地',
    type: 'secret',
    bounds: { x: 40, y: 2, width: 8, height: 8 },  // 右上角角落
    anchorPoints: [
      { id: 'secret_bench', name: '秘密长椅', x: 44, y: 5, type: 'secret_spot' }
    ],
    semanticTags: ['secret', 'meditation', 'private']
  },
  {
    id: 'village_mid',
    name: '草原居住区',
    type: 'village',
    bounds: { x: 5, y: 15, width: 40, height: 20 },  // 中部主体
    anchorPoints: [
      { id: 'village_crops', name: '田地', x: 15, y: 20, type: 'work_spot' },
      { id: 'village_grass', name: '草地', x: 30, y: 22, type: 'interaction_spot' },
      { id: 'village_social', name: '社交广场', x: 25, y: 28, type: 'interaction_spot' }
    ],
    semanticTags: ['social', 'community', 'nature']
  },
  {
    id: 'shop_mid',
    name: '商店',
    type: 'shop',
    bounds: { x: 35, y: 18, width: 10, height: 8 },
    anchorPoints: [
      { id: 'shop_counter', name: '柜台', x: 38, y: 21, type: 'work_spot' },
      { id: 'shop_center', name: '商店中央', x: 40, y: 22, type: 'interaction_spot' }
    ],
    semanticTags: ['commerce', 'social', 'indoor']
  },
  {
    id: 'workshop_mid',
    name: '工作坊',
    type: 'workshop',
    bounds: { x: 5, y: 25, width: 8, height: 8 },
    anchorPoints: [
      { id: 'workshop_sewing', name: '缝纫台', x: 8, y: 28, type: 'work_spot' }
    ],
    semanticTags: ['craft', 'creative', 'indoor']
  },
  {
    id: 'beach_low',
    name: '海边沙滩',
    type: 'beach',
    bounds: { x: 0, y: 35, width: 50, height: 15 },  // 下部
    anchorPoints: [
      { id: 'beach_walkway', name: '海边步道', x: 25, y: 40, type: 'rest_spot' },
      { id: 'beach_meditation', name: '冥想点', x: 15, y: 42, type: 'rest_spot' },
      { id: 'beach_fishing', name: '钓鱼点', x: 35, y: 45, type: 'work_spot' }
    ],
    semanticTags: ['lonely', 'peaceful', 'water']
  }
];
```

---

### 2. 相机系统

#### 2.1 原 3D 相机
```typescript
// 原 Three.js 透视相机
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
camera.position.set(0, 10, 20);
// 鼠标控制相机朝向，用于日落检测
```

#### 2.2 2D 俯视角相机
```typescript
// Phaser 3 相机配置
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,   // 视口宽度
  height: 600,  // 视口高度
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },  // 俯视角无重力
      debug: false
    }
  }
};

// 在 create() 中设置相机
function create() {
  // 创建玩家
  this.player = this.physics.add.sprite(400, 300, 'player');
  
  // 相机跟随玩家
  this.cameras.main.startFollow(this.player);
  
  // 相机边界限制在地图内
  this.cameras.main.setBounds(0, 0, 1600, 1600);
  
  // 设置缩放（可选）
  this.cameras.main.setZoom(1);
}
```

---

### 3. 日落检测系统（2D 版）

#### 3.1 原 3D 实现
```typescript
// 原 Three.js 点积检测
class SunsetDetector {
  calculateDotProduct(cameraDir: Vector3, sunDir: Vector3): number {
    return cameraDir.normalize().dot(sunDir.normalize());
  }
  
  update(cameraDir: Vector3, timeOfDay: TimeOfDay): boolean {
    if (timeOfDay !== 'sunset') return false;
    const dot = this.calculateDotProduct(cameraDir, this.sunDirection);
    return dot >= 0.95;  // 约 18 度夹角
  }
}
```

#### 3.2 2D 八方向检测
```typescript
// 2D 俯视角，角色有 8 个朝向
enum Direction {
  NORTH = 0,      // 上 ↑（Y 减小）
  NORTH_EAST = 1, // 右上 ↗
  EAST = 2,       // 右 →
  SOUTH_EAST = 3, // 右下 ↘
  SOUTH = 4,      // 下 ↓
  SOUTH_WEST = 5, // 左下 ↙
  WEST = 6,       // 左 ←
  NORTH_WEST = 7  // 左上 ↖
}

// 日落方向定义
// 日落时太阳在西方，玩家需要面朝西才能凝视
const SUNSET_VALID_DIRECTIONS = [
  Direction.WEST,       // 正西
  Direction.NORTH_WEST, // 西北
  Direction.SOUTH_WEST  // 西南
];

// 2D 日落凝视检测
interface SunsetGazeDetector2D {
  playerPosition: GridPosition;
  playerDirection: Direction;
  viewpointPosition: GridPosition;
  isGazing: boolean;
  gazeStartTime: number | null;
}

class SunsetGazeDetector2D {
  private readonly GAZE_DURATION = 5000;  // 5秒
  private gazeStartTime: number | null = null;
  private lastPlayerPos: GridPosition | null = null;
  
  update(
    playerPos: GridPosition,
    playerDir: Direction,
    viewpoint: GridPosition,
    timeOfDay: TimeOfDay,
    currentTime: number
  ): { isGazing: boolean; elapsed: number; triggered: boolean } {
    // 1. 必须是日落时段
    if (timeOfDay !== 'sunset') {
      this.gazeStartTime = null;
      return { isGazing: false, elapsed: 0, triggered: false };
    }
    
    // 2. 必须在观景点范围内（3格内）
    const distance = Math.abs(playerPos.x - viewpoint.x) + 
                     Math.abs(playerPos.y - viewpoint.y);  // 曼哈顿距离
    if (distance > 3) {
      this.gazeStartTime = null;
      return { isGazing: false, elapsed: 0, triggered: false };
    }
    
    // 3. 必须面朝正确方向（西方）
    const isFacingSun = SUNSET_VALID_DIRECTIONS.includes(playerDir);
    if (!isFacingSun) {
      this.gazeStartTime = null;
      return { isGazing: false, elapsed: 0, triggered: false };
    }
    
    // 4. 开始计时
    if (this.gazeStartTime === null) {
      this.gazeStartTime = currentTime;
    }
    
    const elapsed = currentTime - this.gazeStartTime;
    const triggered = elapsed >= this.GAZE_DURATION;
    
    return { isGazing: true, elapsed, triggered };
  }
  
  reset(): void {
    this.gazeStartTime = null;
  }
}

// 观景点定义（2D 格子坐标）
const SUNSET_VIEWPOINTS = [
  {
    id: 'peak_sunset_point',
    name: '山顶日落观景台',
    position: { x: 25, y: 3 },  // 山顶偏上
    description: '面向西方的悬崖边'
  },
  {
    id: 'beach_sunset_point',
    name: '海边日落点',
    position: { x: 10, y: 38 },  // 海滩偏左
    description: '面向西方的海岸'
  }
];
```

---

### 4. 高台冥想检测（2D 版）

#### 4.1 原 3D 实现
```typescript
// 原 3D：位置 + 距离 + 视线 + 坐下
function detectMeditateHighContext(
  playerPos: Vector3,
  playerRot: Euler,
  benchPos: Vector3,
  isSitting: boolean,
  idleDuration: number
): boolean {
  const distance = playerPos.distanceTo(benchPos);
  const isNearBench = distance <= 5;
  
  const forward = new Vector3(0, 0, 1).applyEuler(playerRot);
  const isFacingHorizon = Math.abs(forward.y) < 0.2;
  
  return isNearBench && isSitting && isFacingHorizon && idleDuration >= 15;
}
```

#### 4.2 2D 实现
```typescript
// 2D：格子位置 + 朝向 + 坐下 + 停留时间
function detectMeditateHigh2D(
  playerPos: GridPosition,
  playerDir: Direction,
  benchPos: GridPosition,
  isSitting: boolean,
  idleDuration: number
): boolean {
  // 1. 距离秘密长椅 2 格内
  const distance = Math.abs(playerPos.x - benchPos.x) + 
                   Math.abs(playerPos.y - benchPos.y);
  const isNearBench = distance <= 2;
  
  // 2. 面朝北方（地平线方向，屏幕上方）
  const isFacingHorizon = playerDir === Direction.NORTH || 
                          playerDir === Direction.NORTH_WEST || 
                          playerDir === Direction.NORTH_EAST;
  
  // 3. 坐下状态
  // 4. 停留 15 秒以上
  
  return isNearBench && isFacingHorizon && isSitting && idleDuration >= 15000;
}

// 秘密长椅位置（2D 格子坐标）
const SECRET_BENCH_2D = {
  id: 'secret_bench',
  name: '秘密长椅',
  position: { x: 44, y: 5 },  // 秘密基地区域内
  description: '面向北方的长椅'
};
```

---

### 5. 玩家控制系统（2D 版）

#### 5.1 原 3D 控制
```typescript
// 原 Three.js WASD + 鼠标控制镜头
interface PlayerController {
  movement: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  };
  camera: {
    rotate: 'MouseMove';  // 鼠标控制
  };
}
```

#### 5.2 2D Phaser 控制
```typescript
// Phaser 3 Arcade Physics
class PlayerController2D {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  
  private speed = 150;  // 像素/秒
  private direction: Direction = Direction.SOUTH;
  private isMoving = false;
  private isSitting = false;
  
  constructor(private scene: Phaser.Scene, private player: Phaser.Physics.Arcade.Sprite) {
    // 键盘输入
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      E: Phaser.Input.Keyboard.KeyCodes.E  // 交互键
    }) as any;
  }
  
  update(delta: number): void {
    if (this.isSitting) {
      // 坐下时不能移动
      if (Phaser.Input.Keyboard.JustDown(this.wasd.E)) {
        this.standUp();
      }
      return;
    }
    
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    
    // 计算方向
    let vx = 0;
    let vy = 0;
    
    if (up) vy -= 1;
    if (down) vy += 1;
    if (left) vx -= 1;
    if (right) vx += 1;
    
    // 归一化对角线移动
    if (vx !== 0 && vy !== 0) {
      const length = Math.sqrt(vx * vx + vy * vy);
      vx /= length;
      vy /= length;
    }
    
    // 应用速度
    this.player.setVelocity(vx * this.speed, vy * this.speed);
    
    // 更新朝向和动画
    if (vx !== 0 || vy !== 0) {
      this.isMoving = true;
      this.direction = this.calculateDirection(vx, vy);
      this.playDirectionalAnimation('walk', this.direction);
    } else {
      this.isMoving = false;
      this.player.setVelocity(0);
      this.playDirectionalAnimation('idle', this.direction);
    }
    
    // 交互检测
    if (Phaser.Input.Keyboard.JustDown(this.wasd.E)) {
      this.tryInteract();
    }
    
    // 记录事件埋点
    this.recordMovementEvent();
  }
  
  private calculateDirection(vx: number, vy: number): Direction {
    // 根据速度向量计算 8 方向
    if (vx === 0 && vy < 0) return Direction.NORTH;
    if (vx > 0 && vy < 0) return Direction.NORTH_EAST;
    if (vx > 0 && vy === 0) return Direction.EAST;
    if (vx > 0 && vy > 0) return Direction.SOUTH_EAST;
    if (vx === 0 && vy > 0) return Direction.SOUTH;
    if (vx < 0 && vy > 0) return Direction.SOUTH_WEST;
    if (vx < 0 && vy === 0) return Direction.WEST;
    if (vx < 0 && vy < 0) return Direction.NORTH_WEST;
    return this.direction;  // 无输入保持原朝向
  }
  
  private playDirectionalAnimation(baseAnim: string, dir: Direction): void {
    const dirNames = ['up', 'up-right', 'right', 'down-right', 
                      'down', 'down-left', 'left', 'up-left'];
    const animKey = `${baseAnim}-${dirNames[dir]}`;
    this.player.play(animKey, true);
  }
  
  sitDown(): void {
    this.isSitting = true;
    this.player.setVelocity(0);
    this.playDirectionalAnimation('sit', this.direction);
    
    // 记录坐下事件
    recordEvent({
      type: 'sit',
      payload: {
        position: pixelToGrid({ x: this.player.x, y: this.player.y }),
        direction: this.direction
      }
    });
  }
  
  private standUp(): void {
    this.isSitting = false;
    this.playDirectionalAnimation('idle', this.direction);
  }
  
  getDirection(): Direction { return this.direction; }
  getIsMoving(): boolean { return this.isMoving; }
  getIsSitting(): boolean { return this.isSitting; }
}
```

---

### 6. NPC 移动系统（2D 直线移动）

#### 6.1 原 3D NavMesh
```typescript
// 原 @recast-navigation/three
const path = calculateNavMeshPath(startPos, endPos);
```

#### 6.2 2D 直线移动
```typescript
class NPCController2D {
  private targetPosition: GridPosition | null = null;
  private currentPath: GridPosition[] = [];
  private isMoving = false;
  private speed = 80;  // NPC 比玩家慢
  
  constructor(
    private scene: Phaser.Scene,
    private sprite: Phaser.Physics.Arcade.Sprite,
    private npcData: NPC
  ) {}
  
  // 移动到指定锚点（直线移动，渐进式披露）
  navigateTo(anchor: AnchorPoint2D): void {
    this.targetPosition = { x: anchor.x, y: anchor.y };
    this.isMoving = true;
  }
  
  update(delta: number): void {
    if (!this.isMoving || !this.targetPosition) return;
    
    const currentPixel = { x: this.sprite.x, y: this.sprite.y };
    const targetPixel = gridToPixel(this.targetPosition);
    
    // 计算方向
    const dx = targetPixel.x - currentPixel.x;
    const dy = targetPixel.y - currentPixel.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 5) {
      // 到达目标
      this.isMoving = false;
      this.targetPosition = null;
      this.sprite.setVelocity(0);
      this.playAnimation('idle');
      return;
    }
    
    // 直线移动
    const vx = (dx / distance) * this.speed;
    const vy = (dy / distance) * this.speed;
    this.sprite.setVelocity(vx, vy);
    
    // 朝向目标
    const angle = Math.atan2(dy, dx);
    const direction = this.angleToDirection(angle);
    this.playDirectionalAnimation('walk', direction);
  }
  
  private angleToDirection(angle: number): Direction {
    // 将弧度转换为 8 方向
    const degrees = (angle * 180 / Math.PI + 360) % 360;
    const sector = Math.round(degrees / 45) % 8;
    return sector as Direction;
  }
  
  // V2.1: 根据日程获取当前目标锚点
  getCurrentScheduleTarget(): AnchorPoint2D | null {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour + minute / 60;
    
    for (const entry of this.npcData.daily_schedule) {
      const [start, end] = entry.time.split('-').map(t => {
        const [h, m] = t.split(':').map(Number);
        return h + m / 60;
      });
      
      if (currentTime >= start && currentTime < end) {
        // 找到对应区域和锚点
        const area = AREAS_2D.find(a => a.id === entry.location);
        return area?.anchorPoints.find(a => a.id === entry.anchor_point_id) || null;
      }
    }
    return null;
  }
}
```

---

### 7. 地图生成（纯代码）

#### 7.1 瓦片地图数据
```typescript
// 50x50 格地图，用二维数组表示
// 0: 草地, 1: 道路, 2: 建筑地板, 3: 墙壁, 4: 沙滩, 5: 森林, 9: 阻挡

const TILE_TYPES = {
  GRASS: 0,
  ROAD: 1,
  FLOOR: 2,
  WALL: 3,
  SAND: 4,
  FOREST: 5,
  WATER: 6,
  BLOCKED: 9
};

// 生成 50x50 地图
function generateMap(): number[][] {
  const map: number[][] = [];
  
  for (let y = 0; y < 50; y++) {
    const row: number[] = [];
    for (let x = 0; x < 50; x++) {
      row.push(generateTile(x, y));
    }
    map.push(row);
  }
  
  return map;
}

function generateTile(x: number, y: number): number {
  // 山顶/森林区 (y: 0-15)
  if (y < 15) {
    if (x >= 15 && x < 35) {
      // 山顶高地
      if (y < 5 && x >= 20 && x < 30) return TILE_TYPES.GRASS;  // 山顶平台
      return TILE_TYPES.FOREST;
    }
    if (x >= 40 && y >= 2 && y < 10) {
      return TILE_TYPES.GRASS;  // 秘密基地
    }
    return TILE_TYPES.FOREST;
  }
  
  // 草原/城镇区 (y: 15-35)
  if (y >= 15 && y < 35) {
    // 道路网络
    if (y === 25 || x === 25) return TILE_TYPES.ROAD;  // 十字主干道
    if (y === 20 && x >= 10 && x < 30) return TILE_TYPES.ROAD;  // 横向次干道
    
    // 商店区域
    if (x >= 35 && x < 45 && y >= 18 && y < 26) {
      if (x === 35 || x === 44 || y === 18 || y === 25) return TILE_TYPES.WALL;
      return TILE_TYPES.FLOOR;
    }
    
    // 工作坊
    if (x >= 5 && x < 13 && y >= 25 && y < 33) {
      if (x === 5 || x === 12 || y === 25 || y === 32) return TILE_TYPES.WALL;
      return TILE_TYPES.FLOOR;
    }
    
    return TILE_TYPES.GRASS;
  }
  
  // 海滩区 (y: 35-50)
  if (y >= 40) return TILE_TYPES.SAND;  // 沙滩
  if (y >= 35) return TILE_TYPES.GRASS;  // 过渡带
  
  return TILE_TYPES.GRASS;
}

// Phaser 3 场景中使用
class GameScene extends Phaser.Scene {
  private map: number[][];
  private tileMap: Phaser.Tilemaps.Tilemap;
  
  create() {
    // 生成地图数据
    this.map = generateMap();
    
    // 创建 tilemap
    this.tileMap = this.make.tilemap({
      data: this.map,
      tileWidth: 32,
      tileHeight: 32
    });
    
    // 添加 tileset（占位图）
    const tileset = this.tileMap.addTilesetImage('tiles');
    const layer = this.tileMap.createLayer(0, tileset, 0, 0);
    
    // 设置碰撞
    layer.setCollision([TILE_TYPES.WALL, TILE_TYPES.WATER, TILE_TYPES.BLOCKED]);
  }
}
```

---

### 8. 昼夜循环（2D 版）

#### 8.1 原 3D 实现
```typescript
// Three.js 光照 + 天空颜色
this.sunLight.intensity = sunIntensity;
this.ambientLight.intensity = ambientIntensity;
this.skyMaterial.color.set(skyColor);
```

#### 8.2 2D 滤镜实现
```typescript
// Phaser 3 使用 Camera 滤镜或叠加层
class DayNightSystem {
  private overlay: Phaser.GameObjects.Rectangle;
  private readonly PHASES = {
    sunrise: { color: 0xFFB347, alpha: 0.2 },
    noon: { color: 0x87CEEB, alpha: 0 },
    sunset: { color: 0xFF6B6B, alpha: 0.3 },
    night: { color: 0x1a1a2e, alpha: 0.6 }
  };
  
  constructor(private scene: Phaser.Scene) {
    // 创建全屏叠加层
    const camera = scene.cameras.main;
    this.overlay = scene.add.rectangle(
      camera.centerX, camera.centerY,
      camera.width, camera.height,
      0x000000, 0
    );
    this.overlay.setScrollFactor(0);  // 不跟随相机
    this.overlay.setDepth(1000);  // 在最上层
  }
  
  setTimeOfDay(timeOfDay: TimeOfDay): void {
    const phase = this.PHASES[timeOfDay];
    
    // V2.1: 日落时段使用渐变插值
    if (timeOfDay === 'sunset') {
      this.scene.tweens.add({
        targets: this.overlay,
        fillColor: phase.color,
        alpha: phase.alpha,
        duration: 300000,  // 5分钟渐变（现实时间）
        ease: 'Linear'
      });
    } else {
      this.overlay.setFillStyle(phase.color, phase.alpha);
    }
  }
}
```

---

### 9. 数据库 Schema（保持不变）

**注意**：数据库层完全复用原设计，因为：
- 坐标存储可以用 JSONB `{ x, y }` 替代 `{ x, y, z }`
- 语义事件、记忆、习惯统计层与渲染无关
- API Routes 逻辑基本不变

```typescript
// 仅需调整位置类型
interface PlayerEvent {
  // ... 其他字段不变
  position: { x: number; y: number };  // 移除 z
}

interface Area2D {
  // ... 其他字段不变
  bounds: {
    x: number;      // 起始格子 X
    y: number;      // 起始格子 Y
    width: number;
    height: number;
  };
}
```

---

### 10. 项目目录结构（2D 版）

```
2d_game_stardew-like-game/
├── src/
│   ├── game/                    # Phaser 3 游戏核心
│   │   ├── scenes/
│   │   │   ├── GameScene.ts     # 主游戏场景
│   │   │   └── BootScene.ts     # 初始化场景
│   │   ├── entities/
│   │   │   ├── Player.ts        # 玩家控制
│   │   │   └── NPC.ts           # NPC 控制
│   │   ├── systems/
│   │   │   ├── DayNightSystem.ts
│   │   │   ├── SunsetDetector.ts
│   │   │   └── EventTracker.ts
│   │   └── map/
│   │       ├── MapGenerator.ts  # 地图生成器
│   │       └── AreaConfig.ts    # 区域配置
│   │
│   ├── api/                     # API Routes（复用原设计）
│   │   ├── events/
│   │   ├── npcs/
│   │   └── environment/
│   │
│   ├── stores/                  # Zustand Stores（复用原设计）
│   │   ├── playerStore.ts
│   │   ├── npcStore.ts
│   │   └── environmentStore.ts
│   │
│   ├── lib/                     # 工具库
│   │   ├── semantic/            # 语义引擎（复用）
│   │   ├── llm/                 # LLM 集成（复用）
│   │   └── constants/           # 常量定义
│   │       ├── npcs.ts
│   │       └── areas.ts
│   │
│   └── types/                   # TypeScript 类型
│       └── index.ts
│
├── public/
│   └── assets/                  # 游戏资源
│       ├── sprites/             # 角色精灵表
│       ├── tiles/               # 瓦片图
│       └── ui/                  # UI 元素
│
├── docs/
│   ├── PRD.md
│   ├── PRD_2D_Adjustment.md
│   ├── TDD.md
│   ├── TDD_2D_Adjustment.md    # 本文档
│   └── WORKLOG.md
│
├── package.json
├── tsconfig.json
└── vite.config.ts               # Vite 构建（比 Next.js 更轻量）
```

---

### 11. 技术栈变更

| 类别 | 原 3D | 2D 调整 | 理由 |
|------|-------|---------|------|
| **构建工具** | Next.js 16 + Turbopack | Vite 5 + TypeScript | 更轻量，Phaser 3 无需 React |
| **游戏引擎** | Three.js | Phaser 3 | 原生 2D 支持 |
| **UI 框架** | React + shadcn/ui | Phaser UI + 少量 HTML | 减少复杂度 |
| **物理引擎** | 自定义/Cannon.js | Phaser Arcade Physics | 内置，够用 |
| **地图编辑** | 3D 模型 | 纯代码生成 / Tiled（后期） | 快速迭代 |
| **动画** | GLB 骨骼动画 | Sprite Sheet 帧动画 | 2D 标准 |
| **状态管理** | Zustand | Zustand（保留） | 依然适用 |
| **数据库** | Supabase（保留） | Supabase（保留） | 无变化 |
| **LLM** | 阿里云百炼（保留） | 阿里云百炼（保留） | 无变化 |

---

### 12. 关键常量（2D 版）

```typescript
// lib/constants/game.ts
export const GAME_CONFIG = {
  // 地图
  MAP_WIDTH: 50,        // 格
  MAP_HEIGHT: 50,       // 格
  TILE_SIZE: 32,        // 像素
  
  // 玩家
  PLAYER_SPEED: 150,    // 像素/秒
  PLAYER_DIRECTIONS: 8, // 8方向
  
  // NPC
  NPC_SPEED: 80,        // 像素/秒（比玩家慢）
  NPC_INTERACTION_DISTANCE: 3,  // 格
  
  // 检测
  SUNSET_GAZE_DURATION: 5000,   // 毫秒
  MEDITATE_DURATION: 15000,     // 毫秒
  VIEWPOINT_DISTANCE: 3,        // 格
  
  // 时间
  TIME_SYNC: true,      // 1:1 现实时间
  
  // 情绪
  EMOTION_OPTIONS: [
    { type: 'joy', label: '喜', emoji: '😊' },
    { type: 'anger', label: '怒', emoji: '😠' },
    { type: 'confusion', label: '疑惑', emoji: '❓' },
    { type: 'sadness', label: '悲哀', emoji: '😢' }
  ]
};

// 方向枚举
export enum Direction {
  NORTH = 0,
  NORTH_EAST = 1,
  EAST = 2,
  SOUTH_EAST = 3,
  SOUTH = 4,
  SOUTH_WEST = 5,
  WEST = 6,
  NORTH_WEST = 7
}

// 日落有效方向（西方）
export const SUNSET_DIRECTIONS = [
  Direction.WEST,
  Direction.NORTH_WEST,
  Direction.SOUTH_WEST
];
```

---

### 13. 实现路线图（2D 版）

#### Phase 1: 基础架构 (Week 1)
- [ ] Vite 5 + Phaser 3 项目初始化
- [ ] 基础场景搭建
- [ ] 50x50 地图生成器（纯代码）
- [ ] 玩家移动与 8 方向朝向
- [ ] 相机跟随

#### Phase 2: 核心系统 (Week 2)
- [ ] 区域检测系统
- [ ] 昼夜循环（2D 滤镜版）
- [ ] 日落凝视检测（8方向+观景点）
- [ ] 基础埋点系统

#### Phase 3: NPC 系统 (Week 3)
- [ ] 6 位 NPC 占位图（彩色方块+方向标识）
- [ ] NPC 日程系统
- [ ] NPC 直线移动
- [ ] 社交能量系统

#### Phase 4: 交互系统 (Week 4)
- [ ] 对话系统框架
- [ ] 情绪镜像 UI
- [ ] LLM 接入
- [ ] 高台冥想检测

#### Phase 5: 数据层 (Week 5)
- [ ] PlayerHabit 统计层
- [ ] Memory 缓冲层
- [ ] Supabase 集成

#### Phase 6: God Mode (Week 6)
- [ ] 行为监控面板
- [ ] 语义沉淀列表
- [ ] 环境控制器

---

### 14. 验收标准（2D 版）

| 验收项 | 2D 标准 |
|--------|---------|
| 地图生成 | 50x50 格地图正确生成，3 区域布局正确 |
| 玩家移动 | WASD 移动，8 方向朝向正确，有行走/待机动画 |
| 日落检测 | 面朝西（W/NW/SW）+ 在观景点 3 格内 + 停留 5 秒 = 触发 |
| 区域检测 | 正确识别当前所在区域（peak/village/beach） |
| NPC 移动 | 按日程移动到指定锚点，直线移动 |
| 对话系统 | LLM 生成回应，情绪镜像 UI 正常工作 |
| 数据分层 | PlayerHabit 正确统计，Memory 24h 过期 |

---

### 15. 待确认事项（已解决）

基于用户确认：
1. ✅ 坐标：格子坐标（50x50），tileSize=32px
2. ✅ 日落检测：8 方向，面朝西方（W/NW/SW）即算凝视
3. ✅ 地图：50x50 格，上（森林/山顶）、中（城镇）、下（海滩）
4. ✅ NPC 移动：前期直线移动，渐进式披露
5. ✅ 地图生成：纯代码起步，效果不好再转 Tiled

---

**文档状态**: 待审阅  
**下一步**: 确认 TDD 调整 → 开始写初始代码

---

## 附录：从纯代码到 Tiled 的迁移路径

如果后期需要切换到 Tiled 编辑器：

```typescript
// 当前纯代码
const map = generateMap();  // 二维数组

// 未来 Tiled
const map = this.make.tilemap({ key: 'map' });  // 加载 Tiled JSON
// 只需替换 MapGenerator，其他代码不变
```

**迁移成本**：低，只需替换地图加载部分。
