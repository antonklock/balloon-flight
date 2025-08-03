import * as THREE from "three";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GradientMaterial } from "./materials/GradientMaterial";
import { TerrainGenerator } from "./terrain/TerrainGenerator";
import { colors } from "./resources/colors";
import Stats from "three/examples/jsm/libs/stats.module";

// Scene setup
const scene = new THREE.Scene();

// Height-based fog system
const globalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 180.0); // Initialize with fog height value
const fogPlane = new THREE.Vector4();
let fogDepth = 200;
let fogStartDistance = 45; // Distance from camera where fog starts
let fogEndDistance = 950; // Distance from camera where fog is fully opaque (covers sky sphere)
let fogCloseHue = 294; // Hue for close fog
let fogDistantHue = 263; // Hue for distant fog
let fogCloseBrightness = 33; // Brightness for close fog (0-100%)
let fogDistantBrightness = 25; // Brightness for distant fog (0-100%)
let fogColor = hslToRgb(fogCloseHue, 80, fogCloseBrightness); // 80% saturation, variable lightness
let fogColorStartDistance = 0; // Distance where color transition starts
let fogColorEndDistance = 425; // Distance where color transition ends
let skyRingHeight = 37; // Height of the white ring as percentage of sky sphere
let skyRingFalloff = 50; // Falloff distance as percentage of sky sphere
let skyRingHue = 213; // Hue of the ring (0 = white, 360 = back to white)
let skyRingBrightness = 44; // Brightness of the ring (0-100%)

// Initialize fog colors immediately
fogColor = hslToRgb(fogCloseHue, 80, 50); // 80% saturation, 50% lightness

// Store references to foggy materials for updating uniforms
const foggyMaterials: Array<{ material: THREE.Material; uniforms: any }> = [];

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): THREE.Color {
  h = h / 360; // Convert to 0-1 range
  s = s / 100; // Convert to 0-1 range
  l = l / 100; // Convert to 0-1 range

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return new THREE.Color(r + m, g + m, b + m);
}

// Create gradient background
const gradientBackground = new GradientMaterial();
gradientBackground.addToScene(scene);

// Initialize terrain generator with foggy material function
const terrainGenerator = new TerrainGenerator(
  scene,
  (color: number, side?: THREE.Side) =>
    getFoggyMaterial(fogDepth, fogColor, color, side)
);

// Setup rotation slider
const rotationSlider = document.getElementById(
  "rotation-slider"
) as HTMLInputElement;
const rotationValue = document.getElementById(
  "rotation-value"
) as HTMLSpanElement;
const rotationDegrees = document.getElementById(
  "rotation-degrees"
) as HTMLSpanElement;

function updateRotationDisplay(value: number): void {
  rotationValue.textContent = value.toFixed(1);
  rotationDegrees.textContent = Math.round((value * 180) / Math.PI) + "°";
}

rotationSlider.addEventListener("input", (event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  gradientBackground.updateRotation(value);
  updateRotationDisplay(value);
});

// Initialize display
updateRotationDisplay(0);

// Setup star min size slider
const starMinSizeSlider = document.getElementById(
  "star-min-size-slider"
) as HTMLInputElement;
const starMinSizeValue = document.getElementById(
  "star-min-size-value"
) as HTMLSpanElement;

starMinSizeSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  starMinSizeValue.textContent = value.toString();
  gradientBackground.updateStarSizes(value, parseInt(starMaxSizeSlider.value));
});

// Setup star max size slider
const starMaxSizeSlider = document.getElementById(
  "star-max-size-slider"
) as HTMLInputElement;
const starMaxSizeValue = document.getElementById(
  "star-max-size-value"
) as HTMLSpanElement;

starMaxSizeSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  starMaxSizeValue.textContent = value.toString();
  gradientBackground.updateStarSizes(parseInt(starMinSizeSlider.value), value);
});

// Setup star fade offset slider
const starFadeOffsetSlider = document.getElementById(
  "star-fade-offset-slider"
) as HTMLInputElement;
const starFadeOffsetValue = document.getElementById(
  "star-fade-offset-value"
) as HTMLSpanElement;

starFadeOffsetSlider.addEventListener("input", (event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  starFadeOffsetValue.textContent = value.toFixed(2);
  gradientBackground.updateStarFadeOffset(value);

  // Update star opacity based on new fade offset
  updateStarOpacity(value);
});

// Initialize star control displays
starMinSizeValue.textContent = starMinSizeSlider.value;
starMaxSizeValue.textContent = starMaxSizeSlider.value;
starFadeOffsetValue.textContent = starFadeOffsetSlider.value;

// Initialize star fade offset effect
updateStarOpacity(parseFloat(starFadeOffsetSlider.value));

// Function to update star opacity based on fade offset
function updateStarOpacity(fadeOffset: number) {
  scene.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshBasicMaterial
    ) {
      const material = object.material as THREE.MeshBasicMaterial;
      if (
        material.color &&
        material.color.getHex() === 0xffffff &&
        material.transparent
      ) {
        // This is a star - update its opacity
        const starY = object.position.y;
        const horizonHeight = 0;
        const fadeStart = horizonHeight + fadeOffset;
        const fadeEnd = horizonHeight - fadeOffset;

        let opacity = 1.0;
        if (starY < fadeStart) {
          opacity = Math.max(0, (starY - fadeEnd) / (fadeStart - fadeEnd));
        }

        material.opacity = opacity;
        material.needsUpdate = true;
      }
    }
  });
}

// Setup fog distance slider
const fogDistanceSlider = document.getElementById(
  "fog-distance-slider"
) as HTMLInputElement;
const fogDistanceValue = document.getElementById(
  "fog-distance-value"
) as HTMLSpanElement;

fogDistanceSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogDistanceValue.textContent = value.toString();

  // Update fog depth for height-based fog
  fogDepth = value;
  updateAllFoggyMaterials();
});

// Initialize fog distance display
fogDistanceValue.textContent = fogDistanceSlider.value;

// Setup fog start distance slider
const fogStartDistanceSlider = document.getElementById(
  "fog-start-distance-slider"
) as HTMLInputElement;
const fogStartDistanceValue = document.getElementById(
  "fog-start-distance-value"
) as HTMLSpanElement;

fogStartDistanceSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogStartDistanceValue.textContent = value.toString();

  // Update fog start distance
  fogStartDistance = value;
  console.log(`Fog start distance set to: ${fogStartDistance}`);
  console.log(`Foggy materials count: ${foggyMaterials.length}`);
  updateAllFoggyMaterials();
});

