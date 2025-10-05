import { TileType, Position } from '../types/game';

export class MapGenerator {
  private width: number;
  private height: number;
  private map: TileType[][];
  private staffRooms: Array<{ minX: number; maxX: number; minY: number; maxY: number; center: Position }> = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.map = Array(height).fill(null).map(() => Array(width).fill(TileType.WALL));
  }

  generate(): TileType[][] {
    this.generateRooms();
    this.generateCorridors();
    this.smoothWalls();
    this.generateStaffRooms();
    return this.map;
  }

  getStaffRooms() {
    return this.staffRooms;
  }

  private generateStaffRooms(): void {
    const numStaffRooms = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < numStaffRooms; i++) {
      const roomWidth = 6 + Math.floor(Math.random() * 4);
      const roomHeight = 6 + Math.floor(Math.random() * 4);
      const x = 2 + Math.floor(Math.random() * (this.width - roomWidth - 4));
      const y = 2 + Math.floor(Math.random() * (this.height - roomHeight - 4));

      for (let ry = y; ry < y + roomHeight; ry++) {
        for (let rx = x; rx < x + roomWidth; rx++) {
          if (ry >= 0 && ry < this.height && rx >= 0 && rx < this.width) {
            this.map[ry][rx] = TileType.STAFF_ROOM;
          }
        }
      }

      this.staffRooms.push({
        minX: x,
        maxX: x + roomWidth - 1,
        minY: y,
        maxY: y + roomHeight - 1,
        center: { x: (x + x + roomWidth) / 2, y: (y + y + roomHeight) / 2 }
      });
    }
  }

  private generateRooms(): void {
    const numRooms = 15 + Math.floor(Math.random() * 10);

    for (let i = 0; i < numRooms; i++) {
      const roomWidth = 4 + Math.floor(Math.random() * 8);
      const roomHeight = 4 + Math.floor(Math.random() * 8);
      const x = 2 + Math.floor(Math.random() * (this.width - roomWidth - 4));
      const y = 2 + Math.floor(Math.random() * (this.height - roomHeight - 4));

      for (let ry = y; ry < y + roomHeight; ry++) {
        for (let rx = x; rx < x + roomWidth; rx++) {
          if (ry >= 0 && ry < this.height && rx >= 0 && rx < this.width) {
            this.map[ry][rx] = TileType.FLOOR;
          }
        }
      }
    }
  }

  private generateCorridors(): void {
    for (let attempts = 0; attempts < 500; attempts++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);

      if (this.map[y][x] === TileType.FLOOR) {
        const horizontal = Math.random() > 0.5;
        const length = 3 + Math.floor(Math.random() * 10);

        if (horizontal) {
          for (let i = 0; i < length; i++) {
            const nx = x + i;
            if (nx >= 0 && nx < this.width) {
              this.map[y][nx] = TileType.FLOOR;
              if (y > 0) this.map[y - 1][nx] = TileType.FLOOR;
              if (y < this.height - 1) this.map[y + 1][nx] = TileType.FLOOR;
            }
          }
        } else {
          for (let i = 0; i < length; i++) {
            const ny = y + i;
            if (ny >= 0 && ny < this.height) {
              this.map[ny][x] = TileType.FLOOR;
              if (x > 0) this.map[ny][x - 1] = TileType.FLOOR;
              if (x < this.width - 1) this.map[ny][x + 1] = TileType.FLOOR;
            }
          }
        }
      }
    }
  }

  private smoothWalls(): void {
    const newMap = this.map.map(row => [...row]);

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const floorNeighbors = this.countFloorNeighbors(x, y);

        if (this.map[y][x] === TileType.WALL && floorNeighbors >= 5) {
          newMap[y][x] = TileType.FLOOR;
        }
      }
    }

    this.map = newMap;
  }

  private countFloorNeighbors(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          if (this.map[ny][nx] === TileType.FLOOR) count++;
        }
      }
    }
    return count;
  }

  findSpawnPoint(): { x: number; y: number } {
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.map[y][x] === TileType.FLOOR) {
        return { x, y };
      }
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.map[y][x] === TileType.FLOOR) {
          return { x, y };
        }
      }
    }

    return { x: this.width / 2, y: this.height / 2 };
  }
}
