# 2D 版本 PRD 调整说明 (3D→2D 转换)

**原文档**: PRD.md (V2.1 逻辑闭环版)  
**调整日期**: 2026-03-06  
**调整者**: Kimi Claw the Cat  

---

## 核心变更概览

| 维度 | 原 3D 设计 | 2D 调整方案 | 影响评估 |
|------|-----------|------------|---------|
| **视角** | 第三人称自由视角 (Three.js) | 2D 俯视角 (Phaser 3) | 中 - 需要重新设计输入检测 |
| **移动** | WASD + 鼠标控制镜头 | WASD 移动，角色自动面向移动方向 | 低 - 简化控制 |
| **日落检测** | 镜头方向向量与太阳方向点积 > 0.95 | 角色朝向(8方向) + 处于观景点 | 中 - 保持主动感 |
| **地形** | 三层垂直地形 (Y轴分层) | 假透视单层地图 (星露谷式) | 低 - 视觉等效 |
| **技术栈** | Next.js + Three.js + React Three Fiber | Phaser 3 + TypeScript | 高 - 完全替换 |
| **导航** | NavMesh 3D 路径规划 | 2D A* 或简单网格导航 | 低 - 简化实现 |

---

## 详细调整项

### 1. 视角与渲染系统

#### 1.1 相机系统
```typescript
// 原 3D
camera: {
  position: Vector3,
  rotation: Euler,
  fov: number
}

// 2D 调整
camera: {
  x: number,        // 相机中心 X
  y: number,        // 相机中心 Y
  zoom: number,     // 缩放级别 (默认 1)
  bounds: {         // 边界限制
    minX, maxX, minY, maxY
  }
}
```

#### 1.2 渲染方式
- **3D**: Three.js Scene + Mesh + Material
- **2D**: Phaser 3 Scene + Sprite + Tilemap
- **瓦片地图**: 使用 Tiled 编辑器导出 JSON，或纯代码生成

---

### 2. 玩家控制系统

#### 2.1 输入映射调整
```typescript
// 原 3D
interface PlayerController {
  movement: {
    forward: 'KeyW' | 'ArrowUp',
    backward: 'KeyS' | 'ArrowDown',
    left: 'KeyA' | 'ArrowLeft',
    right: 'KeyD' | 'ArrowRight'
  },
  camera: {
    rotate: 'MouseMove',  // ❌ 移除
    zoom: 'MouseWheel',
    reset: 'KeyR'
  }
}

// 2D 调整
interface PlayerController {
  movement: {
    up: 'KeyW' | 'ArrowUp',
    down: 'KeyS' | 'ArrowDown',
    left: 'KeyA' | 'ArrowLeft',
    right: 'KeyD' | 'ArrowRight'
  },
  camera: {
    zoom: 'MouseWheel',    // 可选
    reset: 'KeyR'
  },
  interaction: 'KeyE' | 'Space'
}
```

#### 2.2 角色朝向系统（新增）
```typescript
// 2D 俯视角，角色有 8 个朝向
enum Direction {
  NORTH = 0,      // 上
  NORTH_EAST = 1, // 右上
  EAST = 2,       // 右
  SOUTH_EAST = 3, // 右下
  SOUTH = 4,      // 下
  SOUTH_WEST = 5, // 左下
  WEST = 6,       // 左
  NORTH_WEST = 7  // 左上
}

interface Player {
  position: { x: number, y: number },
  direction: Direction,        // 当前朝向
  isMoving: boolean,           // 是否移动中
  currentAnimation: string     // 当前动画状态
}

// 根据移动输入计算朝向
function getDirectionFromInput(input: InputState): Direction {
  if (input.up && input.right) return Direction.NORTH_EAST;
  if (input.up && input.left) return Direction.NORTH_WEST;
  if (input.down && input.right) return Direction.SOUTH_EAST;
  if (input.down && input.left) return Direction.SOUTH_WEST;
  if (input.up) return Direction.NORTH;
  if (input.down) return Direction.SOUTH;
  if (input.right) return Direction.EAST;
  if (input.left) return Direction.WEST;
  return currentDirection; // 无输入保持原朝向
}
```

---

### 3. 日落凝视检测（核心机制调整）

#### 3.1 原 3D 方案
```typescript
// 点积检测镜头与太阳方向
const dotProduct = cameraDirection.dot(sunDirection);
if (dotProduct > 0.95 && duration > 5000) {
  triggerEvent('GAZE_SUNSET');
}
```