// Setup fog end distance slider
const fogEndDistanceSlider = document.getElementById(
  "fog-end-distance-slider"
) as HTMLInputElement;
const fogEndDistanceValue = document.getElementById(
  "fog-end-distance-value"
) as HTMLSpanElement;

fogEndDistanceSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogEndDistanceValue.textContent = value.toString();

  // Update fog end distance
  fogEndDistance = value;
  console.log(`Fog end distance set to: ${fogEndDistance}`);
  updateAllFoggyMaterials();
});

// Initialize fog distance displays
fogStartDistanceValue.textContent = fogStartDistanceSlider.value;
fogEndDistanceValue.textContent = fogEndDistanceSlider.value;

// Initialize fog distance slider values to match the variables
fogDistanceSlider.value = fogDepth.toString();
fogDistanceValue.textContent = fogDepth.toString();

// Setup fog height slider
const fogHeightSlider = document.getElementById(
  "fog-height-slider"
) as HTMLInputElement;
const fogHeightValue = document.getElementById(
  "fog-height-value"
) as HTMLSpanElement;

fogHeightSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogHeightValue.textContent = value.toString();

  // Update fog height by changing the global plane constant
  globalPlane.constant = value;
});

// Function to update all foggy materials (called when fog parameters change)
function updateAllFoggyMaterials() {
  // This function will be called when fog parameters change
  // The materials will automatically update due to the shader uniforms
  console.log(
    `Fog updated - Depth: ${fogDepth}, Start: ${fogStartDistance}, End: ${fogEndDistance}, Height: ${globalPlane.constant}`
  );

  // Update all stored foggy materials
  let materialCount = 0;
  foggyMaterials.forEach(({ material, uniforms }) => {
    materialCount++;
    // Update the uniforms directly
    if (uniforms.fDepth) uniforms.fDepth.value = fogDepth;
    if (uniforms.fStartDistance)
      uniforms.fStartDistance.value = fogStartDistance;
    if (uniforms.fEndDistance) uniforms.fEndDistance.value = fogEndDistance;
    if (uniforms.fColor) uniforms.fColor.value = fogColor;
    if (uniforms.fColorDistant)
      uniforms.fColorDistant.value = hslToRgb(
        fogDistantHue,
        80,
        fogDistantBrightness
      );
    if (uniforms.fColorStartDistance)
      uniforms.fColorStartDistance.value = fogColorStartDistance;
    if (uniforms.fColorEndDistance)
      uniforms.fColorEndDistance.value = fogColorEndDistance;
    if (uniforms.fPlane) uniforms.fPlane.value = fogPlane;

    // Mark material as needing update
    material.needsUpdate = true;
  });
  console.log(
    `Updated ${materialCount} foggy materials with start=${fogStartDistance}, end=${fogEndDistance}`
  );
}

// Function to force shader compilation for all materials
function forceShaderCompilation() {
  console.log("Forcing shader compilation...");

  // Create a temporary scene and camera for shader compilation
  const tempScene = new THREE.Scene();
  const tempCamera = new THREE.PerspectiveCamera();
  const tempRenderer = new THREE.WebGLRenderer();

  // Add all meshes to temp scene to force shader compilation
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      tempScene.add(object.clone());
    }
  });

  // Render once to compile shaders
  tempRenderer.render(tempScene, tempCamera);

  // Clean up
  tempRenderer.dispose();
  console.log("Shader compilation forced");
}

// Function to recreate all foggy materials with new parameters
function recreateAllFoggyMaterials() {
  console.log("Recreating all foggy materials...");

  // Clear the stored materials array
  foggyMaterials.length = 0;

  // Store objects that need material recreation
  const objectsToUpdate: Array<{
    mesh: THREE.Mesh;
    color: number;
    side?: THREE.Side;
  }> = [];

  scene.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material) {
      const material = object.material as any;
      // Check if this is a foggy material by looking for the onBeforeCompile callback
      if (material.onBeforeCompile) {
        // This is a foggy material, store it for recreation
        const color = material.color ? material.color.getHex() : 0x808080;
        const side = material.side || THREE.FrontSide;
        objectsToUpdate.push({ mesh: object, color, side });
      }
    }
  });

  // Recreate materials for each object
  objectsToUpdate.forEach(({ mesh, color, side }) => {
    const newMaterial = getFoggyMaterial(fogDepth, fogColor, color, side);
    // Preserve other material properties
    if (mesh.material) {
      const oldMaterial = mesh.material as any;
      if (oldMaterial.transparent !== undefined)
        newMaterial.transparent = oldMaterial.transparent;
      if (oldMaterial.opacity !== undefined)
        newMaterial.opacity = oldMaterial.opacity;
      if (oldMaterial.wireframe !== undefined)
        newMaterial.wireframe = oldMaterial.wireframe;
      if (oldMaterial.vertexColors !== undefined)
        newMaterial.vertexColors = oldMaterial.vertexColors;
    }
    mesh.material = newMaterial;
  });

  console.log(`Recreated ${objectsToUpdate.length} foggy materials`);
}

// Initialize fog height display
fogHeightValue.textContent = fogHeightSlider.value;

// Setup mountain count slider
const mountainCountSlider = document.getElementById(
  "mountain-count-slider"
) as HTMLInputElement;
const mountainCountValue = document.getElementById(
  "mountain-count-value"
) as HTMLSpanElement;

mountainCountSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  mountainCountValue.textContent = value.toString();

  // Recreate mountains with new count
  recreateMountains();
});

// Setup mountain distance slider
const mountainDistanceSlider = document.getElementById(
  "mountain-distance-slider"
) as HTMLInputElement;
const mountainDistanceValue = document.getElementById(
  "mountain-distance-value"
) as HTMLSpanElement;

mountainDistanceSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  mountainDistanceValue.textContent = value.toString();

  // Recreate mountains with new distance
  recreateMountains();
});

// Setup mountain height slider
const mountainHeightSlider = document.getElementById(
  "mountain-height-slider"
) as HTMLInputElement;
const mountainHeightValue = document.getElementById(
  "mountain-height-value"
) as HTMLSpanElement;

mountainHeightSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  mountainHeightValue.textContent = value.toString();

  // Recreate mountains with new height
  recreateMountains();
});

