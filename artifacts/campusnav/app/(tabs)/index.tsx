import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  Overlay,
  Polyline,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BuildingInfoCard } from "@/components/BuildingInfoCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalkingNavPanel } from "@/components/WalkingNavPanel";
import {
  CAMPUS_REGION,
  Building,
  getCategoryLabel,
  type FloorLevel,
} from "@/constants/buildings";
import { useLocation } from "@/hooks/useLocation";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/hooks/useAuth";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { useBuildings } from "@/hooks/useBuildings";
import { haversineDistance } from "@/utils/distance";

const MIN_LAT = 10.5022;
const MAX_LAT = 10.5046;
const MIN_LNG = 124.0270;
const MAX_LNG = 124.0313;

const BOUND_MIN_LAT = 10.4990;
const BOUND_MAX_LAT = 10.5080;
const BOUND_MIN_LNG = 124.0230;
const BOUND_MAX_LNG = 124.0360;

function getBuildingPosition(lat: number, lng: number) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 100;
  const y = (1 - (lat - MIN_LAT) / (MAX_LAT - MIN_LAT)) * 100;
  return { x: Math.min(Math.max(x, 2), 96), y: Math.min(Math.max(y, 2), 90) };
}

const CAMPUS_MAP_IMAGE = require("../../assets/images/campus-map.png");
const CAMPUS_LOGO = require("../../assets/images/cmpslogo.png");

