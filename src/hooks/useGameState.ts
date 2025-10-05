import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, Student, Coin, Direction, TileType, Position, StudentState, NPC, ShopItem, PlayerUpgrades } from '../types/game';
import { MapGenerator } from '../utils/mapGenerator';
import { STUDENT_COMPLAINTS } from '../data/complaints';
import { AudioEngine } from '../utils/audioEngine';

const MAP_SIZE = 64;
const TILE_SIZE = 32;
const BASE_MOVE_SPEED = 6;
const BASE_STUDENT_SPEED = 4;
const ANIMATION_SPEED = 10;
const HEALTH_REGEN_RATE = 0.5;
const STUDENT_DAMAGE = 5;
const DAMAGE_COOLDOWN = 60;
const NUM_STUDENTS = 7;
const NUM_COINS = 30;
const COIN_VALUE = 10;
const COIN_HEALTH_BOOST = 5;
const STUDENT_VIEW_DISTANCE = 10;
const COMMUNICATION_RANGE = 10;
const SPEED_INCREASE_PER_MINUTE = 0.1;
const AURA_FARMING_DELAY = 5;
const AURA_FARMING_GAIN = 10;
const EGO_DECAY_RATE = 1;
const STUDENT_SEPARATION_DISTANCE = TILE_SIZE * 2;
const CHATGPT_TRACKER_COOLDOWN = 5;
const CHATGPT_TRACKER_RADIUS = TILE_SIZE * 8;
const CHATGPT_TRACKER_FORCE = 15;
const CHATGPT_TRACKER_ACTIVE_DURATION = 3; // seconds the fear wave lasts
const CHATGPT_FEAR_SPEED_MULTIPLIER = 2.8; // how fast students run away
const MARQUEE_COOLDOWN = 35000;

const NPC_SAYINGS = [
  'Keep up the good work!',
  'You\'re doing great!',
  'Stay strong!',
  'Education is a noble work!',
  'You got this!',
  'Thank you for playing this game!',
  'All sounds are generated with waves!',
  'Grab some upgrades from me with "E"'
];

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'excitement',
    name: 'Excitement',
    description: 'Increases your walking speed by 0.5',
    cost: 500,
    icon: 'https://dewanmukto.github.io/asset/images/money.jpg',
    type: 'upgrade',
  },
  {
    id: 'assignments',
    name: 'Assignments',
    description: 'Decreases all student speed by 0.5',
    cost: 300,
    icon: 'https://dewanmukto.github.io/asset/images/book.png',
    type: 'upgrade',
  },
  {
    id: 'chatgpt_tracker',
    name: 'ChatGPT Tracker',
    description: 'Push students away with Q key',
    cost: 100,
    icon: 'https://dewanmukto.github.io/asset/images/gpticon.png',
    type: 'tool',
  },
];

