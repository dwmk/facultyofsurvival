export class SpriteLoader {
  private image: HTMLImageElement | null = null;
  private loaded = false;

  readonly SPRITE_WIDTH = 78;
  readonly SPRITE_HEIGHT = 108;
  readonly COLUMNS = 12;
  readonly ROWS = 8;
  readonly CHARS_PER_ROW = 4;
  readonly CHARS_PER_COL = 2;
  readonly CHAR_COLS = 3;
  readonly CHAR_ROWS = 4;

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

  getSprite(charIndex: number, direction: number, frame: number, isMoving: boolean): ImageBitmap | null {
    if (!this.image || !this.loaded) return null;

    const charRow = Math.floor(charIndex / this.CHARS_PER_ROW);
    const charCol = charIndex % this.CHARS_PER_ROW;

    const baseX = charCol * this.CHAR_COLS * this.SPRITE_WIDTH;
    const baseY = charRow * this.CHAR_ROWS * this.SPRITE_HEIGHT;

    let frameCol = 1;
    if (isMoving) {
      frameCol = frame % 3;
    }

    const x = baseX + frameCol * this.SPRITE_WIDTH;
    const y = baseY + direction * this.SPRITE_HEIGHT;

    return { x, y, width: this.SPRITE_WIDTH, height: this.SPRITE_HEIGHT } as any;
  }

  drawSprite(
    ctx: CanvasRenderingContext2D,
    charIndex: number,
    direction: number,
    frame: number,
    isMoving: boolean,
    x: number,
    y: number,
    scale: number = 1
  ): void {
    if (!this.image || !this.loaded) return;

    const charRow = Math.floor(charIndex / this.CHARS_PER_ROW);
    const charCol = charIndex % this.CHARS_PER_ROW;

    const baseX = charCol * this.CHAR_COLS * this.SPRITE_WIDTH;
    const baseY = charRow * this.CHAR_ROWS * this.SPRITE_HEIGHT;

    let frameCol = 1;
    if (isMoving) {
      frameCol = frame % 3;
    }

    const sx = baseX + frameCol * this.SPRITE_WIDTH;
    const sy = baseY + direction * this.SPRITE_HEIGHT;

    ctx.drawImage(
      this.image,
      sx, sy,
      this.SPRITE_WIDTH, this.SPRITE_HEIGHT,
      x, y,
      this.SPRITE_WIDTH * scale, this.SPRITE_HEIGHT * scale
    );
  }
}

interface ImageBitmap {
  x: number;
  y: number;
  width: number;
  height: number;
}
