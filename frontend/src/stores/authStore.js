import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const { data } = await api.post('/auth/login', { email, password });
          
          set({
            user: data.usuario,
            token: data.token,
            isAuthenticated: true,
          });

          localStorage.setItem('token', data.token);
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.error || 'Error al iniciar sesión',
          };
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          localStorage.removeItem('token');
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }

        try {
          const { data } = await api.get('/auth/me');
          set({
            user: data.usuario,
            token,
            isAuthenticated: true,
          });
          return true;
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          localStorage.removeItem('token');
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