#### 3.2 2D 调整方案（角色朝向 + 观景点）
```typescript
// 2D 日落凝视检测
const SUNSET_GAZE_RULE_2D = {
  trigger: 'combined',
  conditions: [
    // 条件1：日落时段
    { field: 'time_state', operator: 'eq', value: 'sunset' },
    
    // 条件2：角色处于观景点
    { field: 'area_id', operator: 'eq', value: 'sunset_viewpoint' },
    
    // 条件3：角色朝向正确（面朝北方/屏幕上方）
    { field: 'player_direction', operator: 'in', value: ['NORTH', 'NORTH_WEST', 'NORTH_EAST'] },
    
    // 条件4：持续停留
    { field: 'duration_seconds', operator: 'gte', value: 5 }
  ],
  confidence: 0.92,
  output: {
    semantic_type: 'GAZE_SUNSET',
    metadata: {
      label: '凝望日落',
      description: '玩家在日落时分于观景点面朝太阳方向凝视',
      environment_context: '日落时分，天空呈现橙红色渐变'
    }
  }
};

// 观景点定义
interface Viewpoint {
  id: string;
  name: string;
  position: { x: number, y: number };
  radius: number;           // 触发范围
  validDirections: Direction[];  // 有效朝向
  description: string;
}

const VIEWPOINTS: Viewpoint[] = [
  {
    id: 'peak_sunset_point',
    name: '山顶日落观景台',
    position: { x: 500, y: 100 },  // 地图坐标
    radius: 50,
    validDirections: [Direction.NORTH, Direction.NORTH_WEST, Direction.NORTH_EAST],
    description: '面向北方的悬崖边，日落最佳观赏点'
  },
  {
    id: 'beach_sunset_point', 
    name: '海边日落点',
    position: { x: 200, y: 600 },
    radius: 40,
    validDirections: [Direction.NORTH, Direction.NORTH_WEST, Direction.NORTH_EAST],
    description: '面向大海的沙滩'
  }
];
```

---

### 4. 地形系统（假透视 → 星露谷式）

#### 4.1 地图结构
```typescript
// 2D 瓦片地图
interface TileMap {
  width: number;           // 地图宽（格子数）
  height: number;          // 地图高（格子数）
  tileSize: number;        // 每个格子像素大小（如 32px）
  layers: TileLayer[];     // 多层结构
}

interface TileLayer {
  name: string;
  tiles: number[][];       // 瓦片索引二维数组
  properties: {
    collidable: boolean;   // 是否可碰撞
    zIndex: number;        // 层级（用于假透视）
  };
}

// 地形层次（视觉层次，非真实 Z 轴）
const LAYERS = {
  ground: 0,      // 地面层
  decorations: 1, // 装饰层（草丛、石子）
  objects: 2,     // 物体层（桌椅、建筑）
  characters: 3,  // 角色层（玩家、NPC）
  overlay: 4      // 覆盖层（树顶、屋顶）
};
```

#### 4.2 区域划分（对应原三层地形）
```typescript
enum AreaType2D {
  // 原高层 (Y: 10-15) → 地图上方区域
  PEAK = 'peak',           // 山顶区域
  SECRET_BASE = 'secret',  // 秘密基地
  
  // 原中层 (Y: 5-10) → 地图中间区域
  VILLAGE = 'village',     // 草原居住区
  SHOP = 'shop',           // 商店
  WORKSHOP = 'workshop',   // 工作坊
  
  // 原低层 (Y: 0-5) → 地图下方区域
  BEACH = 'beach',         // 海边沙滩
  PIER = 'pier'            // 码头
}

// 区域边界（2D 矩形）
interface Area2D {
  id: string;
  type: AreaType2D;
  bounds: {
    x: number,
    y: number,
    width: number,
    height: number
  };
  anchorPoints: AnchorPoint2D[];
}
```

#### 4.3 锚点系统（2D 适配）
```typescript
interface AnchorPoint2D {
  id: string;
  name: string;
  position: { x: number, y: number };  // 2D 坐标
  type: AnchorType;
  giverNpcId?: string;
}

// NPC 导航使用简单 A* 或直线移动
async function navigateNPCToAnchor2D(
  npcId: string, 
  anchorId: string
): Promise<void> {
  const npc = await getNPCDynamic(npcId);
  const anchor = findAnchorPoint(anchorId);
  
  // 2D 简单路径：直线移动 + 避障
  const path = calculate2DPath(npc.position, anchor.position);
  
  await updateNPCState(npcId, {
    currentState: 'walking',
    targetPosition: anchor.position,
    path: path
  });
}
```

---

### 5. 高台冥想检测（境遇化 2D 版）

