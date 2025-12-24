import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Plus, Edit2, Trash2, User, Save, X, Gavel } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import api from '../../api/axios';
import { Agent, AgentWeights } from '../../types';

const MODELS = [
  // GPT-5.x series
  'gpt-5.2',
  'gpt-5.2-instant',
  'gpt-5.2-thinking',
  'gpt-5.1',
  'gpt-5.1-instant', 
  'gpt-5.1-thinking',
  'gpt-5',
  // GPT-4.5 series
  'gpt-4.5',
  'gpt-4.5-preview',
  // GPT-4.1 series
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  // GPT-4o series
  'gpt-4o',
  'gpt-4o-mini',
  // GPT-4 Turbo
  'gpt-4-turbo',
  // GPT-4 base
  'gpt-4',
  // GPT-3.5
  'gpt-3.5-turbo',
  // o-series reasoning models
  'o1',
  'o1-preview',
  'o1-mini',
  'o3',
  'o3-mini',
  'o4-mini',
];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16'];

const defaultWeights: AgentWeights = {
  finance: 0.2,
  technology: 0.2,
  operations: 0.2,
  people_hr: 0.2,
  logistics: 0.2,
};

const defaultAgent = {
  name: '',
  role: '',
  system_prompt: '',
  weights: defaultWeights,
  model: 'gpt-4o-mini',
  avatar_color: '#6366f1',
  is_active: true,
};

