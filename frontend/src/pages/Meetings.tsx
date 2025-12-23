import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import MeetingCard from '../components/MeetingCard';
import api from '../api/axios';
import { Meeting } from '../types';

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await api.get('/api/meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Please enter a question for the board');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/api/meetings', {
        question: question.trim(),
        context: context.trim() || null,
      });
      toast.success('Board meeting completed!');
      navigate(`/meetings/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create meeting');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
          Board Meetings
        </h1>
        <p className="text-obsidian-400 mt-2">
          Ask questions and get collective wisdom from your board
        </p>
      </motion.div>

      {/* New Meeting Button */}
      <div className="mb-8">
        <Button onClick={() => setShowNewMeeting(!showNewMeeting)} size="lg">
          <Plus className="w-5 h-5" />
          New Board Meeting
        </Button>
      </div>

      {/* New Meeting Form */}
      {showNewMeeting && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-8"
        >
          <Card gradient>
            <form onSubmit={handleCreateMeeting} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-obsidian-200 mb-2">
                  Question for the Board *
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What strategic question would you like your board to deliberate on?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50 resize-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-obsidian-200 mb-2">
                  Additional Context (optional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Provide any additional context, constraints, or considerations..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" loading={creating} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Board is deliberating...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-5 h-5" />
                      Start Meeting
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewMeeting(false)}
                >
                  Cancel
                </Button>
              </div>

              {creating && (
                <div className="p-4 rounded-xl bg-sapphire-500/10 border border-sapphire-500/20">
                  <p className="text-sm text-sapphire-300">
                    Your board members are analyzing the question and forming their opinions. 
                    The Chair will synthesize all perspectives into a recommendation.
                    This may take a minute...
                  </p>
                </div>
              )}
            </form>
          </Card>
        </motion.div>
      )}

      {/* Meetings List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl loading-shimmer bg-obsidian-800/30" />
          ))}
        </div>
      ) : meetings.length > 0 ? (
        <div className="space-y-6">
          {meetings.map((meeting, index) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/meetings/${meeting.id}`}>
                <MeetingCard meeting={meeting} />
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
          <MessageSquare className="w-16 h-16 text-obsidian-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No board meetings yet</h3>
          <p className="text-obsidian-400 mb-6 max-w-md mx-auto">
            Start your first board meeting to get strategic advice from your AI executive team
          </p>
          <Button onClick={() => setShowNewMeeting(true)}>
            <Plus className="w-5 h-5" />
            Create Your First Meeting
          </Button>
        </Card>
      )}
    </Layout>
  );
}