// Setup ground distance slider
const groundDistanceSlider = document.getElementById(
  "ground-distance-slider"
) as HTMLInputElement;
const groundDistanceValue = document.getElementById(
  "ground-distance-value"
) as HTMLSpanElement;

groundDistanceSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  groundDistanceValue.textContent = value.toString();

  // Recreate mountains with new ground distance
  recreateMountains();
});

// Setup balloon height slider
const balloonHeightSlider = document.getElementById(
  "balloon-height-slider"
) as HTMLInputElement;
const balloonHeightValue = document.getElementById(
  "balloon-height-value"
) as HTMLSpanElement;

balloonHeightSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  balloonHeightValue.textContent = value.toString();
  console.log("Balloon height changed to:", value);

  // Balloon position will be updated in the animation loop
  // No need to update here since it follows the camera
});

// Setup balloon scale slider
const balloonScaleSlider = document.getElementById(
  "balloon-scale-slider"
) as HTMLInputElement;
const balloonScaleValue = document.getElementById(
  "balloon-scale-value"
) as HTMLSpanElement;

balloonScaleSlider.addEventListener("input", (event) => {
  const value = parseFloat((event.target as HTMLInputElement).value);
  balloonScaleValue.textContent = value.toFixed(1);
  console.log("Balloon scale changed to:", value);

  // Update balloon scale
  if (balloon) {
    balloon.scale.set(value, value, value);
  }
});

// Setup balloon distance slider
const balloonDistanceSlider = document.getElementById(
  "balloon-distance-slider"
) as HTMLInputElement;
const balloonDistanceValue = document.getElementById(
  "balloon-distance-value"
) as HTMLSpanElement;

balloonDistanceSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  balloonDistanceValue.textContent = value.toString();
  console.log("Balloon distance changed to:", value);

  // Balloon distance will be updated in the animation loop
});

// Setup fog color start distance slider
const fogColorStartSlider = document.getElementById(
  "fog-color-start-slider"
) as HTMLInputElement;
const fogColorStartValue = document.getElementById(
  "fog-color-start-value"
) as HTMLSpanElement;

fogColorStartSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogColorStartValue.textContent = value.toString();
  fogColorStartDistance = value;
  console.log("Fog color start distance changed to:", value);

  // Update all foggy materials with new color distance
  updateAllFoggyMaterials();
});

// Setup fog color end distance slider
const fogColorEndSlider = document.getElementById(
  "fog-color-end-slider"
) as HTMLInputElement;
const fogColorEndValue = document.getElementById(
  "fog-color-end-value"
) as HTMLSpanElement;

fogColorEndSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogColorEndValue.textContent = value.toString();
  fogColorEndDistance = value;
  console.log("Fog color end distance changed to:", value);

  // Update all foggy materials with new color distance
  updateAllFoggyMaterials();
});

// Setup fog close hue slider
const fogCloseHueSlider = document.getElementById(
  "fog-close-hue-slider"
) as HTMLInputElement;
const fogCloseHueValue = document.getElementById(
  "fog-close-hue-value"
) as HTMLSpanElement;

fogCloseHueSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogCloseHueValue.textContent = value.toString();
  fogCloseHue = value;
  console.log("Fog close hue changed to:", value);

  // Update fog color based on new hue and brightness
  fogColor = hslToRgb(fogCloseHue, 80, fogCloseBrightness);

  // Update all foggy materials with new color
  updateAllFoggyMaterials();
});

// Setup fog distant hue slider
const fogDistantHueSlider = document.getElementById(
  "fog-distant-hue-slider"
) as HTMLInputElement;
const fogDistantHueValue = document.getElementById(
  "fog-distant-hue-value"
) as HTMLSpanElement;

fogDistantHueSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogDistantHueValue.textContent = value.toString();
  fogDistantHue = value;
  console.log("Fog distant hue changed to:", value);

  // Update all foggy materials with new distant color
  updateAllFoggyMaterials();
});

// Setup fog close brightness slider
const fogCloseBrightnessSlider = document.getElementById(
  "fog-close-brightness-slider"
) as HTMLInputElement;
const fogCloseBrightnessValue = document.getElementById(
  "fog-close-brightness-value"
) as HTMLSpanElement;

fogCloseBrightnessSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogCloseBrightnessValue.textContent = value.toString();
  fogCloseBrightness = value;
  console.log("Fog close brightness changed to:", value);

  // Update fog color based on new brightness
  fogColor = hslToRgb(fogCloseHue, 80, fogCloseBrightness);

  // Update all foggy materials with new color
  updateAllFoggyMaterials();
});

// Setup fog distant brightness slider
const fogDistantBrightnessSlider = document.getElementById(
  "fog-distant-brightness-slider"
) as HTMLInputElement;
const fogDistantBrightnessValue = document.getElementById(
  "fog-distant-brightness-value"
) as HTMLSpanElement;

fogDistantBrightnessSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  fogDistantBrightnessValue.textContent = value.toString();
  fogDistantBrightness = value;
  console.log("Fog distant brightness changed to:", value);

  // Update all foggy materials with new distant color
  updateAllFoggyMaterials();
});

// Setup sky ring height slider
const skyRingHeightSlider = document.getElementById(
  "sky-ring-height-slider"
) as HTMLInputElement;
const skyRingHeightValue = document.getElementById(
  "sky-ring-height-value"
) as HTMLSpanElement;

skyRingHeightSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  skyRingHeightValue.textContent = value.toString();
  skyRingHeight = value;
  console.log("Sky ring height changed to:", value);

  // Update sky sphere material
  if (skyMaterial && skyMaterial.uniforms) {
    skyMaterial.uniforms.ringHeight.value = skyRingHeight / 100.0;
  }
});

// Setup sky ring falloff slider
const skyRingFalloffSlider = document.getElementById(
  "sky-ring-falloff-slider"
) as HTMLInputElement;
const skyRingFalloffValue = document.getElementById(
  "sky-ring-falloff-value"
) as HTMLSpanElement;

skyRingFalloffSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  skyRingFalloffValue.textContent = value.toString();
  skyRingFalloff = value;
  console.log("Sky ring falloff changed to:", value);

  // Update sky sphere material
  if (skyMaterial && skyMaterial.uniforms) {
    skyMaterial.uniforms.ringFalloff.value = skyRingFalloff / 100.0;
  }
});

