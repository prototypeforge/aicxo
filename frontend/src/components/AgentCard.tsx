import { motion } from 'framer-motion';
import { Check, Plus, Minus, User } from 'lucide-react';
import { Agent } from '../types';
import clsx from 'clsx';

interface AgentCardProps {
  agent: Agent;
  isHired?: boolean;
  onHire?: () => void;
  onFire?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

export default function AgentCard({
  agent,
  isHired = false,
  onHire,
  onFire,
  showActions = true,
  compact = false,
}: AgentCardProps) {
  const weights = agent.weights;
  const topWeights = Object.entries(weights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const formatWeightLabel = (key: string): string => {
    const labels: Record<string, string> = {
      finance: 'Finance',
      technology: 'Technology',
      operations: 'Operations',
      people_hr: 'People & HR',
      logistics: 'Logistics',
    };
    return labels[key] || key;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={clsx(
        'relative rounded-2xl border transition-all duration-300',
        isHired
          ? 'bg-gradient-to-br from-gold-500/10 to-transparent border-gold-500/30'
          : 'bg-obsidian-900/50 border-obsidian-800 hover:border-obsidian-700',
        compact ? 'p-4' : 'p-6'
      )}
    >
      {/* Hired Badge */}
      {isHired && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gold-500/20 text-gold-400 text-xs font-medium">
            <Check className="w-3 h-3" />
            <span>Hired</span>
          </div>
        </div>
      )}

      {/* Avatar & Info */}
      <div className="flex items-start gap-4">
        <div
          className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: agent.avatar_color + '20' }}
        >
          <User className="w-7 h-7" style={{ color: agent.avatar_color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{agent.name}</h3>
          <p className="text-sm font-medium" style={{ color: agent.avatar_color }}>
            {agent.role}
          </p>
          {!compact && (
            <p className="text-xs text-obsidian-400 mt-1">Model: {agent.model}</p>
          )}
        </div>
      </div>

      {/* Expertise Weights */}
      {!compact && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-obsidian-400 uppercase tracking-wider">
            Top Expertise
          </p>
          <div className="flex flex-wrap gap-2">
            {topWeights.map(([key, value]) => (
              <div
                key={key}
                className="px-2 py-1 rounded-lg bg-obsidian-800/50 text-xs"
              >
                <span className="text-obsidian-300">{formatWeightLabel(key)}</span>
                <span className="ml-1 text-gold-400">{Math.round(value * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-obsidian-800">
          {isHired ? (
            <button
              onClick={onFire}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Minus className="w-4 h-4" />
              <span>Remove from Board</span>
            </button>
          ) : (
            <button
              onClick={onHire}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Hire to Board</span>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

