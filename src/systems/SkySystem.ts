import * as THREE from "three";
import { hslToRgb } from "../utils/ColorUtils";
import { AppConfig } from "../config/AppConfig";
import { colors } from "../resources/colors";

export interface SkyRingConfig {
  height: number;
  falloff: number;
  hue: number;
  brightness: number;
}

export class SkySystem {
  private scene: THREE.Scene;
  private skySphere: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;
  private fogSystem: any; // Will be properly typed when we refactor the main file
  private config: SkyRingConfig;

  constructor(scene: THREE.Scene, fogSystem: any) {
    this.scene = scene;
    this.fogSystem = fogSystem;
    
    this.config = {
      height: AppConfig.skyRing.defaultHeight,
      falloff: AppConfig.skyRing.defaultFalloff,
      hue: AppConfig.skyRing.defaultHue,
      brightness: AppConfig.skyRing.defaultBrightness,
    };

    this.skyMaterial = this.createSkyMaterial();
    this.skySphere = this.createSkySphere();
    this.scene.add(this.skySphere);
  }

  /**
   * Creates the sky sphere material with equatorial ring
   */
  private createSkyMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        ringHeight: { value: this.config.height / 100.0 },
        ringFalloff: { value: this.config.falloff / 100.0 },
        skyColor: { value: new THREE.Color(colors.deepBlue) },
        ringColor: { value: hslToRgb(this.config.hue, 80, this.config.brightness) },
        fogPlane: { value: this.fogSystem.getFogPlane() },
        fogDepth: { value: this.fogSystem.getParameters().depth },
        fogColor: { value: hslToRgb(this.fogSystem.getParameters().closeHue, 80, this.fogSystem.getParameters().closeBrightness) },
        fogColorDistant: { value: hslToRgb(this.fogSystem.getParameters().distantHue, 80, 50) },
        fogStartDistance: { value: this.fogSystem.getParameters().startDistance },
        fogEndDistance: { value: this.fogSystem.getParameters().endDistance },
        fogColorStartDistance: { value: this.fogSystem.getParameters().colorStartDistance },
        fogColorEndDistance: { value: this.fogSystem.getParameters().colorEndDistance },
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
  }

  /**
   * Creates the sky sphere mesh
   */
  private createSkySphere(): THREE.Mesh {
    const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
    return new THREE.Mesh(skyGeometry, this.skyMaterial);
  }

  /**
   * Updates sky ring parameters
   */
  updateRingParameters(newConfig: Partial<SkyRingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.skyMaterial && this.skyMaterial.uniforms) {
      if (newConfig.height !== undefined) {
        this.skyMaterial.uniforms.ringHeight.value = newConfig.height / 100.0;
      }
      if (newConfig.falloff !== undefined) {
        this.skyMaterial.uniforms.ringFalloff.value = newConfig.falloff / 100.0;
      }
      if (newConfig.hue !== undefined || newConfig.brightness !== undefined) {
        this.skyMaterial.uniforms.ringColor.value = hslToRgb(
          this.config.hue,
          80,
          this.config.brightness
        );
      }
    }
  }

  /**
   * Updates fog-related uniforms in the sky material
   */
  updateFogUniforms(): void {
    if (this.skyMaterial && this.skyMaterial.uniforms) {
      const fogParams = this.fogSystem.getParameters();
      this.skyMaterial.uniforms.fogPlane.value = this.fogSystem.getFogPlane();
      this.skyMaterial.uniforms.fogDepth.value = fogParams.depth;
      this.skyMaterial.uniforms.fogColor.value = hslToRgb(fogParams.closeHue, 80, fogParams.closeBrightness);
      this.skyMaterial.uniforms.fogColorDistant.value = hslToRgb(fogParams.distantHue, 80, 50);
      this.skyMaterial.uniforms.fogStartDistance.value = fogParams.startDistance;
      this.skyMaterial.uniforms.fogEndDistance.value = fogParams.endDistance;
      this.skyMaterial.uniforms.fogColorStartDistance.value = fogParams.colorStartDistance;
      this.skyMaterial.uniforms.fogColorEndDistance.value = fogParams.colorEndDistance;
    }
  }

  /**
   * Gets the sky material for external access
   */
  getSkyMaterial(): THREE.ShaderMaterial {
    return this.skyMaterial;
  }

  /**
   * Gets the current sky ring configuration
   */
  getConfig(): SkyRingConfig {
    return { ...this.config };
  }
}