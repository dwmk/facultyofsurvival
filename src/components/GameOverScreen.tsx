import { Trophy, Clock, RotateCcw } from 'lucide-react';

interface GameOverScreenProps {
  score: number;
  survivalTime: number;
  onRestart: () => void;
}

export const GameOverScreen = ({ score, survivalTime, onRestart }: GameOverScreenProps) => {
  const formatTime = (frames: number): string => {
    const seconds = Math.floor(frames / 60);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white p-8 rounded-lg shadow-2xl max-w-md w-full border-4 border-red-600">
        <h2 className="text-4xl font-bold text-center mb-6 text-red-500">GAME OVER</h2>

        <div className="mb-8 space-y-4">
          <div className="bg-gray-800 p-4 rounded flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="text-yellow-500" size={32} />
              <span className="text-lg">Final Score</span>
            </div>
            <span className="text-3xl font-bold text-yellow-400">{score}</span>
          </div>

          <div className="bg-gray-800 p-4 rounded flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="text-blue-500" size={32} />
              <span className="text-lg">Survival Time</span>
            </div>
            <span className="text-3xl font-bold text-blue-400">{formatTime(survivalTime)}</span>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 text-xl"
        >
          <RotateCcw size={24} />
          Play Again
        </button>

        <p className="text-center text-gray-400 mt-4 text-sm">
          You were overwhelmed by students' requests!
        </p>
      </div>
    </div>
  );
};
