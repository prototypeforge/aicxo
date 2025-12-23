import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Building, Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';

export default function Settings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.put('/api/auth/me', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success('Password updated successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update password');
    } finally {
      setLoading(false);
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
          Settings
        </h1>
        <p className="text-obsidian-400 mt-2">
          Manage your account and preferences
        </p>
      </motion.div>

      <div className="max-w-2xl space-y-6">
        {/* Profile Info */}
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-sapphire-500/20">
              <User className="w-6 h-6 text-sapphire-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile Information</h2>
              <p className="text-sm text-obsidian-400">Your account details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-obsidian-400 mb-1">
                  Username
                </label>
                <p className="text-white">{user?.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-obsidian-400 mb-1">
                  Email
                </label>
                <p className="text-white">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-obsidian-400 mb-1">
                  Full Name
                </label>
                <p className="text-white">{user?.full_name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-obsidian-400 mb-1">
                  Company
                </label>
                <p className="text-white">{user?.company_name || '-'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-obsidian-400 mb-1">
                Account Type
              </label>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user?.is_admin
                    ? 'bg-gold-500/20 text-gold-400'
                    : 'bg-sapphire-500/20 text-sapphire-400'
                }`}
              >
                {user?.is_admin ? 'Administrator' : 'User'}
              </span>
            </div>
          </div>
        </Card>

        {/* Board Summary */}
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-gold-500/20">
              <Building className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Your Board</h2>
              <p className="text-sm text-obsidian-400">Currently hired executives</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-obsidian-800/30">
            <div>
              <p className="text-2xl font-bold text-white">
                {user?.hired_agents?.length || 0}
              </p>
              <p className="text-sm text-obsidian-400">Board Members</p>
            </div>
            <a
              href="/board"
              className="text-sm text-gold-400 hover:text-gold-300"
            >
              Manage Board →
            </a>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-red-500/20">
              <Lock className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Change Password</h2>
              <p className="text-sm text-obsidian-400">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordData.current_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, current_password: e.target.value })
              }
              required
            />
            <Input
              label="New Password"
              type="password"
              value={passwordData.new_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, new_password: e.target.value })
              }
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirm_password: e.target.value })
              }
              required
            />
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4" />
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
}