function WebRouteLine({
  fromLat, fromLng, toLat, toLng,
}: {
  fromLat: number; fromLng: number; toLat: number; toLng: number;
}) {
  const from = getBuildingPosition(fromLat, fromLng);
  const to = getBuildingPosition(toLat, toLng);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.webRouteLine,
        {
          left: `${from.x}%` as any,
          top: `${from.y}%` as any,
          width: `${length}%` as any,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

function WebCampusMap({
  buildings,
  selectedBuilding,
  onBuildingPress,
  onMapPress,
  showMapImage,
  navTarget,
}: {
  buildings: Building[];
  selectedBuilding: Building | null;
  onBuildingPress: (b: Building) => void;
  onMapPress: () => void;
  showMapImage: boolean;
  navTarget: Building | null;
}) {
  const colors = useColors();

  return (
    <Pressable
      style={[styles.webMap, { backgroundColor: colors.background }]}
      onPress={onMapPress}
    >
      {showMapImage && (
        <Image
          source={CAMPUS_MAP_IMAGE}
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          resizeMode="stretch"
        />
      )}

      <View style={[styles.campusLabel, { backgroundColor: colors.card + "CC" }]}>
        <Text style={[styles.campusLabelText, { color: colors.primary }]}>
          CTU Danao Campus
        </Text>
      </View>

      {navTarget && (
        <WebRouteLine
          fromLat={10.50338}
          fromLng={124.02916}
          toLat={navTarget.latitude}
          toLng={navTarget.longitude}
        />
      )}

      {buildings.map((building) => {
        const pos = getBuildingPosition(building.latitude, building.longitude);
        const isSelected = selectedBuilding?.id === building.id;
        const isNavTarget = navTarget?.id === building.id;
        const catColor = building.color;
        return (
          <Pressable
            key={building.id}
            style={[
              styles.webPin,
              {
                left: `${pos.x}%` as any,
                top: `${pos.y}%` as any,
                backgroundColor: catColor,
                transform: [{ scale: isSelected || isNavTarget ? 1.2 : 1 }],
                zIndex: isSelected || isNavTarget ? 10 : 1,
                shadowColor: catColor,
                shadowOpacity: isSelected || isNavTarget ? 0.5 : 0.25,
                shadowRadius: isSelected || isNavTarget ? 8 : 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: isSelected || isNavTarget ? 6 : 2,
                borderWidth: isNavTarget ? 2 : 0,
                borderColor: "#fff",
              },
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBuildingPress(building);
            }}
          >
            <Text style={styles.webPinText}>{building.shortName}</Text>
          </Pressable>
        );
      })}
    </Pressable>
  );
}

export default function MapScreen() {
  const colors = useColors();
  const { signOut, user } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  useActiveUsers(user?.username);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const showMapImage = true;
  const [navTarget, setNavTarget] = useState<Building | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentFloor, setCurrentFloor] = useState<FloorLevel>("Ground");
  const location = useLocation();
  const isWeb = Platform.OS === "web";
  const {
    buildings,
    loading: buildingsLoading,
    refetch,
  } = useBuildings();

  // Filter buildings by current floor
  const filteredBuildings = buildings.filter((building) => {
    // If floorsLocations is not defined, show on all floors
    if (!building.floorsLocations || building.floorsLocations.length === 0) {
      return true;
    }
    return building.floorsLocations.includes(currentFloor);
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const distanceMeters =
    navTarget && location.coords
      ? haversineDistance(
          location.coords.latitude,
          location.coords.longitude,
          navTarget.latitude,
          navTarget.longitude
        )
      : null;

  const handleMarkerPress = (building: Building) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBuilding(building);
    if (!isWeb) {
      mapRef.current?.animateToRegion(
        {
          latitude: building.latitude - 0.0003,
          longitude: building.longitude,
          latitudeDelta: 0.0025,
          longitudeDelta: 0.0025,
        },
        400
      );
    }
  };

  const handleNavigate = (building: Building) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setNavTarget(building);
    setSelectedBuilding(null);
    if (!isWeb && location.coords) {
      mapRef.current?.animateToRegion(
        {
          latitude: (location.coords.latitude + building.latitude) / 2,
          longitude: (location.coords.longitude + building.longitude) / 2,
          latitudeDelta: Math.abs(location.coords.latitude - building.latitude) * 2.5 + 0.003,
          longitudeDelta: Math.abs(location.coords.longitude - building.longitude) * 2.5 + 0.003,
        },
        600
      );
    } else if (!isWeb) {
      mapRef.current?.animateToRegion(
        {
          latitude: building.latitude,
          longitude: building.longitude,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        },
        600
      );
    }
    if (!location.coords) {
      location.requestLocation();
    }
  };

  const handleStopNavigation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNavTarget(null);
  };

  const handleLocateMe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isWeb && location.coords) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        },
        500
      );
    } else {
      location.requestLocation();
      if (!isWeb) {
        mapRef.current?.animateToRegion(
          { latitude: 10.50338, longitude: 124.02916, latitudeDelta: 0.0028, longitudeDelta: 0.0048 },
          500
        );
      }
    }
  };

 const handleResetView = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

 
  refetch();

  if (!isWeb) {
    mapRef.current?.animateToRegion(CAMPUS_REGION, 500);
  }

  setSelectedBuilding(null);
  setNavTarget(null);
};

  const handleRegionChangeComplete = (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => {
    const outOfBounds =
      region.latitude < BOUND_MIN_LAT ||
      region.latitude > BOUND_MAX_LAT ||
      region.longitude < BOUND_MIN_LNG ||
      region.longitude > BOUND_MAX_LNG ||
      region.latitudeDelta > 0.015;

    if (outOfBounds) {
      mapRef.current?.animateToRegion(CAMPUS_REGION, 400);
    }
  };

  const handleDirections = (building: Building) => {
    if (Platform.OS === "web") {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${building.latitude},${building.longitude}`,
        "_blank"
      );
    } else {
      const url =
        Platform.OS === "ios"
          ? `maps://?daddr=${building.latitude},${building.longitude}`
          : `geo:${building.latitude},${building.longitude}?q=${encodeURIComponent(building.name)}`;
      import("react-native").then(({ Linking }) => Linking.openURL(url));
    }
  };

  const isNavigating = navTarget !== null;

  const FLOOR_LEVELS: FloorLevel[] = ["Ground", "2F", "3F", "4F"];
  const floorDisplayNames: Record<FloorLevel, string> = {
    "Ground": "G",
    "2F": "2F",
    "3F": "3F",
    "4F": "4F",
  };
  const currentFloorIndex = FLOOR_LEVELS.indexOf(currentFloor);
  const canMoveUp = currentFloorIndex > 0;
  const canMoveDown = currentFloorIndex < FLOOR_LEVELS.length - 1;

  return (
    <View style={styles.container}>
      {isWeb && (
        <View
          style={[
            styles.floorButtonsContainer,
            { top: "50%" as any },
          ]}
        >
          <Pressable
            accessibilityLabel="Go to previous floor"
            disabled={!canMoveUp}
            onPress={() => setCurrentFloor(FLOOR_LEVELS[currentFloorIndex - 1])}
            style={({ pressed }) => [
              styles.floorArrowButton,
              pressed && canMoveUp && styles.floorArrowButtonPressed,
            ]}
          >
            <Feather
              name="chevron-up"
              size={20}
              color={canMoveUp ? colors.primary : colors.border}
            />
          </Pressable>

          <View style={[styles.currentFloorLabel, { backgroundColor: colors.primary }]}>
            <Text style={styles.currentFloorText}>{floorDisplayNames[currentFloor]}</Text>
          </View>

          <Pressable
            accessibilityLabel="Go to next floor"
            disabled={!canMoveDown}
            onPress={() => setCurrentFloor(FLOOR_LEVELS[currentFloorIndex + 1])}
            style={({ pressed }) => [
              styles.floorArrowButton,
              pressed && canMoveDown && styles.floorArrowButtonPressed,
            ]}
          >
            <Feather
              name="chevron-down"
              size={20}
              color={canMoveDown ? colors.primary : colors.border}
            />
          </Pressable>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={CAMPUS_REGION}
        provider={PROVIDER_DEFAULT}
        showsUserLocation={!!location.coords}
        showsMyLocationButton={false}
        showsCompass={false}
        minZoomLevel={15}
        maxZoomLevel={20}
        onPress={() => setSelectedBuilding(null)}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
          {showMapImage && (
            <Overlay
              bounds={[
                [MIN_LAT, MIN_LNG],
                [MAX_LAT, MAX_LNG],
              ]}
              image={CAMPUS_MAP_IMAGE}
              opacity={0.85}
            />
          )}

          {/* Route line when navigating */}
          {isNavigating && location.coords && (
            <Polyline
              coordinates={[
                {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                },
                {
                  latitude: navTarget.latitude,
                  longitude: navTarget.longitude,
                },
              ]}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[12, 6]}
            />
          )}

          {filteredBuildings.map((building) => (
            <Marker
              key={building.id}
              coordinate={{
                latitude: building.latitude,
                longitude: building.longitude,
              }}
              title={building.name}
              {...({ color: building.color } as any)}
              onPress={() => handleMarkerPress(building)}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.markerContainer,
                  selectedBuilding?.id === building.id && styles.markerSelected,
                  navTarget?.id === building.id && styles.markerNav,
                  { backgroundColor: building.color },
                ]}
              >
                {navTarget?.id === building.id && (
                  <Text style={styles.markerNavEmoji}>📍</Text>
                )}
                <Text style={styles.markerText}>{building.shortName}</Text>
              </View>
              <View
                style={[styles.markerPin, { borderTopColor: building.color }]}
              />
            </Marker>
          ))}
        </MapView>

      {/* Loading overlay */}
      {buildingsLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading buildings…</Text>
          </View>
        </View>
      )}

      {/* Navigating banner */}
      {isNavigating && (
        <View
          style={[
            styles.navBanner,
            { top: topPad + (isWeb ? 0 : 12) + 70, backgroundColor: colors.primary },
          ]}
          pointerEvents="none"
        >
          <Feather name="navigation" size={13} color="#fff" />
          <Text style={styles.navBannerText}>Navigating to {navTarget?.shortName}</Text>
        </View>
      )}

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            top: topPad + (isWeb ? 0 : 12),
            backgroundColor: isNavigating ? colors.primary + "11" : colors.card,
            borderColor: isNavigating ? colors.primary + "44" : colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          {isNavigating ? (
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
              <Feather name="navigation" size={14} color="#fff" />
            </View>
          ) : (
            <Image source={CAMPUS_LOGO} style={styles.logoMark} resizeMode="cover" />
          )}
          <View>
            <Text style={[styles.appName, { color: colors.foreground }]}>
              CampusNav 
            </Text>
            <Text style={[styles.campusName, { color: colors.mutedForeground }]}>
              {isNavigating ? `→ ${navTarget?.name}` : "CTU Danao Campus"}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {!isMobile ? (
            <>
              {user?.username && (
                <View style={[styles.usernameBadge, { backgroundColor: colors.primaryLight }]}>
                  <Feather name="user" size={13} color={colors.primary} />
                  <Text
                    style={[styles.usernameText, { color: colors.primary }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    @{user.username}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={handleResetView}
                style={({ pressed }) => [
                  styles.resetBtn,
                  {
                    backgroundColor: pressed ? colors.secondary : colors.primaryLight,
                  },
                ]}
              >
                <Feather name="refresh-cw" size={15} color={colors.primary} />
              </Pressable>
              <ThemeToggle />
              <Pressable
                accessibilityLabel="Sign out"
                onPress={signOut}
                style={[styles.resetBtn, { backgroundColor: colors.primaryLight }]}
              >
                <Feather name="log-out" size={15} color={colors.primary} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={handleResetView}
                accessibilityLabel="Refresh map"
                style={({ pressed }) => [
                  styles.resetBtn,
                  {
                    backgroundColor: pressed ? colors.secondary : colors.primaryLight,
                  },
                ]}
              >
                <Feather name="refresh-cw" size={15} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityLabel="Open account menu"
                onPress={() => setMenuOpen((open) => !open)}
                style={[styles.resetBtn, { backgroundColor: colors.primaryLight }]}
              >
                <Feather name={menuOpen ? "x" : "menu"} size={20} color={colors.primary} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {menuOpen && isMobile && (
        <>
          <Pressable
            accessibilityLabel="Close account menu"
            onPress={() => setMenuOpen(false)}
            style={styles.menuBackdrop}
          />
          <View
            style={[
              styles.accountMenu,
              {
                top: topPad + (isWeb ? 0 : 12) + 58,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.accountMenuUser}>
              <View style={[styles.accountAvatar, { backgroundColor: colors.primaryLight }]}>
                <Feather name="user" size={17} color={colors.primary} />
              </View>
              <View style={styles.accountMenuUserText}>
                <Text style={[styles.accountMenuUsername, { color: colors.foreground }]} numberOfLines={1}>
                  @{user?.username || "user"}
                </Text>
                <Text style={[styles.accountMenuLabel, { color: colors.mutedForeground }]}>Account</Text>
              </View>
            </View>
            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
            <View style={styles.accountMenuActions}>
              <ThemeToggle />
              <Text style={[styles.accountMenuActionText, { color: colors.foreground }]}>Appearance</Text>
            </View>
            <Pressable
              accessibilityLabel="Sign out"
              onPress={() => {
                setMenuOpen(false);
                signOut();
              }}
              style={({ pressed }) => [styles.accountMenuActions, pressed && { opacity: 0.65 }]}
            >
              <View style={[styles.menuIconButton, { backgroundColor: colors.primaryLight }]}>
                <Feather name="log-out" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.accountMenuActionText, { color: colors.foreground }]}>Log out</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Map Controls */}
      {!isWeb && (
        <View
          style={[
            styles.controls,
            {
              bottom: bottomPad + (isNavigating ? 220 : selectedBuilding ? 200 : 80),
            },
          ]}
        >
          <Pressable
            onPress={handleLocateMe}
            style={({ pressed }) => [
              styles.controlBtn,
              {
                backgroundColor: pressed ? colors.secondary : colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            {location.loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather
                name="navigation"
                size={20}
                color={location.coords ? colors.primary : colors.mutedForeground}
              />
            )}
          </Pressable>
        </View>
      )}

      {/* Building count badge */}
      {!selectedBuilding && !isNavigating && (
        <View
          style={[
            styles.badge,
            {
              bottom: bottomPad + 80,
              left: 16,
              backgroundColor: colors.mapOverlay,
            },
          ]}
        >
          <Feather name="map-pin" size={12} color="#fff" />
          <Text style={styles.badgeText}>{buildings.length} locations</Text>
        </View>
      )}

      {/* Building Info Card (hidden when navigating) */}
      {!isNavigating && (
        <BuildingInfoCard
          building={selectedBuilding}
          onDismiss={() => setSelectedBuilding(null)}
          onNavigate={handleNavigate}
          onDirections={handleDirections}
        />
      )}

      {/* Walking Navigation Panel */}
      <WalkingNavPanel
        building={navTarget}
        distanceMeters={distanceMeters}
        onStop={handleStopNavigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    paddingBottom: 100,
    paddingLeft: 16,
    zIndex: 20,
  },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#800000",
  },
  map: {
    flex: 1,
  },
  webMap: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  campusLabel: {
    position: "absolute",
    bottom: 90,
    left: "50%",
    transform: [{ translateX: -80 }],
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 0,
  },
  campusLabelText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  webRouteLine: {
    position: "absolute",
    height: 3,
    borderRadius: 2,
    backgroundColor: "#800000",
    opacity: 0.7,
    zIndex: 5,
    borderStyle: "dashed",
    borderWidth: 0,
    transformOrigin: "left center" as any,
  },
  webPin: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    transform: [{ translateX: -20 }, { translateY: -14 }],
  },
  webPinText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  navBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
    borderRadius: 10,
    zIndex: 50,
  },
  navBannerText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  header: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  usernameBadge: {
    maxWidth: 140,
    minHeight: 34,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  usernameText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  campusName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
  },
  accountMenu: {
    position: "absolute",
    right: 16,
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  accountMenuUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  accountMenuUserText: {
    flex: 1,
  },
  accountMenuUsername: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  accountMenuLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginVertical: 10,
  },
  accountMenuActions: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },
  menuIconButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  accountMenuActionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  controls: {
    position: "absolute",
    right: 16,
    gap: 10,
  },
  controlBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  badge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  markerContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  markerSelected: {
    transform: [{ scale: 1.15 }],
  },
  markerNav: {
    transform: [{ scale: 1.25 }],
    borderWidth: 2,
    borderColor: "#fff",
  },
  markerNavEmoji: {
    fontSize: 10,
  },
  markerText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  markerPin: {
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  floorButtonsContainer: {
    position: "absolute",
    right: 16,
    flexDirection: "column",
    zIndex: 20,
    justifyContent: "center",
    alignItems: "center",
    width: 45,
    height: 119,
    transform: [{ translateY: -62 }],
    padding: 3,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.66)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.96)",
    shadowColor: "#17301F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  floorArrowButton: {
    width: 40,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  floorArrowButtonPressed: {
    backgroundColor: "#F5E6E6",
  },
  currentFloorLabel: {
    width: 40,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    shadowColor: "#800000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  currentFloorText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    fontFamily: "Inter_700Bold",
  },
 
});
