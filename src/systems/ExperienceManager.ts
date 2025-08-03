import * as THREE from "three";
import { FirstPersonControls } from "three/examples/jsm/controls/FirstPersonControls.js";
import { AppConfig } from "../config/AppConfig";

export interface ExperienceState {
  isActive: boolean;
  isPaused: boolean;
  isAscending: boolean;
  isDescending: boolean;
  debugUIVisible: boolean;
}

export class ExperienceManager {
  private camera: THREE.Camera;
  private controls: FirstPersonControls;
  private state: ExperienceState;
  private terrain: THREE.Mesh | null = null;
  private debugPanel: HTMLElement | null = null;
  private controlsPanel: HTMLElement | null = null;
  private blackOverlay: HTMLElement | null = null;
  private sceneButton: THREE.Mesh | null = null;
  private buttonText: THREE.Mesh | null = null;
  private stats: any = null;

  constructor(camera: THREE.Camera, controls: FirstPersonControls, terrain: THREE.Mesh | null = null) {
    this.camera = camera;
    this.controls = controls;
    this.terrain = terrain;
    
    this.state = {
      isActive: false,
      isPaused: false,
      isAscending: false,
      isDescending: false,
      debugUIVisible: false,
    };

    this.initializeUI();
    this.setupEventListeners();
  }

  /**
   * Initializes UI elements
   */
  private initializeUI(): void {
    this.debugPanel = document.getElementById("debug-panel") as HTMLElement;
    this.controlsPanel = document.querySelector(".controls") as HTMLElement;
    this.blackOverlay = document.getElementById("black-overlay") as HTMLElement;

    // Initialize UI elements as hidden
    if (this.debugPanel) this.debugPanel.style.display = "none";
    if (this.controlsPanel) this.controlsPanel.style.display = "none";
    if (this.blackOverlay) {
      document.body.style.cursor = "none";
    }
  }

