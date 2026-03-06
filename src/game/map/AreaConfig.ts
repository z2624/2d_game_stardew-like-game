// 区域和锚点配置

import { AreaType, VIEWPOINTS, AREA_BOUNDS, MAP_WIDTH, MAP_HEIGHT } from '@/game/constants';
import type { Area, Viewpoint } from '@/types/index';

// 地图区域定义
export const AREAS: Area[] = [
  {
    type: AreaType.FOREST,
    name: '森林区域',
    bounds: {
      x1: 0,
      y1: 0,
      x2: MAP_WIDTH - 1,
      y2: AREA_BOUNDS.FOREST_END,
    },
    anchorPoints: [
      { x: 5, y: 5 },
      { x: 25, y: 8 },
      { x: 45, y: 5 },
      { x: 10, y: 12 },
      { x: 40, y: 10 },
    ],
  },
  {
    type: AreaType.MOUNTAIN,
    name: '山顶区域',
    bounds: {
      x1: 30,
      y1: 0,
      x2: MAP_WIDTH - 1,
      y2: AREA_BOUNDS.FOREST_END,
    },
    anchorPoints: [
      { x: 35, y: 3 },
      { x: 45, y: 8 },
      { x: 48, y: 12 },
    ],
  },
  {
    type: AreaType.TOWN,
    name: '城镇区域',
    bounds: {
      x1: 0,
      y1: AREA_BOUNDS.FOREST_END + 1,
      x2: MAP_WIDTH - 1,
      y2: AREA_BOUNDS.TOWN_END,
    },
    anchorPoints: [
      { x: 10, y: 18 },
      { x: 25, y: 25 },
      { x: 40, y: 20 },
      { x: 15, y: 30 },
      { x: 35, y: 32 },
      { x: 5, y: 22 },
      { x: 45, y: 28 },
    ],
  },
  {
    type: AreaType.BEACH,
    name: '海滩区域',
    bounds: {
      x1: 0,
      y1: AREA_BOUNDS.BEACH_START,
      x2: MAP_WIDTH - 1,
      y2: MAP_HEIGHT - 1,
    },
    anchorPoints: [
      { x: 10, y: 42 },
      { x: 25, y: 45 },
      { x: 40, y: 40 },
      { x: 45, y: 48 },
      { x: 5, y: 46 },
      { x: 30, y: 48 },
    ],
  },
];

// 获取观景点列表
export function getViewpoints(): Viewpoint[] {
  return VIEWPOINTS;
}

// 获取指定位置所属的区域
export function getAreaAtPosition(x: number, y: number): AreaType {
  if (y <= AREA_BOUNDS.FOREST_END) {
    // 山顶在右上角
    if (x >= 30) {
      return AreaType.MOUNTAIN;
    }
    return AreaType.FOREST;
  }
  if (y <= AREA_BOUNDS.TOWN_END) {
    return AreaType.TOWN;
  }
  return AreaType.BEACH;
}

// 获取区域名称
export function getAreaName(areaType: AreaType): string {
  const area = AREAS.find(a => a.type === areaType);
  return area?.name || '未知区域';
}

// 获取区域锚点
export function getAreaAnchors(areaType: AreaType): { x: number; y: number }[] {
  const area = AREAS.find(a => a.type === areaType);
  return area?.anchorPoints || [];
}

// 检查位置是否在观景点范围内
export function isNearViewpoint(
  x: number,
  y: number,
  range: number = 3
): { isNear: boolean; viewpoint: Viewpoint | null } {
  for (const viewpoint of VIEWPOINTS) {
    const distance = Math.abs(x - viewpoint.x) + Math.abs(y - viewpoint.y);
    if (distance <= range) {
      return { isNear: true, viewpoint };
    }
  }
  return { isNear: false, viewpoint: null };
}

// 获取随机锚点（用于NPC移动）
export function getRandomAnchor(areaType: AreaType, exclude?: { x: number; y: number }): { x: number; y: number } {
  const anchors = getAreaAnchors(areaType);
  if (anchors.length === 0) {
    return { x: 25, y: 25 };
  }
  
  // 如果有排除点，尽量选不同的
  let availableAnchors = anchors;
  if (exclude) {
    availableAnchors = anchors.filter(
      a => Math.abs(a.x - exclude.x) > 2 || Math.abs(a.y - exclude.y) > 2
    );
  }
  
  if (availableAnchors.length === 0) {
    availableAnchors = anchors;
  }
  
  return availableAnchors[Math.floor(Math.random() * availableAnchors.length)];
}

// 检查位置是否可走（简化版）
export function isWalkable(x: number, y: number): boolean {
  // 边界检查
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
    return false;
  }
  
  // 山顶区域有障碍物
  const area = getAreaAtPosition(x, y);
  if (area === AreaType.MOUNTAIN) {
    // 山顶有一些不可走的岩石区域
    if (x > 40 && y < 5) return false;
    if (x > 45 && y < 10) return false;
  }
  
  // 水域不可走
  if (area === AreaType.WATER) {
    return false;
  }
  
  return true;
}
