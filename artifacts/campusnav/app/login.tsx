import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

const LOGO = require("../assets/images/cmpslogo.png");
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

function GoogleSignInButton({
  disabled,
  onProfile,
  onError,
}: {
  disabled: boolean;
  onProfile: (profile: { email: string; name: string; picture?: string }, accessToken: string) => void;
  onError: (message: string) => void;
}) {
  const redirectUri = makeRedirectUri({
    native: "https://auth.expo.io/@kathyjun18/campusnav",
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    redirectUri,
  });
  const callbacks = React.useRef({ onProfile, onError });
  callbacks.current = { onProfile, onError };

  useEffect(() => {
    if (response?.type !== "success") {
      if (response?.type === "error") callbacks.current.onError("Google sign-in was cancelled or failed.");
      return;
    }

    const accessToken = response.authentication?.accessToken;
    if (!accessToken) {
      callbacks.current.onError("Google did not return an access token.");
      return;
    }

    fetch("https://www.googleapis.com/userinfo/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (result) => {
        if (!result.ok) throw new Error("Could not read Google profile.");
        const profile = await result.json();
        if (!profile.email?.toLowerCase().endsWith("@gmail.com")) {
          throw new Error("Log-in using your google accounts are allowed.");
        }
        callbacks.current.onProfile({
          email: profile.email,
          name: profile.name || profile.email.split("@")[0],
          picture: profile.picture,
        }, accessToken);
      })
      .catch((reason: unknown) => {
        callbacks.current.onError(reason instanceof Error ? reason.message : "Google sign-in failed.");
      });
  }, [response]);

  return (
    <Pressable
      disabled={disabled || !request}
      onPress={() => promptAsync()}
      style={[styles.button, { backgroundColor: "#800000", opacity: disabled || !request ? 0.65 : 1 }]}
    >
      <Text style={styles.buttonText}>Continue with Google</Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const { signIn } = useAuth();
  const [googleProfile, setGoogleProfile] = useState<{
    email: string;
    name: string;
    picture?: string;
  } | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleProfile = async (
    profile: { email: string; name: string; picture?: string },
    accessToken: string,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL.replace(/\/$/, "")}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 404) {
        setGoogleProfile(profile);
        setGoogleAccessToken(accessToken);
        return;
      }
      if (!response.ok) throw new Error(data?.error || "Could not sign in with Google.");

      await signIn({
        email: data.email,
        name: data.name,
        username: data.username,
        picture: data.picture ?? profile.picture,
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not sign in with Google.");
    } finally {
      setBusy(false);
    }
  };

  const finishRegistration = async () => {
    if (!googleProfile || !googleAccessToken || username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError("Username can only contain letters, numbers, and underscores.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API_URL.replace(/\/$/, "")}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: googleAccessToken, username: username.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not save your profile.");
      await signIn({
        email: data.email,
        name: data.name || googleProfile.name,
        username: data.username,
        picture: data.picture ?? googleProfile.picture,
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  const hasClientId = GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Image source={LOGO} style={styles.logo} />
        <Text style={[styles.title, { color: colors.foreground }]}>Welcome to CampusNav</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in with your Gmail account to explore campus.</Text>

        {googleProfile ? (
          <View style={styles.form}>
            <Text style={[styles.signedIn, { color: colors.primary }]}>{googleProfile.email}</Text>
            <Text style={[styles.label, { color: colors.foreground }]}>Choose a username</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. campuswalker"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                setError(null);
              }}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Pressable
              disabled={busy}
              onPress={finishRegistration}
              style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 }]}
            >
              {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Continue to CampusNav</Text>}
            </Pressable>
          </View>
        ) : (
          hasClientId ? (
            <GoogleSignInButton
              disabled={busy}
              onProfile={handleGoogleProfile}
              onError={(message) => {
                setError(message);
                setBusy(false);
              }}
            />
          ) : null
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {!hasClientId && <Text style={[styles.hint, { color: colors.mutedForeground }]}>Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Google Sign-In.</Text>}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>Continue with Google.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24 },
  panel: { width: "100%", maxWidth: 430, alignSelf: "center", borderWidth: 1, borderRadius: 20, padding: 24, gap: 12 },
  logo: { width: 72, height: 72, borderRadius: 18, alignSelf: "center", marginBottom: 8 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8 },
  form: { gap: 10 },
  signedIn: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 4 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  button: { minHeight: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 },
  buttonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  error: { color: "#C53030", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  hint: { fontSize: 12, lineHeight: 17, textAlign: "center" },
  footer: { fontSize: 12, textAlign: "center", marginTop: 8 },
});