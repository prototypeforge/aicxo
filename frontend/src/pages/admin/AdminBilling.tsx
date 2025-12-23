import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Cpu, 
  Users,
  Calendar,
  BarChart3,
  User,
  ChevronRight
} from 'lucide-react';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import api from '../../api/axios';

interface BillingOverview {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  request_count: number;
  period_days: number;
  period_start: string;
  period_end: string;
  usage_by_model: Array<{
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    total_cost_usd: number;
    request_count: number;
  }>;
  usage_by_user: Array<{
    user_id: number;
    username: string;
    total_tokens: number;
    total_cost_usd: number;
    request_count: number;
  }>;
  usage_by_agent: Array<{
    agent_id: string;
    agent_name: string;
    agent_role: string;
    model: string;
    total_tokens: number;
    total_cost_usd: number;
    request_count: number;
  }>;
  model_pricing: Record<string, { prompt: number; completion: number }>;
}

export default function AdminBilling() {
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);

  useEffect(() => {
    fetchOverview();
  }, [days]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/billing/admin/overview?days=${days}`);
      setOverview(response.data);
    } catch (error) {
      console.error('Failed to fetch billing:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId: number) => {
    try {
      const response = await api.get(`/api/billing/admin/user/${userId}?days=${days}`);
      setUserDetail(response.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
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
            <DollarSign className="w-6 h-6 text-gold-400" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
            Billing Overview
          </h1>
        </div>
        <p className="text-obsidian-400">
          System-wide token usage and cost tracking
        </p>
      </motion.div>

      {/* Period Selector */}
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="w-5 h-5 text-obsidian-400" />
        <span className="text-obsidian-400">Time period:</span>
        <div className="flex gap-2">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                  : 'bg-obsidian-800/50 text-obsidian-300 hover:text-white'
              }`}
            >
              {d === 365 ? '1 Year' : `${d} Days`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl loading-shimmer bg-obsidian-800/30" />
          ))}
        </div>
      ) : overview ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gold-500/20">
                  <DollarSign className="w-6 h-6 text-gold-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(overview.total_cost_usd)}
                  </p>
                  <p className="text-sm text-obsidian-400">Total Cost</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-sapphire-500/20">
                  <Cpu className="w-6 h-6 text-sapphire-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(overview.total_tokens)}
                  </p>
                  <p className="text-sm text-obsidian-400">Total Tokens</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {overview.request_count}
                  </p>
                  <p className="text-sm text-obsidian-400">Total Requests</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {overview.usage_by_user.length}
                  </p>
                  <p className="text-sm text-obsidian-400">Active Users</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Usage by Model */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sapphire-400" />
                By Model
              </h3>
              <div className="space-y-3">
                {overview.usage_by_model.map((item) => (
                  <div
                    key={item.model}
                    className="p-3 rounded-xl bg-obsidian-800/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-white">{item.model}</p>
                      <p className="font-semibold text-gold-400">
                        {formatCurrency(item.total_cost_usd)}
                      </p>
                    </div>
                    <p className="text-xs text-obsidian-400">
                      {formatNumber(item.total_tokens)} tokens · {item.request_count} requests
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Usage by User */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gold-400" />
                Top Users
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {overview.usage_by_user.slice(0, 10).map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => fetchUserDetail(user.user_id)}
                    className={`w-full p-3 rounded-xl text-left transition-colors ${
                      selectedUser === user.user_id
                        ? 'bg-gold-500/20 border border-gold-500/30'
                        : 'bg-obsidian-800/30 hover:bg-obsidian-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{user.username}</p>
                        <p className="text-xs text-obsidian-400">
                          {formatNumber(user.total_tokens)} tokens
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gold-400">
                          {formatCurrency(user.total_cost_usd)}
                        </p>
                        <ChevronRight className="w-4 h-4 text-obsidian-500" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Usage by Agent */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                By Agent
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {overview.usage_by_agent.map((agent) => (
                  <div
                    key={agent.agent_id}
                    className="p-3 rounded-xl bg-obsidian-800/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-white">{agent.agent_name}</p>
                      <p className="font-semibold text-gold-400">
                        {formatCurrency(agent.total_cost_usd)}
                      </p>
                    </div>
                    <p className="text-xs text-obsidian-400">
                      {agent.agent_role} · {agent.model}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* User Detail */}
          {userDetail && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card gradient>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {userDetail.username}'s Usage
                    </h3>
                    <p className="text-sm text-obsidian-400">{userDetail.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setUserDetail(null);
                    }}
                    className="text-sm text-obsidian-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-obsidian-800/30">
                    <p className="text-sm text-obsidian-400">Total Cost</p>
                    <p className="text-xl font-bold text-gold-400">
                      {formatCurrency(userDetail.total_cost_usd)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-obsidian-800/30">
                    <p className="text-sm text-obsidian-400">Total Tokens</p>
                    <p className="text-xl font-bold text-white">
                      {formatNumber(userDetail.total_tokens)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-obsidian-800/30">
                    <p className="text-sm text-obsidian-400">Requests</p>
                    <p className="text-xl font-bold text-white">
                      {userDetail.request_count}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-obsidian-400 mb-2">By Model</h4>
                    <div className="space-y-2">
                      {Object.entries(userDetail.usage_by_model || {}).map(([model, data]: [string, any]) => (
                        <div key={model} className="flex justify-between p-2 rounded-lg bg-obsidian-800/50">
                          <span className="text-white">{model}</span>
                          <span className="text-gold-400">{formatCurrency(data.cost_usd)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-obsidian-400 mb-2">By Agent</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(userDetail.usage_by_agent || []).map((agent: any) => (
                        <div key={agent.agent_id} className="flex justify-between p-2 rounded-lg bg-obsidian-800/50">
                          <span className="text-white">{agent.agent_name}</span>
                          <span className="text-gold-400">{formatCurrency(agent.cost_usd)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Model Pricing Reference */}
          <Card className="mt-6">
            <h3 className="text-lg font-semibold text-white mb-4">Model Pricing Reference</h3>
            <p className="text-sm text-obsidian-400 mb-4">Prices per 1,000 tokens (USD)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(overview.model_pricing || {}).map(([model, pricing]) => (
                <div key={model} className="p-3 rounded-xl bg-obsidian-800/30">
                  <p className="text-sm font-medium text-white mb-1">{model}</p>
                  <p className="text-xs text-obsidian-400">
                    In: ${pricing.prompt.toFixed(4)}
                  </p>
                  <p className="text-xs text-obsidian-400">
                    Out: ${pricing.completion.toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card className="text-center py-12">
          <DollarSign className="w-12 h-12 text-obsidian-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No billing data</h3>
          <p className="text-obsidian-400">
            Usage data will appear once users start using the board
          </p>
        </Card>
      )}
    </Layout>
  );
}

