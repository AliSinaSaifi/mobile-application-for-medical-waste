import React from 'react';
import { NativeModules, Platform, StatusBar as NativeStatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || 'http://192.168.44.142:5176';

export default function App() {
  const androidTopInset = Platform.OS === 'android' ? (NativeStatusBar.currentHeight || 0) : 0;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: androidTopInset }]}>
      <StatusBar style="dark" translucent={false} />
      <WebView
        style={styles.webview}
        source={{ uri: WEB_APP_URL }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        originWhitelist={['*']}
        renderError={() => (
          <View style={styles.errorWrap}>
            <Text style={styles.errorTitle}>Cannot open MedWaste UI</Text>
            <Text style={styles.errorText}>Make sure the web app is running at:</Text>
            <Text style={styles.url}>{WEB_APP_URL}</Text>
            <Text style={styles.errorHint}>Start it with: npm run dev -- --host</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorText: {
    fontSize: 14,
    color: '#334155',
  },
  errorHint: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  url: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
});
