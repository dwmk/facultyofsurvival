import { Direction } from '../types/game';

export class NPCSpriteLoader {
  private image: HTMLImageElement | null = null;
  private loaded = false;

  // Number of columns and rows in the sprite sheet
  private readonly COLUMNS = 3;
  private readonly ROWS = 4;

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
    scale: number = 2.5
  ): void {
    if (!this.loaded || !this.image) return;

    // Dynamically calculate frame size from the loaded image
    const FRAME_WIDTH = this.image.width / this.COLUMNS;
    const FRAME_HEIGHT = this.image.height / this.ROWS;

    const frame = isMoving ? animationFrame % this.COLUMNS : 0;
    const row = direction; // assuming Direction is 0–3 (Up, Right, Down, Left)

    const sx = frame * FRAME_WIDTH;
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
