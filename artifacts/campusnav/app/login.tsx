import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { FontAwesome } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import colorPalettes from "@/constants/colors";
import { getApiBaseUrl } from "@/utils/api";

WebBrowser.maybeCompleteAuthSession();

const LOGO = require("../assets/images/CampusNav.png");
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_SIGN_IN_ENABLED = process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED === "true";
const API_URL = getApiBaseUrl();

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
      style={[styles.button, styles.googleButton, { opacity: disabled || !request ? 0.65 : 1 }]}
    >
      <View style={styles.googleButtonContent}>
        <FontAwesome name="google" size={18} color="#4285F4" />
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </View>
    </Pressable>
  );
}

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const activeColors = useColors();
  const colors = Platform.OS === "web" ? { ...activeColors, ...colorPalettes.light } : activeColors;
  const { signIn, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<"welcome" | "login" | "signup" | "forgot" | "google-signup">("welcome");
  const [googleProfile, setGoogleProfile] = useState<{
    email: string;
    name: string;
    picture?: string;
  } | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetRequested, setResetRequested] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
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
        setMode("google-signup");
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

  const finishGoogleRegistration = async () => {
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

  const postAuth = async (path: string, body: Record<string, string>) => {
    const response = await fetch(`${API_URL.replace(/\/$/, "")}/api/users/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
    return data;
  };

  const handleEmailSignIn = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const user = await postAuth("password/login", { email, password });
      await signIn({ email: user.email, name: user.name, username: user.username, picture: user.picture });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailRegistration = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const user = await postAuth("password/register", { username, email, password });
      await signIn({ email: user.email, name: user.name, username: user.username, picture: user.picture });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await postAuth("password/forgot", { email });
      setResetRequested(true);
      setNotice(data.message || "If an account exists for that email, a reset code has been sent.");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not request a reset code.");
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await postAuth("password/reset", { email, code: resetCode, password });
      setNotice(data.message || "Password updated. You can now sign in.");
      setMode("login");
      setPassword("");
      setResetCode("");
      setResetRequested(false);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not reset your password.");
    } finally {
      setBusy(false);
    }
  };

  const hasClientId = GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID;
  const clearMessages = () => {
    setError(null);
    setNotice(null);
  };

  const renderGoogleButton = () => !GOOGLE_SIGN_IN_ENABLED ? null : hasClientId ? (
    <GoogleSignInButton
      disabled={busy}
      onProfile={handleGoogleProfile}
      onError={(message) => {
        setError(message);
        setBusy(false);
      }}
    />
  ) : (
    <Text style={[styles.hint, { color: colors.mutedForeground }]}>Google sign-in is not configured.</Text>
  );

  const renderDivider = () => !GOOGLE_SIGN_IN_ENABLED ? null : (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>Or</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
    </View>
  );

  const renderFooterLink = (copy: string, action: string, onPress: () => void) => (
    <View style={styles.footerRow}>
      <Text style={[styles.footer, { color: colors.mutedForeground }]}>{copy}</Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={[styles.link, { color: colors.primary }]}>{action}</Text>
      </Pressable>
    </View>
  );

  const renderGuestLink = () => (
    <Pressable onPress={continueAsGuest} hitSlop={8} style={styles.guestLink}>
      <Text style={[styles.link, { color: colors.primary }]}>Continue without signing in or up</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: "#FFCC00" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.screenContent, { padding: isWide ? 32 : 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.authShell, { backgroundColor: colors.card }, isWide ? styles.authShellWide : styles.authShellNarrow]}>
          {isWide && (
            <View style={styles.welcomePanel}>
              <Image source={LOGO} style={styles.welcomeLogo} />
              <Text style={styles.welcomeTitle}>Your Campus, At a Glance</Text>
              <Text style={styles.welcomeSubtitle}>A simpler way to find the places that matter at CTU.</Text>
            </View>
          )}
          <View style={[styles.panel, { backgroundColor: colors.card, width: isWide ? "55%" : "100%", maxWidth: isWide ? undefined : 430 }]}>
          {!isWide && <Image source={LOGO} style={styles.logo} />}

          {mode === "welcome" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Welcome to CampusNav</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Explore campus with a simpler way to find your destination.</Text>
              <Pressable onPress={continueAsGuest} style={[styles.button, { backgroundColor: colors.primary }]}>
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Get Started</Text>
              </Pressable>
              {renderDivider()}
              {renderGoogleButton()}
              {renderFooterLink("New to CampusNav?", "Sign Up", () => { clearMessages(); setMode("signup"); })}
              {renderFooterLink("Already have an account?", "Sign In", () => { clearMessages(); setMode("login"); })}
            </>
          )}

          {mode === "login" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Log in to your account to continue.</Text>
              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="Enter your email"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={(value) => { setEmail(value); clearMessages(); }}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
                <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  value={password}
                  onChangeText={(value) => { setPassword(value); clearMessages(); }}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
                <Pressable onPress={() => { setResetRequested(false); clearMessages(); setMode("forgot"); }} style={styles.forgotLink}>
                  <Text style={[styles.link, { color: colors.primary }]}>Forgot Password?</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={handleEmailSignIn} style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 }]}>
                  {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Sign In</Text>}
                </Pressable>
              </View>
              {renderDivider()}
              {renderGoogleButton()}
              {renderFooterLink("Don't have an account?", "Sign Up", () => { clearMessages(); setMode("signup"); })}
              {renderGuestLink()}
            </>
          )}

          {mode === "signup" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign up to get started with CampusNav.</Text>
              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Choose a username"
                  placeholderTextColor={colors.mutedForeground}
                  value={username}
                  onChangeText={(value) => { setUsername(value); clearMessages(); }}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="Enter your email"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={(value) => { setEmail(value); clearMessages(); }}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
                <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  placeholder="Create a password (8+ characters)"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  value={password}
                  onChangeText={(value) => { setPassword(value); clearMessages(); }}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
                <Pressable disabled={busy} onPress={handleEmailRegistration} style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 }]}>
                  {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Create Account</Text>}
                </Pressable>
              </View>
              {renderDivider()}
              {renderGoogleButton()}
              {renderFooterLink("Already have an account?", "Sign In", () => { clearMessages(); setMode("login"); })}
              {renderGuestLink()}
            </>
          )}

          {mode === "google-signup" && googleProfile && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Choose a username to finish signing up with Google.</Text>
              <View style={styles.form}>
                <Text style={[styles.signedIn, { color: colors.primary }]}>{googleProfile.email}</Text>
                <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Choose a username"
                  placeholderTextColor={colors.mutedForeground}
                  value={username}
                  onChangeText={(value) => { setUsername(value); clearMessages(); }}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                />
                <Pressable disabled={busy} onPress={finishGoogleRegistration} style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 }]}>
                  {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Continue to CampusNav</Text>}
                </Pressable>
              </View>
              {renderFooterLink("Already have an account?", "Sign In", () => { setGoogleProfile(null); setGoogleAccessToken(null); clearMessages(); setMode("login"); })}
            </>
          )}

          {mode === "forgot" && (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>{resetRequested ? "Enter Reset Code" : "Forgot Password?"}</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{resetRequested ? "Enter the 6-digit code sent to your email and choose a new password." : "Enter your registered email to receive a reset code."}</Text>
              <View style={styles.form}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!resetRequested}
                  keyboardType="email-address"
                  placeholder="Enter your email"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={(value) => { setEmail(value); clearMessages(); }}
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, opacity: resetRequested ? 0.7 : 1 }]}
                />
                {resetRequested && <>
                  <Text style={[styles.label, { color: colors.foreground }]}>Reset Code</Text>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={colors.mutedForeground}
                    value={resetCode}
                    onChangeText={(value) => { setResetCode(value); clearMessages(); }}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  />
                  <Text style={[styles.label, { color: colors.foreground }]}>New Password</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="new-password"
                    placeholder="Create a password (8+ characters)"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry
                    value={password}
                    onChangeText={(value) => { setPassword(value); clearMessages(); }}
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  />
                </>}
                <Pressable disabled={busy} onPress={resetRequested ? resetPassword : requestPasswordReset} style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.65 : 1 }]}>
                  {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{resetRequested ? "Reset Password" : "Send Reset Code"}</Text>}
                </Pressable>
                {resetRequested && <Pressable disabled={busy} onPress={requestPasswordReset} style={styles.resendButton}>
                  <Text style={[styles.link, { color: colors.primary }]}>Resend code</Text>
                </Pressable>}
              </View>
              {renderFooterLink("Remember your password?", "Sign In", () => { clearMessages(); setMode("login"); })}
            </>
          )}

          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {notice && <Text style={[styles.notice, { color: colors.primary }]}>{notice}</Text>}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { 
    flexGrow: 1, 
    justifyContent: "center", 
    alignItems: "center" },
  authShell: { 
    width: "100%", 
    overflow: "hidden", 
    borderRadius: 24, 
    boxShadow: "0px 18px 24px rgba(0, 0, 0, 0.16)" },
  authShellWide: { 
    maxWidth: 1100, 
    minHeight: 560, 
    flexDirection: "row" },
  authShellNarrow: { 
    maxWidth: 430 },
  welcomePanel: { 
    width: "45%", 
    minHeight: 560, 
    alignItems: "center", 
    justifyContent: "center", 
    padding: 40, 
    backgroundColor: "#800000" },
  welcomeLogo: { 
    width: 96, 
    height: 96, 
    borderRadius: 24, 
    marginBottom: 28 },
  welcomeTitle: { 
    color: "#FFFFFF", 
    fontSize: 30, 
    fontFamily: "Inter_700Bold", 
    textAlign: "center", 
    marginBottom: 12 },
  welcomeSubtitle: { 
    color: "rgba(255,255,255,0.78)", 
    fontSize: 15, 
    lineHeight: 23, 
    fontFamily: "Inter_400Regular", 
    textAlign: "center", 
    maxWidth: 280 },
  panel: { 
    width: "100%", 
    alignSelf: "center", 
    padding: 36, 
    gap: 12, 
    overflow: "hidden" },
  logo: { 
    width: 72, 
    height: 72, 
    borderRadius: 18, 
    alignSelf: "center", 
    marginBottom: 8 },
  title: { 
    fontSize: 24, 
    fontFamily: "Inter_700Bold", 
    textAlign: "center" },
  subtitle: { 
    fontSize: 14, 
    lineHeight: 21, 
    fontFamily: "Inter_400Regular", 
    textAlign: "center", 
    marginBottom: 8 },
  form: { gap: 10 },
  signedIn: { 
    fontSize: 13, 
    fontFamily: "Inter_500Medium", 
    textAlign: "center", 
    marginBottom: 4 },
  label: { 
    fontSize: 13, 
    fontFamily: "Inter_600SemiBold" },
  input: { 
    height: 48, 
    borderWidth: 1, 
    borderRadius: 10, 
    paddingHorizontal: 14, 
    fontSize: 15, 
    fontFamily: "Inter_400Regular" },
  button: { 
    minHeight: 48, 
    borderRadius: 10, 
    alignItems: "center", 
    justifyContent: "center", 
    paddingHorizontal: 16, 
    marginTop: 4 },
  buttonText: { 
    fontSize: 15, 
    fontFamily: "Inter_600SemiBold", 
    color: "#FFFFFF" },
  googleButton: { 
    backgroundColor: "#FFFFFF", 
    borderWidth: 1, 
    borderColor: "#DADCE0" },
  googleButtonContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 10 },
  googleButtonText: { 
    color: "#32141F", 
    fontSize: 15, 
    fontFamily: "Inter_500Medium" },
  dividerRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    marginVertical: 4 },
  dividerLine: { 
    flex: 1, 
    height: 1 },
  dividerText: { 
    fontSize: 13, 
    fontFamily: "Inter_400Regular" },
  footerRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 4, 
    flexWrap: "wrap", 
    marginTop: 8 },
  guestLink: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 4,
  },
  forgotLink: { 
    alignSelf: "flex-end", 
    paddingVertical: 2 },
  resendButton: { 
    alignSelf: "center", 
    padding: 8 },
  link: { 
    fontSize: 13, 
    fontFamily: "Inter_500Medium" },
  error: { 
    color: "#C53030", 
    fontSize: 13, 
    fontFamily: "Inter_500Medium", 
    textAlign: "center" },
  notice: { 
    fontSize: 13, 
    lineHeight: 19, 
    fontFamily: "Inter_500Medium", 
    textAlign: "center" },
  hint: { 
    fontSize: 12, 
    lineHeight: 17, 
    textAlign: "center" },
  footer: { 
    fontSize: 12, 
    textAlign: "center", 
    marginTop: 8 },
});