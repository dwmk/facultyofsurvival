export interface Position {
  x: number;
  y: number;
}

export interface Character {
  id: string;
  position: Position;
  direction: Direction;
  spriteIndex: number;
  animationFrame: number;
  isMoving: boolean;
}

export interface Player extends Character {
  health: number;
  maxHealth: number;
  score: number;
  isAuraFarming: boolean;
  lastMoveTime: number;
}

export enum StudentState {
  IDLE = 'idle',
  CHASING = 'chasing',
  INFORMED = 'informed',
  SEARCHING = 'searching',
}

export interface Student extends Character {
  chasing: boolean;
  target: Position | null;
  complaint: string;
  groupId: string | null;
  lastSeenPlayer: Position | null;
  communicationCooldown: number;
  state: StudentState;
  searchTarget: Position | null;
}

export interface Coin {
  id: string;
  position: Position;
  collected: boolean;
}

export enum Direction {
  DOWN = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
}

export enum TileType {
  FLOOR = 0,
  WALL = 1,
}
