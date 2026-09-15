import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getCategoryColor,
  getCategoryLabel,
} from "@/constants/buildings";
import { useColors } from "@/hooks/useColors";
import { useBuildings } from "@/hooks/useBuildings";

const DEFAULT_BUILDING_IMAGE = require("../../assets/images/ctucampus.jpg");

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buildings } = useBuildings();

  const building = buildings.find((b) => b.id === (id ?? ""));

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!building) {
    return (
      <View
        style={[
          styles.notFound,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        <Feather name="alert-circle" size={48} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>
          Building not found
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const categoryColor = getCategoryColor(building.category);

  const handleDirections = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web") {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${building.latitude},${building.longitude}&destination_place_id=${encodeURIComponent(building.name)}`,
        "_blank"
      );
    } else {
      const url =
        Platform.OS === "ios"
          ? `maps://?daddr=${building.latitude},${building.longitude}&q=${encodeURIComponent(building.name)}`
          : `geo:${building.latitude},${building.longitude}?q=${encodeURIComponent(building.name)}`;
      Linking.openURL(url);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero header — shows photo if available, else color banner */}
      <View
        style={[
          styles.hero,
          { backgroundColor: building.color, paddingTop: topPad + 12 },
        ]}
      >
        <Image
          source={
            building.images?.[0]
              ? { uri: building.images[0] }
              : DEFAULT_BUILDING_IMAGE
          }
          style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
          resizeMode="cover"
        />

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={[styles.heroBack, { backgroundColor: "rgba(255,255,255,0.2)" }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>

        <View style={styles.heroContent}>
          <View
            style={[
              styles.heroBadge,
              { backgroundColor: "rgba(255,255,255,0.25)" },
            ]}
          >
            <Text style={styles.heroBadgeText}>
              {getCategoryLabel(building.category)}
            </Text>
          </View>
          <Text style={styles.heroTitle}>{building.name}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <Feather name="layers" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>
                {building.floors} {building.floors === 1 ? "Floor" : "Floors"}
              </Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Feather name="grid" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroMetaText}>
                {building.rooms.length} Rooms
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* About */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            About
          </Text>
          <Text style={[styles.sectionText, { color: colors.mutedForeground }]}>
            {building.description}
          </Text>
        </View>

        {/* Location */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Location
          </Text>
          <View style={styles.coordRow}>
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: colors.mutedForeground }]}>
                Latitude
              </Text>
              <Text style={[styles.coordValue, { color: colors.foreground }]}>
                {building.latitude.toFixed(5)}°N
              </Text>
            </View>
            <View
              style={[styles.coordDivider, { backgroundColor: colors.border }]}
            />
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: colors.mutedForeground }]}>
                Longitude
              </Text>
              <Text style={[styles.coordValue, { color: colors.foreground }]}>
                {building.longitude.toFixed(5)}°E
              </Text>
            </View>
          </View>
        </View>

        {/* Rooms */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Rooms & Areas
          </Text>
          {building.rooms.map((room, idx) => (
            <View
              key={idx}
              style={[
                styles.roomRow,
                idx < building.rooms.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.roomIcon,
                  { backgroundColor: categoryColor + "18" },
                ]}
              >
                <Feather name="home" size={13} color={categoryColor} />
              </View>
              <Text style={[styles.roomName, { color: colors.foreground }]}>
                {room}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Directions button */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: bottomPad + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleDirections}
          style={({ pressed }) => [
            styles.directionsBtn,
            { backgroundColor: pressed ? colors.accent : building.color },
          ]}
        >
          <Feather name="navigation" size={18} color="#fff" />
          <Text style={styles.directionsBtnText}>Get Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  heroBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroContent: {
    gap: 8,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
  },
  heroMeta: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroMetaText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    gap: 12,
  },
  section: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  sectionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coordItem: {
    flex: 1,
    gap: 3,
  },
  coordLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coordValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  coordDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 16,
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
  },
  roomIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  roomName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 16,
  },
  directionsBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
});
