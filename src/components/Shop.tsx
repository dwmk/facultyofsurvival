import { ShopItem } from '../types/game';

interface ShopProps {
  isOpen: boolean;
  playerEgo: number;
  shopItems: ShopItem[];
  onPurchase: (itemId: string) => void;
  onClose: () => void;
}

export const Shop = ({ isOpen, playerEgo, shopItems, onPurchase, onClose }: ShopProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 border-4 border-yellow-500 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400">Staff Room Shop</h2>
          <div className="text-white">
            <span className="text-yellow-400">Your Ego:</span> {Math.floor(playerEgo)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {shopItems.map((item) => {
            const canAfford = playerEgo >= item.cost;
            const purchased = item.purchased || 0;

            return (
              <div
                key={item.id}
                className={`border-2 rounded-lg p-4 ${
                  canAfford ? 'border-green-500 bg-gray-800' : 'border-gray-600 bg-gray-850'
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={item.icon}
                    alt={item.name}
                    className="w-20 h-20 object-contain border-2 border-gray-700 rounded"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {item.name}
                      {item.type === 'tool' && purchased > 0 && (
                        <span className="ml-2 text-sm text-green-400">({purchased} owned)</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${canAfford ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {item.cost} Ego
                      </span>
                      <button
                        onClick={() => onPurchase(item.id)}
                        disabled={!canAfford}
                        className={`px-4 py-2 rounded font-semibold ${
                          canAfford
                            ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold text-lg"
          >
            Close Shop (Press E)
          </button>
        </div>
      </div>
    </div>
  );
};