export const CHARACTERS = {
  default: { name: 'Mr. Tom Ku', pronoun: 'Sir', spritesheet: 'default' as const, unlock_attribute: 'none' as const, unlock_amount: null as null },
  famille: { name: 'Ms. Pookie', pronoun: 'Ma\'am', spritesheet: 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_famille.png' as const, unlock_attribute: 'totalGameovers' as const, unlock_amount: 10 },
  tsukasa: { name: 'Club Pres.', pronoun: 'Bro', spritesheet: 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_tsukasa.png' as const, unlock_attribute: 'totalEgo' as const, unlock_amount: 1000 },
  angrynerd: { name: 'Class Rep.', pronoun: 'CR', spritesheet: 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_angrynerd.png' as const, unlock_attribute: 'totalSurvival' as const, unlock_amount: 1000 },
  greed: { name: 'Professor', pronoun: 'Sir', spritesheet: 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_greed.png' as const, unlock_attribute: 'totalEgo' as const, unlock_amount: 5000 },
  darion: { name: 'Headmaster', pronoun: 'Sir', spritesheet: 'https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_darion.png' as const, unlock_attribute: 'totalPlaytime' as const, unlock_amount: 100 * 3600 },
} as const;

type UnlockAttribute = 'none' | 'totalEgo' | 'totalPlaytime' | 'totalSurvival' | 'totalGameovers';

type Stats = {
  totalEgo: number;
  totalPlaytime: number; // seconds
  totalSurvival: number; // seconds
  totalGameovers: number;
};

const STORAGE_KEY = 'facultySurvivalStats';

export const useGameState = () => {
  const [gameMap, setGameMap] = useState<TileType[][]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [gameOverReason, setGameOverReason] = useState<string>('');
  const [shopOpen, setShopOpen] = useState(false);
  const [nearNPC, setNearNPC] = useState(false);
  const [playerUpgrades, setPlayerUpgrades] = useState<PlayerUpgrades>({
    speedBoosts: 0,
    assignmentsPurchased: 0,
    chatGPTTrackers: 0,
  });

  const [selectedCharacter, setSelectedCharacter] = useState<keyof typeof CHARACTERS>('default');
  const [showCharSelect, setShowCharSelect] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalEgo: 0, totalPlaytime: 0, totalSurvival: 0, totalGameovers: 0 });
  const [activeMarquee, setActiveMarquee] = useState<{ text: string; startTime: number } | null>(null);
  const [customPlayerSpritesheets, setCustomPlayerSpritesheets] = useState<Record<string, string>>({});

  const keysPressed = useRef<Set<string>>(new Set());
  const lastDamageTime = useRef<number>(0);
  const animationFrame = useRef<number>(0);
  const mapRef = useRef<TileType[][]>([]);
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const lastEgoDecayTime = useRef<number>(0);
  const mapGeneratorRef = useRef<MapGenerator | null>(null);
  const chatGPTTrackerCooldown = useRef<number>(0);
  const lastChatGPTUseTime = useRef<number>(0);
  const chatGPTActiveUntil = useRef<number>(0);
  const accumulatedPlaytimeRef = useRef(0);
  const lastCommRef = useRef(0);

  // Load stats
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setStats(JSON.parse(saved));
    }
  }, []);

  // Save stats
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  const isUnlocked = useCallback((charId: keyof typeof CHARACTERS): boolean => {
    const char = CHARACTERS[charId];
    if (char.unlock_attribute === 'none') return true;
    const amount = char.unlock_amount!;
    const current = stats[char.unlock_attribute as UnlockAttribute];
    return current >= amount;
}, [stats]);

  const startGame = useCallback(() => {
    setShowCharSelect(true);
  }, []);

  const onCharSelect = useCallback((charId: keyof typeof CHARACTERS) => {
    setSelectedCharacter(charId);
    setShowCharSelect(false);
    initializeGame(charId);
    setGameStarted(true);
  }, []);

  const initializeGame = useCallback((charId: keyof typeof CHARACTERS = 'default') => {
    const mapGen = new MapGenerator(MAP_SIZE, MAP_SIZE);
    const newMap = mapGen.generate();
    mapRef.current = newMap;
    mapGeneratorRef.current = mapGen;
    setGameMap(newMap);

    const playerSpawn = mapGen.findSpawnPoint();
    const char = CHARACTERS[charId];
    const playerPronoun = char.pronoun;
    const currentTime = Date.now();
    const newPlayer: Player = {
      id: 'player',
      position: { x: playerSpawn.x * TILE_SIZE + TILE_SIZE / 2, y: playerSpawn.y * TILE_SIZE + TILE_SIZE / 2 },
      direction: Direction.DOWN,
      spriteIndex: 0,
      animationFrame: 0,
      isMoving: false,
      health: 100,
      maxHealth: 100,
      score: 30,
      isAuraFarming: false,
      lastMoveTime: currentTime,
      pronoun: playerPronoun,
      isCustomSprite: char.spritesheet !== 'default',
      spriteSheetUrl: char.spritesheet !== 'default' ? char.spritesheet : undefined,
    };
    setPlayer(newPlayer);
    accumulatedPlaytimeRef.current = 0;

    // Update custom sheets
    const sheets: Record<string, string> = {};
    Object.entries(CHARACTERS).forEach(([id, c]) => {
      if (c.spritesheet !== 'default') sheets[id] = c.spritesheet;
    });
    setCustomPlayerSpritesheets(sheets);

    const newStudents: Student[] = [];
    for (let i = 0; i < NUM_STUDENTS; i++) {
      const spawn = mapGen.findSpawnPoint();
      let complaint = STUDENT_COMPLAINTS[Math.floor(Math.random() * STUDENT_COMPLAINTS.length)];
      complaint = complaint.replace(/Sir/g, playerPronoun);
      newStudents.push({
        id: `student-${i}`,
        position: { x: spawn.x * TILE_SIZE + TILE_SIZE / 2, y: spawn.y * TILE_SIZE + TILE_SIZE / 2 },
        direction: Direction.DOWN,
        spriteIndex: i + 1,
        animationFrame: 0,
        isMoving: false,
        chasing: false,
        target: null,
        complaint,
        groupId: null,
        lastSeenPlayer: null,
        communicationCooldown: 0,
        state: StudentState.IDLE,
        searchTarget: null,
      });
    }
    setStudents(newStudents);

    const newCoins: Coin[] = [];
    for (let i = 0; i < NUM_COINS; i++) {
      const spawn = mapGen.findSpawnPoint();
      newCoins.push({
        id: `coin-${i}`,
        position: { x: spawn.x * TILE_SIZE + TILE_SIZE / 2, y: spawn.y * TILE_SIZE + TILE_SIZE / 2 },
        collected: false,
      });
    }
    setCoins(newCoins);

    const staffRooms = mapGen.getStaffRooms();
    const newNpcs: NPC[] = staffRooms.map((room, index) => {
      const loaderTypes = ['albedo', 'supports'] as const;
      const loaderType = loaderTypes[Math.floor(Math.random() * loaderTypes.length)];
      let charIndex = loaderType === 'albedo' ? 0 : Math.floor(Math.random() * 5); // 0 for albedo; 0-4 for supports
      if (loaderType === 'supports') {
        const valid = [0, 1, 2, 4, 5];
        charIndex = valid[Math.floor(Math.random() * valid.length)];
      }
      return {
        id: `npc-${index}`,
        position: {
          x: room.center.x * TILE_SIZE,
          y: room.center.y * TILE_SIZE
        },
        direction: Direction.DOWN,
        spriteIndex: 0,
        animationFrame: 0,
        isMoving: false,
        sayings: NPC_SAYINGS,
        currentSaying: NPC_SAYINGS[Math.floor(Math.random() * NPC_SAYINGS.length)],
        sayingTime: 0,
        targetPosition: null,
        idleMoving: false,
        roomBounds: {
          minX: room.minX * TILE_SIZE,
          maxX: room.maxX * TILE_SIZE,
          minY: room.minY * TILE_SIZE,
          maxY: room.maxY * TILE_SIZE,
        },
        loaderType,
        charIndex,
      };
    });
    setNpcs(newNpcs);

    setGameOver(false);
    setGameOverReason('');
    setSurvivalTime(0);
    setShopOpen(false);
    setNearNPC(false);
    setPlayerUpgrades({
      speedBoosts: 0,
      assignmentsPurchased: 0,
      chatGPTTrackers: 0,
    });
    keysPressed.current.clear();
    lastDamageTime.current = 0;
    lastEgoDecayTime.current = Date.now();
    animationFrame.current = 0;
    chatGPTTrackerCooldown.current = 0;
    lastChatGPTUseTime.current = 0;
    audioEngineRef.current.setBossMode(false);
  }, [CHARACTERS]);

  const restartGame = useCallback(() => {
    initializeGame(selectedCharacter);
    setGameStarted(true);
  }, [initializeGame, selectedCharacter]);

  const isWalkable = useCallback((x: number, y: number): boolean => {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) {
      return false;
    }

    const tile = mapRef.current[tileY]?.[tileX];
    return tile === TileType.FLOOR || tile === TileType.STAFF_ROOM;
  }, []);

  const hasLineOfSight = useCallback((from: Position, to: Position): boolean => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > STUDENT_VIEW_DISTANCE * TILE_SIZE) return false;

    const steps = Math.ceil(distance / (TILE_SIZE / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;

      if (!isWalkable(x, y)) return false;
    }

    return true;
  }, [isWalkable]);

  const getDistance = (pos1: Position, pos2: Position): number => {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const moveTowards = useCallback((from: Position, to: Position, speed: number, studentId?: string, allStudents?: Student[]): { position: Position; direction: Direction; isMoving: boolean } => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < speed) {
      return { position: { ...to }, direction: Direction.DOWN, isMoving: false };
    }

    const ratio = speed / distance;
    let newX = from.x + dx * ratio;
    let newY = from.y + dy * ratio;

    if (studentId && allStudents) {
      for (const other of allStudents) {
        if (other.id === studentId) continue;
        const distToOther = Math.sqrt(
          Math.pow(newX - other.position.x, 2) + Math.pow(newY - other.position.y, 2)
        );
        if (distToOther < STUDENT_SEPARATION_DISTANCE) {
          const avoidX = newX - other.position.x;
          const avoidY = newY - other.position.y;
          const avoidDist = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
          if (avoidDist > 0) {
            newX += (avoidX / avoidDist) * speed * 0.5;
            newY += (avoidY / avoidDist) * speed * 0.5;
          }
        }
      }
    }

    if (!isWalkable(newX, newY)) {
      if (isWalkable(newX, from.y)) {
        newY = from.y;
      } else if (isWalkable(from.x, newY)) {
        newX = from.x;
      } else {
        return { position: { ...from }, direction: Direction.DOWN, isMoving: false };
      }
    }

    let direction = Direction.DOWN;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      direction = dy > 0 ? Direction.DOWN : Direction.UP;
    }

    return { position: { x: newX, y: newY }, direction, isMoving: true };
  }, [isWalkable]);

  const handlePurchase = useCallback((itemId: string) => {
    if (!player) return;

    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || player.score < item.cost) return;

    setPlayer(p => {
      if (!p) return p;
      const newPlayer = { ...p, score: p.score - item.cost };
      return newPlayer;
    });

    setPlayerUpgrades(upgrades => {
      const newUpgrades = { ...upgrades };
      if (itemId === 'excitement') {
        newUpgrades.speedBoosts++;
      } else if (itemId === 'assignments') {
        newUpgrades.assignmentsPurchased++;
      } else if (itemId === 'chatgpt_tracker') {
        newUpgrades.chatGPTTrackers++;
      }
      return newUpgrades;
    });
  }, [player]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        keysPressed.current.add(key);
      }
      if (key === 'e' && nearNPC && !shopOpen) {
        e.preventDefault();
        setShopOpen(true);
      } else if (key === 'e' && shopOpen) {
        e.preventDefault();
        setShopOpen(false);
      }
      if (key === 'q' && playerUpgrades.chatGPTTrackers > 0) {
        e.preventDefault();
        const currentTime = Date.now();
        if (currentTime - lastChatGPTUseTime.current >= CHATGPT_TRACKER_COOLDOWN * 1000) {
          chatGPTTrackerCooldown.current = CHATGPT_TRACKER_COOLDOWN;
          lastChatGPTUseTime.current = currentTime;
          chatGPTActiveUntil.current = currentTime + CHATGPT_TRACKER_ACTIVE_DURATION * 1000;
      
          // consume one tracker
          setPlayerUpgrades(upgrades => ({
            ...upgrades,
            chatGPTTrackers: Math.max(0, upgrades.chatGPTTrackers - 1),
          }));
        }
      }

    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameOver, nearNPC, shopOpen, playerUpgrades.chatGPTTrackers]);

  useEffect(() => {
    if (!gameStarted || gameOver || !player) return;

    const gameLoop = setInterval(() => {
      if (shopOpen) return;

      animationFrame.current++;
      const currentTime = animationFrame.current / 60;
      const minutesPassed = Math.floor(currentTime / 60);
      const speedMultiplier = 1 + (minutesPassed * SPEED_INCREASE_PER_MINUTE);
      const currentMoveSpeed = (BASE_MOVE_SPEED + playerUpgrades.speedBoosts * 0.5) * speedMultiplier;
      const currentStudentSpeed = Math.max(1, (BASE_STUDENT_SPEED - playerUpgrades.assignmentsPurchased * 0.5) * speedMultiplier);

      if (chatGPTTrackerCooldown.current > 0) {
        chatGPTTrackerCooldown.current -= 1 / 60;
      }

      setSurvivalTime(t => t + 1);
      accumulatedPlaytimeRef.current += 1 / 60;

      setNpcs(prevNpcs => {
        if (!player) return prevNpcs;
        return prevNpcs.map(npc => {
          const newNpc = { ...npc };
          const distToPlayer = getDistance(npc.position, player.position);
          const canSeePlayer = distToPlayer < TILE_SIZE * 3;

          if (distToPlayer < TILE_SIZE * 2) {
            setNearNPC(true);
          }

          if (canSeePlayer) {
            const dx = player.position.x - npc.position.x;
            const dy = player.position.y - npc.position.y;
            if (Math.abs(dx) > Math.abs(dy)) {
              newNpc.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
            } else {
              newNpc.direction = dy > 0 ? Direction.DOWN : Direction.UP;
            }
            newNpc.isMoving = false;
            newNpc.animationFrame = 0;
            newNpc.targetPosition = null;

            if (animationFrame.current % 180 === 0) {
              newNpc.currentSaying = NPC_SAYINGS[Math.floor(Math.random() * NPC_SAYINGS.length)];
              newNpc.sayingTime = 180;
            }
          } else {
            if (animationFrame.current % 120 === 0 || !newNpc.targetPosition) {
              const bounds = newNpc.roomBounds;
              if (bounds) {
                const targetX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
                const targetY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
                newNpc.targetPosition = { x: targetX, y: targetY };
              }
            }

            if (newNpc.targetPosition) {
              const result = moveTowards(npc.position, newNpc.targetPosition, 2);
              newNpc.position = result.position;
              newNpc.direction = result.direction;
              newNpc.isMoving = result.isMoving;

              if (animationFrame.current % ANIMATION_SPEED === 0 && newNpc.isMoving) {
                newNpc.animationFrame = (npc.animationFrame + 1) % 3;
              }

              const distToTarget = getDistance(npc.position, newNpc.targetPosition);
              if (distToTarget < 10) {
                newNpc.targetPosition = null;
                newNpc.isMoving = false;
                newNpc.animationFrame = 0;
              }
            }
          }

          if (newNpc.sayingTime > 0) {
            newNpc.sayingTime--;
          }

          return newNpc;
        });
      });

      let isNear = false;
      npcs.forEach(npc => {
        if (player && getDistance(npc.position, player.position) < TILE_SIZE * 3) {
          isNear = true;
        }
      });
      setNearNPC(isNear);

      setPlayer(prevPlayer => {
        if (!prevPlayer) return prevPlayer;

        let newPlayer = { ...prevPlayer };
        let dx = 0;
        let dy = 0;

        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy -= currentMoveSpeed;
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy += currentMoveSpeed;
        if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= currentMoveSpeed;
        if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += currentMoveSpeed;

        const currentTime = Date.now();

        if (dx !== 0 || dy !== 0) {
          const newX = prevPlayer.position.x + dx;
          const newY = prevPlayer.position.y + dy;

          if (isWalkable(newX, newY)) {
            newPlayer.position = { x: newX, y: newY };
            newPlayer.isMoving = true;
            newPlayer.lastMoveTime = currentTime;

            if (prevPlayer.isAuraFarming) {
              newPlayer.isAuraFarming = false;
              audioEngineRef.current.setBossMode(false);
            }

            if (Math.abs(dx) > Math.abs(dy)) {
              newPlayer.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
            } else {
              newPlayer.direction = dy > 0 ? Direction.DOWN : Direction.UP;
            }

            if (animationFrame.current % ANIMATION_SPEED === 0) {
              newPlayer.animationFrame = (prevPlayer.animationFrame + 1) % 3;
            }
          }
        } else {
          newPlayer.isMoving = false;
          newPlayer.animationFrame = 0;

          const timeSinceLastMove = (currentTime - prevPlayer.lastMoveTime) / 1000;
          if (timeSinceLastMove >= AURA_FARMING_DELAY && !prevPlayer.isAuraFarming) {
            newPlayer.isAuraFarming = true;
            audioEngineRef.current.setBossMode(true);
          }

          if (newPlayer.isAuraFarming && animationFrame.current % 60 === 0) {
            newPlayer.score += AURA_FARMING_GAIN;
            newPlayer.health -= 2;
          }
        }

        if (newPlayer.health < newPlayer.maxHealth) {
          newPlayer.health = Math.min(newPlayer.maxHealth, newPlayer.health + HEALTH_REGEN_RATE / 60);
        }

        const egoTimePassed = (currentTime - lastEgoDecayTime.current) / 1000;
        if (egoTimePassed >= 1) {
          newPlayer.score = Math.max(0, newPlayer.score - EGO_DECAY_RATE);
          lastEgoDecayTime.current = currentTime;

          if (newPlayer.score <= 0) {
            setGameOver(true);
            setGameOverReason('You lost your self-esteem!');
            audioEngineRef.current.setBossMode(false);
          }
        }

        return newPlayer;
      });

      setStudents(prevStudents => {
        if (!player) return prevStudents;

        let communicationHappened = false;

        // --- ChatGPT Tracker fear effect ---
        const now = Date.now();
        const trackerActive = now < chatGPTActiveUntil.current;
        
        let studentsToUpdate = [...prevStudents];
        
        if (trackerActive) {
          studentsToUpdate = studentsToUpdate.map(student => {
            const distToPlayer = getDistance(student.position, player.position);
            if (distToPlayer < CHATGPT_TRACKER_RADIUS) {
              // Students move away from the player each frame during activation
              const dx = student.position.x - player.position.x;
              const dy = student.position.y - player.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
        
              if (distance > 0) {
                const fearSpeed = currentStudentSpeed * CHATGPT_FEAR_SPEED_MULTIPLIER;
                const pushX = (dx / distance) * fearSpeed;
                const pushY = (dy / distance) * fearSpeed;
                const newX = student.position.x + pushX;
                const newY = student.position.y + pushY;
        
                // Avoid walls, stay walkable
                if (isWalkable(newX, newY)) {
                  return {
                    ...student,
                    position: { x: newX, y: newY },
                    state: StudentState.FLEEING,
                    chasing: false,
                    target: null,
                  };
                }
              }
            }
            return student;
          });
        }


        const updatedStudents = studentsToUpdate.map(student => {
          const newStudent = { ...student };

          if (trackerActive && getDistance(student.position, player.position) < CHATGPT_TRACKER_RADIUS * 1.5) {
            // temporarily override behavior
            newStudent.state = StudentState.FLEEING;
            newStudent.chasing = false;
            newStudent.target = null;
            return newStudent;
          }

          newStudent.communicationCooldown = Math.max(0, newStudent.communicationCooldown - 1);

          const canSeePlayer = player.isAuraFarming || hasLineOfSight(student.position, player.position);

          if (canSeePlayer) {
            newStudent.chasing = true;
            newStudent.state = StudentState.CHASING;
            newStudent.lastSeenPlayer = { ...player.position };
            newStudent.target = { ...player.position };
            newStudent.searchTarget = null;

            if (newStudent.groupId) {
              prevStudents.forEach(other => {
                if (other.groupId === newStudent.groupId && other.id !== student.id) {
                  other.state = StudentState.CHASING;
                  other.chasing = true;
                  other.lastSeenPlayer = { ...player.position };
                  other.target = { ...player.position };
                }
              });
            }
          } else if (newStudent.state === StudentState.CHASING && newStudent.lastSeenPlayer) {
            const distToLastSeen = getDistance(student.position, newStudent.lastSeenPlayer);
            if (distToLastSeen < TILE_SIZE * 2) {
              let nearestStudent: Student | null = null;
              let nearestDist = Infinity;

              prevStudents.forEach(other => {
                if (other.id !== student.id) {
                  const dist = getDistance(student.position, other.position);
                  if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestStudent = other;
                  }
                }
              });

              if (nearestStudent && nearestDist < COMMUNICATION_RANGE * TILE_SIZE) {
                const groupId = `group-${Date.now()}-${student.id}`;
                newStudent.groupId = groupId;
                newStudent.state = StudentState.INFORMED;
                newStudent.target = nearestStudent.position;
                newStudent.chasing = false;

                nearestStudent.groupId = groupId;
                nearestStudent.state = StudentState.INFORMED;
                communicationHappened = true;
              } else {
                newStudent.state = StudentState.SEARCHING;
                newStudent.chasing = false;
                const randomAngle = Math.random() * Math.PI * 2;
                const searchDist = TILE_SIZE * 5;
                newStudent.searchTarget = {
                  x: student.position.x + Math.cos(randomAngle) * searchDist,
                  y: student.position.y + Math.sin(randomAngle) * searchDist,
                };
                newStudent.target = newStudent.searchTarget;
              }
            }
          } else if (newStudent.state === StudentState.INFORMED) {
            let anyChasing = false;
            prevStudents.forEach(other => {
              if (other.groupId === newStudent.groupId && other.state === StudentState.CHASING) {
                anyChasing = true;
                newStudent.state = StudentState.CHASING;
                newStudent.chasing = true;
                newStudent.lastSeenPlayer = other.lastSeenPlayer;
                newStudent.target = other.target;
              }
            });

            if (!anyChasing && newStudent.groupId) {
              const groupMembers = prevStudents.filter(s => s.groupId === newStudent.groupId && s.id !== student.id);
              if (groupMembers.length > 0) {
                if (animationFrame.current % 120 === 0) {
                  const randomAngle = Math.random() * Math.PI * 2;
                  const searchDist = TILE_SIZE * 4;
                  newStudent.target = {
                    x: student.position.x + Math.cos(randomAngle) * searchDist,
                    y: student.position.y + Math.sin(randomAngle) * searchDist,
                  };
                } else if (!newStudent.target) {
                  const randomMember = groupMembers[Math.floor(Math.random() * groupMembers.length)];
                  newStudent.target = randomMember.position;
                }
              }
            }
          } else if (newStudent.state === StudentState.SEARCHING && newStudent.searchTarget) {
            const distToSearch = getDistance(student.position, newStudent.searchTarget);
            if (distToSearch < TILE_SIZE * 2) {
              const randomAngle = Math.random() * Math.PI * 2;
              const searchDist = TILE_SIZE * 5;
              newStudent.searchTarget = {
                x: student.position.x + Math.cos(randomAngle) * searchDist,
                y: student.position.y + Math.sin(randomAngle) * searchDist,
              };
              newStudent.target = newStudent.searchTarget;
            }
          }

          if (newStudent.communicationCooldown === 0 && newStudent.state === StudentState.CHASING) {
            prevStudents.forEach(other => {
              if (other.id !== student.id && other.state !== StudentState.CHASING) {
                const dist = getDistance(student.position, other.position);
                if (dist < COMMUNICATION_RANGE * TILE_SIZE) {
                  const groupId = newStudent.groupId || `group-${Date.now()}-${student.id}`;
                  other.groupId = groupId;
                  newStudent.groupId = groupId;
                  other.state = StudentState.INFORMED;
                  newStudent.communicationCooldown = 120;
                  communicationHappened = true;
                }
              }
            });
          }

          if (newStudent.target) {
            const studentSpeed = player.isAuraFarming ? currentStudentSpeed * 2 : currentStudentSpeed;
            const result = moveTowards(student.position, newStudent.target, studentSpeed, student.id, prevStudents);
            newStudent.position = result.position;
            newStudent.direction = result.direction;
            newStudent.isMoving = result.isMoving;

            if (animationFrame.current % ANIMATION_SPEED === 0 && newStudent.isMoving) {
              newStudent.animationFrame = (student.animationFrame + 1) % 3;
            }
          } else {
            newStudent.isMoving = false;
            newStudent.animationFrame = 0;
          }

          const distToPlayer = getDistance(student.position, player.position);
          if (distToPlayer < TILE_SIZE && Date.now() - lastDamageTime.current > DAMAGE_COOLDOWN) {
            setPlayer(p => {
              if (!p) return p;
              const newHealth = p.health - STUDENT_DAMAGE;
              if (newHealth <= 0) {
                setGameOver(true);
                setGameOverReason('You were overwhelmed by student requests!');
                audioEngineRef.current.setBossMode(false);
              }
              lastDamageTime.current = Date.now();
              audioEngineRef.current.playHitSound();
              return { ...p, health: Math.max(0, newHealth) };
            });
          }

          return newStudent;
        });

        if (communicationHappened && Date.now() - lastCommRef.current > MARQUEE_COOLDOWN) {
          lastCommRef.current = Date.now();
          const x = Math.floor(Math.random() * 99) + 1;
          setActiveMarquee({
            text: `${x} new posts have appeared on BRAX Faculty Course Review group on social media about you!`,
            startTime: Date.now(),
          });
        }

        return updatedStudents;
      });

      setCoins(prevCoins => {
        if (!player || !mapGeneratorRef.current) return prevCoins;

        const updatedCoins = prevCoins.map(coin => {
          if (coin.collected) return coin;

          const dist = getDistance(player.position, coin.position);
          if (dist < TILE_SIZE) {
            setPlayer(p => {
              if (!p) return p;
              const newHealth = Math.min(p.maxHealth, p.health + COIN_HEALTH_BOOST);
              return { ...p, score: p.score + COIN_VALUE, health: newHealth };
            });
            audioEngineRef.current.playCollectSound();
            return { ...coin, collected: true };
          }
          return coin;
        });

        if (animationFrame.current % 180 === 0) {
          return updatedCoins.map(coin => {
            if (coin.collected) {
              const spawn = mapGeneratorRef.current!.findSpawnPoint();
              return {
                ...coin,
                position: { x: spawn.x * TILE_SIZE + TILE_SIZE / 2, y: spawn.y * TILE_SIZE + TILE_SIZE / 2 },
                collected: false,
              };
            }
            return coin;
          });
        }

        return updatedCoins;
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, player, isWalkable, hasLineOfSight, moveTowards, shopOpen, playerUpgrades, npcs]);

  // Update stats on game over
  useEffect(() => {
    if (gameOver && player) {
      setStats((prev) => ({
        ...prev,
        totalGameovers: prev.totalGameovers + 1,
        totalSurvival: prev.totalSurvival + (survivalTime / 60),
        totalEgo: prev.totalEgo + player.score,
        totalPlaytime: prev.totalPlaytime + accumulatedPlaytimeRef.current,
      }));
    }
  }, [gameOver, player, survivalTime]);

  // Clear marquee when off screen
  useEffect(() => {
    if (!activeMarquee) return;
    const SCROLL_SPEED = 100; // px per second (matches GameCanvas drawing)
    const ESTIMATED_PX_PER_CHAR = 8; // Approximation for '12px "Press Start 2P", monospace' (adjust if needed)
    const ADDITIONAL_WAIT_MS = 20000; // 20 seconds after reaching other side
    const viewportWidth = window.innerWidth; // Dynamic screen/viewport width; falls back to canvas if needed
  
    const estimatedTextWidth = activeMarquee.text.length * ESTIMATED_PX_PER_CHAR;
    const timeToCrossMs = ((viewportWidth + estimatedTextWidth) / SCROLL_SPEED) * 1000;
    const clearTime = activeMarquee.startTime + timeToCrossMs + ADDITIONAL_WAIT_MS;
  
    const interval = setInterval(() => {
      if (Date.now() > clearTime) {
        setActiveMarquee(null);
      }
    }, 100);

  return () => clearInterval(interval);
}, [activeMarquee]);

  return {
    gameMap,
    player,
    students,
    coins,
    npcs,
    gameStarted,
    gameOver,
    gameOverReason,
    survivalTime,
    startGame,
    restartGame,
    shopOpen,
    nearNPC,
    closeShop: () => setShopOpen(false),
    shopItems: SHOP_ITEMS.map(item => ({
      ...item,
      purchased: item.id === 'chatgpt_tracker' ? playerUpgrades.chatGPTTrackers : undefined,
    })),
    handlePurchase,
    playerUpgrades,
    chatGPTTrackerCooldown: Math.max(0, chatGPTTrackerCooldown.current),
    TILE_SIZE,
    MAP_SIZE,
    selectedCharacter,
    showCharSelect,
    onCharSelect,
    isUnlocked,
    CHARACTERS,
    stats,
    activeMarquee,
    customPlayerSpritesheets,
  };
};
