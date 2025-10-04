import { Player } from '../types/game';
import { Heart, Trophy, Clock } from 'lucide-react';

interface HUDProps {
  player: Player;
  survivalTime: number;
}

export const HUD = ({ player, survivalTime }: HUDProps) => {
  const formatTime = (frames: number): string => {
    const seconds = Math.floor(frames / 60);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const healthPercentage = (player.health / player.maxHealth) * 100;

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg flex items-center justify-between gap-6 min-w-[600px]">
      <div className="flex items-center gap-3">
        <Heart className="text-red-500" size={24} />
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-400">Health</div>
          <div className="w-48 h-6 bg-gray-700 rounded-full overflow-hidden border-2 border-gray-600">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-300">{Math.ceil(player.health)} / {player.maxHealth}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Trophy className="text-yellow-500" size={24} />
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-400">Score</div>
          <div className="text-2xl font-bold text-yellow-400">{player.score}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Clock className="text-blue-500" size={24} />
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-400">Time</div>
          <div className="text-2xl font-bold text-blue-400">{formatTime(survivalTime)}</div>
        </div>
      </div>
    </div>
  );
};
