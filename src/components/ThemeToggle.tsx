import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from './ThemeProvider';
import { motion } from 'motion/react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="relative overflow-hidden">
      <motion.div
        initial={false}
        animate={{
          scale: theme === 'dark' ? 1 : 0,
          rotate: theme === 'dark' ? 0 : 180,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Moon className="h-5 w-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          scale: theme === 'light' ? 1 : 0,
          rotate: theme === 'light' ? 0 : -180,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Sun className="h-5 w-5" />
      </motion.div>
    </Button>
  );
}
