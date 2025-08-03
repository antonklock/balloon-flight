import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { AppConfig } from "../config/AppConfig";
import { colors } from "../resources/colors";

export interface BalloonConfig {
  height: number;
  distance: number;
  scale: number;
  color: string;
}

export class BalloonSystem {
  private scene: THREE.Scene;
  private balloon: THREE.Group | null = null;
  private config: BalloonConfig;
  private isLoading = false;

  constructor(scene: THREE.Scene, config: Partial<BalloonConfig> = {}) {
    this.scene = scene;
    this.config = {
      height: AppConfig.balloon.defaultHeight,
      distance: AppConfig.balloon.defaultDistance,
      scale: AppConfig.balloon.defaultScale,
      color: AppConfig.balloon.defaultColor,
      ...config,
    };
  }

  /**
   * Loads the balloon model
   */
  async loadBalloon(): Promise<void> {
    if (this.isLoading) {
      console.warn("Balloon is already loading");
      return;
    }

    this.isLoading = true;
    console.log("Loading balloon...");

    return new Promise((resolve, reject) => {
      const balloonLoader = new OBJLoader();
      
      balloonLoader.load(
        "./assets/meshes/balloon_v1.obj",
        (object) => {
          console.log("Balloon loaded successfully");
          this.balloon = object;

          // Scale the balloon to appropriate size
          this.balloon.scale.set(this.config.scale, this.config.scale, this.config.scale);

          // Position the balloon above the terrain
          this.balloon.position.set(0, -5, 0);

          // Apply material to all balloon parts
          this.balloon.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const material = new THREE.MeshStandardMaterial({
                color: parseInt(this.config.color.replace("#", "0x")),
                side: THREE.DoubleSide,
                metalness: 0.1,
                roughness: 0.8,
              });
              child.material = material;
            }
          });

          this.scene.add(this.balloon);
          console.log("Balloon added to scene at position:", this.balloon.position);
          this.isLoading = false;
          resolve();
        },
        (progress) => {
          console.log(
            "Loading balloon...",
            (progress.loaded / progress.total) * 100 + "%"
          );
        },
        (error) => {
          console.error("Error loading balloon:", error);
          this.isLoading = false;
          reject(error);
        }
      );
    });
  }

  /**
   * Updates balloon position to follow camera
   */
  updatePosition(camera: THREE.Camera): void {
    if (!this.balloon) return;

    // Position balloon in front of the camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Place balloon at specified distance in front of the camera
    this.balloon.position.x = camera.position.x + cameraDirection.x * this.config.distance;
    this.balloon.position.z = camera.position.z + cameraDirection.z * this.config.distance;
    this.balloon.position.y = camera.position.y + this.config.height; // Offset above camera
  }

  /**
   * Updates balloon scale
   */
  updateScale(scale: number): void {
    this.config.scale = scale;
    if (this.balloon) {
      this.balloon.scale.set(scale, scale, scale);
    }
  }

  /**
   * Updates balloon configuration
   */
  updateConfig(newConfig: Partial<BalloonConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply immediate changes
    if (newConfig.scale !== undefined && this.balloon) {
      this.balloon.scale.set(newConfig.scale, newConfig.scale, newConfig.scale);
    }
  }

  /**
   * Gets the balloon object
   */
  getBalloon(): THREE.Group | null {
    return this.balloon;
  }

  /**
   * Gets the current balloon configuration
   */
  getConfig(): BalloonConfig {
    return { ...this.config };
  }

  /**
   * Checks if balloon is loaded
   */
  isLoaded(): boolean {
    return this.balloon !== null;
  }

  /**
   * Checks if balloon is currently loading
   */
  isLoadingState(): boolean {
    return this.isLoading;
  }

  /**
   * Removes balloon from scene
   */
  removeBalloon(): void {
    if (this.balloon) {
      this.scene.remove(this.balloon);
      this.balloon = null;
    }
  }
}