import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Plus,
  ArrowRight,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import MeetingCard from '../components/MeetingCard';
import api from '../api/axios';
import { Meeting, Agent } from '../types';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [boardMembers, setBoardMembers] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meetingsRes, boardRes] = await Promise.all([
          api.get('/api/meetings'),
          api.get('/api/agents/my-board'),
        ]);
        setRecentMeetings(meetingsRes.data.slice(0, 3));
        setBoardMembers(boardRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      label: 'Board Members',
      value: boardMembers.length,
      icon: Users,
      color: 'text-sapphire-400',
      bgColor: 'bg-sapphire-500/20',
      link: '/board',
    },
    {
      label: 'Total Meetings',
      value: recentMeetings.length,
      icon: MessageSquare,
      color: 'text-gold-400',
      bgColor: 'bg-gold-500/20',
      link: '/meetings',
    },
    {
      label: 'Company Files',
      value: '-',
      icon: FileText,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      link: '/files',
    },
  ];

  return (
    <Layout>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
          Welcome back, <span className="text-gradient">{user?.full_name || user?.username}</span>
        </h1>
        <p className="text-obsidian-400 mt-2">
          {user?.company_name
            ? `Managing ${user.company_name}'s digital board of directors`
            : 'Your AI-powered advisory board is ready to assist'}
        </p>
      </motion.div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link to="/meetings">
          <Button size="lg">
            <Plus className="w-5 h-5" />
            New Board Meeting
          </Button>
        </Link>
        <Link to="/board">
          <Button variant="secondary" size="lg">
            <Users className="w-5 h-5" />
            Manage Board
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={stat.link}>
              <Card hover className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-obsidian-400">{stat.label}</p>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Meetings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Board Meetings</h2>
            <Link to="/meetings" className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl loading-shimmer bg-obsidian-800/30" />
              ))}
            </div>
          ) : recentMeetings.length > 0 ? (
            <div className="space-y-4">
              {recentMeetings.map((meeting) => (
                <Link key={meeting.id} to={`/meetings/${meeting.id}`}>
                  <MeetingCard meeting={meeting} />
                </Link>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-obsidian-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No meetings yet</h3>
              <p className="text-obsidian-400 mb-4">
                Start your first board meeting to get AI-powered advice
              </p>
              <Link to="/meetings">
                <Button>
                  <Plus className="w-4 h-4" />
                  Create First Meeting
                </Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Board Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Board</h2>
            <Link to="/board" className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-1">
              Manage <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {boardMembers.length > 0 ? (
            <Card>
              <div className="space-y-4">
                {boardMembers.slice(0, 4).map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: agent.avatar_color + '20',
                        color: agent.avatar_color,
                      }}
                    >
                      {agent.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                      <p className="text-xs text-obsidian-400">{agent.role}</p>
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                      <Zap className="w-3 h-3" />
                      <span className="text-xs">Active</span>
                    </div>
                  </motion.div>
                ))}
                {boardMembers.length > 4 && (
                  <p className="text-sm text-obsidian-400 text-center pt-2">
                    +{boardMembers.length - 4} more board members
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <Card className="text-center py-8">
              <Users className="w-10 h-10 text-obsidian-600 mx-auto mb-3" />
              <h3 className="font-medium text-white mb-2">No board members</h3>
              <p className="text-sm text-obsidian-400 mb-4">
                Hire your first executive
              </p>
              <Link to="/board">
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  Hire Agents
                </Button>
              </Link>
            </Card>
          )}

          {/* Quick Tips */}
          <Card gradient>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gold-500/20">
                <TrendingUp className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Pro Tip</h3>
                <p className="text-sm text-obsidian-400">
                  Upload your company's financial statements and product docs to give your board members context for better advice.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

