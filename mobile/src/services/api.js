import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('mw_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const loginRequest = (email, password) =>
  api.post('/api/auth/login', { email, password });

export const registerRequest = (fullName, username, email, password, phoneNumber) =>
  api.post('/api/auth/register', { fullName, username, email, password, phoneNumber });

export const sendAuthOtpRequest = (phoneNumber, email) =>
  api.post('/api/auth/send-otp', { phoneNumber, email });

export const verifyAuthOtpRequest = (phoneNumber, email, code) =>
  api.post('/api/auth/verify-otp', { phoneNumber, email, code });

export default api;
