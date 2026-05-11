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

export const registerRequest = (fullName, email, password) =>
  api.post('/api/auth/register', { fullName, email, password });

export default api;
