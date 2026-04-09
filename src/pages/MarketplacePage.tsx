import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { MarketplaceFilters } from '../components/marketplace/MarketplaceFilters';
import { MarketplaceGrid } from '../components/marketplace/MarketplaceGrid';
import { getAllListings } from '../lib/firebase/marketplace-service';
import type { CardCondition, GameType, Listing } from '../types';
import { ANIMATION_DELAY, ANIMATION_DURATION } from '../constants';

export default function MarketplacePage() {
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [filtered, setFiltered] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllListings()
      .then(data => {
        setAllListings(data);
        setFiltered(data);
      })
      .catch(() => setError('Failed to load listings. Please try again later.'))
      .finally(() => setLoading(false));
  }, []);

  const handleFilterChange = useCallback(
    (search: string, gameType?: GameType, condition?: CardCondition) => {
      let result = allListings;
      if (search) {
        const lower = search.toLowerCase();
        result = result.filter(l => l.cardName.toLowerCase().includes(lower));
      }
      if (gameType) {
        result = result.filter(l => l.gameType === gameType);
      }
      if (condition) {
        result = result.filter(l => l.condition === condition);
      }
      setFiltered(result);
    },
    [allListings]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ANIMATION_DURATION.SLOW }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400 dark:gradient-brand p-12 mb-10 dark:shadow-[0_0_50px_rgba(232,80,2,0.4)]"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-transparent" />
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ANIMATION_DELAY.STAGGER_1, duration: ANIMATION_DURATION.SLOW }}
            className="inline-flex items-center gap-2 bg-white/20 dark:bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4 text-orange-300" />
            <span className="text-sm text-white">Community Marketplace</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ANIMATION_DELAY.STAGGER_2, duration: ANIMATION_DURATION.SLOW }}
            className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight"
          >
            Browse the Dojo
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ANIMATION_DELAY.STAGGER_3, duration: ANIMATION_DURATION.SLOW }}
            className="text-lg text-white/90"
          >
            Find your next card. Buy with confidence from the community.
          </motion.p>
        </div>
      </motion.div>

      {/* Filters */}
      <MarketplaceFilters onFilterChange={handleFilterChange} />

      {/* Grid */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="text-center py-16 text-destructive">{error}</div>
      )}
      {!loading && !error && <MarketplaceGrid listings={filtered} />}
    </div>
  );
}
