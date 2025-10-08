import { useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileControlsProps {
  onKeyDown: (key: string) => void;
  onKeyUp: (key: string) => void;
}

export const MobileControls = ({ onKeyDown, onKeyUp }: MobileControlsProps) => {
  const activeKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isMobile) return;

    return () => {
      activeKeysRef.current.forEach(key => onKeyUp(key));
      activeKeysRef.current.clear();
    };
  }, [onKeyUp]);

  const handleTouchStart = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!activeKeysRef.current.has(key)) {
      activeKeysRef.current.add(key);
      onKeyDown(key);
    }
  };

  const handleTouchEnd = (key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (activeKeysRef.current.has(key)) {
      activeKeysRef.current.delete(key);
      onKeyUp(key);
    }
  };

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isMobile) return null;

  const buttonClass = "bg-gray-800 bg-opacity-70 text-white rounded-lg flex items-center justify-center active:bg-gray-600 border-2 border-gray-600 transition-colors select-none touch-none";

  return (
    <div className="fixed inset-0 pointer-events-none z-40 flex items-end justify-between p-4 pb-8">
      <div className="pointer-events-auto relative w-48 h-48">
        <button
          className={`${buttonClass} absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14`}
          onTouchStart={handleTouchStart('ArrowUp')}
          onTouchEnd={handleTouchEnd('ArrowUp')}
          onMouseDown={handleTouchStart('ArrowUp')}
          onMouseUp={handleTouchEnd('ArrowUp')}
          onMouseLeave={handleTouchEnd('ArrowUp')}
        >
          <ChevronUp size={28} />
        </button>

        <button
          className={`${buttonClass} absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14`}
          onTouchStart={handleTouchStart('ArrowDown')}
          onTouchEnd={handleTouchEnd('ArrowDown')}
          onMouseDown={handleTouchStart('ArrowDown')}
          onMouseUp={handleTouchEnd('ArrowDown')}
          onMouseLeave={handleTouchEnd('ArrowDown')}
        >
          <ChevronDown size={28} />
        </button>

        <button
          className={`${buttonClass} absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14`}
          onTouchStart={handleTouchStart('ArrowLeft')}
          onTouchEnd={handleTouchEnd('ArrowLeft')}
          onMouseDown={handleTouchStart('ArrowLeft')}
          onMouseUp={handleTouchEnd('ArrowLeft')}
          onMouseLeave={handleTouchEnd('ArrowLeft')}
        >
          <ChevronLeft size={28} />
        </button>

        <button
          className={`${buttonClass} absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14`}
          onTouchStart={handleTouchStart('ArrowRight')}
          onTouchEnd={handleTouchEnd('ArrowRight')}
          onMouseDown={handleTouchStart('ArrowRight')}
          onMouseUp={handleTouchEnd('ArrowRight')}
          onMouseLeave={handleTouchEnd('ArrowRight')}
        >
          <ChevronRight size={28} />
        </button>

        <div className={`${buttonClass} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 pointer-events-none`} />
      </div>

      <div className="pointer-events-auto flex flex-col gap-3">
        <button
          className={`${buttonClass} w-16 h-16 text-2xl font-bold`}
          onTouchStart={handleTouchStart('q')}
          onTouchEnd={handleTouchEnd('q')}
          onMouseDown={handleTouchStart('q')}
          onMouseUp={handleTouchEnd('q')}
          onMouseLeave={handleTouchEnd('q')}
        >
          Q
        </button>

        <button
          className={`${buttonClass} w-16 h-16 text-2xl font-bold`}
          onTouchStart={handleTouchStart('e')}
          onTouchEnd={handleTouchEnd('e')}
          onMouseDown={handleTouchStart('e')}
          onMouseUp={handleTouchEnd('e')}
          onMouseLeave={handleTouchEnd('e')}
        >
          E
        </button>
      </div>
    </div>
  );
};
