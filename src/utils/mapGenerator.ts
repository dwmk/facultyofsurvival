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
    this.ensureConnectivity();
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
            const isWall = (rx === x || rx === x + roomWidth - 1 || ry === y || ry === y + roomHeight - 1);
            this.map[ry][rx] = isWall ? TileType.WALL : TileType.STAFF_ROOM;
          }
        }
      }

      const doorSide = Math.floor(Math.random() * 4);
      let doorX: number, doorY: number;

      switch (doorSide) {
        case 0:
          doorX = x + Math.floor(roomWidth / 2);
          doorY = y;
          break;
        case 1:
          doorX = x + roomWidth - 1;
          doorY = y + Math.floor(roomHeight / 2);
          break;
        case 2:
          doorX = x + Math.floor(roomWidth / 2);
          doorY = y + roomHeight - 1;
          break;
        default:
          doorX = x;
          doorY = y + Math.floor(roomHeight / 2);
      }

      if (doorX >= 0 && doorX < this.width && doorY >= 0 && doorY < this.height) {
        this.map[doorY][doorX] = TileType.STAFF_ROOM;
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

  private ensureConnectivity(): void {
    const walkables: Position[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.map[y][x] === TileType.FLOOR || this.map[y][x] === TileType.STAFF_ROOM) {
          walkables.push({ x, y });
        }
      }
    }

    if (walkables.length === 0) return;

    const components: Position[][] = [];
    const globalVisited = new Set<string>();

    for (const pos of walkables) {
      const posKey = this.getKey(pos.x, pos.y);
      if (!globalVisited.has(posKey)) {
        const component: Position[] = [];
        this.floodFill(pos, globalVisited, component);
        components.push(component);
      }
    }

    if (components.length <= 1) return;

    // Find largest component
    let mainIndex = 0;
    let maxSize = components[0].length;
    for (let i = 1; i < components.length; i++) {
      if (components[i].length > maxSize) {
        maxSize = components[i].length;
        mainIndex = i;
      }
    }

    const mainComponent = components[mainIndex];
    components.splice(mainIndex, 1);

    // Connect each other component to main
    for (const component of components) {
      if (component.length > 0 && mainComponent.length > 0) {
        const randomMain = mainComponent[Math.floor(Math.random() * mainComponent.length)];
        const randomComp = component[Math.floor(Math.random() * component.length)];
        this.carvePath(randomMain, randomComp);
      }
    }
  }

  private floodFill(start: Position, visited: Set<string>, component: Position[]): void {
    const queue: Position[] = [{ x: start.x, y: start.y }];
    const startKey = this.getKey(start.x, start.y);
    visited.add(startKey);
    component.push(start);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];

      for (const dir of dirs) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        if (
          nx >= 0 &&
          nx < this.width &&
          ny >= 0 &&
          ny < this.height &&
          (this.map[ny][nx] === TileType.FLOOR || this.map[ny][nx] === TileType.STAFF_ROOM) &&
          !visited.has(this.getKey(nx, ny))
        ) {
          const nkey = this.getKey(nx, ny);
          visited.add(nkey);
          const npos: Position = { x: nx, y: ny };
          component.push(npos);
          queue.push(npos);
        }
      }
    }
  }

  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private carvePath(p1: Position, p2: Position): void {
    // Horizontal leg
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const horY = p1.y;
    for (let x = minX; x <= maxX; x++) {
      [-1, 0, 1].forEach(dy => {
        const ny = horY + dy;
        if (ny >= 0 && ny < this.height && x >= 0 && x < this.width) {
          this.map[ny][x] = TileType.FLOOR;
        }
      });
    }

    // Vertical leg
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    const verX = p2.x;
    for (let y = minY; y <= maxY; y++) {
      [-1, 0, 1].forEach(dx => {
        const nx = verX + dx;
        if (nx >= 0 && nx < this.width && y >= 0 && y < this.height) {
          this.map[y][nx] = TileType.FLOOR;
        }
      });
    }
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
