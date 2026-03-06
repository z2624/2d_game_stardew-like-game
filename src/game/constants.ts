// 游戏常量定义

export const TILE_SIZE = 16;  // 素材包瓦片尺寸为 16x16
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 50;

// 游戏画面尺寸
export const GAME_WIDTH = MAP_WIDTH * TILE_SIZE;  // 1600
export const GAME_HEIGHT = MAP_HEIGHT * TILE_SIZE; // 1600

// 8方向朝向
export enum Direction {
  N = 'N',      // 北 (0, -1)
  NE = 'NE',    // 东北 (1, -1)
  E = 'E',      // 东 (1, 0)
  SE = 'SE',    // 东南 (1, 1)
  S = 'S',      // 南 (0, 1)
  SW = 'SW',    // 西南 (-1, 1)
  W = 'W',      // 西 (-1, 0)
  NW = 'NW',    // 西北 (-1, -1)
}

// 西方的方向集合（用于日落检测）
export const WESTERN_DIRECTIONS = [Direction.W, Direction.NW, Direction.SW];

// 地图区域类型
export enum AreaType {
  FOREST = 'forest',       // 森林（上部）
  MOUNTAIN = 'mountain',   // 山顶（上部）
  TOWN = 'town',           // 城镇（中部）
  BEACH = 'beach',         // 海滩（下部）
  WATER = 'water',         // 水域
}

// 瓦片类型
export enum TileType {
  GRASS = 'grass',
  TREE = 'tree',
  WATER = 'water',
  SAND = 'sand',
  DIRT = 'dirt',
  STONE = 'stone',
  HOUSE = 'house',
  PATH = 'path',
  VIEWPOINT = 'viewpoint', // 观景点
}

// 游戏时间配置
export const GAME_TIME_CONFIG = {
  DAY_DURATION_MINUTES: 20,     // 游戏内一天持续20分钟现实时间
  HOUR_DURATION_SECONDS: 50,    // 游戏内一小时 = 50秒
  SUNSET_HOUR: 17,              // 日落时间 17:00
  SUNSET_DURATION_MINUTES: 30,  // 日落持续30分钟游戏时间
  NIGHT_HOUR: 19,               // 夜晚开始 19:00
  SUNRISE_HOUR: 6,              // 日出时间 6:00
};

// 日落检测配置
export const SUNSET_CONFIG = {
  VIEWPOINT_RANGE: 3,           // 观景点检测范围（格）
  REQUIRED_STAY_TIME: 5000,     // 需要停留5秒（毫秒）
};

// NPC 配置
export const NPC_CONFIG = {
  NPC_COUNT: 8,
  COLORS: [
    0xff6b6b,  // 红色
    0x4ecdc4,  // 青色
    0xffe66d,  // 黄色
    0x95e1d3,  // 薄荷绿
    0xffa07a,  // 浅橙
    0xdda0dd,  // 梅花
    0x98d8c8,  // 浅青
    0xf7dc6f,  // 金黄
  ],
  MOVEMENT_SPEED: 60,  // NPC移动速度（像素/秒）
  IDLE_TIME: 3000,     // 停留时间（毫秒）
};

// 玩家配置
export const PLAYER_CONFIG = {
  SPEED: 150,          // 玩家移动速度（像素/秒）
  COLOR: 0x3498db,     // 玩家颜色（蓝色）
};

// 地图区域边界（Y轴分割）
export const AREA_BOUNDS = {
  FOREST_END: 15,      // 0-15: 森林/山顶
  TOWN_END: 35,        // 16-35: 城镇
  BEACH_START: 36,     // 36-49: 海滩
};

// 观景点位置
export const VIEWPOINTS = [
  { x: 5, y: 5, name: '森林瞭望台', area: AreaType.FOREST },
  { x: 45, y: 8, name: '山顶观景台', area: AreaType.MOUNTAIN },
  { x: 25, y: 15, name: '镇中心钟楼', area: AreaType.TOWN },
  { x: 40, y: 40, name: '海滩栈桥', area: AreaType.BEACH },
  { x: 10, y: 42, name: '海岸悬崖', area: AreaType.BEACH },
];

// NPC 初始位置
export const NPC_SPAWN_POINTS = [
  { x: 20, y: 20, name: '村长', role: 'elder' },
  { x: 22, y: 22, name: '商人', role: 'merchant' },
  { x: 28, y: 25, name: '铁匠', role: 'blacksmith' },
  { x: 15, y: 30, name: '农夫', role: 'farmer' },
  { x: 35, y: 28, name: '渔夫', role: 'fisher' },
  { x: 8, y: 12, name: '猎人', role: 'hunter' },
  { x: 42, y: 38, name: '水手', role: 'sailor' },
  { x: 25, y: 8, name: '登山者', role: 'climber' },
];
