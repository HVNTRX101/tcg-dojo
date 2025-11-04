import React from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';

interface GameNavigationProps {
  selectedGame: string;
  onGameSelect: (game: string) => void;
}

export function GameNavigation({ selectedGame: _selectedGame, onGameSelect }: GameNavigationProps) {
  const location = useLocation();

  const games = [
    { name: 'All Products', slug: 'all', path: '/' },
    { name: 'Magic: The Gathering', slug: 'magic', path: '/games/magic' },
    { name: 'Yu-Gi-Oh!', slug: 'yugioh', path: '/games/yugioh' },
    { name: 'Pokemon', slug: 'pokemon', path: '/games/pokemon' },
    { name: 'Disney Lorcana', slug: 'lorcana', path: '/games/lorcana' },
    { name: 'One Piece', slug: 'onepiece', path: '/games/onepiece' },
    { name: 'Digimon', slug: 'digimon', path: '/games/digimon' },
  ];

  const isActive = (game: (typeof games)[0]) => {
    if (game.slug === 'all') {
      return location.pathname === '/' || location.pathname.startsWith('/search');
    }
    return location.pathname === game.path;
  };

  return (
    <div className="bg-gray-900 dark:bg-black dark:border-b dark:border-[#E85002]/20 text-white">
      <div className="container mx-auto px-4">
        <nav className="flex items-center overflow-x-auto">
          {games.map(game => (
            <motion.div
              key={game.slug}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`px-4 py-3 text-sm whitespace-nowrap hover:bg-gray-800 dark:hover:bg-[#E85002]/20 transition-colors flex items-center gap-1 relative ${
                isActive(game) ? 'bg-gray-800 dark:bg-[#E85002]/30' : ''
              }`}
            >
              <Link
                to={game.path}
                onClick={() => onGameSelect(game.slug)}
                className="flex items-center gap-1"
              >
                {game.name}
                <ChevronDown className="w-3 h-3" />
              </Link>
              {isActive(game) && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-[#E85002]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.div>
          ))}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-3 text-sm whitespace-nowrap hover:bg-gray-800 dark:hover:bg-[#E85002]/20 transition-colors flex items-center gap-1"
          >
            More Products & Options
            <ChevronDown className="w-3 h-3" />
          </motion.button>
        </nav>
      </div>
    </div>
  );
}