// Setup sky ring hue slider
const skyRingHueSlider = document.getElementById(
  "sky-ring-hue-slider"
) as HTMLInputElement;
const skyRingHueValue = document.getElementById(
  "sky-ring-hue-value"
) as HTMLSpanElement;

skyRingHueSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  skyRingHueValue.textContent = value.toString();
  skyRingHue = value;
  console.log("Sky ring hue changed to:", value);

  // Update sky sphere material
  if (skyMaterial && skyMaterial.uniforms) {
    skyMaterial.uniforms.ringColor.value = hslToRgb(
      skyRingHue,
      80,
      skyRingBrightness
    );
  }
});

// Setup sky ring brightness slider
const skyRingBrightnessSlider = document.getElementById(
  "sky-ring-brightness-slider"
) as HTMLInputElement;
const skyRingBrightnessValue = document.getElementById(
  "sky-ring-brightness-value"
) as HTMLSpanElement;

skyRingBrightnessSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  skyRingBrightnessValue.textContent = value.toString();
  skyRingBrightness = value;
  console.log("Sky ring brightness changed to:", value);

  // Update sky sphere material
  if (skyMaterial && skyMaterial.uniforms) {
    skyMaterial.uniforms.ringColor.value = hslToRgb(
      skyRingHue,
      80,
      skyRingBrightness
    );
  }
});

// Initialize fog slider values from JavaScript variables
fogColorStartSlider.value = fogColorStartDistance.toString();
fogColorStartValue.textContent = fogColorStartDistance.toString();

fogColorEndSlider.value = fogColorEndDistance.toString();
fogColorEndValue.textContent = fogColorEndDistance.toString();

fogCloseHueSlider.value = fogCloseHue.toString();
fogCloseHueValue.textContent = fogCloseHue.toString();

fogDistantHueSlider.value = fogDistantHue.toString();
fogDistantHueValue.textContent = fogDistantHue.toString();

// Initialize fog brightness sliders
fogCloseBrightnessSlider.value = fogCloseBrightness.toString();
fogCloseBrightnessValue.textContent = fogCloseBrightness.toString();

fogDistantBrightnessSlider.value = fogDistantBrightness.toString();
fogDistantBrightnessValue.textContent = fogDistantBrightness.toString();

// Initialize sky ring slider values
skyRingHeightSlider.value = skyRingHeight.toString();
skyRingHeightValue.textContent = skyRingHeight.toString();

skyRingFalloffSlider.value = skyRingFalloff.toString();
skyRingFalloffValue.textContent = skyRingFalloff.toString();

// Initialize sky ring hue and brightness sliders
skyRingHueSlider.value = skyRingHue.toString();
skyRingHueValue.textContent = skyRingHue.toString();

skyRingBrightnessSlider.value = skyRingBrightness.toString();
skyRingBrightnessValue.textContent = skyRingBrightness.toString();

// Initialize fog end distance slider
fogEndDistanceSlider.value = fogEndDistance.toString();
fogEndDistanceValue.textContent = fogEndDistance.toString();

// Update fog materials with initial values
updateAllFoggyMaterials();

// Setup mountain position slider
const mountainPositionSlider = document.getElementById(
  "mountain-position-slider"
) as HTMLInputElement;
const mountainPositionValue = document.getElementById(
  "mountain-position-value"
) as HTMLSpanElement;

mountainPositionSlider.addEventListener("input", (event) => {
  const value = parseInt((event.target as HTMLInputElement).value);
  mountainPositionValue.textContent = value.toString();

  // Recreate mountains with new position
  recreateMountains();
});

// Function to recreate mountains with current slider values
function recreateMountains() {
  // Remove existing mountains and ground plane
  if (distantMountains) {
    distantMountains.forEach((mountain) => {
      scene.remove(mountain);
      mountain.geometry.dispose();
      if (mountain.material instanceof THREE.Material) {
        mountain.material.dispose();
      }
    });
  }

  if (groundPlane) {
    scene.remove(groundPlane);
    groundPlane.geometry.dispose();
    if (groundPlane.material instanceof THREE.Material) {
      groundPlane.material.dispose();
    }
  }

  // Create new mountain system with current settings
  const newMountainSystem = terrainGenerator.createDistantMountains({
    count: parseInt(mountainCountSlider.value),
    distance: parseInt(groundDistanceSlider.value),
    minHeight: 40,
    maxHeight: parseInt(mountainHeightSlider.value),
    width: 200,
    depth: 200,
    color: 0x2d4a3e,
    groundColor: 0x1a3a2e,
    mountainPosition: parseInt(mountainPositionSlider.value),
  });

  // Update the references
  distantMountains = newMountainSystem.mountains;
  groundPlane = newMountainSystem.groundPlane;
}

// Mountain system configuration - single source of truth
const mountainConfig = {
  count: 26,
  distance: 900,
  maxHeight: 160,
  groundDistance: 900,
  mountainPosition: -40,
};

// Function to sync slider values with Three.js configuration
function syncSliderValues() {
  // Update slider values and displays
  mountainCountSlider.value = mountainConfig.count.toString();
  mountainCountValue.textContent = mountainConfig.count.toString();

  mountainDistanceSlider.value = mountainConfig.distance.toString();
  mountainDistanceValue.textContent = mountainConfig.distance.toString();

  mountainHeightSlider.value = mountainConfig.maxHeight.toString();
  mountainHeightValue.textContent = mountainConfig.maxHeight.toString();

  groundDistanceSlider.value = mountainConfig.groundDistance.toString();
  groundDistanceValue.textContent = mountainConfig.groundDistance.toString();

  mountainPositionSlider.value = mountainConfig.mountainPosition.toString();
  mountainPositionValue.textContent =
    mountainConfig.mountainPosition.toString();
}

// Initialize slider values from Three.js configuration
syncSliderValues();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Test that the canvas is clickable
console.log("Canvas element:", renderer.domElement);
console.log(
  "Canvas style pointer-events:",
  renderer.domElement.style.pointerEvents
);

// Ensure canvas is clickable
renderer.domElement.style.pointerEvents = "auto";
renderer.domElement.style.cursor = "pointer";

// Add a simple click test
renderer.domElement.addEventListener("click", () => {
  console.log("Canvas clicked!");
});

