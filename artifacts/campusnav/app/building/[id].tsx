import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Image,
  Linking,
  Modal,
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

export default function BuildingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buildings } = useBuildings();
  const [viewingPhotoIndex, setViewingPhotoIndex] = React.useState<number | null>(null);
  const zoomScale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const viewerImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoomScale.value }],
  }));
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      zoomScale.value = Math.min(4, Math.max(1, pinchStartScale.value * event.scale));
    })
    .onEnd(() => {
      pinchStartScale.value = zoomScale.value;
    });

  const building = buildings.find((b) => b.id === (id ?? ""));

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const setZoom = (nextScale: number) => {
    const scale = Math.min(4, Math.max(1, nextScale));
    zoomScale.value = withTiming(scale, { duration: 150 });
    pinchStartScale.value = scale;
  };

  const closePhotoViewer = () => {
    setViewingPhotoIndex(null);
    setZoom(1);
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

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
          onPress={handleGoBack}
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
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleGoBack();
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

        {building.images?.length ? (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Photos
            </Text>
            <View style={styles.imageGrid}>
              {building.images.map((image, index) => (
                <Pressable
                  key={`${image}-${index}`}
                  style={styles.imageTile}
                  onPress={() => {
                    setZoom(1);
                    setViewingPhotoIndex(index);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${building.name} photo ${index + 1}`}
                >
                  <Image
                    source={{ uri: image }}
                    style={styles.buildingImage}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Modal
          visible={viewingPhotoIndex !== null}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={closePhotoViewer}
        >
          <GestureHandlerRootView style={styles.viewerRoot}>
            <View style={styles.viewerOverlay}>
              <View style={[styles.viewerHeader, { paddingTop: topPad }]}>
                <Text style={styles.viewerCounter}>
                  {viewingPhotoIndex !== null ? viewingPhotoIndex + 1 : 0} / {building.images?.length ?? 0}
                </Text>
                <Pressable
                  onPress={closePhotoViewer}
                  style={styles.viewerIconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close photo viewer"
                >
                  <Feather name="x" size={22} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.viewerImageStage}>
                {viewingPhotoIndex !== null && building.images?.[viewingPhotoIndex] ? (
                  <GestureDetector gesture={pinchGesture}>
                    <Animated.View style={[styles.viewerImageFrame, viewerImageStyle]}>
                      <Image
                        source={{ uri: building.images[viewingPhotoIndex] }}
                        style={styles.viewerImage}
                        resizeMode="contain"
                      />
                    </Animated.View>
                  </GestureDetector>
                ) : null}
              </View>

              <View style={[styles.viewerControls, { paddingBottom: bottomPad + 12 }]}>
                <Pressable
                  onPress={() => setZoom(zoomScale.value - 0.5)}
                  style={styles.viewerIconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Zoom out"
                >
                  <Feather name="minus" size={21} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => setZoom(1)}
                  style={styles.viewerResetButton}
                  accessibilityRole="button"
                  accessibilityLabel="Reset zoom"
                >
                  <Feather name="rotate-ccw" size={18} color="#fff" />
                  <Text style={styles.viewerResetText}>Reset</Text>
                </Pressable>
                <Pressable
                  onPress={() => setZoom(zoomScale.value + 0.5)}
                  style={styles.viewerIconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Zoom in"
                >
                  <Feather name="plus" size={21} color="#fff" />
                </Pressable>
              </View>
            </View>
          </GestureHandlerRootView>
        </Modal>

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
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imageTile: {
    width: "48%",
  },
  buildingImage: {
    width: "100%",
    height: 132,
    borderRadius: 10,
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
  },
  viewerRoot: {
    flex: 1,
  },
  viewerHeader: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewerCounter: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  viewerImageStage: {
    flex: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImageFrame: {
    width: "100%",
    height: "78%",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  viewerControls: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  viewerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerResetButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  viewerResetText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
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
