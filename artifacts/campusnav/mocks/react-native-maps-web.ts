import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// Dynamically import Leaflet only on web to avoid module errors on native
let MapContainer: any = null;
let TileLayer: any = null;
let Marker: any = null;
let Popup: any = null;
let useMap: any = null;
let L: any = null;

if (typeof window !== "undefined") {
  try {
    const leaflet = require("leaflet");
    const reactLeaflet = require("react-leaflet");
    
    L = leaflet;
    MapContainer = reactLeaflet.MapContainer;
    TileLayer = reactLeaflet.TileLayer;
    Marker = reactLeaflet.Marker;
    Popup = reactLeaflet.Popup;
    useMap = reactLeaflet.useMap;
    
    //Leaflet marker icons
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
      iconUrl: require("leaflet/dist/images/marker-icon.png"),
      shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
    });
    
    require("leaflet/dist/leaflet.css");
  } catch (e) {
    console.warn("Leaflet not available, using fallback implementation", e);
  }
}

const PROVIDER_DEFAULT = null;
const PROVIDER_GOOGLE = "google";



type RegionType = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type MapViewProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  onPress?: (event?: unknown) => void;
  initialRegion?: RegionType;
  provider?: string | null;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  minZoomLevel?: number;
  maxZoomLevel?: number;
  onRegionChangeComplete?: (region: RegionType) => void;
};

// Controller component to handle map methods
function MapController({ onMapReady }: any) {
  const map = useMap();

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

const MapView = React.forwardRef<
  { animateToRegion: (region: RegionType, duration: number) => void },
  MapViewProps
>(function MapViewComponent(props, ref) {
  const {
    style,
    children,
    onPress,
    initialRegion,
    minZoomLevel = 0,
    maxZoomLevel = 20,
    onRegionChangeComplete,
  } = props;

  const mapInstanceRef = useRef<any>(null);

  // Expose animateToRegion method via ref
  React.useImperativeHandle(ref, () => ({
    animateToRegion: (region: RegionType, duration: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([region.latitude, region.longitude], 16, {
          duration: duration / 1000,
        });
      }
    },
  }), []);

  if (!MapContainer) {
   
    return React.createElement(
      View,
      {
        style: [styles.container, style],
      },
      children
    );
  }

  const handleMapClick = useCallback(
    (event: any) => {
      if (onPress) {
        onPress();
      }
    },
    [onPress]
  );

  const handleMapReady = useCallback((mapInstance: any) => {
    mapInstanceRef.current = mapInstance;
  }, []);

  // On web, render MapContainer directly as JSX
  return React.createElement(
    MapContainer,
    {
      center: [initialRegion?.latitude || 10.50338, initialRegion?.longitude || 124.02916],
      zoom: 18,
      minZoom: minZoomLevel,
      maxZoom: maxZoomLevel,
      zoomControl: false,
      style: {
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
        
      },
      onClick: handleMapClick,
    },
    React.createElement(TileLayer, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    }),
    React.createElement(MapController, {
      onMapReady: handleMapReady,
    }),
    children
  );
});

type MarkerProps = {
  coordinate?: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  color?: string;
  onPress?: (event: {
    nativeEvent: {
      coordinate?: {
        latitude: number;
        longitude: number;
      };
    };
  }) => void;
  children?: React.ReactNode;
  tracksViewChanges?: boolean;
};

function MarkerComponent(props: MarkerProps) {
  const { coordinate, onPress, children, title, color = "#800000" } = props;

  if (!coordinate || !Marker) return null;

  const handleClick = useCallback(
    (e: any) => {
      e.originalEvent?.stopPropagation?.();
      if (onPress) {
        onPress({
          nativeEvent: {
            coordinate,
          },
        });
      }
    },
    [onPress, coordinate]
  );

  return React.createElement(
    Marker,
    {
      position: [coordinate.latitude, coordinate.longitude],
      icon: L.divIcon({
        className: "campus-leaflet-marker",
        html: `<span style="display:flex;align-items:center;gap:6px;transform:translate(-17px,-34px)"><span style="display:flex;flex:0 0 34px;width:34px;height:34px;align-items:center;justify-content:center;background:${color};border:2px solid #fff;border-radius:50% 50% 50% 0;box-shadow:0 2px 5px rgba(0,0,0,.3);transform:rotate(-45deg)"><span style="display:block;width:11px;height:11px;background:#fff;border-radius:50%"></span></span><span style="display:block;background:#fff;color:#800000;padding:5px 8px;border-radius:6px;font:700 11px Inter,sans-serif;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,.2)">${String(title || "Building").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character)}</span></span>`,
        iconSize: [180, 40],
        iconAnchor: [17, 34],
      }),
      eventHandlers: {
        click: handleClick,
      },
    }
  );
}

type CalloutProps = {
  tooltip?: boolean;
  children?: React.ReactNode;
};

function Callout(props: CalloutProps) {
  return props.children || null;
}

type OverlayProps = {
  bounds: [[number, number], [number, number]];
  image: any;
  opacity?: number;
};

function Overlay(props: OverlayProps) {
  const { bounds, image, opacity = 1 } = props;
  const map = useMap?.();

  useEffect(() => {
    if (!map || !L) return;

    const imageUrl = typeof image === "string" ? image : image?.uri || image;
    const imageBounds: [[number, number], [number, number]] = [
      [Math.min(bounds[0][0], bounds[1][0]), Math.min(bounds[0][1], bounds[1][1])],
      [Math.max(bounds[0][0], bounds[1][0]), Math.max(bounds[0][1], bounds[1][1])],
    ];

    const imageOverlay = L.imageOverlay(imageUrl, imageBounds, {
      opacity: opacity,
    });

    imageOverlay.addTo(map);

    return () => {
      map.removeLayer(imageOverlay);
    };
  }, [map, bounds, image, opacity]);

  return null;
}

type PolylineProps = {
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
};

function Polyline(props: PolylineProps) {
  const { coordinates, strokeColor = "#000", strokeWidth = 2 } = props;
  const map = useMap?.();

  useEffect(() => {
    if (!map || !L || coordinates.length === 0) return;

    const latlngs = coordinates.map((c) => [c.latitude, c.longitude]);
    const polyline = L.polyline(latlngs, {
      color: strokeColor,
      weight: strokeWidth,
      opacity: 0.8,
    });

    polyline.addTo(map);

    return () => {
      map.removeLayer(polyline);
    };
  }, [map, coordinates, strokeColor, strokeWidth]);

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
});

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = MarkerComponent;
module.exports.Callout = Callout;
module.exports.Overlay = Overlay;
module.exports.Polyline = Polyline;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;