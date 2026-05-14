import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { sendAuthOtpRequest } from '../services/api';

const RESEND_COOLDOWN_SEC = 60;

export default function RegisterScreen({ navigation }) {
  const { register, completeRegisterVerification } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const onSubmitForm = async () => {
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!/^[A-Za-z0-9_-]{3,30}$/.test(username)) {
      setError('Username must be 3-30 characters and only contain letters, numbers, underscores, or hyphens.');
      return;
    }

    setLoading(true);
    try {
      await register(fullName.trim(), username.trim(), email.trim(), password, phoneNumber.trim());
      setStep('verify');
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setSuccess('Enter the code sent to your phone.');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    setError('');
    setVerifyLoading(true);
    try {
      await completeRegisterVerification(phoneNumber.trim(), email.trim(), otp);
      navigation.replace('Home');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setError('');
    setResendLoading(true);
    try {
      await sendAuthOtpRequest(phoneNumber.trim(), email.trim());
      setSuccess('A new code was sent.');
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register a new MedWaste account</Text>

        {step === 'form' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#94A3B8"
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone (E.164, e.g. +77051234567)"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </>
        )}

        {step === 'verify' && (
          <>
            <Text style={styles.hint}>Enter the 6-digit code sent to {phoneNumber}</Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
            />
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!success && <Text style={styles.success}>{success}</Text>}

        {step === 'form' && (
          <Pressable style={styles.button} onPress={onSubmitForm} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </Pressable>
        )}

        {step === 'verify' && (
          <>
            <Pressable style={styles.button} onPress={onVerify} disabled={verifyLoading || otp.length !== 6}>
              {verifyLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & continue</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.button, styles.buttonGhost]}
              onPress={onResend}
              disabled={resendCooldown > 0 || resendLoading}
            >
              {resendLoading ? (
                <ActivityIndicator color="#60A5FA" />
              ) : (
                <Text style={styles.buttonGhostText}>
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                </Text>
              )}
            </Pressable>
          </>
        )}

        <View style={styles.row}>
          <Text style={styles.muted}>Already have an account?</Text>
          <Pressable onPress={() => navigation.replace('Login')}>
            <Text style={styles.link}> Log In</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 32, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#94A3B8', marginBottom: 24 },
  hint: { color: '#94A3B8', marginBottom: 12, textAlign: 'center' },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 14,
    backgroundColor: '#0F172A',
    marginBottom: 14,
  },
  error: { color: '#EF4444', marginBottom: 10 },
  success: { color: '#22C55E', marginBottom: 10 },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    marginTop: 4,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 10,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonGhostText: { color: '#60A5FA', fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  muted: { color: '#94A3B8' },
  link: { color: '#60A5FA', fontWeight: '700' },
});
