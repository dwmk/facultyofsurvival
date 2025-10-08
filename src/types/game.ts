// game.ts (updated for player pronoun, custom sprite, npc loader/charIndex)
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
  pronoun: string;
  isCustomSprite: boolean;
  spriteSheetUrl?: string;
}

export enum StudentState {
  IDLE = 'idle',
  CHASING = 'chasing',
  INFORMED = 'informed',
  SEARCHING = 'searching',
  FLEEING = 'fleeing',
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
  STAFF_ROOM = 2,
}

export interface NPC extends Character {
  sayings: string[];
  currentSaying: string;
  sayingTime: number;
  targetPosition: Position | null;
  idleMoving: boolean;
  roomBounds: { minX: number; maxX: number; minY: number; maxY: number } | null;
  loaderType: 'albedo' | 'supports';
  charIndex: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  type: 'upgrade' | 'tool';
  purchased?: number;
}

export interface PlayerUpgrades {
  speedBoosts: number;
  assignmentsPurchased: number;
  chatGPTTrackers: number;
}