  /**
   * Sets up event listeners for keyboard and mouse input
   */
  private setupEventListeners(): void {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));
  }

  /**
   * Handles key down events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape" && this.state.isActive) {
      this.resetExperience();
    }

    // Toggle debug UI with H key
    if (event.key === "h" || event.key === "H") {
      this.toggleDebugUI();
    }

    // Pause controls with spacebar (only when experience is active)
    if (event.key === " " && this.state.isActive) {
      this.togglePause();
    }

    // Vertical movement controls (only when experience is active and not paused)
    if (this.state.isActive && !this.state.isPaused) {
      if (event.key === "e" || event.key === "E") {
        this.state.isAscending = true;
      }
      if (event.key === "q" || event.key === "Q") {
        this.state.isDescending = true;
      }
    }
  }

  /**
   * Handles key up events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (this.state.isActive) {
      if (event.key === "e" || event.key === "E") {
        this.state.isAscending = false;
      }
      if (event.key === "q" || event.key === "Q") {
        this.state.isDescending = false;
      }
    }
  }

  /**
   * Sets up canvas click handler
   */
  setupCanvasClick(renderer: THREE.WebGLRenderer): void {
    renderer.domElement.addEventListener("mousedown", () => {
      console.log("Mouse down event detected!");
      if (!this.state.isActive) {
        this.startExperience();
      }
    });
  }

  /**
   * Creates the 3D start button
   */
  createStartButton(fogSystem: any): void {
    const buttonGeometry = new THREE.PlaneGeometry(2, 0.5);
    const buttonMaterial = fogSystem.createFoggyMaterial(0xff0000);
    buttonMaterial.transparent = true;
    buttonMaterial.opacity = 1.0;
    
    this.sceneButton = new THREE.Mesh(buttonGeometry, buttonMaterial);
    this.sceneButton.position.set(0, 0, 20);

    // Add text to the button
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = AppConfig.ui.canvasWidth;
    canvas.height = AppConfig.ui.canvasHeight;
    context.fillStyle = "#d400e1";
    context.font = AppConfig.ui.fontFamily;
    context.textAlign = "center";
    context.fillText("BEGIN", 128, 40);

    const buttonTexture = new THREE.CanvasTexture(canvas);
    const buttonTextMaterial = new THREE.MeshBasicMaterial({
      map: buttonTexture,
      transparent: true,
      opacity: 0.9,
    });
    this.buttonText = new THREE.Mesh(buttonGeometry, buttonTextMaterial);
    this.buttonText.position.set(0, 0, 20.1);
  }

  /**
   * Adds start button to scene
   */
  addStartButtonToScene(scene: THREE.Scene): void {
    if (this.sceneButton && this.buttonText) {
      scene.add(this.sceneButton);
      scene.add(this.buttonText);
    }
  }

  /**
   * Starts the experience
   */
  private startExperience(): void {
    console.log("Canvas clicked! Starting experience...");
    this.state.isActive = true;

    // Enable FirstPersonControls for the experience
    this.controls.enabled = true;

    // Remove 3D button from scene
    if (this.sceneButton && this.buttonText) {
      // We'll need to remove these from the scene when we refactor the main file
      console.log("Start button should be removed from scene");
    }

    // Fade out black overlay to reveal scene
    if (this.blackOverlay) {
      this.blackOverlay.style.opacity = "0";
      setTimeout(() => {
        if (this.blackOverlay) {
          this.blackOverlay.style.display = "none";
        }
      }, 500);
    }
  }

  /**
   * Resets the experience
   */
  private resetExperience(): void {
    // Reset experience state
    this.state.isActive = false;
    this.controls.enabled = false;

    // Show black overlay again
    if (this.blackOverlay) {
      this.blackOverlay.style.display = "block";
      this.blackOverlay.style.opacity = "1";
    }

    // Reset camera position
    this.camera.position.set(0, AppConfig.camera.defaultHeight, 0);
    this.camera.lookAt(0, 0, AppConfig.camera.lookAtDistance);

    // Re-add button to scene
    if (this.sceneButton && this.buttonText) {
      console.log("Start button should be re-added to scene");
    }
  }

  /**
   * Toggles debug UI visibility
   */
  private toggleDebugUI(): void {
    this.state.debugUIVisible = !this.state.debugUIVisible;
    
    if (this.debugPanel) {
      this.debugPanel.style.display = this.state.debugUIVisible ? "block" : "none";
    }
    if (this.controlsPanel) {
      this.controlsPanel.style.display = this.state.debugUIVisible ? "block" : "none";
    }
    if (this.stats) {
      this.stats.dom.style.display = this.state.debugUIVisible ? "block" : "none";
    }
    
    document.body.style.cursor = this.state.debugUIVisible ? "pointer" : "none";
    
    console.log(this.state.debugUIVisible ? "Debug UI SHOWN" : "Debug UI HIDDEN");
  }

  /**
   * Toggles pause state
   */
  private togglePause(): void {
    this.state.isPaused = !this.state.isPaused;
    this.controls.enabled = !this.state.isPaused;
    console.log(this.state.isPaused ? "Controls PAUSED" : "Controls RESUMED");
  }

  /**
   * Updates the experience (called in animation loop)
   */
  update(deltaTime: number): void {
    if (this.state.isActive && !this.state.isPaused) {
      // Handle vertical movement
      const verticalDelta = AppConfig.controls.verticalSpeed * deltaTime;

      if (this.state.isAscending) {
        // Check if we're below max elevation
        const terrainHeight = this.checkTerrainCollision();
        const maxAllowedHeight = terrainHeight + AppConfig.controls.maxElevation;

        if (this.camera.position.y < maxAllowedHeight) {
          this.camera.position.y += verticalDelta;
          // Don't exceed max elevation
          if (this.camera.position.y > maxAllowedHeight) {
            this.camera.position.y = maxAllowedHeight;
          }
        }
      }

      if (this.state.isDescending) {
        this.camera.position.y -= verticalDelta;
      }

      // Ensure camera doesn't go below terrain
      const terrainHeight = this.checkTerrainCollision();
      const minHeightAboveTerrain = AppConfig.controls.heightMin;
      const requiredHeight = terrainHeight + minHeightAboveTerrain;
      
      if (this.camera.position.y < requiredHeight) {
        this.camera.position.y = requiredHeight;
      }
    }
  }

  /**
   * Checks terrain collision for camera height
   */
  private checkTerrainCollision(): number {
    if (!this.terrain) return AppConfig.debug.defaultHeight;

    // Create a ray pointing straight down from the camera
    const rayOrigin = this.camera.position.clone();
    const rayDirection = new THREE.Vector3(0, -1, 0); // Pointing down
    const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);

    // Cast the ray against the terrain
    const intersects = raycaster.intersectObject(this.terrain);

    if (intersects.length > 0) {
      // Return the height of the first intersection point
      return intersects[0].point.y;
    }

    // If no intersection, return a very low value
    return AppConfig.debug.defaultHeight;
  }

  /**
   * Sets the stats object for debug UI
   */
  setStats(stats: any): void {
    this.stats = stats;
  }

  /**
   * Gets the current experience state
   */
  getState(): ExperienceState {
    return { ...this.state };
  }

  /**
   * Gets the terrain collision height
   */
  getTerrainHeight(): number {
    return this.checkTerrainCollision();
  }

  /**
   * Gets the distance to ground
   */
  getDistanceToGround(): number {
    const terrainHeight = this.checkTerrainCollision();
    return this.camera.position.y - terrainHeight;
  }

  /**
   * Gets the required height above terrain
   */
  getRequiredHeight(): number {
    const terrainHeight = this.checkTerrainCollision();
    return terrainHeight + AppConfig.controls.heightMin;
  }

  /**
   * Checks if camera is colliding with terrain
   */
  isCollidingWithTerrain(): boolean {
    return this.camera.position.y < this.getRequiredHeight();
  }
}