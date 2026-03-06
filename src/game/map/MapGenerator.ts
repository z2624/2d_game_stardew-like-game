// 50x50 地图生成器

import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  AreaType,
  TileType,
  AREA_BOUNDS,
} from '@/game/constants';
import { getAreaAtPosition } from '@/game/map/AreaConfig';
import type { Tile } from '@/types/index';

export class MapGenerator {
  private mapData: Tile[][] = [];
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  // 生成地图
  generate(): Tile[][] {
    this.mapData = [];

    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = this.generateTile(x, y);
        row.push(tile);
      }
      this.mapData.push(row);
    }

    // 添加特殊元素
    this.addViewpoints();
    this.addHouses();
    this.addTrees();
    this.addPaths();

    return this.mapData;
  }

  // 根据位置生成基础瓦片
  private generateTile(x: number, y: number): Tile {
    const area = getAreaAtPosition(x, y);
    
    let type = TileType.GRASS;
    let walkable = true;

    switch (area) {
      case AreaType.FOREST:
        type = TileType.GRASS;
        walkable = true;
        break;
      
      case AreaType.MOUNTAIN:
        if (x > 40 && y < 8) {
          type = TileType.STONE;
          walkable = false;
        } else {
          type = TileType.DIRT;
          walkable = true;
        }
        break;
      
      case AreaType.TOWN:
        type = TileType.GRASS;
        walkable = true;
        // 房屋区域
        if (this.isHouseArea(x, y)) {
          type = TileType.HOUSE;
          walkable = false;
        }
        break;
      
      case AreaType.BEACH:
        if (y >= MAP_HEIGHT - 3 || x < 2 || x >= MAP_WIDTH - 2) {
          type = TileType.WATER;
          walkable = false;
        } else if (y >= MAP_HEIGHT - 8) {
          type = TileType.SAND;
          walkable = true;
        } else {
          type = TileType.GRASS;
          walkable = true;
        }
        break;
    }

    return {
      type,
      walkable,
      x,
      y,
    };
  }

  // 检查是否是房屋区域
  private isHouseArea(x: number, y: number): boolean {
    // 城镇中的几个房屋位置
    const houses = [
      { x: 12, y: 18, w: 4, h: 4 },
      { x: 22, y: 22, w: 4, h: 4 },
      { x: 32, y: 20, w: 4, h: 4 },
      { x: 8, y: 28, w: 4, h: 4 },
      { x: 38, y: 26, w: 4, h: 4 },
      { x: 18, y: 30, w: 4, h: 4 },
      { x: 28, y: 28, w: 4, h: 4 },
    ];

    for (const house of houses) {
      if (x >= house.x && x < house.x + house.w &&
          y >= house.y && y < house.y + house.h) {
        return true;
      }
    }
    return false;
  }

  // 添加观景点
  private addViewpoints(): void {
    const viewpoints = [
      { x: 5, y: 5 },
      { x: 45, y: 8 },
      { x: 25, y: 15 },
      { x: 40, y: 40 },
      { x: 10, y: 42 },
    ];

    for (const vp of viewpoints) {
      if (this.isValidPosition(vp.x, vp.y)) {
        this.mapData[vp.y][vp.x] = {
          type: TileType.VIEWPOINT,
          walkable: true,
          x: vp.x,
          y: vp.y,
        };
      }
    }
  }

  // 添加房屋（确保不可走）
  private addHouses(): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.isHouseArea(x, y)) {
          this.mapData[y][x] = {
            type: TileType.HOUSE,
            walkable: false,
            x,
            y,
          };
        }
      }
    }
  }

  // 添加树木
  private addTrees(): void {
    const treePositions = [
      // 森林区域
      { x: 2, y: 2 }, { x: 8, y: 3 }, { x: 15, y: 5 },
      { x: 3, y: 8 }, { x: 12, y: 10 }, { x: 20, y: 8 },
      { x: 6, y: 12 }, { x: 18, y: 12 }, { x: 28, y: 5 },
      { x: 35, y: 3 }, { x: 38, y: 10 }, { x: 42, y: 12 },
      { x: 48, y: 5 }, { x: 33, y: 8 }, { x: 22, y: 2 },
      // 城镇边缘
      { x: 1, y: 16 }, { x: 5, y: 16 }, { x: 48, y: 16 },
      { x: 3, y: 35 }, { x: 47, y: 35 },
      // 其他分散的树木
      { x: 20, y: 38 }, { x: 30, y: 42 },
    ];

    for (const pos of treePositions) {
      if (this.isValidPosition(pos.x, pos.y)) {
        const tile = this.mapData[pos.y][pos.x];
        if (tile.type === TileType.GRASS) {
          this.mapData[pos.y][pos.x] = {
            type: TileType.TREE,
            walkable: false,
            x: pos.x,
            y: pos.y,
          };
        }
      }
    }
  }

  // 添加小路
  private addPaths(): void {
    // 主路 - 穿过城镇
    for (let x = 5; x < MAP_WIDTH - 5; x++) {
      if (x % 3 !== 0) {  // 断断续续的小路
        const y = 25;
        if (this.mapData[y] && this.mapData[y][x] && 
            this.mapData[y][x].walkable && 
            this.mapData[y][x].type === TileType.GRASS) {
          this.mapData[y][x] = {
            type: TileType.PATH,
            walkable: true,
            x,
            y,
          };
        }
      }
    }

    // 通往森林的小路
    for (let y = 10; y < 25; y++) {
      const x = 25;
      if (this.mapData[y] && this.mapData[y][x] && 
          this.mapData[y][x].walkable) {
        this.mapData[y][x] = {
          type: TileType.PATH,
          walkable: true,
          x,
          y,
        };
      }
    }

    // 通往海滩的小路
    for (let y = 25; y < 45; y++) {
      const x = 30;
      if (this.mapData[y] && this.mapData[y][x] && 
          this.mapData[y][x].walkable) {
        this.mapData[y][x] = {
          type: TileType.PATH,
          walkable: true,
          x,
          y,
        };
      }
    }
  }

  // 检查位置是否有效
  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT;
  }

  // 获取地图数据
  getMapData(): Tile[][] {
    return this.mapData;
  }

  // 获取指定位置的瓦片
  getTileAt(x: number, y: number): Tile | null {
    if (!this.isValidPosition(x, y)) {
      return null;
    }
    return this.mapData[y][x];
  }

  // 检查位置是否可走
  isWalkable(x: number, y: number): boolean {
    const tile = this.getTileAt(x, y);
    return tile?.walkable ?? false;
  }
}

// 单例地图生成器
let mapGeneratorInstance: MapGenerator | null = null;

export function getMapGenerator(seed?: number): MapGenerator {
  if (!mapGeneratorInstance || seed !== undefined) {
    mapGeneratorInstance = new MapGenerator(seed);
  }
  return mapGeneratorInstance;
}
