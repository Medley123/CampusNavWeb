import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const colors = useColors();
  const { mode, toggleMode } = useTheme();

  return (
    <Pressable
      accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
      onPress={toggleMode}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? colors.secondary : colors.primaryLight },
      ]}
    >
      <Feather name={mode === "dark" ? "sun" : "moon"} size={16} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});