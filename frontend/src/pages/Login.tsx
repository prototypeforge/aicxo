import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Crown, 
  ArrowRight, 
  Users, 
  Brain, 
  FileText, 
  Sparkles,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import Button from '../components/Button';
import Input from '../components/Input';

const features = [
  {
    icon: Users,
    title: 'AI Executive Board',
    description: 'Access a team of AI executives - CFO, CTO, CPO, COO, and more - each with unique expertise.'
  },
  {
    icon: Brain,
    title: 'Strategic Insights',
    description: 'Get comprehensive analysis from multiple executive perspectives on any business challenge.'
  },
  {
    icon: FileText,
    title: 'Complete Records',
    description: 'Access detailed meeting notes with individual opinions and synthesized recommendations.'
  },
  {
    icon: TrendingUp,
    title: 'Data-Driven Decisions',
    description: 'Upload financial statements and documents for context-aware strategic advice.'
  }
];

const executives = [
  { role: 'CFO', name: 'Finance', color: 'from-emerald-400 to-emerald-600' },
  { role: 'CTO', name: 'Technology', color: 'from-blue-400 to-blue-600' },
  { role: 'CPO', name: 'Product', color: 'from-violet-400 to-violet-600' },
  { role: 'COO', name: 'Operations', color: 'from-orange-400 to-orange-600' },
  { role: 'CHRO', name: 'People', color: 'from-pink-400 to-pink-600' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      toast.success('Welcome back!');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Landing Page / Commercial */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-obsidian-950 via-obsidian-900 to-obsidian-950" />
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255, 180, 32, 0.12) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(59, 110, 246, 0.1) 0%, transparent 40%)',
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12 w-full">
          {/* Logo & Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/25">
                <Crown className="w-7 h-7 text-obsidian-950" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-white">CxO Ninja</h1>
                <p className="text-obsidian-400 text-sm">Your Digital C-Suite</p>
              </div>
            </div>
            
            <h2 className="font-display text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Strategic Decisions,<br />
              <span className="text-gradient">Powered by AI Executives</span>
            </h2>
            <p className="text-obsidian-300 text-lg max-w-xl leading-relaxed">
              Consult with a team of AI-powered executives. Each forms their own opinion 
              based on expertise, then a Chair synthesizes all perspectives into unified recommendations.
            </p>
          </motion.div>

          {/* Executive Avatars */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-10"
          >
            <p className="text-obsidian-400 text-sm mb-4 uppercase tracking-wider font-medium">Your AI Executive Team</p>
            <div className="flex gap-3 flex-wrap">
              {executives.map((exec, index) => (
                <motion.div
                  key={exec.role}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-obsidian-800/50 border border-obsidian-700/50"
                >
                  <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${exec.color}`} />
                  <span className="text-white font-medium text-sm">{exec.role}</span>
                  <span className="text-obsidian-400 text-xs">· {exec.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 gap-4"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="p-5 rounded-2xl bg-obsidian-800/30 border border-obsidian-700/40 hover:border-gold-500/30 hover:bg-obsidian-800/50 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400/20 to-gold-600/10 flex items-center justify-center mb-3 group-hover:from-gold-400/30 group-hover:to-gold-600/20 transition-all">
                  <feature.icon className="w-5 h-5 text-gold-400" />
                </div>
                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                <p className="text-obsidian-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-10 pt-8 border-t border-obsidian-800/50"
          >
            <div className="flex items-center gap-8 text-sm">
              <div className="flex items-center gap-2 text-obsidian-400">
                <Shield className="w-4 h-4 text-gold-400" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2 text-obsidian-400">
                <Zap className="w-4 h-4 text-gold-400" />
                <span>Real-time Analysis</span>
              </div>
              <div className="flex items-center gap-2 text-obsidian-400">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <span>GPT-4 Powered</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-gold-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-sapphire-500/5 rounded-full blur-3xl" />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-2/5 flex flex-col relative">
        {/* Background for mobile and right panel */}
        <div className="absolute inset-0 bg-obsidian-950" />
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255, 180, 32, 0.08) 0%, transparent 50%)',
          }}
        />
        
        {/* Login Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 shadow-xl shadow-gold-500/30 mb-4"
              >
                <Crown className="w-8 h-8 text-obsidian-950" />
              </motion.div>
              <h1 className="font-display text-2xl font-bold text-white">CxO Ninja</h1>
              <p className="text-obsidian-400 mt-1 text-sm">Your Digital C-Suite</p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block mb-8">
              <h2 className="font-display text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p className="text-obsidian-400">Sign in to access your executive board</p>
            </div>

            {/* Login Form */}
            <div className="glass rounded-2xl p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-obsidian-400 text-sm">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-gold-400 hover:text-gold-300 font-medium transition-colors">
                    Create one
                  </Link>
                </p>
              </div>
            </div>

            {/* Mobile Feature Highlights */}
            <div className="lg:hidden mt-8 text-center">
              <p className="text-obsidian-500 text-xs mb-4">Trusted by business leaders worldwide</p>
              <div className="flex justify-center gap-6 text-xs text-obsidian-400">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-gold-400" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-gold-400" />
                  <span>Fast</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                  <span>AI-Powered</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-8 py-4 text-center">
          <p className="text-obsidian-600 text-xs">
            © {new Date().getFullYear()} CxO Ninja. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
