import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Cpu, 
  User,
  Calendar,
  BarChart3
} from 'lucide-react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import api from '../api/axios';

interface UsageSummary {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  request_count: number;
  period_days: number;
  usage_by_model: Record<string, { tokens: number; cost_usd: number; requests: number }>;
  usage_by_agent: Array<{
    agent_id: string;
    agent_name: string;
    agent_role: string;
    model: string;
    total_tokens: number;
    total_cost_usd: number;
    request_count: number;
  }>;
}

export default function Billing() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchUsage();
  }, [days]);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/billing/my-summary?days=${days}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to fetch billing:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
          Usage & Billing
        </h1>
        <p className="text-obsidian-400 mt-2">
          Track your AI token usage and estimated costs
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
      ) : summary ? (
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
                    {formatCurrency(summary.total_cost_usd)}
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
                    {formatNumber(summary.total_tokens)}
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
                    {summary.request_count}
                  </p>
                  <p className="text-sm text-obsidian-400">API Requests</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {summary.request_count > 0
                      ? formatCurrency(summary.total_cost_usd / summary.request_count)
                      : '$0.00'}
                  </p>
                  <p className="text-sm text-obsidian-400">Avg Cost/Request</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Usage by Model */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sapphire-400" />
                Usage by Model
              </h3>
              {Object.keys(summary.usage_by_model).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(summary.usage_by_model).map(([model, data]) => (
                    <div
                      key={model}
                      className="flex items-center justify-between p-3 rounded-xl bg-obsidian-800/30"
                    >
                      <div>
                        <p className="font-medium text-white">{model}</p>
                        <p className="text-sm text-obsidian-400">
                          {formatNumber(data.tokens)} tokens · {data.requests} requests
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-gold-400">
                        {formatCurrency(data.cost_usd)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-obsidian-400 text-center py-8">No usage data</p>
              )}
            </Card>

            {/* Usage by Agent */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gold-400" />
                Usage by Agent
              </h3>
              {summary.usage_by_agent.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {summary.usage_by_agent.map((agent) => (
                    <div
                      key={agent.agent_id}
                      className="flex items-center justify-between p-3 rounded-xl bg-obsidian-800/30"
                    >
                      <div>
                        <p className="font-medium text-white">{agent.agent_name}</p>
                        <p className="text-sm text-obsidian-400">
                          {agent.agent_role} · {agent.model}
                        </p>
                        <p className="text-xs text-obsidian-500">
                          {formatNumber(agent.total_tokens)} tokens · {agent.request_count} requests
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-gold-400">
                        {formatCurrency(agent.total_cost_usd)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-obsidian-400 text-center py-8">No usage data</p>
              )}
            </Card>
          </div>

          {/* Token Breakdown */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Token Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-obsidian-800/30">
                <p className="text-sm text-obsidian-400 mb-1">Prompt Tokens</p>
                <p className="text-xl font-bold text-white">
                  {formatNumber(summary.total_prompt_tokens)}
                </p>
                <p className="text-xs text-obsidian-500">Input to AI models</p>
              </div>
              <div className="p-4 rounded-xl bg-obsidian-800/30">
                <p className="text-sm text-obsidian-400 mb-1">Completion Tokens</p>
                <p className="text-xl font-bold text-white">
                  {formatNumber(summary.total_completion_tokens)}
                </p>
                <p className="text-xs text-obsidian-500">Output from AI models</p>
              </div>
              <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/20">
                <p className="text-sm text-gold-400 mb-1">Estimated Monthly Cost</p>
                <p className="text-xl font-bold text-gold-400">
                  {formatCurrency((summary.total_cost_usd / days) * 30)}
                </p>
                <p className="text-xs text-obsidian-500">Based on current usage</p>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="text-center py-12">
          <DollarSign className="w-12 h-12 text-obsidian-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No usage data</h3>
          <p className="text-obsidian-400">
            Start using board meetings to see your usage statistics
          </p>
        </Card>
      )}
    </Layout>
  );
}

