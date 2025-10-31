import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';
import { PriceTicker } from './PriceTicker';
import { Card } from '../types/product.types';
import { ANIMATION_DURATION, ANIMATION_DELAY } from '../constants';

interface HeroSectionProps {
  cards: Card[];
}

export function HeroSection({ cards }: HeroSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION_DURATION.SLOW }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400 dark:gradient-brand p-12 mb-12 dark:shadow-[0_0_50px_rgba(232,80,2,0.4)]"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: ANIMATION_DURATION.EXTENDED, ease: "easeOut" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1664997296099-5a0b63ab0196?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2tlbW9uJTIwY2FyZHMlMjBjb2xsZWN0aW9ufGVufDF8fHx8MTc2MDcxMDYwOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
          }}
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background dark:from-black/80 dark:via-black/60 dark:to-background" />
        {/* Optional: Add subtle orange glow overlay in dark mode */}
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: ANIMATION_DURATION.INFINITE,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-red-600/10 dark:from-orange-600/20 dark:to-red-600/20"
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ANIMATION_DELAY.STAGGER_1, duration: ANIMATION_DURATION.SLOW }}
            className="inline-flex items-center gap-2 bg-white/20 dark:bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4 text-orange-300" />
            <span className="text-sm text-white">The Premier TCG Marketplace</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ANIMATION_DELAY.STAGGER_2, duration: ANIMATION_DURATION.SLOW }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Collect, Trade & Battle
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ANIMATION_DELAY.STAGGER_3, duration: ANIMATION_DURATION.SLOW }}
            className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto"
          >
            Join thousands of collectors buying and selling cards from Magic: The Gathering, Pokémon, Yu-Gi-Oh! and more. Trusted marketplace with verified sellers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ANIMATION_DELAY.STAGGER_4, duration: ANIMATION_DURATION.SLOW }}
            className="flex flex-wrap justify-center gap-4 mb-8"
          >
            <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90 dark:bg-[#E85002] dark:text-white dark:hover:bg-[#F16001] shadow-lg">
              Start Collecting
            </Button>
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm">
              Browse Cards
            </Button>
          </motion.div>

          {/* Price Ticker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ANIMATION_DELAY.STAGGER_5, duration: ANIMATION_DURATION.SLOW }}
          >
            <PriceTicker cards={cards} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
