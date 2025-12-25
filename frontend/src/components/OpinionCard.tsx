import { motion } from 'framer-motion';
import { User, TrendingUp } from 'lucide-react';
import { AgentOpinion } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface OpinionCardProps {
  opinion: AgentOpinion;
  index: number;
}

export default function OpinionCard({ opinion, index }: OpinionCardProps) {
  const confidenceColor = 
    opinion.confidence >= 0.8
      ? 'text-green-400 bg-green-500/20'
      : opinion.confidence >= 0.6
      ? 'text-gold-400 bg-gold-500/20'
      : 'text-red-400 bg-red-500/20';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl p-6 bg-obsidian-900/50 border border-obsidian-800"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-sapphire-500/20 flex items-center justify-center">
            <User className="w-6 h-6 text-sapphire-400" />
          </div>
          <div>
            <h4 className="font-semibold text-white">{opinion.agent_name}</h4>
            <p className="text-sm text-sapphire-400">{opinion.agent_role}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${confidenceColor}`}>
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">{Math.round(opinion.confidence * 100)}%</span>
        </div>
      </div>

      {/* Opinion */}
      <div className="mt-4">
        <h5 className="text-xs font-medium text-obsidian-400 uppercase tracking-wider mb-2">
          Opinion
        </h5>
        <div className="text-white leading-relaxed">
          <MarkdownRenderer content={opinion.opinion} />
        </div>
      </div>

      {/* Reasoning */}
      <div className="mt-4 p-4 rounded-xl bg-obsidian-800/30">
        <h5 className="text-xs font-medium text-obsidian-400 uppercase tracking-wider mb-2">
          Reasoning
        </h5>
        <div className="text-sm text-obsidian-300 leading-relaxed">
          <MarkdownRenderer content={opinion.reasoning} />
        </div>
      </div>

      {/* Expertise Applied */}
      <div className="mt-4">
        <h5 className="text-xs font-medium text-obsidian-400 uppercase tracking-wider mb-2">
          Expertise Applied
        </h5>
        <div className="flex flex-wrap gap-2">
          {Object.entries(opinion.weights_applied)
            .filter(([, value]) => value > 0.3)
            .sort(([, a], [, b]) => b - a)
            .map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-1 rounded-lg bg-obsidian-800 text-xs"
              >
                <span className="text-obsidian-300 capitalize">
                  {key.replace('_', ' ')}
                </span>
                <span className="ml-1 text-gold-400">{Math.round(value * 100)}%</span>
              </span>
            ))}
        </div>
      </div>
    </motion.div>
  );
}

