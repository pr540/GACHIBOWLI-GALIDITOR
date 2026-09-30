import Constants from "expo-constants";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const host = Constants.expoConfig?.hostUri?.split(":")[0];
const webUrl = process.env.EXPO_PUBLIC_WEB_URL ?? (host ? `http://${host}:3000` : null);

export default function App() {
  const [failed, setFailed] = useState(false);

  if (!webUrl) {
    return (
      <View style={styles.message}>
        <Text style={styles.title}>Expo connection unavailable</Text>
        <Text style={styles.body}>Start Expo with LAN access or set EXPO_PUBLIC_WEB_URL.</Text>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.message}>
        <Text style={styles.title}>Could not reach GG SplitOps</Text>
        <Text style={styles.body}>Check that the web server is running and your phone is on the same Wi-Fi.</Text>
        <Text accessibilityRole="button" onPress={() => setFailed(false)} style={styles.retry}>
          Retry
        </Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ uri: webUrl }}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      startInLoadingState
      onError={() => setFailed(true)}
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#d95838" />
        </View>
      )}
      style={styles.webview}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
  loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  message: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "#f8f7f2" },
  title: { color: "#202522", fontSize: 22, fontWeight: "600" },
  body: { marginTop: 10, color: "#5a625d", fontSize: 16, lineHeight: 23 },
  retry: { marginTop: 20, color: "#b63d26", fontSize: 16, fontWeight: "600" },
});