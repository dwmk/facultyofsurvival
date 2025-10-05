import { useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { Shop } from './components/Shop';
import { useGameState } from './hooks/useGameState';
import { AudioEngine } from './utils/audioEngine';

function App() {
  const {
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
    shopItems,
    handlePurchase,
    playerUpgrades,
    chatGPTTrackerCooldown,
    TILE_SIZE,
    MAP_SIZE,
  } = useGameState();

  const audioEngineRef = useRef<AudioEngine>(new AudioEngine());
  const audioInitializedRef = useRef(false);
  const prevCoinsCountRef = useRef(0);
  const prevHealthRef = useRef(100);

  useEffect(() => {
    if (gameStarted && !audioInitializedRef.current) {
      audioEngineRef.current.initialize();
      audioEngineRef.current.start();
      audioInitializedRef.current = true;
    }

    if (gameOver && audioInitializedRef.current) {
      audioEngineRef.current.stop();
    }
  }, [gameStarted, gameOver]);

  useEffect(() => {
    const collectedCount = coins.filter(c => c.collected).length;

    if (collectedCount > prevCoinsCountRef.current) {
      audioEngineRef.current.playCollectSound();
    }

    prevCoinsCountRef.current = collectedCount;
  }, [coins]);

  useEffect(() => {
    if (player && player.health < prevHealthRef.current) {
      audioEngineRef.current.playHitSound();
    }

    if (player) {
      prevHealthRef.current = player.health;
    }
  }, [player?.health]);

  const handleStart = () => {
    startGame();
  };

  const handleRestart = () => {
    audioEngineRef.current.stop();
    audioInitializedRef.current = false;
    restartGame();
  };

  if (!gameStarted) {
    return <StartScreen onStart={handleStart} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-8 gap-6">
      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
        Faculty of Survival
      </h1>

      {player && <HUD player={player} survivalTime={survivalTime} />}

      <GameCanvas
        gameMap={gameMap}
        player={player}
        students={students}
        coins={coins}
        npcs={npcs}
        tileSize={TILE_SIZE}
        mapSize={MAP_SIZE}
        playerUpgrades={playerUpgrades}
        chatGPTTrackerCooldown={chatGPTTrackerCooldown}
      />

      {nearNPC && !shopOpen && (
        <div className="text-white text-lg font-bold animate-pulse">
          Press E to open shop
        </div>
      )}

      <Shop
        isOpen={shopOpen}
        playerEgo={player?.score || 0}
        shopItems={shopItems}
        onPurchase={handlePurchase}
        onClose={() => {}}
      />

      {gameOver && player && (
        <GameOverScreen
          score={player.score}
          survivalTime={survivalTime}
          onRestart={handleRestart}
          reason={gameOverReason}
        />
      )}
    </div>
  );
}

export default App;