#### 5.1 原 3D 方案
```typescript
// 原 3D：位置 + 坐下 + 视线朝向
const MEDITATE_HIGH_RULE = {
  conditions: [
    { field: 'area_type', operator: 'eq', value: 'peak' },
    { field: 'proximity_to_secret_bench', operator: 'lte', value: 5 },
    { field: 'view_direction_horizon', operator: 'eq', value: true },
    { field: 'is_sitting', operator: 'eq', value: true },
    { field: 'duration_seconds', operator: 'gte', value: 15 }
  ]
};
```

#### 5.2 2D 调整方案
```typescript
const MEDITATE_HIGH_RULE_2D = {
  trigger: 'idle',
  conditions: [
    // 条件1：在高台区域
    { field: 'area_type', operator: 'eq', value: 'peak' },
    
    // 条件2：距离秘密长椅足够近
    { field: 'distance_to_anchor', operator: 'lte', value: 50 },
    { field: 'anchor_id', operator: 'eq', value: 'secret_bench' },
    
    // 条件3：面朝正确方向（面向北方/地平线）
    { field: 'player_direction', operator: 'in', value: ['NORTH', 'NORTH_WEST', 'NORTH_EAST'] },
    
    // 条件4：处于坐下状态
    { field: 'is_sitting', operator: 'eq', value: true },
    
    // 条件5：持续停留
    { field: 'duration_seconds', operator: 'gte', value: 15 }
  ],
  confidence: 0.92,
  output: {
    semantic_type: 'MEDITATE_HIGH',
    metadata: {
      label: '高台冥想',
      description: '玩家在山顶秘密长椅上坐下，面向地平线发呆',
      environment_context: '在山顶的秘密长椅上，面向地平线',
      anchor_name: '秘密长椅'
    }
  }
};
```

---

### 6. 技术栈变更

#### 6.1 核心技术对比

| 模块 | 原 3D 技术 | 2D 技术 | 理由 |
|------|-----------|---------|------|
| 框架 | Next.js 16 + React | Phaser 3 + TypeScript | 2D 游戏专用，无编辑器负担 |
| 渲染 | Three.js | Phaser 3 WebGL/Canvas | 原生 2D 支持 |
| 地图 | 3D 模型/场景 | Tiled JSON / 代码生成 | 2D 瓦片地图标准 |
| 动画 | 3D 骨骼动画 | Sprite Sheet 帧动画 | 2D 标准方案 |
| 物理 | Cannon.js / 自定义 | Phaser Arcade Physics | 内置轻量物理 |
| 导航 | @recast-navigation | 简单 A* 或自定义 | 2D 导航更简单 |

#### 6.2 Phaser 3 动画系统
```typescript
// Phaser 3 精灵表动画
class Player extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    
    // 创建动画
    scene.anims.create({
      key: 'walk-down',
      frames: scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    
    scene.anims.create({
      key: 'idle-down',
      frames: [{ key: 'player', frame: 0 }],
      frameRate: 1
    });
  }
  
  playDirectionalAnimation(direction: Direction, isMoving: boolean) {
    const animKey = isMoving ? `walk-${direction}` : `idle-${direction}`;
    this.play(animKey);
  }
}
```

#### 6.3 美术素材需求（适配 2D）

**角色精灵表需求：**
```
player_sprite_sheet.png
├── 4 方向（或 8 方向）
├── 每方向至少 4 帧动画
├── 帧大小：32x32 或 64x64
└── 排列方式：横向或纵向连续帧

示例（4方向 x 4帧 = 16帧）:
[上1][上2][上3][上4][右1][右2][右3][右4][下1][下2][下3][下4][左1][左2][左3][左4]
```

**占位图方案（开发阶段）：**
```typescript
// 用 Phaser Graphics 生成彩色方块
function createPlaceholderSprite(
  scene: Phaser.Scene, 
  color: number, 
  size: number = 32
): Phaser.GameObjects.Graphics {
  const graphics = scene.add.graphics();
  graphics.fillStyle(color, 1);
  graphics.fillRect(0, 0, size, size);
  
  // 添加简单"眼睛"区分方向
  graphics.fillStyle(0x000000, 1);
  graphics.fillRect(size * 0.2, size * 0.2, 4, 4);
  graphics.fillRect(size * 0.7, size * 0.2, 4, 4);
  
  return graphics;
}

// 角色占位色
const NPC_COLORS = {
  player: 0x3498db,    // 蓝
  cloudfruit: 0xff9500, // 橙（狐狸）
  izaqi: 0xffeb3b,      // 黄（狐狸）
  miandori: 0xffc0cb,   // 粉（羊）
  huanxue: 0x9b59b6,    // 紫（九尾狐）
  dojehlang: 0x8b4513,  // 棕（探险家）
  safeili: 0xf0f0f0     // 白（雪豹）
};
```