export default function AdminAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [chair, setChair] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showChairForm, setShowChairForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState(defaultAgent);
  const [chairFormData, setChairFormData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchChair();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await api.get('/api/agents/all');
      setAgents(response.data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchChair = async () => {
    try {
      const response = await api.get('/api/agents/chair');
      setChair(response.data);
    } catch (error) {
      console.error('Failed to fetch chair:', error);
    }
  };

  const openCreateForm = () => {
    setEditingAgent(null);
    setFormData(defaultAgent);
    setShowForm(true);
    setShowChairForm(false);
  };

  const openEditForm = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      role: agent.role,
      system_prompt: agent.system_prompt,
      weights: agent.weights,
      model: agent.model,
      avatar_color: agent.avatar_color,
      is_active: agent.is_active,
    });
    setShowForm(true);
    setShowChairForm(false);
  };

  const openChairForm = () => {
    setChairFormData({
      name: chair?.name || 'Board Chair',
      system_prompt: chair?.system_prompt || '',
      model: chair?.model || 'gpt-4o-mini',
      avatar_color: chair?.avatar_color || '#f59e0b',
    });
    setShowChairForm(true);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.role.trim() || !formData.system_prompt.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingAgent) {
        const response = await api.put(`/api/agents/admin/${editingAgent.id}`, formData);
        setAgents(agents.map((a) => (a.id === editingAgent.id ? response.data : a)));
        toast.success('Agent updated successfully');
      } else {
        const response = await api.post('/api/agents/admin', formData);
        setAgents([...agents, response.data]);
        toast.success('Agent created successfully');
      }
      setShowForm(false);
      setFormData(defaultAgent);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleChairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chairFormData.system_prompt.trim()) {
      toast.error('Please provide a system prompt for the Chair');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put('/api/agents/chair', chairFormData);
      setChair(response.data);
      toast.success('Chair of the Board updated successfully');
      setShowChairForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update Chair');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await api.delete(`/api/agents/admin/${agentId}`);
      setAgents(agents.filter((a) => a.id !== agentId));
      toast.success('Agent deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete agent');
    }
  };

  const updateWeight = (key: keyof AgentWeights, value: number) => {
    setFormData({
      ...formData,
      weights: { ...formData.weights, [key]: value / 100 },
    });
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-gold-500/20">
            <Crown className="w-6 h-6 text-gold-400" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
            Agent Management
          </h1>
        </div>
        <p className="text-obsidian-400">
          Create and manage AI executive agents
        </p>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={openCreateForm} size="lg">
          <Plus className="w-5 h-5" />
          Create New Agent
        </Button>
        <Button onClick={openChairForm} variant="secondary" size="lg">
          <Gavel className="w-5 h-5" />
          Configure Chair of the Board
        </Button>
      </div>

      {/* Chair of the Board Card */}
      {chair && !showChairForm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card gradient className="border-gold-500/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: (chair.avatar_color || '#f59e0b') + '20' }}
                >
                  <Gavel className="w-7 h-7" style={{ color: chair.avatar_color || '#f59e0b' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{chair.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 text-xs">
                      Chair
                    </span>
                  </div>
                  <p className="text-sm text-gold-400">Chair of the Board</p>
                  <p className="text-xs text-obsidian-400 mt-1">Model: {chair.model}</p>
                </div>
              </div>
              <button
                onClick={openChairForm}
                className="p-2 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800 transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-obsidian-800/30">
              <p className="text-xs text-obsidian-400 mb-1">System Prompt:</p>
              <p className="text-sm text-obsidian-300 line-clamp-3">{chair.system_prompt}</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Chair Form */}
      {showChairForm && chairFormData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8"
        >
          <Card gradient className="border-gold-500/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Gavel className="w-6 h-6 text-gold-400" />
                <h2 className="text-lg font-semibold text-white">
                  Configure Chair of the Board
                </h2>
              </div>
              <button
                onClick={() => setShowChairForm(false)}
                className="p-2 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChairSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Chair Name"
                  value={chairFormData.name}
                  onChange={(e) => setChairFormData({ ...chairFormData, name: e.target.value })}
                  placeholder="Board Chair"
                />
                <div>
                  <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                    AI Model
                  </label>
                  <select
                    value={chairFormData.model}
                    onChange={(e) => setChairFormData({ ...chairFormData, model: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                  >
                    {MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                  Avatar Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setChairFormData({ ...chairFormData, avatar_color: color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        chairFormData.avatar_color === color ? 'scale-110 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                  System Prompt *
                </label>
                <textarea
                  value={chairFormData.system_prompt}
                  onChange={(e) => setChairFormData({ ...chairFormData, system_prompt: e.target.value })}
                  placeholder="You are the Chair of the Board of Directors. Your role is to synthesize the opinions of all board members..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 resize-none"
                  required
                />
                <p className="mt-1 text-xs text-obsidian-500">
                  This prompt defines how the Chair synthesizes board member opinions and forms recommendations.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" loading={saving}>
                  <Save className="w-5 h-5" />
                  Save Chair Configuration
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowChairForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Agent Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8"
        >
          <Card gradient>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingAgent ? 'Edit Agent' : 'Create New Agent'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Agent Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Alexandra Sterling"
                  required
                />
                <Input
                  label="Role/Title *"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="CFO"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                    AI Model
                  </label>
                  <select
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                  >
                    {MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                    Avatar Color
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar_color: color })}
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          formData.avatar_color === color ? 'scale-110 ring-2 ring-white' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                  System Prompt *
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="You are a seasoned Chief Financial Officer with 20+ years of experience..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 resize-none"
                  required
                />
              </div>

              {/* Expertise Weights */}
              <div>
                <label className="block text-sm font-medium text-obsidian-200 mb-4">
                  Expertise Weights
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {Object.entries(formData.weights).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-xs text-obsidian-400 mb-1 capitalize">
                        {key.replace('_', ' ')}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={value * 100}
                          onChange={(e) =>
                            updateWeight(key as keyof AgentWeights, parseInt(e.target.value))
                          }
                          className="flex-1"
                        />
                        <span className="text-sm text-white w-10 text-right">
                          {Math.round(value * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-obsidian-300">
                  Agent is active and available for users to hire
                </label>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" loading={saving}>
                  <Save className="w-5 h-5" />
                  {editingAgent ? 'Update Agent' : 'Create Agent'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Agents List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl loading-shimmer bg-obsidian-800/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={!agent.is_active ? 'opacity-60' : ''}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: agent.avatar_color + '20' }}
                    >
                      <User className="w-6 h-6" style={{ color: agent.avatar_color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{agent.name}</h3>
                        {!agent.is_active && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: agent.avatar_color }}>
                        {agent.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditForm(agent)}
                      className="p-2 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="p-2 rounded-lg text-obsidian-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-obsidian-400 line-clamp-2">
                  {agent.system_prompt}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(agent.weights)
                    .filter(([, v]) => v > 0.3)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <span
                        key={key}
                        className="px-2 py-1 rounded-lg bg-obsidian-800/50 text-xs"
                      >
                        <span className="text-obsidian-300 capitalize">{key.replace('_', ' ')}</span>
                        <span className="ml-1 text-gold-400">{Math.round(value * 100)}%</span>
                      </span>
                    ))}
                </div>

                <div className="mt-3 text-xs text-obsidian-500">
                  Model: {agent.model}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </Layout>
  );
}
