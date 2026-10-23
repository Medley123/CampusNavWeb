import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Building, getCategoryColor, getCategoryLabel } from "@/constants/buildings";
import { useColors } from "@/hooks/useColors";

interface BuildingInfoCardProps {
  building: Building | null;
  onDismiss: () => void;
  onNavigate?: (building: Building) => void;
  onDirections?: (building: Building) => void;
}

export function BuildingInfoCard({
  building,
  onDismiss,
  onNavigate,
  onDirections,
}: BuildingInfoCardProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (building) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 300,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [building, translateY]);

  if (!building) return null;

  const categoryColor = getCategoryColor(building.category);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          bottom: bottomPad + 70,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.dragBar}>
        <View style={[styles.dragIndicator, { backgroundColor: colors.border }]} />
      </View>

      <View style={styles.header}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: categoryColor + "22" },
          ]}
        >
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {getCategoryLabel(building.category)}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
          hitSlop={12}
        >
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Text
        style={[styles.buildingName, { color: colors.foreground }]}
        numberOfLines={1}
      >
        {building.name}
      </Text>
      <Text
        style={[styles.description, { color: colors.mutedForeground }]}
        numberOfLines={2}
      >
        {building.description}
      </Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Feather name="layers" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {building.floors} {building.floors === 1 ? "Floor" : "Floors"}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="grid" size={14} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {building.rooms.length} Rooms
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.btnSecondary,
            {
              backgroundColor: pressed ? colors.secondary : colors.primaryLight,
              borderColor: colors.border,
              flex: 1,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/building/${building.id}`);
          }}
        >
          <Feather name="info" size={15} color={colors.primary} />
          <Text style={[styles.btnSecondaryText, { color: colors.primary }]}>
            View Details
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.btnPrimary,
            {
              backgroundColor: pressed ? colors.accent : colors.primary,
              flex: 1,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (onNavigate) {
              onNavigate(building);
            } else {
              onDirections?.(building);
            }
          }}
        >
          <Feather name="navigation" size={15} color="#fff" />
          <Text style={styles.btnPrimaryText}>Navigate</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    paddingTop: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
  dragBar: {
    alignItems: "center",
    marginBottom: 10,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buildingName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 12,
  },
  meta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
