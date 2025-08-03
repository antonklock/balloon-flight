import * as THREE from "three";
import { hslToRgb } from "../utils/ColorUtils";
import { AppConfig } from "../config/AppConfig";
import { colors } from "../resources/colors";

export interface FogParameters {
  depth: number;
  startDistance: number;
  endDistance: number;
  closeHue: number;
  distantHue: number;
  closeBrightness: number;
  distantBrightness: number;
  colorStartDistance: number;
  colorEndDistance: number;
  height: number;
}

export class FogSystem {
  private scene: THREE.Scene;
  private globalPlane: THREE.Plane;
  private fogPlane: THREE.Vector4;
  private foggyMaterials: Array<{ material: THREE.Material; uniforms: any }> = [];
  private parameters: FogParameters;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.globalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), AppConfig.fog.defaultDepth);
    this.fogPlane = new THREE.Vector4();
    
    this.parameters = {
      depth: AppConfig.fog.defaultDepth,
      startDistance: AppConfig.fog.defaultStartDistance,
      endDistance: AppConfig.fog.defaultEndDistance,
      closeHue: AppConfig.fog.defaultCloseHue,
      distantHue: AppConfig.fog.defaultDistantHue,
      closeBrightness: AppConfig.fog.defaultCloseBrightness,
      distantBrightness: AppConfig.fog.defaultDistantBrightness,
      colorStartDistance: AppConfig.fog.defaultColorStartDistance,
      colorEndDistance: AppConfig.fog.defaultColorEndDistance,
      height: AppConfig.fog.defaultDepth,
    };
  }

  /**
   * Creates a foggy material with height-based fog
   */
  createFoggyMaterial(
    color: number,
    side: THREE.Side = THREE.FrontSide
  ): THREE.Material {
    const material = new THREE.MeshStandardMaterial({
      color: color,
      side: side,
      metalness: 0.5,
      roughness: 0.75,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.fPlane = { value: this.fogPlane };
      shader.uniforms.fDepth = { value: this.parameters.depth };
      shader.uniforms.fColor = { value: this.getFogColor() };
      shader.uniforms.fColorDistant = { value: new THREE.Color(colors.deepBlue) };
      shader.uniforms.fStartDistance = { value: this.parameters.startDistance };
      shader.uniforms.fEndDistance = { value: this.parameters.endDistance };
      shader.uniforms.fColorStartDistance = { value: this.parameters.colorStartDistance };
      shader.uniforms.fColorEndDistance = { value: this.parameters.colorEndDistance };

      // Store reference to this material and its uniforms for later updates
      this.foggyMaterials.push({ material, uniforms: shader.uniforms });

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

  /**
   * Updates fog plane based on camera view
   */
  updateFogPlane(camera: THREE.Camera): void {
    const viewNormalMatrix = new THREE.Matrix3();
    const plane = new THREE.Plane();

    viewNormalMatrix.getNormalMatrix(camera.matrixWorldInverse);
    plane
      .copy(this.globalPlane)
      .applyMatrix4(camera.matrixWorldInverse, viewNormalMatrix);
    this.fogPlane.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
  }

  /**
   * Updates all foggy materials with current parameters
   */
  updateAllFoggyMaterials(): void {
    console.log(
      `Fog updated - Depth: ${this.parameters.depth}, Start: ${this.parameters.startDistance}, End: ${this.parameters.endDistance}, Height: ${this.globalPlane.constant}`
    );

    let materialCount = 0;
    this.foggyMaterials.forEach(({ material, uniforms }) => {
      materialCount++;
      // Update the uniforms directly
      if (uniforms.fDepth) uniforms.fDepth.value = this.parameters.depth;
      if (uniforms.fStartDistance) uniforms.fStartDistance.value = this.parameters.startDistance;
      if (uniforms.fEndDistance) uniforms.fEndDistance.value = this.parameters.endDistance;
      if (uniforms.fColor) uniforms.fColor.value = this.getFogColor();
      if (uniforms.fColorDistant) {
        uniforms.fColorDistant.value = hslToRgb(
          this.parameters.distantHue,
          AppConfig.fog.saturation,
          this.parameters.distantBrightness
        );
      }
      if (uniforms.fColorStartDistance) uniforms.fColorStartDistance.value = this.parameters.colorStartDistance;
      if (uniforms.fColorEndDistance) uniforms.fColorEndDistance.value = this.parameters.colorEndDistance;
      if (uniforms.fPlane) uniforms.fPlane.value = this.fogPlane;

      // Mark material as needing update
      material.needsUpdate = true;
    });
    
    console.log(`Updated ${materialCount} foggy materials with start=${this.parameters.startDistance}, end=${this.parameters.endDistance}`);
  }

  /**
   * Recreates all foggy materials with new parameters
   */
  recreateAllFoggyMaterials(): void {
    console.log("Recreating all foggy materials...");

    // Clear the stored materials array
    this.foggyMaterials.length = 0;

    // Store objects that need material recreation
    const objectsToUpdate: Array<{
      mesh: THREE.Mesh;
      color: number;
      side?: THREE.Side;
    }> = [];

    this.scene.traverse((object) => {
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
      const newMaterial = this.createFoggyMaterial(color, side);
      // Preserve other material properties
      if (mesh.material) {
        const oldMaterial = mesh.material as any;
        if (oldMaterial.transparent !== undefined) newMaterial.transparent = oldMaterial.transparent;
        if (oldMaterial.opacity !== undefined) newMaterial.opacity = oldMaterial.opacity;
        if (oldMaterial.wireframe !== undefined) (newMaterial as THREE.MeshStandardMaterial).wireframe = oldMaterial.wireframe;
        if (oldMaterial.vertexColors !== undefined) newMaterial.vertexColors = oldMaterial.vertexColors;
      }
      mesh.material = newMaterial;
    });

    console.log(`Recreated ${objectsToUpdate.length} foggy materials`);
  }

  /**
   * Gets the current fog color based on close hue and brightness
   */
  private getFogColor(): THREE.Color {
    return hslToRgb(this.parameters.closeHue, AppConfig.fog.saturation, this.parameters.closeBrightness);
  }

  /**
   * Updates fog parameters
   */
  updateParameters(newParams: Partial<FogParameters>): void {
    this.parameters = { ...this.parameters, ...newParams };
    
    // Update global plane height if height parameter changed
    if (newParams.height !== undefined) {
      this.globalPlane.constant = newParams.height;
    }
    
    this.updateAllFoggyMaterials();
  }

  /**
   * Gets current fog parameters
   */
  getParameters(): FogParameters {
    return { ...this.parameters };
  }

  /**
   * Gets the fog plane for sky sphere materials
   */
  getFogPlane(): THREE.Vector4 {
    return this.fogPlane;
  }

  /**
   * Gets the global plane for height-based fog
   */
  getGlobalPlane(): THREE.Plane {
    return this.globalPlane;
  }
}