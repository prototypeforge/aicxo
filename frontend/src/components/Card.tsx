import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

export default function Card({ children, className, hover = false, gradient = false }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      className={clsx(
        'rounded-2xl p-6',
        gradient
          ? 'bg-gradient-to-br from-obsidian-800/80 to-obsidian-900/80 border border-obsidian-700/50'
          : 'bg-obsidian-900/50 border border-obsidian-800',
        hover && 'cursor-pointer transition-shadow hover:shadow-xl hover:shadow-gold-500/5',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

