import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { Building } from "@/constants/buildings";
import { useColors } from "@/hooks/useColors";
import { formatDistance, walkingMinutes } from "@/utils/distance";

interface WalkingNavPanelProps {
  building: Building | null;
  distanceMeters: number | null;
  onStop: () => void;
}

function WalkingFigure({ color }: { color: string }) {
  const legAnim = useRef(new Animated.Value(0)).current;
  const armAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const leg = Animated.loop(
      Animated.sequence([
        Animated.timing(legAnim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(legAnim, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
      ])
    );
    const arm = Animated.loop(
      Animated.sequence([
        Animated.timing(armAnim, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(armAnim, {
          toValue: 0,
          duration: 380,
          useNativeDriver: true,
        }),
      ])
    );
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 190,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 190,
          useNativeDriver: true,
        }),
      ])
    );
    leg.start();
    arm.start();
    bounce.start();
    return () => {
      leg.stop();
      arm.stop();
      bounce.stop();
    };
  }, [legAnim, armAnim, bounceAnim]);

  const leftLegRot = legAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-28deg", "28deg"],
  });
  const rightLegRot = legAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["28deg", "-28deg"],
  });
  const leftArmRot = armAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["20deg", "-20deg"],
  });
  const rightArmRot = armAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["-20deg", "20deg"],
  });
  const bodyY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  return (
    <Animated.View
      style={[styles.figureWrap, { transform: [{ translateY: bodyY }] }]}
    >
      {/* Head */}
      <View style={[styles.head, { borderColor: color, backgroundColor: color + "22" }]} />

      {/* Body */}
      <View style={[styles.body, { backgroundColor: color }]} />

      {/* Arms */}
      <View style={styles.armsRow}>
        <Animated.View
          style={[
            styles.arm,
            { backgroundColor: color, transform: [{ rotate: leftArmRot }] },
          ]}
        />
        <Animated.View
          style={[
            styles.arm,
            { backgroundColor: color, transform: [{ rotate: rightArmRot }] },
          ]}
        />
      </View>

      {/* Legs */}
      <View style={styles.legsRow}>
        <Animated.View
          style={[
            styles.leg,
            { backgroundColor: color, transform: [{ rotate: leftLegRot }] },
          ]}
        />
        <Animated.View
          style={[
            styles.leg,
            { backgroundColor: color, transform: [{ rotate: rightLegRot }] },
          ]}
        />
      </View>
    </Animated.View>
  );
}

function DottedPath({ color }: { color: string }) {
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [scrollAnim]);

  const translateX = scrollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <View style={styles.pathContainer}>
      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX }] }]}
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: color + "88" }]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

export function WalkingNavPanel({
  building,
  distanceMeters,
  onStop,
}: WalkingNavPanelProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(200)).current;

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
        toValue: 200,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [building, translateY]);

  if (!building) return null;

  const dist = distanceMeters ?? 0;
  const mins = walkingMinutes(dist);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          backgroundColor: colors.card,
          borderColor: colors.primary + "55",
          bottom: bottomPad + 70,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Top strip: path + figure */}
      <View style={styles.navStrip}>
        <View style={styles.figureSection}>
          <WalkingFigure color={colors.primary} />
        </View>

        <DottedPath color={colors.primary} />

        {/* Destination dot */}
        <View style={[styles.destDot, { backgroundColor: colors.primary }]}>
          <Feather name="map-pin" size={14} color="#fff" />
        </View>
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
          <Text
            style={[styles.destName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {building.name}
          </Text>
          <View style={styles.metaRow}>
            {distanceMeters !== null ? (
              <>
                <View style={styles.metaChip}>
                  <Feather
                    name="map-pin"
                    size={12}
                    color={colors.primary}
                  />
                  <Text style={[styles.metaVal, { color: colors.primary }]}>
                    {formatDistance(dist)}
                  </Text>
                </View>
                <View style={styles.metaChip}>
                  <Feather
                    name="clock"
                    size={12}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.metaVal,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    ~{mins} min walk
                  </Text>
                </View>
              </>
            ) : (
              <Text
                style={[styles.metaVal, { color: colors.mutedForeground }]}
              >
                Enable location for distance
              </Text>
            )}
          </View>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onStop();
          }}
          style={({ pressed }) => [
            styles.stopBtn,
            { backgroundColor: pressed ? "#ffcccc" : "#fee2e2" },
          ]}
        >
          <Feather name="x" size={14} color="#dc2626" />
          <Text style={styles.stopText}>Stop</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
  navStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    height: 72,
  },
  figureSection: {
    width: 52,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  figureWrap: {
    alignItems: "center",
  },
  head: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 2,
  },
  body: {
    width: 3,
    height: 18,
    borderRadius: 2,
    marginBottom: 1,
  },
  armsRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 1,
  },
  arm: {
    width: 3,
    height: 13,
    borderRadius: 2,
  },
  legsRow: {
    flexDirection: "row",
    gap: 4,
  },
  leg: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  pathContainer: {
    flex: 1,
    overflow: "hidden",
    height: 4,
    alignSelf: "flex-end",
    marginBottom: 8,
    marginHorizontal: 6,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 4,
    borderRadius: 2,
  },
  destDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoLeft: {
    flex: 1,
  },
  destName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaVal: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  stopText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#dc2626",
  },
});
