import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/utils/api";

export default function FeedbackScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submitFeedback = async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 5 || sending) return;
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedMessage,
          userEmail: user?.email,
          username: user?.username,
          userName: user?.name,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not send feedback.");
      setMessage("");
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send feedback.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.replace("/(tabs)")}
          style={[styles.headerButton, { backgroundColor: colors.primaryLight }]}
        >
          <Feather name="arrow-left" size={19} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Send feedback</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.heading, { color: colors.foreground }]}>Help us improve CampusNav</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>Report a problem or share an idea. Your account name will be included so the team can follow up.</Text>
        <TextInput
          accessibilityLabel="Your feedback"
          value={message}
          onChangeText={(value) => { setMessage(value); setSent(false); }}
          placeholder="What would you like us to know?"
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
          textAlignVertical="top"
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
        />
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>{message.length}/4000</Text>
        {error && <Text accessibilityRole="alert" style={[styles.feedbackState, { color: colors.destructive }]}>{error}</Text>}
        {sent && <Text style={[styles.feedbackState, { color: colors.primary }]}>Thanks, your feedback was sent.</Text>}
        <Pressable
          accessibilityRole="button"
          disabled={message.trim().length < 5 || sending}
          onPress={() => void submitFeedback()}
          style={({ pressed }) => [styles.submit, { backgroundColor: colors.primary, opacity: message.trim().length < 5 || sending ? 0.55 : pressed ? 0.82 : 1 }]}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
          <Text style={styles.submitText}>{sending ? "Sending..." : "Send feedback"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 18, paddingBottom: 32 },
  heading: { fontSize: 21, fontFamily: "Inter_700Bold" },
  helper: { marginTop: 7, marginBottom: 18, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  input: { minHeight: 190, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  counter: { marginTop: 6, textAlign: "right", fontSize: 12, fontFamily: "Inter_400Regular" },
  feedbackState: { marginTop: 12, fontSize: 14, fontFamily: "Inter_500Medium" },
  submit: { minHeight: 48, marginTop: 18, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  submitText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});