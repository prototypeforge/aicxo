import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Clock, CheckCircle2, User } from 'lucide-react';
import { Meeting } from '../types';
import clsx from 'clsx';

interface MeetingCardProps {
  meeting: Meeting;
  onClick?: () => void;
}

export default function MeetingCard({ meeting, onClick }: MeetingCardProps) {
  const isCompleted = meeting.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={clsx(
        'rounded-2xl p-6 cursor-pointer transition-all duration-300 border',
        'bg-obsidian-900/50 border-obsidian-800 hover:border-obsidian-700',
        'hover:shadow-xl hover:shadow-gold-500/5'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sapphire-500/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-sapphire-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  isCompleted
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gold-500/20 text-gold-400'
                )}
              >
                {isCompleted ? 'Completed' : 'In Progress'}
              </span>
            </div>
            <p className="text-xs text-obsidian-400 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(meeting.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-obsidian-400">
          <User className="w-4 h-4" />
          <span className="text-sm">{meeting.opinions.length}</span>
        </div>
      </div>

      {/* Question */}
      <div className="mt-4">
        <h3 className="text-white font-medium line-clamp-2">{meeting.question}</h3>
        {meeting.context && (
          <p className="mt-2 text-sm text-obsidian-400 line-clamp-1">
            Context: {meeting.context}
          </p>
        )}
      </div>

      {/* Chair Recommendation Preview */}
      {isCompleted && meeting.chair_recommendation && (
        <div className="mt-4 p-3 rounded-xl bg-obsidian-800/30 border border-obsidian-700/50">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-gold-400" />
            <span className="text-xs font-medium text-gold-400">Chair's Recommendation</span>
          </div>
          <p className="text-sm text-obsidian-300 line-clamp-2">
            {meeting.chair_recommendation}
          </p>
        </div>
      )}

      {/* Participating Agents */}
      {meeting.opinions.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <div className="flex -space-x-2">
            {meeting.opinions.slice(0, 4).map((opinion, index) => (
              <div
                key={opinion.agent_id}
                className="w-8 h-8 rounded-full border-2 border-obsidian-900 flex items-center justify-center text-xs font-medium text-white"
                style={{
                  backgroundColor: `hsl(${(index * 60) % 360}, 60%, 40%)`,
                  zIndex: 4 - index,
                }}
              >
                {opinion.agent_name[0]}
              </div>
            ))}
            {meeting.opinions.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-obsidian-900 bg-obsidian-700 flex items-center justify-center text-xs font-medium text-obsidian-300">
                +{meeting.opinions.length - 4}
              </div>
            )}
          </div>
          <span className="text-xs text-obsidian-400">
            {meeting.opinions.length} board member{meeting.opinions.length !== 1 ? 's' : ''} participated
          </span>
        </div>
      )}
    </motion.div>
  );
}

