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
  chatGPTStartTime: number;
  chatGPTActiveUntil: number;
  lastDamageTimeForVignette: number;
  activeMarquee: { text: string; startTime: number } | null;
  customPlayerSpritesheets: Record<string, string>;
  nearNPC: boolean;
}

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const SPRITE_URL = 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_freeschooluniforms.png';
const ALBEDO_SPRITE_URL = 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_albedo.png';
const SUPPORTS_SPRITE_URL = 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_supports.png';

export const GameCanvas = ({ gameMap, player, students, coins, npcs, tileSize, mapSize, playerUpgrades, chatGPTTrackerCooldown, chatGPTStartTime, chatGPTActiveUntil, lastDamageTimeForVignette, activeMarquee, customPlayerSpritesheets, nearNPC }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteLoaderRef = useRef<SpriteLoader>(new SpriteLoader());
  const albedoLoaderRef = useRef<NPCSpriteLoader>(new NPCSpriteLoader('albedo'));
  const supportsLoaderRef = useRef<NPCSpriteLoader>(new NPCSpriteLoader('supports'));
  const customPlayerLoadersRef = useRef<Map<string, NPCSpriteLoader>>(new Map());
  const spritesLoadedRef = useRef(false);
  const npcSpritesLoadedRef = useRef(false);
  const customLoadedRef = useRef(false);

  useEffect(() => {
    const loadSprites = async () => {
      try {
        await spriteLoaderRef.current.load(SPRITE_URL);
        spritesLoadedRef.current = true;
        await albedoLoaderRef.current.load(ALBEDO_SPRITE_URL);
        await supportsLoaderRef.current.load(SUPPORTS_SPRITE_URL);
        npcSpritesLoadedRef.current = true;

        // Preload custom player sprites
        Object.values(customPlayerSpritesheets).forEach((url) => {
          if (!url.startsWith('http')) return; // skip default
          const loader = new NPCSpriteLoader('single');
          loader.load(url).then(() => {
            customPlayerLoadersRef.current.set(url, loader);
          });
        });
        customLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load sprites:', error);
      }
    };

    loadSprites();
  }, [customPlayerSpritesheets]);

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
    if (!ctx || !player || !spritesLoadedRef.current || !npcSpritesLoadedRef.current) return;

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

       const loader = npc.loaderType === 'albedo' ? albedoLoaderRef.current : supportsLoaderRef.current;
      loader.drawSprite(
        ctx,
        npc.direction,
        npc.animationFrame,
        npc.isMoving,
        screenX,
        screenY,
        2.5,
        npc.charIndex
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

      if (player.isCustomSprite && player.spriteSheetUrl) {
        const loader = customPlayerLoadersRef.current.get(player.spriteSheetUrl);
        if (loader) {
          loader.drawSprite(
            ctx,
            player.direction,
            player.animationFrame,
            player.isMoving,
            playerScreenX,
            playerScreenY,
            2.5,
            0 // charIndex 0 for single
          );
        }
    } else {
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
    }

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

      const now = Date.now();
      if (now >= chatGPTStartTime && now <= chatGPTActiveUntil) {
        const elapsedSinceStart = (now - chatGPTStartTime) / 1000;
        const totalDuration = (chatGPTActiveUntil - chatGPTStartTime) / 1000;
        const maxRadius = 256;
        const playerCenterX = player.position.x - cameraX;
        const playerCenterY = player.position.y - cameraY;

        const expansionProgress = Math.min(1, elapsedSinceStart / 1);
        const fadeProgress = 1 - (elapsedSinceStart / totalDuration);
        const radius = expansionProgress * maxRadius;

        ctx.save();
        const gradient = ctx.createRadialGradient(
          playerCenterX, playerCenterY, 0,
          playerCenterX, playerCenterY, radius
        );
        gradient.addColorStop(0, `rgba(0, 255, 100, ${0.5 * fadeProgress})`);
        gradient.addColorStop(0.7, `rgba(0, 200, 50, ${0.4 * fadeProgress})`);
        gradient.addColorStop(1, `rgba(0, 150, 0, ${0.2 * fadeProgress})`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(playerCenterX, playerCenterY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(0, 255, 0, ${0.8 * fadeProgress})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(playerCenterX, playerCenterY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

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

     // Marquee
    if (activeMarquee) {
      const elapsed = Date.now() - activeMarquee.startTime;
      const scrollSpeed = 100; // px per second
      let x = VIEWPORT_WIDTH - (elapsed / 1000) * scrollSpeed;
      const y = VIEWPORT_HEIGHT - 30;
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const metrics = ctx.measureText(activeMarquee.text);
      const textWidth = metrics.width;
      if (x + textWidth < 0) {
        // Parent will clear via state
      } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(x, y - 5, textWidth + 20, 12 + 10);
        ctx.fillStyle = 'white';
        ctx.fillText(activeMarquee.text, x, y);
      }
    }

    const timeSinceLastDamage = (Date.now() - lastDamageTimeForVignette) / 1000;
const vignetteActive = timeSinceLastDamage < 1.5 || (player && (player.health <= 0 || player.score <= 0));

if (vignetteActive) {
  ctx.save();
  const centerX = VIEWPORT_WIDTH / 2;
  const centerY = VIEWPORT_HEIGHT / 2;
  const outerRadius = VIEWPORT_WIDTH * 0.7;
  let innerRadius;
  let vignetteOpacity;

  let inDespair = player && (player.health <= 0);
  if (inDespair) {
    // Progressive despair mode: grows inward and intensifies based on remaining health/ego
    let progress = 0;
    if (player.health <= 0 && player.score <= 0){
      progress = 1;
    } else if (player.health <= 0) {
      progress = 1 - (player.score / 30); // Initial ego is 30
    } else if (player.score <= 0) {
      progress = 1 - (player.health / player.maxHealth);
    }
    innerRadius = outerRadius * (1 - progress); // Shrinks transparent center from full to 0
    vignetteOpacity = 0.3 + 0.7 * progress; // Starts subtle (0.3), fills to nearly full red (1.0)
  } else {
    // Quick flash on damage: fixed size, fading opacity
    vignetteOpacity = Math.max(0, 0.6 * (1 - timeSinceLastDamage / 1.5));
    innerRadius = VIEWPORT_WIDTH * 0.3;
  }

  const vignetteGradient = ctx.createRadialGradient(
    centerX, centerY, innerRadius,
    centerX, centerY, outerRadius
  );
  vignetteGradient.addColorStop(0, 'rgba(139, 0, 0, 0)');
  vignetteGradient.addColorStop(1, `rgba(139, 0, 0, ${vignetteOpacity})`);
  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
  ctx.restore();
}

    if (nearNPC) {
      ctx.fillStyle = 'rgba(0, 5, 255, 0.9)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const text = 'Press E to open shop';
      const metrics = ctx.measureText(text);
      const textX = VIEWPORT_WIDTH / 2;
      const textY = 20;

      ctx.strokeText(text, textX, textY);
      ctx.fillText(text, textX, textY);
    }
    
  }, [gameMap, player, students, coins, npcs, tileSize, mapSize, chatGPTTrackerCooldown, chatGPTStartTime, chatGPTActiveUntil, lastDamageTimeForVignette, playerUpgrades, activeMarquee, customPlayerSpritesheets, nearNPC]);


  return <canvas ref={canvasRef} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} className="border-4 border-gray-800 rounded" />;
};
