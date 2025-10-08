import { useEffect, useRef } from 'react';
import { SpriteLoader } from '../utils/spriteLoader';
import { NPCSpriteLoader } from '../utils/npcSpriteLoader';
import { Direction } from '../types/game';
import { CHARACTERS } from '../hooks/useGameState';

interface CharacterSelectProps {
  onSelect: (charId: string) => void;
  isUnlocked: (charId: string) => boolean;
  stats: any;
}

export const CharacterSelect = ({ onSelect, isUnlocked, stats }: CharacterSelectProps) => {
  const getProgressLabel = (attribute: string, current: number, amount: number) => {
    if (attribute === 'totalPlaytime') {
      return `${Math.floor(current / 60)} / ${Math.floor(amount / 60)} Mins total played`;
    } else if (attribute === 'totalSurvival') {
      return `${Math.floor(current / 60)} / ${Math.floor(amount / 60)} Mins survived`;
    } else {
      return `${Math.floor(current)} / ${amount} ${attribute.replace('total', '')}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-4 border-yellow-500 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 text-center">Choose Your Character</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(CHARACTERS).map(([id, char]) => (
            <div key={id} className="bg-gray-800 p-3 rounded-lg border-2 border-gray-600 flex gap-3 hover:border-yellow-500 transition-colors">
              {/* Left: Animated Preview */}
              <div className="flex-shrink-0">
                <CharacterPreview charId={id as keyof typeof CHARACTERS} char={char} />
              </div>
              
              {/* Right: Text Box (like Shop) */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h3 className="text-lg font-semibold text-white mb-1 truncate">{char.name}</h3>
                <p className="text-sm text-gray-400 mb-3">Pronoun: {char.pronoun}</p>
                
                {isUnlocked(id as any) ? (
                  <button
                    onClick={() => onSelect(id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm transition-colors w-full"
                  >
                    Select
                  </button>
                ) : (
                  char.unlock_amount !== null && (
                    <div className="space-y-1">
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all"
                          style={{
                            width: `${Math.min((stats[char.unlock_attribute] / char.unlock_amount) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-300 truncate">
                        {getProgressLabel(char.unlock_attribute, stats[char.unlock_attribute], char.unlock_amount)}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <button
            onClick={() => onSelect('default')} // fallback
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

interface CharacterPreviewProps {
  charId: string;
  char: any;
}

const CharacterPreview = ({ charId, char }: CharacterPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loaderRef = useRef<any>(null); // SpriteLoader | NPCSpriteLoader
  const loadedRef = useRef(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create and load loader ONCE
    if (char.spritesheet === 'default') {
      loaderRef.current = new SpriteLoader();
      loaderRef.current.load('https://dewanmukto.github.io/asset/images/geminidrake_deviantart_spritesheet_freeschooluniforms.png').then(() => {
        loadedRef.current = true;
      }).catch(console.error);
    } else {
      loaderRef.current = new NPCSpriteLoader('single');
      loaderRef.current.load(char.spritesheet).then(() => {
        loadedRef.current = true;
      }).catch(console.error);
    }

    // Animate loop
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      // Throttle frame increment (e.g., every ~200ms for visible walk cycle)
      if (delta > 200) {
        frameRef.current = (frameRef.current + 1) % 3;
      }

      ctx.clearRect(0, 0, 64, 64); // Smaller canvas

      if (loadedRef.current && loaderRef.current) {
        if (char.spritesheet === 'default') {
          (loaderRef.current as SpriteLoader).drawSprite(ctx, 0 /* charIndex */, Direction.DOWN, frameRef.current, true /* isMoving */, 0, 0, 2 /* smaller scale */);
        } else {
          (loaderRef.current as NPCSpriteLoader).drawSprite(ctx, Direction.DOWN, frameRef.current, true, 0, 0, 2 /* scale */, 0 /* charIndex */);
        }
      }

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    return () => {
      // Cleanup: revoke if needed, but not critical
    };
  }, [charId, char]);

  return <canvas ref={canvasRef} width={64} height={64} className="border-2 border-gray-700 rounded" />;
};
