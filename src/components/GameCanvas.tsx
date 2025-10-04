import { useEffect, useRef } from 'react';
import { Player, Student, Coin, TileType, StudentState } from '../types/game';
import { SpriteLoader } from '../utils/spriteLoader';

interface GameCanvasProps {
  gameMap: TileType[][];
  player: Player | null;
  students: Student[];
  coins: Coin[];
  tileSize: number;
  mapSize: number;
}

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const SPRITE_URL = 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_freeschooluniforms.png';

export const GameCanvas = ({ gameMap, player, students, coins, tileSize, mapSize }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteLoaderRef = useRef<SpriteLoader>(new SpriteLoader());
  const spritesLoadedRef = useRef(false);

  useEffect(() => {
    const loadSprites = async () => {
      try {
        await spriteLoaderRef.current.load(SPRITE_URL);
        spritesLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load sprites:', error);
      }
    };

    loadSprites();
  }, []);

  

  useEffect(() => {
  let interval: NodeJS.Timeout | null = null;

  const movePlayer = (dir: string) => {
    switch (dir) {
      case "up":
        handleKeyDown({ key: "ArrowUp" } as KeyboardEvent);
        break;
      case "down":
        handleKeyDown({ key: "ArrowDown" } as KeyboardEvent);
        break;
      case "left":
        handleKeyDown({ key: "ArrowLeft" } as KeyboardEvent);
        break;
      case "right":
        handleKeyDown({ key: "ArrowRight" } as KeyboardEvent);
        break;
    }
  };

  const startMoving = (dir: string) => {
    movePlayer(dir); // immediate move
    interval = setInterval(() => movePlayer(dir), 150); // repeat every 150ms
  };

  const stopMoving = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };

  ["up", "down", "left", "right"].forEach((dir) => {
    const btn = document.getElementById(dir);
    if (btn) {
      btn.addEventListener("touchstart", () => startMoving(dir));
      btn.addEventListener("mousedown", () => startMoving(dir));

      btn.addEventListener("touchend", stopMoving);
      btn.addEventListener("mouseup", stopMoving);
      btn.addEventListener("mouseleave", stopMoving); // for when finger slides off
    }
  });

  return () => {
    stopMoving();
    ["up", "down", "left", "right"].forEach((dir) => {
      const btn = document.getElementById(dir);
      if (btn) {
        btn.replaceWith(btn.cloneNode(true)); // remove old listeners
      }
    });
  };
}, []);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    // add shadow below character sprites
    const drawShadow = (ctx: CanvasRenderingContext2D, spriteX: number, spriteY: number, scale: number = 2.5) => {
  const w = 32 * scale; // Sprite width after scaling
  const h = 32 * scale; // Sprite height after scaling

  const shadowX = spriteX + w / 2; // Center horizontally
  const shadowY = spriteY + h + 5; // Below the sprite by 5px

  const shadowWidth = w * 1.2; // Slightly wider than sprite
  const shadowHeight = h * 0.2; // Flat oval

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; // Semi-transparent black
  ctx.beginPath();
  ctx.ellipse(shadowX, shadowY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);

    if (!player) return;

    const cameraX = player.position.x - VIEWPORT_WIDTH / 2;
    const cameraY = player.position.y - VIEWPORT_HEIGHT / 2;

    const startTileX = Math.max(0, Math.floor(cameraX / tileSize));
    const endTileX = Math.min(mapSize, Math.ceil((cameraX + VIEWPORT_WIDTH) / tileSize));
    const startTileY = Math.max(0, Math.floor(cameraY / tileSize));
    const endTileY = Math.min(mapSize, Math.ceil((cameraY + VIEWPORT_HEIGHT) / tileSize));

    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        const screenX = x * tileSize - cameraX;
        const screenY = y * tileSize - cameraY;

        if (gameMap[y]?.[x] === TileType.FLOOR) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#e0e0e0' : '#ffffff';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);

          ctx.strokeStyle = '#d0d0d0';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);

          ctx.fillStyle = '#6B3410';
          ctx.fillRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
        }
      }
    }

    coins.forEach(coin => {
      if (coin.collected) return;

      const screenX = coin.position.x - cameraX;
      const screenY = coin.position.y - cameraY;

      if (screenX < -20 || screenX > VIEWPORT_WIDTH + 20 || screenY < -20 || screenY > VIEWPORT_HEIGHT + 20) {
        return;
      }

      const radius = 8;
      const time = Date.now() / 1000;
      const bobOffset = Math.sin(time * 3) * 3;

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(screenX, screenY + bobOffset, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY + bobOffset, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#FFE55C';
      ctx.beginPath();
      ctx.arc(screenX - 2, screenY + bobOffset - 2, radius / 3, 0, Math.PI * 2);
      ctx.fill();
    });

    if (spritesLoadedRef.current) {
      students.forEach(student => {
        const screenX = student.position.x - cameraX - 40;
        const screenY = student.position.y - cameraY - 40;

        if (screenX < -100 || screenX > VIEWPORT_WIDTH + 100 || screenY < -100 || screenY > VIEWPORT_HEIGHT + 100) {
          return;
        }

        drawShadow(ctx, screenX, screenY, 2.5);

        spriteLoaderRef.current.drawSprite(
          ctx,
          student.spriteIndex,
          student.direction,
          student.animationFrame,
          student.isMoving,
          screenX,
          screenY,
          2.5
        );

        if (student.state === StudentState.CHASING || student.state === StudentState.INFORMED) {
          const displayText = student.state === StudentState.INFORMED ? '...' : student.complaint;

          ctx.font = '8px "Press Start 2P", monospace';
          const maxWidth = 180;
          const words = displayText.split(' ');
          const lines: string[] = [];
          let currentLine = '';

          words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });
          if (currentLine) lines.push(currentLine);

          const lineHeight = 12;
          const padding = 8;
          const bubbleWidth = Math.min(maxWidth + padding * 2, 200);
          const bubbleHeight = lines.length * lineHeight + padding * 2;
          const bubbleX = screenX + 40 - bubbleWidth / 2;
          const bubbleY = screenY - bubbleHeight - 15;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.beginPath();
          ctx.moveTo(bubbleX + bubbleWidth / 2 - 5, bubbleY + bubbleHeight);
          ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight + 8);
          ctx.lineTo(bubbleX + bubbleWidth / 2 + 5, bubbleY + bubbleHeight);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#333';
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          lines.forEach((line, i) => {
            ctx.fillText(line, bubbleX + bubbleWidth / 2, bubbleY + padding + i * lineHeight);
          });
        }
      });

      const playerScreenX = player.position.x - cameraX - 40;
      const playerScreenY = player.position.y - cameraY - 40;

      drawShadow(ctx, playerScreenX, playerScreenY, 2.5);

      spriteLoaderRef.current.drawSprite(
        ctx,
        player.spriteIndex,
        player.direction,
        player.animationFrame,
        player.isMoving,
        playerScreenX,
        playerScreenY,
        2.5
      );

      if (player.isAuraFarming) {
        const time = Date.now() / 1000;
        const slideOffset = (time * 50) % 100;

        ctx.save();
        ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
        ctx.shadowBlur = 20;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        const gradient = ctx.createLinearGradient(
          playerScreenX + 39 - 50 + slideOffset,
          playerScreenY - 20,
          playerScreenX + 39 + 50 + slideOffset,
          playerScreenY - 20
        );
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 1)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.3)');

        ctx.fillStyle = gradient;
        ctx.fillText('AURA FARMING', playerScreenX + 40, playerScreenY - 20);

        ctx.restore();
      }
    }
  }, [gameMap, player, students, coins, tileSize, mapSize]);

  return <canvas ref={canvasRef} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} className="border-4 border-gray-800 rounded" />;
};
