import * as THREE from "three";
import { AppConfig } from "../config/AppConfig";

export interface StarConfig {
  count?: number;
  radius?: number;
  minSize?: number;
  maxSize?: number;
  fadeOffset?: number;
}

export class StarSystem {
  private scene: THREE.Scene;
  private stars: THREE.Mesh[] = [];
  private config: StarConfig;

  constructor(scene: THREE.Scene, config: StarConfig = {}) {
    this.scene = scene;
    this.config = {
      count: AppConfig.stars.defaultCount,
      radius: AppConfig.stars.defaultRadius,
      minSize: AppConfig.stars.defaultMinSize,
      maxSize: AppConfig.stars.defaultMaxSize,
      fadeOffset: AppConfig.stars.defaultFadeOffset,
      ...config,
    };
  }

  /**
   * Creates stars and adds them to the scene
   */
  createStars(): void {
    const starGeometry = new THREE.SphereGeometry(1, 8, 8);

    for (let i = 0; i < this.config.count!; i++) {
      // Random position on a sphere
      const theta = Math.random() * Math.PI * 2; // Random angle around Y axis
      const phi = Math.acos(Math.random() * 2 - 1); // Random angle from Y axis
      const radius = this.config.radius!;

      const starX = radius * Math.sin(phi) * Math.cos(theta);
      const starY = radius * Math.cos(phi);
      const starZ = radius * Math.sin(phi) * Math.sin(theta);

      // Calculate opacity based on height (Y position)
      const horizonHeight = 0; // Horizon level
      const fadeStart = horizonHeight + this.config.fadeOffset!;
      const fadeEnd = horizonHeight - this.config.fadeOffset!;

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

      // Random size
      const scale = 0.5 + Math.random() * 1.0;
      star.scale.set(scale, scale, scale);

      this.stars.push(star);
      this.scene.add(star);
    }
  }

  /**
   * Updates star opacity based on fade offset
   */
  updateStarOpacity(fadeOffset: number): void {
    this.scene.traverse((object) => {
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

  /**
   * Updates star sizes
   */
  updateStarSizes(minSize: number, maxSize: number): void {
    this.config.minSize = minSize;
    this.config.maxSize = maxSize;
    
    // Note: This would require recreating stars to change their visual size
    // For now, we just update the config for future star creation
    console.log(`Star sizes updated: min=${minSize}, max=${maxSize}`);
  }

  /**
   * Updates star fade offset
   */
  updateStarFadeOffset(fadeOffset: number): void {
    this.config.fadeOffset = fadeOffset;
    this.updateStarOpacity(fadeOffset);
  }

  /**
   * Removes all stars from the scene
   */
  clearStars(): void {
    this.stars.forEach(star => {
      this.scene.remove(star);
      star.geometry.dispose();
      if (star.material instanceof THREE.Material) {
        star.material.dispose();
      }
    });
    this.stars = [];
  }

  /**
   * Gets the current star configuration
   */
  getConfig(): StarConfig {
    return { ...this.config };
  }

  /**
   * Updates the star configuration
   */
  updateConfig(newConfig: Partial<StarConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}