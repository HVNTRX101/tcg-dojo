import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../types/product.types';
import { ANIMATION_DURATION } from '../constants';

interface PriceTickerProps {
  cards: Card[];
}

// Generate mock price change data for cards
const generatePriceChange = (card: Card): { change: number; isPositive: boolean } => {
  // Use card price to generate consistent random-like changes
  const seed = card.price * 100;
  const change = (((seed % 20) - 10) / 10) * 15; // Range: -15% to +15%
  return {
    change: Math.abs(change),
    isPositive: change >= 0,
  };
};

export function PriceTicker({ cards }: PriceTickerProps) {
  // Take first 15 cards and duplicate for seamless loop
  const tickerCards = cards.slice(0, 15);
  const duplicatedCards = [...tickerCards, ...tickerCards, ...tickerCards];

  return (
    <div className="relative overflow-hidden bg-white/10 dark:bg-black/30 backdrop-blur-md border border-white/30 dark:border-[#E85002]/30 rounded-xl py-3 px-2">
      {/* Gradient fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white/10 dark:from-black/30 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white/10 dark:from-black/30 to-transparent z-10 pointer-events-none" />

      {/* Scrolling ticker content */}
      <div className="relative overflow-hidden">
        <motion.div
          className="flex gap-8"
          animate={{
            x: [0, -100 * tickerCards.length / 3],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: ANIMATION_DURATION.TICKER_SCROLL,
              ease: "linear",
            },
          }}
        >
          {duplicatedCards.map((card, index) => {
            const priceData = generatePriceChange(card);
            return (
              <TickerItem
                key={`${card.id}-${index}`}
                name={card.name}
                price={card.price}
                change={priceData.change}
                isPositive={priceData.isPositive}
              />
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}

interface TickerItemProps {
  name: string;
  price: number;
  change: number;
  isPositive: boolean;
}

function TickerItem({ name, price, change, isPositive }: TickerItemProps) {
  return (
    <div className="flex items-center gap-3 whitespace-nowrap min-w-fit">
      {/* Card name */}
      <span className="font-medium text-white/90 max-w-[180px] truncate">
        {name}
      </span>

      {/* Price */}
      <span className="text-white/70">
        ${price.toFixed(2)}
      </span>

      {/* Price change indicator */}
      <motion.div
        className={`flex items-center gap-1 px-2 py-0.5 rounded ${
          isPositive
            ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
            : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
        }`}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{
          duration: ANIMATION_DURATION.TICKER_SCALE,
          repeat: Infinity,
          repeatDelay: 3,
        }}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span className="text-xs font-medium">
          {isPositive ? '+' : '-'}{change.toFixed(1)}%
        </span>
      </motion.div>

      {/* Separator */}
      <div className="h-4 w-px bg-white/20 dark:bg-[#E85002]/30" />
    </div>
  );
}
