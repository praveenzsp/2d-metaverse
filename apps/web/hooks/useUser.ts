import { useAuth } from '@/contexts/AuthContext';

export const useUser = () => {
  const { user, isAuthenticated, loading } = useAuth();

  return {
    user,
    isAuthenticated,
    loading,
    isAdmin: user?.role === 'Admin',
    isUser: user?.role === 'User',
    userId: user?.userId,
    username: user?.username,
    email: user?.email,
  };
}; 