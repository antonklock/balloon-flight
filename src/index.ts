import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GradientMaterial } from "./materials/GradientMaterial";
import { TerrainGenerator } from "./terrain/TerrainGenerator";
import Stats from "three/examples/jsm/libs/stats.module";

// Scene setup
const scene = new THREE.Scene();

// Create gradient background
const gradientBackground = new GradientMaterial();
gradientBackground.addToScene(scene);

// Initialize terrain generator
const terrainGenerator = new TerrainGenerator(scene);

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

// Setup OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableZoom = false;
controls.enableDamping = true;
controls.enablePan = false;
controls.enableRotate = false; // Disable rotation initially
controls.autoRotate = false;

// Experience state
let isExperienceActive = false;

// Mouse tracking variables
let mouseX = 0;
let mouseY = 0;
let targetAzimuth = 0;
let targetPolar = Math.PI / 2;
let currentAzimuth = 0;
let currentPolar = Math.PI / 2;

// Track mouse movement
document.addEventListener("mousemove", (event) => {
  if (isExperienceActive) {
    if (isPointerLocked) {
      // Use movement deltas when pointer is locked
      targetAzimuth += event.movementX * 0.02;
      targetPolar -= event.movementY * 0.02;
    } else {
      // Use absolute position when not locked
      mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

      targetAzimuth = mouseX * Math.PI;
      targetPolar = Math.PI / 2 + (mouseY * Math.PI) / 2;
    }

    // Clamp polar angle to prevent flipping
    targetPolar = Math.max(0.1, Math.min(Math.PI - 0.1, targetPolar));
  }
});

// Pointer lock variables
let isPointerLocked = false;

// Request pointer lock when clicking on canvas
renderer.domElement.addEventListener("click", () => {
  if (isExperienceActive) {
    renderer.domElement.requestPointerLock().catch((error) => {
      console.log("Pointer lock failed:", error);
    });
  }
});

// Handle pointer lock changes
document.addEventListener("pointerlockchange", () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
  console.log("Pointer lock state:", isPointerLocked ? "locked" : "unlocked");
});

// Exit pointer lock with Escape key
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isPointerLocked) {
    document.exitPointerLock();
  }
});

// Get black overlay
const blackOverlay = document.getElementById("black-overlay") as HTMLElement;

// Create 3D button in the scene
const buttonGeometry = new THREE.PlaneGeometry(2, 0.5);
const buttonMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000, // Bright red for debugging
  transparent: true,
  opacity: 1.0,
});
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

    // Initialize custom tracking to match current camera position
    const currentCameraPosition = camera.position.clone();
    const radius = 5;

    // Calculate current spherical coordinates from camera position
    currentAzimuth = Math.atan2(
      currentCameraPosition.z,
      currentCameraPosition.x
    );
    currentPolar = Math.acos(currentCameraPosition.y / radius);

    // Set target to current position to prevent jumping
    targetAzimuth = currentAzimuth;
    targetPolar = currentPolar;

    // Completely disable OrbitControls to prevent pointer capture errors
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.dispose(); // Remove all event listeners

    // Remove 3D button from scene
    scene.remove(sceneButton);
    scene.remove(buttonText);

    // Fade out black overlay to reveal scene
    blackOverlay.style.opacity = "0";
    setTimeout(() => {
      blackOverlay.style.display = "none";
    }, 500);

    // Request pointer lock immediately
    renderer.domElement.requestPointerLock().catch((error) => {
      console.log("Pointer lock failed:", error);
    });
  }
});

// Create a simple cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
});
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
  const markerMaterial = new THREE.MeshBasicMaterial({ color });
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
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.position.set(0, y + 5, 0);
  sprite.scale.set(10, 2.5, 1);

  return sprite;
};

const upLabel = createLabel("UP", 20, 0x00ff00);
const downLabel = createLabel("DOWN", -20, 0xff0000);
scene.add(upLabel);
scene.add(downLabel);

// Position camera at the center of the sky sphere (original position)
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, 20); // Look at the button initially
controls.target.set(0, 0, 20);
controls.update();

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

// Terrain collision detection and camera height adjustment
function getTerrainHeightAt(x: number, z: number): number {
  if (!terrain) return -1000; // Default height if no terrain

  // Convert world position to terrain local position
  const terrainX = (x - terrain.position.x) / 2; // spacingX = 2
  const terrainZ = (z - terrain.position.z) / 2; // spacingZ = 2

  // Get terrain dimensions
  const width = 64;
  const depth = 64;

  // Clamp to terrain bounds
  const clampedX = Math.max(0, Math.min(width - 1, Math.floor(terrainX)));
  const clampedZ = Math.max(0, Math.min(depth - 1, Math.floor(terrainZ)));

  // Get vertex index
  const vertexIndex = clampedZ * width + clampedX;

  // Get height from terrain geometry
  const positionAttribute = terrain.geometry.getAttribute("position");
  if (positionAttribute && vertexIndex < positionAttribute.count) {
    const y = positionAttribute.getY(vertexIndex);
    return y + terrain.position.y; // Add terrain's world position
  }

  return terrain.position.y; // Fallback to terrain base height
}

// Animation loop
function animate(): void {
  requestAnimationFrame(animate);

  if (isExperienceActive) {
    // Smooth interpolation between current and target angles
    currentAzimuth += (targetAzimuth - currentAzimuth) * 0.1;
    currentPolar += (targetPolar - currentPolar) * 0.1;

    // Apply smooth camera tracking from center (original behavior)
    const radius = 5;
    const targetX = radius * Math.sin(currentPolar) * Math.cos(currentAzimuth);
    const targetZ = radius * Math.sin(currentPolar) * Math.sin(currentAzimuth);
    const targetY = radius * Math.cos(currentPolar);

    // Get terrain height directly below the camera
    const terrainHeight = getTerrainHeightAt(targetX, targetZ);
    const minHeightAboveTerrain = 10; // Minimum height above terrain
    const requiredHeight = terrainHeight + minHeightAboveTerrain;

    // Use the higher of the target Y or required height above terrain
    const finalY = Math.max(targetY, requiredHeight);

    // Smoothly move camera to final position
    camera.position.x += (targetX - camera.position.x) * 0.1;
    camera.position.y += (finalY - camera.position.y) * 0.1;
    camera.position.z += (targetZ - camera.position.z) * 0.1;

    // Also move the OrbitControls target up to maintain relative positioning
    const currentTargetY = controls.target.y;
    const targetTargetY = Math.max(0, requiredHeight - 5); // Keep target slightly below camera
    controls.target.y += (targetTargetY - currentTargetY) * 0.1;

    camera.lookAt(controls.target);
  } else {
    // Update OrbitControls only when experience is not active
    controls.update();
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
