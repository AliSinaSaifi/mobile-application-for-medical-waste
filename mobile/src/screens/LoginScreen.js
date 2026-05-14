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

const RESEND_COOLDOWN_SEC = 60;

export default function LoginScreen({ navigation }) {
  const { login, sendLoginOtp, verifyLoginOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('credentials');
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const onSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.needPhoneVerification) {
        setPendingEmail(result.email);
        setStep('otp');
        setOtp('');
        try {
          await sendLoginOtp(result.email);
          setResendCooldown(RESEND_COOLDOWN_SEC);
        } catch (sendErr) {
          setError(sendErr.response?.data?.error || 'Could not send verification code.');
        }
        return;
      }
      navigation.replace('Home');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    setError('');
    setVerifyLoading(true);
    try {
      await verifyLoginOtp(pendingEmail, otp);
      navigation.replace('Home');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const onResend = async () => {
    if (resendCooldown > 0 || resendLoading || !pendingEmail) return;
    setError('');
    setResendLoading(true);
    try {
      await sendLoginOtp(pendingEmail);
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
        <Text style={styles.title}>MedWaste</Text>
        <Text style={styles.subtitle}>
          {step === 'credentials' ? 'Sign in to your account' : 'Verify your phone to finish signing in.'}
        </Text>

        {step === 'credentials' && (
          <>
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
          </>
        )}

        {step === 'otp' && (
          <>
            <Text style={styles.hint}>Code sent for {pendingEmail}</Text>
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

        {step === 'credentials' && (
          <Pressable style={styles.button} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
          </Pressable>
        )}

        {step === 'otp' && (
          <>
            <Pressable style={styles.button} onPress={onVerify} disabled={verifyLoading || otp.length !== 6}>
              {verifyLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & sign in</Text>
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
            <Pressable
              style={[styles.button, styles.buttonGhost]}
              onPress={() => {
                setStep('credentials');
                setOtp('');
                setPendingEmail('');
                setError('');
                setResendCooldown(0);
              }}
            >
              <Text style={styles.buttonGhostText}>Back</Text>
            </Pressable>
          </>
        )}

        <View style={styles.row}>
          <Text style={styles.muted}>No account?</Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}> Register</Text>
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
