"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';

interface User {
  userId: string;
  username: string;
  email: string;
  role: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async (): Promise<User | null> => {
    try {
		const response = await axios.get(`${process.env.
			NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me`)
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    const userData = await fetchUser();
    setUser(userData);
    setLoading(false);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.post(`${process.env.
		NEXT_PUBLIC_BACKEND_URL}/api/v1/signin`, {
        email,
        password,
      });

      if (response.status === 200) {
        // Fetch user data after successful login
        await refreshUser();
        
        // Redirect based on user role
        if (response.data.role === "Admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/user/dashboard");
        }
        
        return { success: true };
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error?.response?.data?.error || 'An error occurred during sign in';
      return { success: false, error: errorMessage };
    }
    
    return { success: false, error: 'Login failed' };
  };

  const logout = async () => {
    try {
      await axios.post(`${process.env.
		NEXT_PUBLIC_BACKEND_URL}/api/v1/signout`)
      setUser(null);
      router.push('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if logout fails, clear local state
      setUser(null);
      router.push('/signin');
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 