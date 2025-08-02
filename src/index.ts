import * as THREE from "three";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
import { GradientMaterial } from "./materials/GradientMaterial";
import { TerrainGenerator } from "./terrain/TerrainGenerator";
import { colors } from "./resources/colors";
import Stats from "three/examples/jsm/libs/stats.module";

// Scene setup
const scene = new THREE.Scene();

// Height-based fog system
const globalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.0);
const fogPlane = new THREE.Vector4();
let fogDepth = 200;
let fogStartDistance = 10; // Distance from camera where fog starts
let fogEndDistance = 1200; // Distance from camera where fog is fully opaque (covers sky sphere)
let fogColor = new THREE.Color(colors.darkBlue);

// Store references to foggy materials for updating uniforms
const foggyMaterials: Array<{ material: THREE.Material; uniforms: any }> = [];

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
});

// Initialize star control displays
starMinSizeValue.textContent = starMinSizeSlider.value;
starMaxSizeValue.textContent = starMaxSizeSlider.value;
starFadeOffsetValue.textContent = starFadeOffsetSlider.value;

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
  recreateAllFoggyMaterials();
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
  recreateAllFoggyMaterials();
});

// Initialize fog distance displays
fogStartDistanceValue.textContent = fogStartDistanceSlider.value;
fogEndDistanceValue.textContent = fogEndDistanceSlider.value;

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
    if (uniforms.fPlane) uniforms.fPlane.value = fogPlane;

    // Mark material as needing update
    material.needsUpdate = true;
  });
  console.log(`Updated ${materialCount} foggy materials`);
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

// Create simple sky sphere
const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
const skyMaterial = getFoggyMaterial(
  fogDepth,
  fogColor,
  parseInt(colors.steelPink.replace("#", "0x")),
  THREE.BackSide
);
scene.add(new THREE.Mesh(skyGeometry, skyMaterial));

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
    shader.uniforms.fStartDistance = { value: fogStartDistance };
    shader.uniforms.fEndDistance = { value: fogEndDistance };

    // Store reference to this material and its uniforms for later updates
    foggyMaterials.push({ material, uniforms: shader.uniforms });

    shader.fragmentShader =
      `
      uniform vec4 fPlane;
      uniform float fDepth;
      uniform vec3 fColor;
      uniform float fStartDistance;
      uniform float fEndDistance;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
      float planeFog = 0.0;
      float distanceFog = 0.0;
      
      // Height-based fog
      planeFog = smoothstep(0.0, -fDepth, dot( vViewPosition, fPlane.xyz) - fPlane.w);
      
      // Distance-based fog with smooth falloff
      float viewDistance = length(vViewPosition);
      float falloffStart = fStartDistance * 0.3; // Start falloff at 30% of start distance
      float clearDistance = fStartDistance; // Objects within this distance should be clear
      
      // Create smooth transition: 0 at clearDistance, 1 at fEndDistance
      distanceFog = smoothstep(clearDistance, fEndDistance, viewDistance);
      
      // Combine distance and height fog - distance fog provides the base, height fog adds to it
      float totalFog = distanceFog;
      
      // Add height fog on top of distance fog
      totalFog = max(distanceFog, planeFog);
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      `#include <fog_fragment>`,
      `#include <fog_fragment>
       gl_FragColor.rgb = mix( gl_FragColor.rgb, fColor, totalFog );
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
