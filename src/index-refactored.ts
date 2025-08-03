import * as THREE from "three";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
import Stats from "three/examples/jsm/libs/stats.module";

// Import our new systems
import { FogSystem } from "./systems/FogSystem";
import { UIControls } from "./systems/UIControls";
import { StarSystem } from "./systems/StarSystem";
import { SkySystem } from "./systems/SkySystem";
import { BalloonSystem } from "./systems/BalloonSystem";
import { ExperienceManager } from "./systems/ExperienceManager";
import { TerrainGenerator } from "./terrain/TerrainGenerator";
import { GradientMaterial } from "./materials/GradientMaterial";
import { AppConfig } from "./config/AppConfig";
import { colors } from "./resources/colors";

/**
 * Main application class that orchestrates all systems
 */
class BalloonFlightApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: FirstPersonControls;
  private stats: Stats;

  // Systems
  private fogSystem: FogSystem;
  private uiControls: UIControls;
  private starSystem: StarSystem;
  private skySystem: SkySystem;
  private balloonSystem: BalloonSystem;
  private experienceManager: ExperienceManager;
  private terrainGenerator: TerrainGenerator;
  private gradientBackground: GradientMaterial;

  // Scene objects
  private terrain: THREE.Mesh | null = null;
  private distantMountains: THREE.Mesh[] = [];
  private groundPlane: THREE.Mesh | null = null;
  private cube: THREE.Mesh | null = null;
  private horizonLine: THREE.Line | null = null;
  private upMarker: THREE.Mesh | null = null;
  private downMarker: THREE.Mesh | null = null;
  private upLabel: THREE.Sprite | null = null;
  private downLabel: THREE.Sprite | null = null;

  // Debug variables
  private debugCounter = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.stats = new Stats();

    // Initialize systems
    this.fogSystem = new FogSystem(this.scene);
    this.uiControls = new UIControls();
    this.starSystem = new StarSystem(this.scene);
    this.skySystem = new SkySystem(this.scene, this.fogSystem);
    this.balloonSystem = new BalloonSystem(this.scene);
    this.terrainGenerator = new TerrainGenerator(
      this.scene,
      (color: number, side?: THREE.Side) => this.fogSystem.createFoggyMaterial(color, side)
    );
    this.gradientBackground = new GradientMaterial();

    // Initialize experience manager after terrain is created
    this.experienceManager = new ExperienceManager(this.camera, this.controls, this.terrain);

    this.initialize();
  }

  /**
   * Creates the camera
   */
  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      AppConfig.camera.fov,
      window.innerWidth / window.innerHeight,
      AppConfig.camera.near,
      AppConfig.camera.far
    );
    camera.position.set(0, AppConfig.camera.defaultHeight, 0);
    camera.lookAt(0, 0, AppConfig.camera.lookAtDistance);
    return camera;
  }

  /**
   * Creates the renderer
   */
  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Ensure canvas is clickable
    renderer.domElement.style.pointerEvents = "auto";
    renderer.domElement.style.cursor = "pointer";

    return renderer;
  }

  /**
   * Creates the controls
   */
  private createControls(): FirstPersonControls {
    const controls = new FirstPersonControls(this.camera, this.renderer.domElement);
    controls.movementSpeed = AppConfig.controls.movementSpeed;
    controls.lookSpeed = AppConfig.controls.lookSpeed;
    controls.lookVertical = true;
    controls.constrainVertical = true;
    controls.verticalMin = 0;
    controls.verticalMax = Math.PI;
    controls.activeLook = true;
    controls.heightCoef = 1;
    controls.heightMin = AppConfig.controls.heightMin;
    controls.heightMax = AppConfig.controls.heightMax;
    controls.enabled = false; // Disable controls initially

    return controls;
  }

  /**
   * Initializes the application
   */
  private async initialize(): Promise<void> {
    // Add gradient background
    this.gradientBackground.addToScene(this.scene);

    // Create terrain
    this.createTerrain();

    // Create distant mountains
    this.createDistantMountains();

    // Create sky and stars
    this.starSystem.createStars();

    // Create scene objects
    this.createSceneObjects();

    // Create start button
    this.experienceManager.createStartButton(this.fogSystem);
    this.experienceManager.addStartButtonToScene(this.scene);

    // Setup UI controls
    this.setupUIControls();

    // Setup canvas click handler
    this.experienceManager.setupCanvasClick(this.renderer);

    // Load balloon
    await this.balloonSystem.loadBalloon();

    // Setup lighting
    this.setupLighting();

    // Setup debug UI
    this.setupDebugUI();

    // Setup event listeners
    this.setupEventListeners();

    // Start animation loop
    this.animate();
  }

  /**
   * Creates the terrain
   */
  private createTerrain(): void {
    this.terrain = this.terrainGenerator.createProceduralTerrain({
      width: AppConfig.terrain.defaultWidth,
      depth: AppConfig.terrain.defaultDepth,
      spacingX: AppConfig.terrain.defaultSpacingX,
      spacingZ: AppConfig.terrain.defaultSpacingZ,
      maxHeight: AppConfig.terrain.defaultMaxHeight,
      noiseScale: AppConfig.terrain.defaultNoiseScale,
    });

    this.terrain.position.y = AppConfig.terrain.defaultHeightOffset;
  }

  /**
   * Creates distant mountains
   */
  private createDistantMountains(): void {
    const mountainSystem = this.terrainGenerator.createDistantMountains({
      count: AppConfig.mountains.defaultCount,
      distance: AppConfig.mountains.defaultGroundDistance,
      minHeight: AppConfig.mountains.defaultMinHeight,
      maxHeight: AppConfig.mountains.defaultMaxHeight,
      width: AppConfig.mountains.defaultWidth,
      depth: AppConfig.mountains.defaultDepth,
      color: AppConfig.mountains.defaultColor,
      groundColor: AppConfig.mountains.defaultGroundColor,
      mountainPosition: AppConfig.mountains.defaultMountainPosition,
    });

    this.distantMountains = mountainSystem.mountains;
    this.groundPlane = mountainSystem.groundPlane;
  }

  /**
   * Creates scene objects (cube, horizon line, debug markers)
   */
  private createSceneObjects(): void {
    // Create a simple cube
    const geometry = new THREE.BoxGeometry();
    const material = this.fogSystem.createFoggyMaterial(0x00ff00);
    (material as THREE.MeshStandardMaterial).wireframe = true;
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    // Create horizon line
    this.createHorizonLine();

    // Create debug helpers
    this.createDebugMarkers();
  }

  /**
   * Creates the horizon line
   */
  private createHorizonLine(): void {
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
    this.horizonLine = new THREE.Line(horizonGeometry, horizonMaterial);
    this.scene.add(this.horizonLine);
  }

  /**
   * Creates debug markers
   */
  private createDebugMarkers(): void {
    // Up marker (above player)
    const markerGeometry = new THREE.SphereGeometry(2, 8, 8);
    const upMaterial = this.fogSystem.createFoggyMaterial(0x00ff00);
    this.upMarker = new THREE.Mesh(markerGeometry, upMaterial);
    this.upMarker.position.set(0, 20, 0);
    this.scene.add(this.upMarker);

    // Down marker (below player)
    const downMaterial = this.fogSystem.createFoggyMaterial(0xff0000);
    this.downMarker = new THREE.Mesh(markerGeometry, downMaterial);
    this.downMarker.position.set(0, -20, 0);
    this.scene.add(this.downMarker);

    // Add labels for the markers
    this.upLabel = this.createLabel("UP", 20, 0x00ff00);
    this.downLabel = this.createLabel("DOWN", -20, 0xff0000);
    this.scene.add(this.upLabel);
    this.scene.add(this.downLabel);
  }

  /**
   * Creates a label sprite
   */
  private createLabel(text: string, y: number, color: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = AppConfig.ui.canvasWidth;
    canvas.height = AppConfig.ui.canvasHeight;

    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.font = AppConfig.ui.labelFontFamily;
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
  }

  /**
   * Sets up UI controls
   */
  private setupUIControls(): void {
    // Rotation slider
    this.uiControls.createRotationSlider(
      {
        id: "rotation-slider",
        valueId: "rotation-value",
        defaultValue: 0,
        precision: 1,
      },
      (value) => {
        this.gradientBackground.updateRotation(value);
      }
    );

    // Star size sliders
    this.uiControls.createStarSizeSlider(
      {
        id: "star-min-size-slider",
        valueId: "star-min-size-value",
        defaultValue: AppConfig.stars.defaultMinSize,
      },
      {
        id: "star-max-size-slider",
        valueId: "star-max-size-value",
        defaultValue: AppConfig.stars.defaultMaxSize,
      },
      (minSize, maxSize) => {
        this.gradientBackground.updateStarSizes(minSize, maxSize);
        this.starSystem.updateStarSizes(minSize, maxSize);
      }
    );

    // Star fade offset slider
    this.uiControls.createSlider(
      {
        id: "star-fade-offset-slider",
        valueId: "star-fade-offset-value",
        defaultValue: AppConfig.stars.defaultFadeOffset,
        precision: 2,
      },
      (value) => {
        this.gradientBackground.updateStarFadeOffset(value);
        this.starSystem.updateStarFadeOffset(value);
      }
    );

    // Fog sliders
    this.setupFogSliders();

    // Mountain sliders
    this.setupMountainSliders();

    // Balloon sliders
    this.setupBalloonSliders();

    // Sky ring sliders
    this.setupSkyRingSliders();
  }

  /**
   * Sets up fog-related sliders
   */
  private setupFogSliders(): void {
    const fogParams = this.fogSystem.getParameters();

    // Fog distance slider
    this.uiControls.createSlider(
      {
        id: "fog-distance-slider",
        valueId: "fog-distance-value",
        defaultValue: fogParams.depth,
      },
      (value) => {
        this.fogSystem.updateParameters({ depth: value });
      }
    );

    // Fog start distance slider
    this.uiControls.createSlider(
      {
        id: "fog-start-distance-slider",
        valueId: "fog-start-distance-value",
        defaultValue: fogParams.startDistance,
      },
      (value) => {
        this.fogSystem.updateParameters({ startDistance: value });
      }
    );

    // Fog end distance slider
    this.uiControls.createSlider(
      {
        id: "fog-end-distance-slider",
        valueId: "fog-end-distance-value",
        defaultValue: fogParams.endDistance,
      },
      (value) => {
        this.fogSystem.updateParameters({ endDistance: value });
      }
    );

    // Fog height slider
    this.uiControls.createSlider(
      {
        id: "fog-height-slider",
        valueId: "fog-height-value",
        defaultValue: fogParams.height,
      },
      (value) => {
        this.fogSystem.updateParameters({ height: value });
      }
    );

    // Fog color sliders
    this.uiControls.createSlider(
      {
        id: "fog-color-start-slider",
        valueId: "fog-color-start-value",
        defaultValue: fogParams.colorStartDistance,
      },
      (value) => {
        this.fogSystem.updateParameters({ colorStartDistance: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "fog-color-end-slider",
        valueId: "fog-color-end-value",
        defaultValue: fogParams.colorEndDistance,
      },
      (value) => {
        this.fogSystem.updateParameters({ colorEndDistance: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "fog-close-hue-slider",
        valueId: "fog-close-hue-value",
        defaultValue: fogParams.closeHue,
      },
      (value) => {
        this.fogSystem.updateParameters({ closeHue: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "fog-distant-hue-slider",
        valueId: "fog-distant-hue-value",
        defaultValue: fogParams.distantHue,
      },
      (value) => {
        this.fogSystem.updateParameters({ distantHue: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "fog-close-brightness-slider",
        valueId: "fog-close-brightness-value",
        defaultValue: fogParams.closeBrightness,
      },
      (value) => {
        this.fogSystem.updateParameters({ closeBrightness: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "fog-distant-brightness-slider",
        valueId: "fog-distant-brightness-value",
        defaultValue: fogParams.distantBrightness,
      },
      (value) => {
        this.fogSystem.updateParameters({ distantBrightness: value });
      }
    );
  }

  /**
   * Sets up mountain-related sliders
   */
  private setupMountainSliders(): void {
    this.uiControls.createSlider(
      {
        id: "mountain-count-slider",
        valueId: "mountain-count-value",
        defaultValue: AppConfig.mountains.defaultCount,
      },
      () => this.recreateMountains()
    );

    this.uiControls.createSlider(
      {
        id: "mountain-distance-slider",
        valueId: "mountain-distance-value",
        defaultValue: AppConfig.mountains.defaultDistance,
      },
      () => this.recreateMountains()
    );

    this.uiControls.createSlider(
      {
        id: "mountain-height-slider",
        valueId: "mountain-height-value",
        defaultValue: AppConfig.mountains.defaultMaxHeight,
      },
      () => this.recreateMountains()
    );

    this.uiControls.createSlider(
      {
        id: "ground-distance-slider",
        valueId: "ground-distance-value",
        defaultValue: AppConfig.mountains.defaultGroundDistance,
      },
      () => this.recreateMountains()
    );

    this.uiControls.createSlider(
      {
        id: "mountain-position-slider",
        valueId: "mountain-position-value",
        defaultValue: AppConfig.mountains.defaultMountainPosition,
      },
      () => this.recreateMountains()
    );
  }

  /**
   * Sets up balloon-related sliders
   */
  private setupBalloonSliders(): void {
    const balloonConfig = this.balloonSystem.getConfig();

    this.uiControls.createSlider(
      {
        id: "balloon-height-slider",
        valueId: "balloon-height-value",
        defaultValue: balloonConfig.height,
      },
      (value) => {
        this.balloonSystem.updateConfig({ height: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "balloon-scale-slider",
        valueId: "balloon-scale-value",
        defaultValue: balloonConfig.scale,
        precision: 1,
      },
      (value) => {
        this.balloonSystem.updateScale(value);
      }
    );

    this.uiControls.createSlider(
      {
        id: "balloon-distance-slider",
        valueId: "balloon-distance-value",
        defaultValue: balloonConfig.distance,
      },
      (value) => {
        this.balloonSystem.updateConfig({ distance: value });
      }
    );
  }

  /**
   * Sets up sky ring sliders
   */
  private setupSkyRingSliders(): void {
    const skyConfig = this.skySystem.getConfig();

    this.uiControls.createSlider(
      {
        id: "sky-ring-height-slider",
        valueId: "sky-ring-height-value",
        defaultValue: skyConfig.height,
      },
      (value) => {
        this.skySystem.updateRingParameters({ height: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "sky-ring-falloff-slider",
        valueId: "sky-ring-falloff-value",
        defaultValue: skyConfig.falloff,
      },
      (value) => {
        this.skySystem.updateRingParameters({ falloff: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "sky-ring-hue-slider",
        valueId: "sky-ring-hue-value",
        defaultValue: skyConfig.hue,
      },
      (value) => {
        this.skySystem.updateRingParameters({ hue: value });
      }
    );

    this.uiControls.createSlider(
      {
        id: "sky-ring-brightness-slider",
        valueId: "sky-ring-brightness-value",
        defaultValue: skyConfig.brightness,
      },
      (value) => {
        this.skySystem.updateRingParameters({ brightness: value });
      }
    );
  }

  /**
   * Recreates mountains with current slider values
   */
  private recreateMountains(): void {
    // Remove existing mountains and ground plane
    this.distantMountains.forEach((mountain) => {
      this.scene.remove(mountain);
      mountain.geometry.dispose();
      if (mountain.material instanceof THREE.Material) {
        mountain.material.dispose();
      }
    });

    if (this.groundPlane) {
      this.scene.remove(this.groundPlane);
      this.groundPlane.geometry.dispose();
      if (this.groundPlane.material instanceof THREE.Material) {
        this.groundPlane.material.dispose();
      }
    }

    // Create new mountain system with current settings
    const newMountainSystem = this.terrainGenerator.createDistantMountains({
      count: this.uiControls.getSliderValue("mountain-count-slider"),
      distance: this.uiControls.getSliderValue("ground-distance-slider"),
      minHeight: AppConfig.mountains.defaultMinHeight,
      maxHeight: this.uiControls.getSliderValue("mountain-height-slider"),
      width: AppConfig.mountains.defaultWidth,
      depth: AppConfig.mountains.defaultDepth,
      color: AppConfig.mountains.defaultColor,
      groundColor: AppConfig.mountains.defaultGroundColor,
      mountainPosition: this.uiControls.getSliderValue("mountain-position-slider"),
    });

    this.distantMountains = newMountainSystem.mountains;
    this.groundPlane = newMountainSystem.groundPlane;
  }

  /**
   * Sets up lighting
   */
  private setupLighting(): void {
    // Add lighting for the terrain
    const terrainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    terrainLight.position.set(100, 100, 100);
    this.scene.add(terrainLight);

    // Add ambient light for better terrain visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
  }

  /**
   * Sets up debug UI
   */
  private setupDebugUI(): void {
    document.body.appendChild(this.stats.dom);
    this.experienceManager.setStats(this.stats);
  }

  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }

  /**
   * Handles window resize
   */
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Animation loop
   */
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    // Update experience manager
    this.experienceManager.update(0.016);

    // Update fog plane
    this.fogSystem.updateFogPlane(this.camera);

    // Update balloon position
    this.balloonSystem.updatePosition(this.camera);

    // Update sky fog uniforms
    this.skySystem.updateFogUniforms();

    // Rotate the cube
    if (this.cube) {
      this.cube.rotation.x += 0.01;
      this.cube.rotation.y += 0.01;
    }

    // Update debug info
    this.updateDebugInfo();

    // Render the scene
    this.renderer.render(this.scene, this.camera);

    // Update stats
    this.stats.update();
  }

  /**
   * Updates debug information
   */
  private updateDebugInfo(): void {
    this.debugCounter++;

    // Update UI debug panel every frame
    const debugCameraPos = document.getElementById("debug-camera-pos") as HTMLElement;
    const debugTerrainHeight = document.getElementById("debug-terrain-height") as HTMLElement;
    const debugDistance = document.getElementById("debug-distance") as HTMLElement;
    const debugRequired = document.getElementById("debug-required") as HTMLElement;
    const debugCollision = document.getElementById("debug-collision") as HTMLElement;
    const debugTerrainStatus = document.getElementById("debug-terrain-status") as HTMLElement;
    const debugExperience = document.getElementById("debug-experience") as HTMLElement;
    const debugVertical = document.getElementById("debug-vertical") as HTMLElement;
    const debugPause = document.getElementById("debug-pause") as HTMLElement;
    const balloonStatus = document.getElementById("balloon-status") as HTMLElement;

    if (debugCameraPos) {
      debugCameraPos.textContent = `Camera: (${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)})`;
    }
    if (debugTerrainHeight) {
      debugTerrainHeight.textContent = `Terrain: ${this.experienceManager.getTerrainHeight().toFixed(2)}`;
    }
    if (debugDistance) {
      debugDistance.textContent = `Distance: ${this.experienceManager.getDistanceToGround().toFixed(2)}`;
    }
    if (debugRequired) {
      debugRequired.textContent = `Required: ${this.experienceManager.getRequiredHeight().toFixed(2)}`;
    }
    if (debugCollision) {
      debugCollision.textContent = `Collision: ${this.experienceManager.isCollidingWithTerrain() ? "YES" : "NO"}`;
    }
    if (debugTerrainStatus) {
      debugTerrainStatus.textContent = `Terrain: ${this.terrain ? "EXISTS" : "NULL"}`;
    }
    if (debugExperience) {
      const state = this.experienceManager.getState();
      debugExperience.textContent = `Experience: ${state.isActive ? "ACTIVE" : "INACTIVE"}`;
    }
    if (debugVertical) {
      const state = this.experienceManager.getState();
      let verticalStatus = "NONE";
      if (state.isActive) {
        if (state.isAscending && state.isDescending) {
          verticalStatus = "BOTH";
        } else if (state.isAscending) {
          verticalStatus = "UP (E)";
        } else if (state.isDescending) {
          verticalStatus = "DOWN (Q)";
        }
      }
      debugVertical.textContent = `Vertical: ${verticalStatus}`;
    }
    if (debugPause) {
      const state = this.experienceManager.getState();
      debugPause.textContent = `Pause: ${state.isPaused ? "YES" : "NO"}`;
    }
    if (balloonStatus) {
      balloonStatus.textContent = `Balloon: ${this.balloonSystem.isLoaded() ? "LOADED" : "LOADING..."}`;
    }

    // Reset debug counter
    if (this.debugCounter >= AppConfig.debug.interval) {
      this.debugCounter = 0;
    }
  }
}

// Start the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new BalloonFlightApp();
  console.log("Three.js TypeScript site is running!");
});