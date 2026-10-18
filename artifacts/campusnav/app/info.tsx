import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/utils/api";

type AppUpdate = {
  id: number;
  title: string;
  body: string;
  isPublished: boolean;
  createdAt: string;
};

export default function AppInfoScreen() {
  const colors = useColors();
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/app-updates`);
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Could not load app updates.");
      setUpdates(Array.isArray(data) ? data : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load app updates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUpdates(); }, [loadUpdates]);

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>App info</Text>
        <Pressable accessibilityLabel="Refresh updates" onPress={() => void loadUpdates()} style={[styles.headerButton, { backgroundColor: colors.primaryLight }]}>
          <Feather name="refresh-cw" size={17} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.about, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.aboutIcon, { backgroundColor: colors.primaryLight }]}>
            <Feather name="map" size={22} color={colors.primary} />
          </View>
          <View style={styles.aboutCopy}>
            <Text style={[styles.aboutTitle, { color: colors.foreground }]}>CampusNav</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>Find campus buildings, explore locations, and get walking directions around CTU campuses.</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What’s new</Text>
        </View>
        {loading ? (
          <ActivityIndicator style={styles.state} color={colors.primary} />
        ) : error ? (
          <View style={styles.state}>
            <Text style={[styles.stateText, { color: colors.mutedForeground }]}>{error}</Text>
            <Pressable onPress={() => void loadUpdates()}><Text style={[styles.retry, { color: colors.primary }]}>Try again</Text></Pressable>
          </View>
        ) : updates.length === 0 ? (
          <Text style={[styles.stateText, { color: colors.mutedForeground }]}>No updates posted yet.</Text>
        ) : updates.map((update) => (
          <View key={update.id} style={[styles.update, { borderBottomColor: colors.border }]}>
            <Text style={[styles.updateTitle, { color: colors.foreground }]}>{update.title}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{update.body}</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{new Date(update.createdAt).toLocaleDateString()}</Text>
          </View>
        ))}
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
  about: { flexDirection: "row", alignItems: "flex-start", gap: 13, borderWidth: 1, borderRadius: 12, padding: 16 },
  aboutIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  aboutCopy: { flex: 1, gap: 5 },
  aboutTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  body: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  sectionHeader: { marginTop: 26, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  update: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 7 },
  updateTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  state: { minHeight: 90, alignItems: "center", justifyContent: "center", gap: 10 },
  stateText: { paddingVertical: 22, textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular" },
  retry: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});