import { colors } from "../resources/colors";

/**
 * Application configuration constants
 */
export const AppConfig = {
  // Fog system configuration
  fog: {
    defaultDepth: 200,
    defaultStartDistance: 45,
    defaultEndDistance: 950,
    defaultCloseHue: 294,
    defaultDistantHue: 263,
    defaultCloseBrightness: 33,
    defaultDistantBrightness: 25,
    defaultColorStartDistance: 0,
    defaultColorEndDistance: 425,
    saturation: 80,
  },

  // Sky ring configuration
  skyRing: {
    defaultHeight: 37,
    defaultFalloff: 50,
    defaultHue: 213,
    defaultBrightness: 44,
  },

  // Mountain system configuration
  mountains: {
    defaultCount: 26,
    defaultDistance: 900,
    defaultMaxHeight: 160,
    defaultGroundDistance: 900,
    defaultMountainPosition: -40,
    defaultMinHeight: 40,
    defaultWidth: 200,
    defaultDepth: 200,
    defaultColor: 0x2d4a3e,
    defaultGroundColor: 0x1a3a2e,
  },

  // Balloon configuration
  balloon: {
    defaultHeight: 15,
    defaultDistance: 20,
    defaultScale: 2.5,
    defaultColor: colors.steelPink,
  },

  // Star configuration
  stars: {
    defaultCount: 200,
    defaultRadius: 950,
    defaultMinSize: 15,
    defaultMaxSize: 25,
    defaultFadeOffset: 0.1,
  },

  // Camera and controls configuration
  camera: {
    fov: 75,
    near: 0.1,
    far: 5000,
    defaultHeight: 15,
    lookAtDistance: 20,
  },

  controls: {
    movementSpeed: 1.0,
    lookSpeed: 0.1,
    heightMin: 5,
    heightMax: 100,
    verticalSpeed: 2.0,
    maxElevation: 100,
  },

  // Terrain configuration
  terrain: {
    defaultWidth: 64,
    defaultDepth: 64,
    defaultSpacingX: 2,
    defaultSpacingZ: 2,
    defaultMaxHeight: 20,
    defaultNoiseScale: 0.15,
    defaultHeightOffset: -10,
  },

  // Debug configuration
  debug: {
    interval: 60,
    defaultHeight: -1000,
  },

  // UI configuration
  ui: {
    canvasWidth: 256,
    canvasHeight: 64,
    fontFamily: "bold 24px Arial",
    labelFontFamily: "24px Arial",
  },
} as const;