// Setup FirstPersonControls
const controls = new FirstPersonControls(camera, renderer.domElement);
controls.movementSpeed = 1.0;
controls.lookSpeed = 0.1;
controls.lookVertical = true;
controls.constrainVertical = true;
controls.verticalMin = 0;
controls.verticalMax = Math.PI;
controls.activeLook = true;
controls.heightCoef = 1;
controls.heightMin = 5; // Minimum height above terrain
controls.heightMax = 100; // Maximum height limit
controls.enabled = false; // Disable controls initially

// Experience state
let isExperienceActive = false;

// Debug variables
let debugCounter = 0;
const DEBUG_INTERVAL = 60; // Print debug info every 60 frames (about 1 second at 60fps)

// Vertical movement variables
let isAscending = false;
let isDescending = false;
const VERTICAL_SPEED = 2.0; // Units per second
const MAX_ELEVATION = 100; // Maximum height above ground

// Pause state
let isPaused = false;

// Debug UI elements
const debugPanel = document.getElementById("debug-panel") as HTMLElement;
const debugCameraPos = document.getElementById(
  "debug-camera-pos"
) as HTMLElement;
const debugTerrainHeight = document.getElementById(
  "debug-terrain-height"
) as HTMLElement;
const debugDistance = document.getElementById("debug-distance") as HTMLElement;
const debugRequired = document.getElementById("debug-required") as HTMLElement;
const debugCollision = document.getElementById(
  "debug-collision"
) as HTMLElement;
const debugTerrainStatus = document.getElementById(
  "debug-terrain-status"
) as HTMLElement;
const debugExperience = document.getElementById(
  "debug-experience"
) as HTMLElement;
const debugVertical = document.getElementById("debug-vertical") as HTMLElement;
const debugPause = document.getElementById("debug-pause") as HTMLElement;

// Controls panel element
const controlsPanel = document.querySelector(".controls") as HTMLElement;

// Debug UI visibility state
let isDebugUIVisible = false;

// Initialize UI elements as hidden
debugPanel.style.display = "none";
controlsPanel.style.display = "none";
document.body.style.cursor = "none";
renderer.domElement.style.cursor = "none";

// Handle key events
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isExperienceActive) {
    // Reset experience state
    isExperienceActive = false;
    controls.enabled = false;

    // Show black overlay again
    blackOverlay.style.display = "block";
    blackOverlay.style.opacity = "1";

    // Reset camera position
    camera.position.set(0, 15, 0);
    camera.lookAt(0, 0, 20);

    // Re-add button to scene
    scene.add(sceneButton);
    scene.add(buttonText);
  }

  // Toggle debug UI with H key
  if (event.key === "h" || event.key === "H") {
    isDebugUIVisible = !isDebugUIVisible;
    debugPanel.style.display = isDebugUIVisible ? "block" : "none";
    controlsPanel.style.display = isDebugUIVisible ? "block" : "none";
    stats.dom.style.display = isDebugUIVisible ? "block" : "none";
    document.body.style.cursor = isDebugUIVisible ? "pointer" : "none";
    renderer.domElement.style.cursor = isDebugUIVisible ? "pointer" : "none";
    console.log(isDebugUIVisible ? "Debug UI SHOWN" : "Debug UI HIDDEN");
  }

  // Pause controls with spacebar (only when experience is active)
  if (event.key === " " && isExperienceActive) {
    isPaused = !isPaused;
    controls.enabled = !isPaused;
    console.log(isPaused ? "Controls PAUSED" : "Controls RESUMED");
  }

  // Vertical movement controls (only when experience is active and not paused)
  if (isExperienceActive && !isPaused) {
    if (event.key === "e" || event.key === "E") {
      isAscending = true;
    }
    if (event.key === "q" || event.key === "Q") {
      isDescending = true;
    }
  }
});

// Handle key release
document.addEventListener("keyup", (event) => {
  if (isExperienceActive) {
    if (event.key === "e" || event.key === "E") {
      isAscending = false;
    }
    if (event.key === "q" || event.key === "Q") {
      isDescending = false;
    }
  }
});

// Get black overlay
const blackOverlay = document.getElementById("black-overlay") as HTMLElement;

// Create 3D button in the scene
const buttonGeometry = new THREE.PlaneGeometry(2, 0.5);
const buttonMaterial = getFoggyMaterial(fogDepth, fogColor, 0xff0000);
buttonMaterial.transparent = true;
buttonMaterial.opacity = 1.0;
const sceneButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
sceneButton.position.set(0, 0, 20);
scene.add(sceneButton);

// Add text to the button
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d")!;
canvas.width = 256;
canvas.height = 64;
context.fillStyle = "#d400e1";
context.font = "bold 24px Arial";
context.textAlign = "center";
context.fillText("BEGIN", 128, 40);

const buttonTexture = new THREE.CanvasTexture(canvas);
const buttonTextMaterial = new THREE.MeshBasicMaterial({
  map: buttonTexture,
  transparent: true,
  opacity: 0.9,
});
const buttonText = new THREE.Mesh(buttonGeometry, buttonTextMaterial);
buttonText.position.set(0, 0, 20.1);
scene.add(buttonText);

// Mouse tracking for experience (no longer needed for button detection)

// Handle any click on the canvas to start the experience
renderer.domElement.addEventListener("mousedown", (event) => {
  console.log("Mouse down event detected!");
  if (!isExperienceActive) {
    console.log("Canvas clicked! Starting experience...");
    isExperienceActive = true;

    // Enable FirstPersonControls for the experience
    controls.enabled = true;

    // Remove 3D button from scene
    scene.remove(sceneButton);
    scene.remove(buttonText);

    // Fade out black overlay to reveal scene
    blackOverlay.style.opacity = "0";
    setTimeout(() => {
      blackOverlay.style.display = "none";
    }, 500);
  }
});

// Create a simple cube
const geometry = new THREE.BoxGeometry();
const material = getFoggyMaterial(fogDepth, fogColor, 0x00ff00);
material.wireframe = true;
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Create horizon line
const horizonGeometry = new THREE.BufferGeometry();
const horizonPoints = [];
const segments = 360;

for (let i = 0; i <= segments; i++) {
  const angle = (i / segments) * Math.PI * 2;
  const radius = 50;
  horizonPoints.push(
    Math.cos(angle) * radius, // x
    0, // y (horizon level)
    Math.sin(angle) * radius // z
  );
}

horizonGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(horizonPoints, 3)
);
const horizonMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  linewidth: 2,
});
const horizonLine = new THREE.Line(horizonGeometry, horizonMaterial);
scene.add(horizonLine);

