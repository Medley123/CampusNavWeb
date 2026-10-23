import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
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
import type { WalkingRouteStatus } from "@/utils/walkingRoute";

interface WalkingNavPanelProps {
  building: Building | null;
  distanceMeters: number | null;
  routeStatus: WalkingRouteStatus;
  routeError: string | null;
  onStop: () => void;
}

function WalkingFigure() {
  return (
    <Image
      source={require("@/assets/images/walkinggif.gif")}
      autoplay
      contentFit="contain"
      style={styles.walkingIcon}
    />
  );
}

function DottedPath({ color }: { color: string }) {
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const [pathWidth, setPathWidth] = useState(0);

  useEffect(() => {
    if (pathWidth === 0) return;

    scrollAnim.setValue(-pathWidth);
    const anim = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: 0,
        duration: 1400,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [pathWidth, scrollAnim]);

  return (
    <View
      style={styles.pathContainer}
      onLayout={(event) => setPathWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.dotsTrack,
          {
            width: pathWidth * 2,
            transform: [{ translateX: scrollAnim }],
          },
        ]}
      >
        {[0, 1].map((row) => (
          <View key={row} style={[styles.dotsRow, { width: pathWidth }]}>
            {Array.from({ length: 14 }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: color + "88" }]}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function WalkingNavPanel({
  building,
  distanceMeters,
  routeStatus,
  routeError,
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
          <WalkingFigure />
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
      {routeStatus === "loading" && (
        <Text style={[styles.routeStatus, { color: colors.mutedForeground }]}>
          Finding a walking route…
        </Text>
      )}
      {routeStatus === "error" && (
        <Text style={[styles.routeStatus, styles.routeError]}>
          {routeError ?? "Unable to load the walking route. Check your connection and try again."}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
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
    width: 64,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  walkingIcon: {
    width: 64,
    height: 64,
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
    justifyContent: "space-between",
  },
  dotsTrack: {
    flexDirection: "row",
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
  routeStatus: {
    fontSize: 12,
    marginTop: 8,
  },
  routeError: {
    color: "#dc2626",
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
