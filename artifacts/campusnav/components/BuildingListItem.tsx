import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Building, getCategoryColor, getCategoryLabel } from "@/constants/buildings";
import { useColors } from "@/hooks/useColors";

interface BuildingListItemProps {
  building: Building;
  onPress?: () => void;
}

export function BuildingListItem({ building, onPress }: BuildingListItemProps) {
  const colors = useColors();
  const categoryColor = getCategoryColor(building.category);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      router.push(`/building/${building.id}`);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.secondary : colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: categoryColor + "18" },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: categoryColor }]} />
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.name, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {building.name}
        </Text>
        <View style={styles.meta}>
          <Text
            style={[styles.category, { color: categoryColor }]}
          >
            {getCategoryLabel(building.category)}
          </Text>
          <Text style={[styles.dot2, { color: colors.mutedForeground }]}>·</Text>
          <Text style={[styles.floors, { color: colors.mutedForeground }]}>
            {building.floors}F · {building.rooms.length} rooms
          </Text>
        </View>
      </View>

      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  category: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  dot2: {
    fontSize: 12,
  },
  floors: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
