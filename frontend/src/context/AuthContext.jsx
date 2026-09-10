import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user_profile');
    const token = localStorage.getItem('access_token');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user_profile');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, roleHint = null) => {
    const res = await apiClient.post('/auth/login', {
      email,
      password,
      role_hint: roleHint
    });

    const userProfile = {
      id: res.user_id,
      name: res.name,
      email: res.email,
      role: res.role,
      batch_id: res.batch_id,
      batch_year: res.batch_year
    };

    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
    setUser(userProfile);
    return userProfile;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_profile');
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const profile = await apiClient.get('/auth/me');
      const updated = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        batch_id: profile.batch_id,
        batch_year: profile.batch_year
      };
      localStorage.setItem('user_profile', JSON.stringify(updated));
      setUser(updated);
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