// Create debug helpers - up and down markers
const createDebugMarker = (y: number, color: number) => {
  const markerGeometry = new THREE.SphereGeometry(2, 8, 8);
  const markerMaterial = getFoggyMaterial(fogDepth, fogColor, color);
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.position.set(0, y, 0);
  return marker;
};

// Up marker (above player)
const upMarker = createDebugMarker(20, 0x00ff00); // Green
scene.add(upMarker);

// Down marker (below player)
const downMarker = createDebugMarker(-20, 0xff0000); // Red
scene.add(downMarker);

// Add labels for the markers
const createLabel = (text: string, y: number, color: number) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = 256;
  canvas.height = 64;

  context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  context.font = "24px Arial";
  context.textAlign = "center";
  context.fillText(text, 128, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.set(0, y + 5, 0);
  sprite.scale.set(10, 2.5, 1);

  return sprite;
};

const upLabel = createLabel("UP", 20, 0x00ff00);
const downLabel = createLabel("DOWN", -20, 0xff0000);
scene.add(upLabel);
scene.add(downLabel);

// Position camera above the terrain to avoid clipping through ground
camera.position.set(0, 15, 0); // Start 15 units above ground
camera.lookAt(0, 0, 20); // Look at the button initially
controls.update(0.016); // Pass delta time (approximately 60fps)

// Create terrain below the camera
// You can either use a heightmap image or procedural terrain
// For now, we'll use procedural terrain since we don't have a heightmap image
const terrain = terrainGenerator.createProceduralTerrain({
  width: 64,
  depth: 64,
  spacingX: 2,
  spacingZ: 2,
  maxHeight: 20,
  noiseScale: 0.15, // Increased noise scale for more dramatic displacement
});

// Position terrain much closer to the camera
terrain.position.y = -10; // Move terrain up much closer to the camera

// Create distant mountains with ground plane
const mountainSystem = terrainGenerator.createDistantMountains({
  count: mountainConfig.count,
  distance: mountainConfig.groundDistance,
  minHeight: 40,
  maxHeight: mountainConfig.maxHeight,
  width: 200, // Wider segments for better overlap
  depth: 200,
  color: 0x2d4a3e, // Dark green-gray for mountains
  groundColor: 0x1a3a2e, // Darker green for ground
  mountainPosition: mountainConfig.mountainPosition,
});

let distantMountains = mountainSystem.mountains;
let groundPlane = mountainSystem.groundPlane;

// Load balloon mesh
const balloonLoader = new OBJLoader();
let balloon: THREE.Group | null = null;

balloonLoader.load(
  "./assets/meshes/balloon_v1.obj",
  (object) => {
    console.log("Balloon loaded successfully");
    balloon = object;

    // Scale the balloon to appropriate size
    balloon.scale.set(2.5, 2.5, 2.5);

    // Position the balloon above the terrain
    balloon.position.set(0, -5, 0);

    // Apply regular material to all balloon parts
    balloon.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = new THREE.MeshStandardMaterial({
          color: parseInt(colors.steelPink.replace("#", "0x")), // Steelpink color for balloon
          side: THREE.DoubleSide,
          metalness: 0.1,
          roughness: 0.8,
        });
        child.material = material;
      }
    });

    scene.add(balloon);
    console.log("Balloon added to scene at position:", balloon.position);
  },
  (progress) => {
    console.log(
      "Loading balloon...",
      (progress.loaded / progress.total) * 100 + "%"
    );
  },
  (error) => {
    console.error("Error loading balloon:", error);
  }
);

// Add lighting for the terrain
const terrainLight = new THREE.DirectionalLight(0xffffff, 0.8);
terrainLight.position.set(100, 100, 100);
scene.add(terrainLight);

// Add ambient light for better terrain visibility
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

// Create test cubes at various heights and distances
const cubeGeometry = new THREE.BoxGeometry(5, 5, 5);
const createTestCube = (x: number, y: number, z: number, color: number) => {
  const material = getFoggyMaterial(fogDepth, fogColor, color);
  material.transparent = true;
  material.opacity = 0.8;
  const cube = new THREE.Mesh(cubeGeometry, material);
  cube.position.set(x, y, z);
  return cube;
};

// Add test cubes at different heights and distances
scene.add(
  createTestCube(20, 5, -30, parseInt(colors.yellow.replace("#", "0x")))
); // Low, close
scene.add(
  createTestCube(40, 15, -60, parseInt(colors.yellow.replace("#", "0x")))
); // Medium height, medium distance
scene.add(
  createTestCube(60, 30, -90, parseInt(colors.yellow.replace("#", "0x")))
); // High, far
scene.add(
  createTestCube(80, 10, -120, parseInt(colors.yellow.replace("#", "0x")))
); // Low, very far
scene.add(
  createTestCube(100, 40, -150, parseInt(colors.yellow.replace("#", "0x")))
); // High, very far
scene.add(
  createTestCube(-30, 25, -80, parseInt(colors.yellow.replace("#", "0x")))
); // Medium height, medium distance
scene.add(
  createTestCube(-50, 5, -100, parseInt(colors.yellow.replace("#", "0x")))
); // Low, far
scene.add(
  createTestCube(-70, 35, -130, parseInt(colors.yellow.replace("#", "0x")))
); // High, very far

