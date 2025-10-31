import React from 'react';
import { X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-yellow-400 dark:bg-gradient-to-r dark:from-[#C10801] dark:to-[#E85002] text-black dark:text-white px-4 py-2 text-center relative overflow-hidden"
        >
      <p className="text-sm">
        <span>Breaking news!</span> New Product Announcements And Card Reveals From Disney Lorcana -{' '}
        <a href="#" className="underline hover:no-underline">
          Read All About It!
        </a>
        </p>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70"
          aria-label="Close banner"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
