import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginRequest,
  registerRequest,
  sendAuthOtpRequest,
  verifyAuthOtpRequest,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const [token, email, role, fullName, username] = await AsyncStorage.multiGet([
          'mw_token',
          'mw_user',
          'mw_role',
          'mw_name',
          'mw_username',
        ]);
        const tokenVal = token[1];
        const emailVal = email[1];
        const roleVal = role[1];
        const nameVal = fullName[1];

        if (tokenVal && emailVal) {
          setUser({
            token: tokenVal,
            email: emailVal,
            role: roleVal,
            fullName: nameVal,
            username: username[1],
          });
        }
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  const persistSession = async (data) => {
    await AsyncStorage.multiSet([
      ['mw_logged_in', 'true'],
      ['mw_token', data.token],
      ['mw_user', data.email],
      ['mw_role', data.role || 'personnel'],
      ['mw_name', data.fullName || data.email.split('@')[0]],
      ['mw_username', data.username || ''],
    ]);
    setUser({
      token: data.token,
      email: data.email,
      role: data.role,
      fullName: data.fullName,
      username: data.username,
    });
  };

  const login = async (email, password) => {
    try {
      const res = await loginRequest(email, password);
      const data = res.data;
      await persistSession(data);
      return { ok: true };
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code === 'PHONE_NOT_VERIFIED') {
        return {
          ok: false,
          needPhoneVerification: true,
          email: err.response.data.email || email,
        };
      }
      throw err;
    }
  };

  const register = async (fullName, username, email, password, phoneNumber) =>
    registerRequest(fullName, username, email, password, phoneNumber);

  const sendLoginOtp = async (email) => {
    await sendAuthOtpRequest(undefined, email);
  };

  const verifyLoginOtp = async (email, code) => {
    const res = await verifyAuthOtpRequest(undefined, email, code);
    await persistSession(res.data);
  };

  const completeRegisterVerification = async (phoneNumber, email, code) => {
    const res = await verifyAuthOtpRequest(phoneNumber, email, code);
    await persistSession(res.data);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['mw_logged_in', 'mw_token', 'mw_user', 'mw_role', 'mw_name', 'mw_username']);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      sendLoginOtp,
      verifyLoginOtp,
      completeRegisterVerification,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
