import { useEffect, useRef } from 'react';
import { Player, Student, Coin, TileType, StudentState, NPC, PlayerUpgrades } from '../types/game';
import { SpriteLoader } from '../utils/spriteLoader';
import { NPCSpriteLoader } from '../utils/npcSpriteLoader';

interface GameCanvasProps {
  gameMap: TileType[][];
  player: Player | null;
  students: Student[];
  coins: Coin[];
  npcs: NPC[];
  tileSize: number;
  mapSize: number;
  playerUpgrades: PlayerUpgrades;
  chatGPTTrackerCooldown: number;
}

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const SPRITE_URL = 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_freeschooluniforms.png';
const NPC_SPRITE_URL = 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_albedo.png';

export const GameCanvas = ({ gameMap, player, students, coins, npcs, tileSize, mapSize, playerUpgrades, chatGPTTrackerCooldown }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteLoaderRef = useRef<SpriteLoader>(new SpriteLoader());
  const npcSpriteLoaderRef = useRef<NPCSpriteLoader>(new NPCSpriteLoader());
  const spritesLoadedRef = useRef(false);
  const npcSpritesLoadedRef = useRef(false);

  useEffect(() => {
    const loadSprites = async () => {
      try {
        await spriteLoaderRef.current.load(SPRITE_URL);
        spritesLoadedRef.current = true;
        await npcSpriteLoaderRef.current.load(NPC_SPRITE_URL);
        npcSpritesLoadedRef.current = true;
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

  // Shared helper for all chat bubbles
const drawChatBubble = (
  ctx: CanvasRenderingContext2D,
  text: string,
  screenX: number,
  screenY: number,
  options?: {
    font?: string;
    textColor?: string;
    fillColor?: string;
    strokeColor?: string;
    maxWidth?: number;
    lineHeight?: number;
    padding?: number;
  }
) => {
  const {
    font = '8px "Press Start 2P", monospace',
    textColor = '#333',
    fillColor = 'rgba(255, 255, 255, 0.95)',
    strokeColor = '#333',
    maxWidth = 180,
    lineHeight = 12,
    padding = 8,
  } = options || {};

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const words = text.split(' ');
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

  const bubbleWidth = Math.min(maxWidth + padding * 2, 200);
  const bubbleHeight = lines.length * lineHeight + padding * 2;
  const bubbleX = screenX + 40 - bubbleWidth / 2;
  const bubbleY = screenY - bubbleHeight - 15;

  // Bubble box
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
  ctx.fill();
  ctx.stroke();

  // Tail triangle
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(bubbleX + bubbleWidth / 2 - 5, bubbleY + bubbleHeight);
  ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight + 8);
  ctx.lineTo(bubbleX + bubbleWidth / 2 + 5, bubbleY + bubbleHeight);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = textColor;
  lines.forEach((line, i) => {
    ctx.fillText(line, bubbleX + bubbleWidth / 2, bubbleY + padding + i * lineHeight);
  });
};


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
  const shadowY = spriteY + h + 2; // Below the sprite by 2px

  const shadowWidth = w * 0.7; // Slightly wider than sprite
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
        } else if (gameMap[y]?.[x] === TileType.STAFF_ROOM) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#FFD700' : '#4169E1';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);

          ctx.strokeStyle = '#DAA520';
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

    if (spritesLoadedRef.current && npcSpritesLoadedRef.current) {
      npcs.forEach(npc => {
        const screenX = npc.position.x - cameraX - 40;
        const screenY = npc.position.y - cameraY - 40;

        if (screenX < -100 || screenX > VIEWPORT_WIDTH + 100 || screenY < -100 || screenY > VIEWPORT_HEIGHT + 100) {
          return;
        }

        drawShadow(ctx, screenX, screenY, 2.5);

        npcSpriteLoaderRef.current.drawSprite(
          ctx,
          npc.direction,
          npc.animationFrame,
          npc.isMoving,
          screenX,
          screenY,
          2.5
        );

        if (npc.sayingTime > 0) {
          drawChatBubble(ctx, npc.currentSaying, screenX, screenY);
        }

      });

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
          drawChatBubble(ctx, displayText, screenX, screenY);
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

      if (chatGPTTrackerCooldown > 0 && chatGPTTrackerCooldown < 5) {
        const progress = (5 - chatGPTTrackerCooldown) / 5;
        const radius = progress * 300;
        const playerScreenX = player.position.x - cameraX - 40;
        const playerScreenY = player.position.y - cameraY - 40;
        
        drawChatBubble(ctx, 'Stop using ChatGPT!', playerScreenX, playerScreenY);
      }
    }

    if (playerUpgrades.chatGPTTrackers > 0) {
      const iconSize = 80;
      const padding = 10;
      const boxSize = iconSize + padding * 2;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(padding, padding, boxSize, boxSize);
      ctx.strokeStyle = chatGPTTrackerCooldown > 0 ? '#666' : '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(padding, padding, boxSize, boxSize);

      const img = new Image();
      img.src = 'https://dewanmukto.github.io/asset/images/gpticon.png';
      ctx.drawImage(img, padding * 2, padding * 2, iconSize, iconSize);

      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`x${playerUpgrades.chatGPTTrackers}`, padding + boxSize - 5, padding + boxSize - 5);

      if (chatGPTTrackerCooldown > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.fillRect(padding, padding, boxSize, boxSize);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.ceil(chatGPTTrackerCooldown).toString(), padding + boxSize / 2, padding + boxSize / 2);
      }
    }
  }, [gameMap, player, students, coins, npcs, tileSize, mapSize, chatGPTTrackerCooldown, playerUpgrades]);

  return <canvas ref={canvasRef} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} className="border-4 border-gray-800 rounded" />;
};