// Create sky sphere with equatorial ring
const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    ringHeight: { value: skyRingHeight / 100.0 },
    ringFalloff: { value: skyRingFalloff / 100.0 },
    skyColor: { value: new THREE.Color(colors.deepBlue) },
    ringColor: { value: hslToRgb(skyRingHue, 80, skyRingBrightness) },
    fogPlane: { value: fogPlane },
    fogDepth: { value: fogDepth },
    fogColor: { value: fogColor },
    fogColorDistant: { value: hslToRgb(fogDistantHue, 80, 50) },
    fogStartDistance: { value: fogStartDistance },
    fogEndDistance: { value: fogEndDistance },
    fogColorStartDistance: { value: fogColorStartDistance },
    fogColorEndDistance: { value: fogColorEndDistance },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    varying vec3 vWorldNormal;
    
    void main() {
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vViewPosition = -(modelViewMatrix * vec4(position, 1.0)).xyz;
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float ringHeight;
    uniform float ringFalloff;
    uniform vec3 skyColor;
    uniform vec3 ringColor;
    uniform vec4 fogPlane;
    uniform float fogDepth;
    uniform vec3 fogColor;
    uniform vec3 fogColorDistant;
    uniform float fogStartDistance;
    uniform float fogEndDistance;
    uniform float fogColorStartDistance;
    uniform float fogColorEndDistance;
    
    varying vec3 vWorldPosition;
    varying vec3 vViewPosition;
    varying vec3 vWorldNormal;
    
    void main() {
      // Calculate height factor (0 at equator, 1 at poles) using world space
      float heightFactor = abs(vWorldNormal.y);
      
      // Create ring effect
      float ringFactor = smoothstep(ringHeight - ringFalloff, ringHeight, heightFactor);
      vec3 finalColor = mix(ringColor, skyColor, ringFactor);
      
      // Apply fog effect
      float planeFog = 0.0;
      float distanceFog = 0.0;
      
      float viewDistance = length(vViewPosition);
      
      // Distance fog: 0 at start distance, 1 at end distance, no fog beyond end distance
      if (viewDistance <= fogStartDistance) {
        distanceFog = 0.0; // No fog within start distance
      } else if (viewDistance >= fogEndDistance) {
        distanceFog = 0.0; // No fog beyond end distance (objects become visible again)
      } else {
        distanceFog = smoothstep(fogStartDistance, fogEndDistance, viewDistance);
      }
      
      // Height fog
      planeFog = smoothstep(0.0, -fogDepth, dot(vViewPosition, fogPlane.xyz) - fogPlane.w);
      
      float totalFog = max(distanceFog, planeFog);
      
      // Interpolate between close and distant fog colors
      float colorBlendFactor = smoothstep(fogColorStartDistance, fogColorEndDistance, viewDistance);
      vec3 fogColorBlended = mix(fogColor, fogColorDistant, colorBlendFactor);
      
      // Don't apply fog to the sky sphere itself
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  side: THREE.BackSide,
});

const skySphere = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(skySphere);

// Add sky material to foggy materials for updates
foggyMaterials.push({ material: skyMaterial, uniforms: skyMaterial.uniforms });

// Add white dots (stars) to the sky
const starGeometry = new THREE.SphereGeometry(1, 8, 8);

// Create stars at random positions on the sky sphere
for (let i = 0; i < 200; i++) {
  // Random position on a sphere
  const theta = Math.random() * Math.PI * 2; // Random angle around Y axis
  const phi = Math.acos(Math.random() * 2 - 1); // Random angle from Y axis
  const radius = 950; // Slightly inside the sky sphere

  const starX = radius * Math.sin(phi) * Math.cos(theta);
  const starY = radius * Math.cos(phi);
  const starZ = radius * Math.sin(phi) * Math.sin(theta);

  // Calculate opacity based on height (Y position)
  const horizonHeight = 0; // Horizon level
  const fadeOffset = parseFloat(starFadeOffsetSlider.value);
  const fadeStart = horizonHeight + fadeOffset;
  const fadeEnd = horizonHeight - fadeOffset;

  let opacity = 1.0;
  if (starY < fadeStart) {
    opacity = Math.max(0, (starY - fadeEnd) / (fadeStart - fadeEnd));
  }

  const starMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: opacity,
    fog: false, // Disable fog for stars
  });

  const star = new THREE.Mesh(starGeometry, starMaterial);
  star.position.set(starX, starY, starZ);

  // Random size - middle ground
  const scale = 0.5 + Math.random() * 1.0;
  star.scale.set(scale, scale, scale);

  scene.add(star);
}

// Function to create terrain from heightmap (uncomment and modify path when you have a heightmap image)
/*
async function createHeightmapTerrain() {
  try {
    const heightmapTerrain = await terrainGenerator.createTerrainFromHeightmap(
      './src/resources/heightmap.png', // Path to your heightmap image
      {
        width: 256,
        depth: 256,
        spacingX: 2,
        spacingZ: 2,
        heightOffset: 2,
        maxHeight: 50
      }
    );
    heightmapTerrain.position.y = -100;
    console.log('Heightmap terrain created successfully');
  } catch (error) {
    console.error('Failed to create heightmap terrain:', error);
  }
}

// Uncomment the line below to use heightmap terrain instead of procedural
// createHeightmapTerrain();
*/

// Raycast-based terrain collision detection
function checkTerrainCollision(cameraPosition: THREE.Vector3): number {
  if (!terrain) return -1000; // Default height if no terrain

  // Create a ray pointing straight down from the camera
  const rayOrigin = cameraPosition.clone();
  const rayDirection = new THREE.Vector3(0, -1, 0); // Pointing down
  const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);

  // Cast the ray against the terrain
  const intersects = raycaster.intersectObject(terrain);

  if (intersects.length > 0) {
    // Return the height of the first intersection point
    return intersects[0].point.y;
  }

  // If no intersection, return a very low value
  return -1000;
}

// Function to create foggy material with height-based fog
function getFoggyMaterial(
  fogDepth: number,
  fogColor: THREE.Color,
  color: number,
  side: THREE.Side = THREE.FrontSide
) {
  let material = new THREE.MeshStandardMaterial({
    color: color,
    side: side,
    metalness: 0.5,
    roughness: 0.75,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.fPlane = { value: fogPlane };
    shader.uniforms.fDepth = { value: fogDepth };
    shader.uniforms.fColor = { value: fogColor };
    shader.uniforms.fColorDistant = { value: new THREE.Color(colors.deepBlue) };
    shader.uniforms.fStartDistance = { value: fogStartDistance };
    shader.uniforms.fEndDistance = { value: fogEndDistance };
    shader.uniforms.fColorStartDistance = { value: fogColorStartDistance };
    shader.uniforms.fColorEndDistance = { value: fogColorEndDistance };

    // Store reference to this material and its uniforms for later updates
    foggyMaterials.push({ material, uniforms: shader.uniforms });

    shader.fragmentShader =
      `
      uniform vec4 fPlane;
      uniform float fDepth;
      uniform vec3 fColor;
      uniform vec3 fColorDistant;
      uniform float fStartDistance;
      uniform float fEndDistance;
      uniform float fColorStartDistance;
      uniform float fColorEndDistance;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
      float planeFog = 0.0;
      float distanceFog = 0.0;
      
      // Calculate view distance once
      float viewDistance = length(vViewPosition);
      
      // Distance fog: 0 at start distance, 1 at end distance, no fog beyond end distance
      if (viewDistance <= fStartDistance) {
        distanceFog = 0.0; // No fog within start distance
      } else if (viewDistance >= fEndDistance) {
        distanceFog = 0.0; // No fog beyond end distance (objects become visible again)
      } else {
        distanceFog = smoothstep(fStartDistance, fEndDistance, viewDistance);
      }
      
      // Height fog: controls overall intensity based on height
      planeFog = smoothstep(0.0, -fDepth, dot( vViewPosition, fPlane.xyz) - fPlane.w);
      
      // Combine: distance fog provides the base, height fog adds to it
      float totalFog = max(distanceFog, planeFog);
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <fog_fragment>`,
      `#include <fog_fragment>
       // Apply fog with smooth falloff around start distance
       float falloffStart = fStartDistance * 0.7; // Start falloff at 70% of start distance
       float falloffFactor = smoothstep(falloffStart, fStartDistance, viewDistance);
       
       // Interpolate between close and distant fog colors based on distance
       float colorBlendFactor = smoothstep(fColorStartDistance, fColorEndDistance, viewDistance);
       vec3 fogColorBlended = mix(fColor, fColorDistant, colorBlendFactor);
       
       gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColorBlended, totalFog * falloffFactor );
      `
    );
  };

  // Force the material to compile its shader immediately
  material.needsUpdate = true;

  return material;
}

