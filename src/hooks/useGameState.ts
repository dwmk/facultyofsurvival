import { useState, useEffect, useCallback, useRef } from 'react';
import { Player, Student, Coin, Direction, TileType, Position, StudentState } from '../types/game';
import { MapGenerator } from '../utils/mapGenerator';
import { STUDENT_COMPLAINTS } from '../data/complaints';
import { AudioEngine } from '../utils/audioEngine';

const MAP_SIZE = 64;
const TILE_SIZE = 32;
const BASE_MOVE_SPEED = 6;
const BASE_STUDENT_SPEED = 5;
const ANIMATION_SPEED = 10;
const HEALTH_REGEN_RATE = 0.5;
const STUDENT_DAMAGE = 5;
const DAMAGE_COOLDOWN = 60;
const NUM_STUDENTS = 5;
const NUM_COINS = 30;
const COIN_VALUE = 10;
const COIN_HEALTH_BOOST = 5;
const STUDENT_VIEW_DISTANCE = 10;
const COMMUNICATION_RANGE = 8;
const SPEED_INCREASE_PER_MINUTE = 0.1;
const AURA_FARMING_DELAY = 5;
const AURA_FARMING_GAIN = 10;
const EGO_DECAY_RATE = 1;
const STUDENT_SEPARATION_DISTANCE = TILE_SIZE * 2;

export const useGameState = () => {
  const [gameMap, setGameMap] = useState<TileType[][]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [gameOverReason, setGameOverReason] = useState<string>('');

  const keysPressed = useRef<Set<string>>(new Set());
  const lastDamageTime = useRef<number>(0);
  const animationFrame = useRef<number>(0);
  const mapRef = useRef<TileType[][]>([]);
  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const lastEgoDecayTime = useRef<number>(0);
  const mapGeneratorRef = useRef<MapGenerator | null>(null);
  const auraFarmingSoundPlayed = useRef<boolean>(false);

  const initializeGame = useCallback(() => {
    const mapGen = new MapGenerator(MAP_SIZE, MAP_SIZE);
    const newMap = mapGen.generate();
    mapRef.current = newMap;
    mapGeneratorRef.current = mapGen;
    setGameMap(newMap);

    const playerSpawn = mapGen.findSpawnPoint();
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

    setGameOver(false);
    setGameOverReason('');
    setSurvivalTime(0);
    keysPressed.current.clear();
    lastDamageTime.current = 0;
    lastEgoDecayTime.current = Date.now();
    animationFrame.current = 0;
    auraFarmingSoundPlayed.current = false;
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
      const currentTime = animationFrame.current / 60;
      const minutesPassed = Math.floor(currentTime / 60);
      const speedMultiplier = 1 + (minutesPassed * SPEED_INCREASE_PER_MINUTE);
      const currentMoveSpeed = BASE_MOVE_SPEED * speedMultiplier;
      const currentStudentSpeed = BASE_STUDENT_SPEED * speedMultiplier;

      setSurvivalTime(t => t + 1);

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
              auraFarmingSoundPlayed.current = false;
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
            if (!auraFarmingSoundPlayed.current) {
              audioEngineRef.current.playAuraFarmingSound();
              auraFarmingSoundPlayed.current = true;
            }
          }

          if (newPlayer.isAuraFarming && animationFrame.current % 60 === 0) {
            newPlayer.score += AURA_FARMING_GAIN;
            newPlayer.health = Math.min(newPlayer.maxHealth, newPlayer.health - HEALTH_REGEN_RATE / 60);
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
          }
        }

        return newPlayer;
      });

      setStudents(prevStudents => {
        if (!player) return prevStudents;

        const updatedStudents = prevStudents.map(student => {
          const newStudent = { ...student };

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
              }
              lastDamageTime.current = Date.now();
              audioEngineRef.current.playHitSound();
              return { ...p, health: Math.max(0, newHealth) };
            });
          }

          return newStudent;
        });

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
  }, [gameStarted, gameOver, player, isWalkable, hasLineOfSight, moveTowards]);

  return {
    gameMap,
    player,
    students,
    coins,
    gameStarted,
    gameOver,
    gameOverReason,
    survivalTime,
    startGame,
    restartGame,
    TILE_SIZE,
    MAP_SIZE,
  };
};
