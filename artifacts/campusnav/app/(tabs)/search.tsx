import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BuildingListItem } from "@/components/BuildingListItem";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  BuildingCategory,
  getCategoryColor,
} from "@/constants/buildings";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { useBuildings } from "@/hooks/useBuildings";

const CATEGORIES: Array<{ key: BuildingCategory | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "academic", label: "Academic" },
  { key: "admin", label: "Admin" },
  { key: "facility", label: "Facility" },
  { key: "sports", label: "Sports" },
];

const EXPLORE_BACKGROUND = require("../../assets/images/ctucampus.jpg");

export default function SearchScreen() {
  const colors = useColors();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { buildings, loading: buildingsLoading } = useBuildings();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    BuildingCategory | "all"
  >("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    let list = buildings;
    if (activeCategory !== "all") {
      list = list.filter((b) => b.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.shortName.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.rooms.some((r) => r.toLowerCase().includes(q))
      );
    }
    return list;
  }, [buildings, query, activeCategory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={EXPLORE_BACKGROUND}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View
        style={[styles.backgroundWash, { backgroundColor: colors.background + "D9" }]}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          { paddingTop: topPad + 16 },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Explore Campus
          </Text>
          <View style={styles.titleActions}>
            <Text style={[styles.count, { color: colors.mutedForeground }]}> 
              {buildings.length} locations
            </Text>
            <ThemeToggle />
            <Pressable
              accessibilityLabel="Sign out"
              onPress={signOut}
              style={[styles.logoutButton, { backgroundColor: colors.primaryLight }]}
            >
              <Feather name="log-out" size={15} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search buildings, rooms..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={8}
            >
              <Feather name="x-circle" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Category chips */}
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.key;
            const catColor =
              item.key === "all"
                ? colors.primary
                : getCategoryColor(item.key);
            return (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveCategory(item.key);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? catColor
                      : colors.card,
                    borderColor: isActive ? catColor : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isActive ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              Platform.OS === "web" ? 34 + 84 : insets.bottom + 84,
          },
        ]}
        renderItem={({ item }) => <BuildingListItem building={item} />}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={() =>
          buildingsLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Loading buildings…
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="search" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No results
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Try a different search term or category
              </Text>
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    opacity: 1,
  },
  backgroundWash: {
    ...StyleSheet.absoluteFill,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  titleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoutButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  count: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  chipList: {
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
