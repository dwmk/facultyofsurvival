import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export const MobileOrientationWarning = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center">
      <div className="text-center text-white px-6">
        <RotateCcw size={80} className="mx-auto mb-6 animate-spin" style={{ animationDuration: '3s' }} />
        <h2 className="text-2xl font-bold mb-4">Please Rotate Your Device</h2>
        <p className="text-lg">This game requires landscape orientation</p>
      </div>
    </div>
  );
};
