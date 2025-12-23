import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api, { setAuthToken } from '../api/axios';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  company_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  hired_agents: string[];
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateHiredAgents: (agents: string[]) => void;
  setHasHydrated: (state: boolean) => void;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  company_name?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ hasHydrated: state });
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/api/auth/login', { username, password });
          const { access_token } = response.data;
          
          // Set token in axios immediately so subsequent calls work
          setAuthToken(access_token);
          
          // Fetch user data with the new token
          const userResponse = await api.get('/api/auth/me');
          
          // Set everything at once in the store
          set({ 
            token: access_token, 
            isAuthenticated: true,
            user: userResponse.data 
          });
        } catch (error) {
          setAuthToken(null);
          set({ token: null, isAuthenticated: false, user: null });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          await api.post('/api/auth/register', data);
          // After registration, log in automatically
          await get().login(data.username, data.password);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        setAuthToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        const token = get().token;
        if (!token) return;

        try {
          const response = await api.get('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          set({ user: response.data, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      updateHiredAgents: (agents: string[]) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, hired_agents: agents } });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        token: state.token, 
        isAuthenticated: state.isAuthenticated,
        user: state.user 
      }),
      onRehydrateStorage: () => (state) => {
        // Restore token to axios after page reload
        if (state?.token) {
          setAuthToken(state.token);
        }
        state?.setHasHydrated(true);
      },
    }
  )
);