// Function to update fog plane based on camera view
function updateFogPlane(camera: THREE.Camera) {
  const viewNormalMatrix = new THREE.Matrix3();
  const plane = new THREE.Plane();

  viewNormalMatrix.getNormalMatrix(camera.matrixWorldInverse);
  plane
    .copy(globalPlane)
    .applyMatrix4(camera.matrixWorldInverse, viewNormalMatrix);
  fogPlane.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
}

// Animation loop
function animate(): void {
  requestAnimationFrame(animate);

  // Always update debug info regardless of experience state
  const terrainHeight = checkTerrainCollision(camera.position);
  const minHeightAboveTerrain = 5; // Minimum height above terrain
  const requiredHeight = terrainHeight + minHeightAboveTerrain;
  const distanceToGround = camera.position.y - terrainHeight;

  // Debug logging and UI updates
  debugCounter++;

  // Update UI debug panel every frame
  debugCameraPos.textContent = `Camera: (${camera.position.x.toFixed(
    2
  )}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`;
  debugTerrainHeight.textContent = `Terrain: ${terrainHeight.toFixed(2)}`;
  debugDistance.textContent = `Distance: ${distanceToGround.toFixed(2)}`;
  debugRequired.textContent = `Required: ${requiredHeight.toFixed(2)}`;
  debugCollision.textContent = `Collision: ${
    camera.position.y < requiredHeight ? "YES" : "NO"
  }`;
  debugTerrainStatus.textContent = `Terrain: ${terrain ? "EXISTS" : "NULL"}`;
  debugExperience.textContent = `Experience: ${
    isExperienceActive ? "ACTIVE" : "INACTIVE"
  }`;

  // Update vertical movement status
  let verticalStatus = "NONE";
  if (isExperienceActive) {
    if (isAscending && isDescending) {
      verticalStatus = "BOTH";
    } else if (isAscending) {
      verticalStatus = "UP (E)";
    } else if (isDescending) {
      verticalStatus = "DOWN (Q)";
    }
  }
  debugVertical.textContent = `Vertical: ${verticalStatus}`;
  debugPause.textContent = `Pause: ${isPaused ? "YES" : "NO"}`;

  // Add balloon status to debug panel
  const balloonStatus = document.getElementById(
    "balloon-status"
  ) as HTMLElement;
  if (balloonStatus) {
    balloonStatus.textContent = `Balloon: ${balloon ? "LOADED" : "LOADING..."}`;
  }

  // Reset debug counter
  if (debugCounter >= DEBUG_INTERVAL) {
    debugCounter = 0;
  }

  if (isExperienceActive && !isPaused) {
    // For FirstPersonControls, we need to update the controls with delta time
    controls.update(0.016); // Pass delta time (approximately 60fps)

    // Handle vertical movement
    const deltaTime = 0.016; // Approximately 60fps
    const verticalDelta = VERTICAL_SPEED * deltaTime;

    if (isAscending) {
      // Check if we're below max elevation
      const terrainHeight = checkTerrainCollision(camera.position);
      const maxAllowedHeight = terrainHeight + MAX_ELEVATION;

      if (camera.position.y < maxAllowedHeight) {
        camera.position.y += verticalDelta;
        // Don't exceed max elevation
        if (camera.position.y > maxAllowedHeight) {
          camera.position.y = maxAllowedHeight;
        }
      }
    }

    if (isDescending) {
      camera.position.y -= verticalDelta;
    }

    // Ensure camera doesn't go below terrain
    if (camera.position.y < requiredHeight) {
      camera.position.y = requiredHeight;
    }
  } else if (isExperienceActive && isPaused) {
    // Experience is active but paused - don't update controls or movement
  } else {
    // Update FirstPersonControls only when experience is not active
    controls.update(0.016); // Pass delta time (approximately 60fps)
  }

  // Update fog plane based on camera view
  updateFogPlane(camera);

  // Update balloon position to follow camera
  if (balloon) {
    const balloonHeight = parseInt(balloonHeightSlider.value);
    const balloonDistance = parseInt(balloonDistanceSlider.value);

    // Position balloon in front of the camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Place balloon at specified distance in front of the camera
    balloon.position.x =
      camera.position.x + cameraDirection.x * balloonDistance;
    balloon.position.z =
      camera.position.z + cameraDirection.z * balloonDistance;
    balloon.position.y = camera.position.y + balloonHeight; // Offset above camera

    // Debug balloon position and values (uncomment to troubleshoot)
    // console.log(`Balloon: (${balloon.position.x.toFixed(2)}, ${balloon.position.y.toFixed(2)}, ${balloon.position.z.toFixed(2)})`);
    // console.log(`Height: ${balloonHeight}, Distance: ${balloonDistance}, Scale: ${balloon.scale.x.toFixed(2)}`);
  }

  // Rotate the cube
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);

  stats.update();
}

// Handle window resize
function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", onWindowResize);

// Add Stats
const stats = new Stats();
document.body.appendChild(stats.dom);

// Start the animation
animate();

console.log("Three.js TypeScript site is running!");
