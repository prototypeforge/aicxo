import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import AgentCard from '../components/AgentCard';
import api from '../api/axios';
import { Agent } from '../types';
import { useAuthStore } from '../store/authStore';

export default function Board() {
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, updateHiredAgents } = useAuthStore();

  const hiredAgentIds = user?.hired_agents || [];

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await api.get('/api/agents');
        setAllAgents(response.data);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        toast.error('Failed to load agents');
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  const handleHire = async (agentId: string) => {
    try {
      const response = await api.post(`/api/agents/hire/${agentId}`);
      updateHiredAgents(response.data.hired_agents);
      toast.success('Agent hired to your board!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to hire agent');
    }
  };

  const handleFire = async (agentId: string) => {
    try {
      const response = await api.post(`/api/agents/fire/${agentId}`);
      updateHiredAgents(response.data.hired_agents);
      toast.success('Agent removed from your board');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove agent');
    }
  };

  const filteredAgents = allAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.role.toLowerCase().includes(search.toLowerCase())
  );

  const hiredAgents = filteredAgents.filter((a) => hiredAgentIds.includes(a.id));
  const availableAgents = filteredAgents.filter((a) => !hiredAgentIds.includes(a.id));

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
          Your C-Suite
        </h1>
        <p className="text-obsidian-400 mt-2">
          Hire and manage your digital executive team
        </p>
      </motion.div>

      {/* Search */}
      <div className="mb-8 max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-obsidian-500" />
          <input
            type="text"
            placeholder="Search agents by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl loading-shimmer bg-obsidian-800/30" />
          ))}
        </div>
      ) : (
        <>
          {/* Hired Agents */}
          {hiredAgents.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gold-500/20">
                  <Users className="w-5 h-5 text-gold-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Your Board ({hiredAgents.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hiredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isHired={true}
                    onFire={() => handleFire(agent.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Available Agents */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-semibold text-white">
                Available Executives ({availableAgents.length})
              </h2>
            </div>
            {availableAgents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isHired={false}
                    onHire={() => handleHire(agent.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-obsidian-400">
                {search
                  ? 'No agents match your search'
                  : 'All available agents have been hired to your board'}
              </div>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}

