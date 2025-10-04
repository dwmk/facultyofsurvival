import { Play } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
}

export const StartScreen = ({ onStart }: StartScreenProps) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-white text-center max-w-2xl px-8">
        <h1 className="text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
          Faculty of Survival
        </h1>

        <p className="text-xl mb-8 text-gray-300">
          You are a teacher trying to survive the endless wave of student requests and complaints!
        </p>

        <div className="bg-gray-800 p-6 rounded-lg mb-8 text-left space-y-3">
          <h2 className="text-2xl font-bold mb-4 text-center text-green-400">How to Play</h2>

          <div className="space-y-2">
            <p><span className="text-yellow-400 font-bold">Movement:</span> Use WASD or Arrow Keys</p>
            <p><span className="text-red-400 font-bold">Danger:</span> Students will chase you and drain your mental health</p>
            <p><span className="text-green-400 font-bold">Survival:</span> Health regenerates over time</p>
            <p><span className="text-blue-400 font-bold">AI:</span> Students communicate and hunt in groups</p>
          </div>
        </div>

        <button
          onClick={onStart}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-4 px-12 rounded-lg text-2xl transition-all duration-200 flex items-center gap-3 mx-auto shadow-lg hover:shadow-xl"
        >
          <Play size={32} />
          Start Game
        </button>
      </div>
    </div>
  );
};