---

### 7. 路径习惯检测（数据分层适配）

```typescript
// 原 3D 逻辑保持不变，只需适配 2D 坐标
const PATH_HABIT_RULE_2D = {
  trigger: 'enter_area',
  conditions: [
    { field: 'area_type', operator: 'in', value: ['shop', 'beach'] },
    { field: 'time_range', operator: 'within', value: '14:00-15:00' },
    { field: 'habit_counter', operator: 'gte', value: 3 }
  ],
  confidence: 0.88,
  output: {
    semantic_type: 'PATH_HABIT',
    metadata: {
      label: '路径习惯',
      description: '玩家连续3天在特定时段前往特定区域',
      habit_backed: true
    }
  }
};

// PlayerHabit 统计层（完全复用原设计）
interface PlayerHabit {
  id: string;
  session_id: string;
  habit_type: HabitType;
  counter: number;
  last_triggered_at: Date;
  consecutive_days: number;
  metadata: {
    area_id?: string;
    time_range?: string;
  };
}
```

---

### 8. 昼夜循环（2D 视觉适配）

```typescript
// 2D 昼夜着色器/滤镜
interface DayNightCycle2D {
  timeOfDay: TimeOfDay;
  skyColor: number;        // 十六进制颜色
  overlayAlpha: number;    // 黑夜遮罩透明度
  lightIntensity: number;  // 光照强度
}

// 使用 Phaser 的 Color Matrix 或叠加黑色半透明层
function updateDayNightVisuals(scene: Phaser.Scene, hour: number) {
  const overlay = scene.add.rectangle(
    scene.cameras.main.centerX,
    scene.cameras.main.centerY,
    scene.cameras.main.width,
    scene.cameras.main.height,
    0x000000
  );
  
  // 根据时间调整透明度
  let alpha = 0;
  if (hour >= 20 || hour < 5) alpha = 0.6;      // 深夜
  else if (hour >= 17 && hour < 20) alpha = 0.3; // 日落
  else if (hour >= 5 && hour < 8) alpha = 0.2;   // 日出
  
  overlay.setAlpha(alpha);
  overlay.setDepth(1000); // 确保在最上层
}
```

---

### 9. 情绪镜像系统（完全复用）

**无需调整**，UI 层和逻辑层与 3D/2D 无关。

---

### 10. God Mode UI（完全复用）

**无需调整**，监控面板是 Web UI，与游戏渲染无关。

---

## 实现路线图（2D 适配版）

### Phase 1: 基础架构 (Week 1)
- [ ] Phaser 3 项目初始化
- [ ] 基础场景搭建
- [ ] 玩家移动与朝向系统
- [ ] 瓦片地图加载

### Phase 2: 核心系统 (Week 2)
- [ ] 昼夜循环（2D 滤镜版）
- [ ] 天气系统
- [ ] 区域检测系统
- [ ] 基础埋点系统

### Phase 3: NPC 系统 (Week 3)
- [ ] 6 位 NPC 占位图
- [ ] NPC 移动与日程
- [ ] 对话系统框架
- [ ] 社交能量系统

### Phase 4: 语义系统 (Week 4)
- [ ] 语义转化规则引擎
- [ ] 日落凝视检测（2D版）
- [ ] 高台冥想检测（2D版）
- [ ] 路径习惯统计

### Phase 5: 完整功能 (Week 5)
- [ ] 情绪镜像系统
- [ ] God Mode UI 对接
- [ ] 数据持久化

---

## 验收标准（2D 版）

| 验收项 | 2D 适配标准 |
|--------|------------|
| 移动控制 | WASD 移动，角色正确面向 8 方向 |
| 日落检测 | 角色面朝北 + 处于观景点 + 停留 5 秒 = 触发 |
| 瓦片地图 | 正确加载并显示假透视层次 |
| NPC 导航 | NPC 按日程移动到指定锚点 |
| 动画系统 | 角色有行走/待机动画（占位图也要有颜色变化区分） |
| 数据分层 | PlayerHabit 正确统计并触发语义 |
| 情绪闭环 | 玩家选择表情后 NPC 给出二次反馈 |

---

## 待确认事项

1. **角色方向数**：4 方向（上下左右）还是 8 方向（含斜向）？
2. **地图尺寸**：预估多大？（星露谷标准农场是 80x60 格子）
3. **观景点数量**：日落点设几个？具体位置？
4. **美术占位**：是否需要简单几何形状区分角色，还是纯色方块即可？

---

**文档状态**: 待审阅  
**下一步**: 审阅 TDD.md 并进行相同调整
