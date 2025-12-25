import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Key, Save, Eye, EyeOff, RefreshCw, Sliders, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import api from '../../api/axios';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTokenLimits, setSavingTokenLimits] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [agentMaxTokens, setAgentMaxTokens] = useState('2000');
  const [chairMaxTokens, setChairMaxTokens] = useState('3000');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/admin/settings');
      setSettings(response.data);
      // Set token limits from settings
      if (response.data.agent_max_tokens) {
        setAgentMaxTokens(response.data.agent_max_tokens);
      }
      if (response.data.chair_max_tokens) {
        setChairMaxTokens(response.data.chair_max_tokens);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setSaving(true);
    try {
      await api.put('/api/admin/settings', { openai_api_key: apiKey });
      toast.success('OpenAI API key saved successfully');
      setApiKey('');
      fetchSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTokenLimits = async () => {
    const agentTokens = parseInt(agentMaxTokens);
    const chairTokens = parseInt(chairMaxTokens);

    if (isNaN(agentTokens) || agentTokens < 500 || agentTokens > 16000) {
      toast.error('Agent max tokens must be between 500 and 16000');
      return;
    }
    if (isNaN(chairTokens) || chairTokens < 500 || chairTokens > 16000) {
      toast.error('Chair max tokens must be between 500 and 16000');
      return;
    }

    setSavingTokenLimits(true);
    try {
      await api.put('/api/admin/settings', {
        agent_max_tokens: agentTokens.toString(),
        chair_max_tokens: chairTokens.toString()
      });
      toast.success('Token limits saved successfully');
      fetchSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save token limits');
    } finally {
      setSavingTokenLimits(false);
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-obsidian-700">
            <Settings className="w-6 h-6 text-obsidian-300" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
            System Settings
          </h1>
        </div>
        <p className="text-obsidian-400">
          Configure global application settings
        </p>
      </motion.div>

      <div className="max-w-2xl space-y-6">
        {/* OpenAI API Key */}
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-green-500/20">
              <Key className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">OpenAI API Key</h2>
              <p className="text-sm text-obsidian-400">
                Required for AI agent reasoning capabilities
              </p>
            </div>
          </div>

          {/* Current Status */}
          <div className="mb-6 p-4 rounded-xl bg-obsidian-800/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-obsidian-400 mb-1">Current API Key</p>
                {settings.openai_api_key ? (
                  <p className="text-white font-mono">{settings.openai_api_key}</p>
                ) : (
                  <p className="text-red-400">Not configured</p>
                )}
              </div>
              {settings.openai_api_key && (
                <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                  Configured
                </span>
              )}
            </div>
          </div>

          {/* Update API Key */}
          <div className="space-y-4">
            <div className="relative">
              <Input
                label="New API Key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-9 text-obsidian-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <Button onClick={handleSaveApiKey} loading={saving}>
              <Save className="w-4 h-4" />
              Save API Key
            </Button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-sapphire-500/10 border border-sapphire-500/20">
            <p className="text-sm text-sapphire-300">
              <strong>Note:</strong> The OpenAI API key is used for all AI agent reasoning.
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sapphire-400 underline hover:text-sapphire-300"
              >
                platform.openai.com
              </a>
            </p>
          </div>
        </Card>

        {/* Token Limits */}
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-amber-500/20">
              <Sliders className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Token Limits</h2>
              <p className="text-sm text-obsidian-400">
                Configure max completion tokens for AI responses
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-obsidian-300 mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Agent Max Tokens
                </div>
              </label>
              <input
                type="number"
                min="500"
                max="16000"
                step="100"
                value={agentMaxTokens}
                onChange={(e) => setAgentMaxTokens(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-sapphire-400/50 focus:border-sapphire-400/50"
              />
              <p className="mt-1 text-xs text-obsidian-500">
                Max tokens for individual board member opinions (default: 2000)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-obsidian-300 mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Chair Max Tokens
                </div>
              </label>
              <input
                type="number"
                min="500"
                max="16000"
                step="100"
                value={chairMaxTokens}
                onChange={(e) => setChairMaxTokens(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-sapphire-400/50 focus:border-sapphire-400/50"
              />
              <p className="mt-1 text-xs text-obsidian-500">
                Max tokens for Chair's summary and recommendation (default: 3000)
              </p>
            </div>

            <Button onClick={handleSaveTokenLimits} loading={savingTokenLimits}>
              <Save className="w-4 h-4" />
              Save Token Limits
            </Button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm text-amber-300">
              <strong>Important:</strong> Higher token limits allow for more detailed responses but cost more.
              If you see "context_length_exceeded" errors, reduce these limits or use a model with a larger context window.
              The total context = prompt tokens + completion tokens must fit within the model's limit
              (e.g., GPT-4o-mini has 8,192 tokens, GPT-4o has 128,000 tokens).
            </p>
          </div>
        </Card>

        {/* System Info */}
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-obsidian-700">
              <RefreshCw className="w-6 h-6 text-obsidian-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">System Information</h2>
              <p className="text-sm text-obsidian-400">
                Application status and version
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-obsidian-800/30">
              <p className="text-sm text-obsidian-400">Version</p>
              <p className="text-white font-mono">1.0.0</p>
            </div>
            <div className="p-4 rounded-xl bg-obsidian-800/30">
              <p className="text-sm text-obsidian-400">Status</p>
              <p className="text-green-400">Healthy</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

