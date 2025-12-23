import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Shield, User, Trash2, Check, X, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Button from '../../components/Button';
import api from '../../api/axios';
import { User as UserType } from '../../types';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: number, isAdmin: boolean) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { is_admin: !isAdmin });
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_admin: !isAdmin } : u)));
      toast.success(`User ${!isAdmin ? 'promoted to' : 'removed from'} admin`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const toggleActive = async (userId: number, isActive: boolean) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { is_active: !isActive });
      setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: !isActive } : u)));
      toast.success(`User ${!isActive ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
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
          <div className="p-2 rounded-lg bg-sapphire-500/20">
            <Shield className="w-6 h-6 text-sapphire-400" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
            User Management
          </h1>
        </div>
        <p className="text-obsidian-400">
          Manage user accounts and permissions
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl loading-shimmer bg-obsidian-800/30" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        user.is_admin ? 'bg-gold-500/20' : 'bg-sapphire-500/20'
                      }`}
                    >
                      {user.is_admin ? (
                        <Crown className="w-6 h-6 text-gold-400" />
                      ) : (
                        <User className="w-6 h-6 text-sapphire-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white truncate">
                          {user.full_name || user.username}
                        </h3>
                        {user.is_admin && (
                          <span className="px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 text-xs">
                            Admin
                          </span>
                        )}
                        {!user.is_active && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-obsidian-400 truncate">{user.email}</p>
                      <p className="text-xs text-obsidian-500">
                        Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        {user.company_name && ` · ${user.company_name}`}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-white">{user.hired_agents?.length || 0}</p>
                      <p className="text-xs text-obsidian-400">Agents</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={user.is_admin ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => toggleAdmin(user.id, user.is_admin)}
                    >
                      {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                    </Button>
                    <Button
                      variant={user.is_active ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => toggleActive(user.id, user.is_active)}
                    >
                      {user.is_active ? (
                        <>
                          <X className="w-4 h-4" /> Deactivate
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Activate
                        </>
                      )}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => deleteUser(user.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </Layout>
  );
}

