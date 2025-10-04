import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, Student, Coin, Direction, TileType, Position } from '../types/game';
import { MapGenerator } from '../utils/mapGenerator';
import { STUDENT_COMPLAINTS } from '../data/complaints';

const MAP_SIZE = 64;
const TILE_SIZE = 32;
const MOVE_SPEED = 2;
const STUDENT_SPEED = 1.5;
const ANIMATION_SPEED = 8;
const HEALTH_REGEN_RATE = 0.5;
const STUDENT_DAMAGE = 20;
const DAMAGE_COOLDOWN = 60;
const NUM_STUDENTS = 5;
const NUM_COINS = 30;
const COIN_VALUE = 10;
const STUDENT_VIEW_DISTANCE = 10;
const COMMUNICATION_RANGE = 8;

export const useGameState = () => {
  const [gameMap, setGameMap] = useState<TileType[][]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [survivalTime, setSurvivalTime] = useState(0);

  const keysPressed = useRef<Set<string>>(new Set());
  const lastDamageTime = useRef<number>(0);
  const animationFrame = useRef<number>(0);
  const mapRef = useRef<TileType[][]>([]);

  const initializeGame = useCallback(() => {
    const mapGen = new MapGenerator(MAP_SIZE, MAP_SIZE);
    const newMap = mapGen.generate();
    mapRef.current = newMap;
    setGameMap(newMap);

    const playerSpawn = mapGen.findSpawnPoint();
    const newPlayer: Player = {
      id: 'player',
      position: { x: playerSpawn.x * TILE_SIZE + TILE_SIZE / 2, y: playerSpawn.y * TILE_SIZE + TILE_SIZE / 2 },
      direction: Direction.DOWN,
      spriteIndex: 0,
      animationFrame: 0,
      isMoving: false,
      health: 100,
      maxHealth: 100,
      score: 0,
    };
    setPlayer(newPlayer);

    const newStudents: Student[] = [];
    for (let i = 0; i < NUM_STUDENTS; i++) {
      const spawn = mapGen.findSpawnPoint();
      const complaint = STUDENT_COMPLAINTS[Math.floor(Math.random() * STUDENT_COMPLAINTS.length)];
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

    setGameOver(false);
    setSurvivalTime(0);
    lastDamageTime.current = 0;
    animationFrame.current = 0;
  }, []);

  const startGame = useCallback(() => {
    initializeGame();
    setGameStarted(true);
  }, [initializeGame]);

  const restartGame = useCallback(() => {
    initializeGame();
    setGameStarted(true);
  }, [initializeGame]);

  const isWalkable = useCallback((x: number, y: number): boolean => {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) {
      return false;
    }

    return mapRef.current[tileY]?.[tileX] === TileType.FLOOR;
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

  const moveTowards = useCallback((from: Position, to: Position, speed: number): { position: Position; direction: Direction; isMoving: boolean } => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < speed) {
      return { position: { ...to }, direction: Direction.DOWN, isMoving: false };
    }

    const ratio = speed / distance;
    let newX = from.x + dx * ratio;
    let newY = from.y + dy * ratio;

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

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        keysPressed.current.add(key);
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
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (!gameStarted || gameOver || !player) return;

    const gameLoop = setInterval(() => {
      animationFrame.current++;
      setSurvivalTime(t => t + 1);

      setPlayer(prevPlayer => {
        if (!prevPlayer) return prevPlayer;

        let newPlayer = { ...prevPlayer };
        let dx = 0;
        let dy = 0;

        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dy -= MOVE_SPEED;
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dy += MOVE_SPEED;
        if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= MOVE_SPEED;
        if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += MOVE_SPEED;

        if (dx !== 0 || dy !== 0) {
          const newX = prevPlayer.position.x + dx;
          const newY = prevPlayer.position.y + dy;

          if (isWalkable(newX, newY)) {
            newPlayer.position = { x: newX, y: newY };
            newPlayer.isMoving = true;

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
        }

        if (newPlayer.health < newPlayer.maxHealth) {
          newPlayer.health = Math.min(newPlayer.maxHealth, newPlayer.health + HEALTH_REGEN_RATE / 60);
        }

        return newPlayer;
      });

      setStudents(prevStudents => {
        if (!player) return prevStudents;

        return prevStudents.map(student => {
          const newStudent = { ...student };

          newStudent.communicationCooldown = Math.max(0, newStudent.communicationCooldown - 1);

          if (hasLineOfSight(student.position, player.position)) {
            newStudent.chasing = true;
            newStudent.lastSeenPlayer = { ...player.position };
            newStudent.target = { ...player.position };
          } else if (newStudent.chasing && newStudent.lastSeenPlayer) {
            const distToLastSeen = getDistance(student.position, newStudent.lastSeenPlayer);
            if (distToLastSeen < TILE_SIZE) {
              newStudent.chasing = false;
              newStudent.lastSeenPlayer = null;
              newStudent.target = null;
            }
          }

          if (newStudent.lastSeenPlayer && newStudent.communicationCooldown === 0) {
            prevStudents.forEach(other => {
              if (other.id !== student.id) {
                const dist = getDistance(student.position, other.position);
                if (dist < COMMUNICATION_RANGE * TILE_SIZE) {
                  other.chasing = true;
                  other.lastSeenPlayer = { ...newStudent.lastSeenPlayer };
                  other.target = { ...newStudent.lastSeenPlayer };
                  newStudent.communicationCooldown = 120;
                }
              }
            });
          }

          if (newStudent.target) {
            const result = moveTowards(student.position, newStudent.target, STUDENT_SPEED);
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
              }
              lastDamageTime.current = Date.now();
              return { ...p, health: Math.max(0, newHealth) };
            });
          }

          return newStudent;
        });
      });

      setCoins(prevCoins => {
        if (!player) return prevCoins;

        return prevCoins.map(coin => {
          if (coin.collected) return coin;

          const dist = getDistance(player.position, coin.position);
          if (dist < TILE_SIZE) {
            setPlayer(p => p ? { ...p, score: p.score + COIN_VALUE } : p);
            return { ...coin, collected: true };
          }
          return coin;
        });
      });
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, player, isWalkable, hasLineOfSight, moveTowards]);

  return {
    gameMap,
    player,
    students,
    coins,
    gameStarted,
    gameOver,
    survivalTime,
    startGame,
    restartGame,
    TILE_SIZE,
    MAP_SIZE,
  };
};
