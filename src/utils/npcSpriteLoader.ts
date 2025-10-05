// npcSpriteLoader.ts (updated for multi-char, single, charIndex)
import { Direction } from '../types/game';

type LoaderType = 'albedo' | 'supports' | 'single';

export class NPCSpriteLoader {
  private image: HTMLImageElement | null = null;
  private loaded = false;
  private readonly type: LoaderType;
  private readonly COLUMNS: number;
  private readonly ROWS: number;
  private readonly charsPerRow: number;
  private readonly framesPerChar = 3;
  private readonly dirsPerChar = 4;

  constructor(type: LoaderType) {
    this.type = type;
    if (type === 'albedo' || type === 'single') {
      this.COLUMNS = 3;
      this.ROWS = 4;
      this.charsPerRow = 1;
    } else { // supports
      this.COLUMNS = 12;
      this.ROWS = 8;
      this.charsPerRow = 4;
    }
  }

  async load(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.image = new Image();
      this.image.crossOrigin = 'anonymous';
      this.image.onload = () => {
        this.loaded = true;
        resolve();
      };
      this.image.onerror = reject;
      this.image.src = url;
    });
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  drawSprite(
    ctx: CanvasRenderingContext2D,
    direction: Direction,
    animationFrame: number,
    isMoving: boolean,
    x: number,
    y: number,
    scale: number = 2.5,
    charIndex: number = 0
  ): void {
    if (!this.loaded || !this.image) return;

    const FRAME_WIDTH = this.image.width / this.COLUMNS;
    const FRAME_HEIGHT = this.image.height / this.ROWS;

    const charCol = charIndex % this.charsPerRow;
    const charRow = Math.floor(charIndex / this.charsPerRow);
    const baseCol = charCol * this.framesPerChar;
    const baseRow = charRow * this.dirsPerChar;

    const frame = isMoving ? (animationFrame % this.framesPerChar) : 1;
    const col = baseCol + frame;
    const row = baseRow + direction;

    if (col >= this.COLUMNS || row >= this.ROWS) return; // invalid frame

    const sx = col * FRAME_WIDTH;
    const sy = row * FRAME_HEIGHT;

    ctx.drawImage(
      this.image,
      sx,
      sy,
      FRAME_WIDTH,
      FRAME_HEIGHT,
      x,
      y,
      FRAME_WIDTH * scale,
      FRAME_HEIGHT * scale
    );
  }
}
