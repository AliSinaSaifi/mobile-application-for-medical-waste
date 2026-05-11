import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginRequest, registerRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const [token, email, role, fullName] = await AsyncStorage.multiGet([
          'mw_token',
          'mw_user',
          'mw_role',
          'mw_name',
        ]);
        const tokenVal = token[1];
        const emailVal = email[1];
        const roleVal = role[1];
        const nameVal = fullName[1];

        if (tokenVal && emailVal) {
          setUser({ token: tokenVal, email: emailVal, role: roleVal, fullName: nameVal });
        }
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  const login = async (email, password) => {
    const res = await loginRequest(email, password);
    const data = res.data;

    await AsyncStorage.multiSet([
      ['mw_logged_in', 'true'],
      ['mw_token', data.token],
      ['mw_user', data.email],
      ['mw_role', data.role || 'personnel'],
      ['mw_name', data.fullName || data.email.split('@')[0]],
    ]);

    setUser({
      token: data.token,
      email: data.email,
      role: data.role,
      fullName: data.fullName,
    });
  };

  const register = async (fullName, email, password) => {
    return registerRequest(fullName, email, password);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['mw_logged_in', 'mw_token', 'mw_user', 'mw_role', 'mw_name']);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
