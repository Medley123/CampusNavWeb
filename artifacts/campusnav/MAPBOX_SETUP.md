# Mapbox Setup Guide

The web version of CampusNav now uses **Mapbox GL** for interactive mapping instead of the basic mock implementation.

## Installation

The Mapbox dependencies need to be added to `package.json`:

```bash
pnpm add mapbox-gl react-map-gl
```

## Configuration

### 1. Get a Mapbox Token

1. Create a free account at [mapbox.com](https://mapbox.com)
2. Go to your account dashboard and copy your **Public Access Token**
3. The free tier includes up to 25,000 map views per month

### 2. Set Environment Variables

Create a `.env.local` file in the `campusnav` directory:

```env
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

Or for the web build:
```env
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here
```

### 3. Verify CSS Loading

The mock file imports the Mapbox CSS dynamically. Make sure your build process supports CSS imports from `node_modules`.

## Features

The new implementation provides:

- ✅ Real map tiles (Mapbox Outdoors style)
- ✅ Interactive zoom and pan
- ✅ Markers with click handlers
- ✅ Campus overlay image support
- ✅ Polyline routing display
- ✅ Responsive design

## Development

When developing locally:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The map should load automatically on the web version when you access the app.

## Troubleshooting

- **"Mapbox GL not available"** warning: Make sure `mapbox-gl` and `react-map-gl` are installed
- **No map tiles**: Verify your Mapbox token is set correctly in environment variables
- **CSS not loading**: Check that your bundler supports CSS imports from node_modules

## File Location

The Mapbox implementation is in: `mocks/react-native-maps-web.ts`

This file wraps `react-map-gl` to provide the same API as `react-native-maps`, allowing the code to work seamlessly across both mobile and web platforms.
