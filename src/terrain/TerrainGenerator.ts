import * as THREE from "three";
import { colors } from "../resources/colors";

export class TerrainGenerator {
  private scene: THREE.Scene;
  private terrainMesh?: THREE.Mesh;
  private materialFunction?: (
    color: number,
    side?: THREE.Side
  ) => THREE.Material;

  constructor(
    scene: THREE.Scene,
    materialFunction?: (color: number, side?: THREE.Side) => THREE.Material
  ) {
    this.scene = scene;
    this.materialFunction = materialFunction;
  }

  async createTerrainFromHeightmap(
    heightmapUrl: string,
    options: {
      width?: number;
      depth?: number;
      spacingX?: number;
      spacingZ?: number;
      heightOffset?: number;
      maxHeight?: number;
    } = {}
  ): Promise<THREE.Mesh> {
    const {
      width = 256,
      depth = 256,
      spacingX = 2,
      spacingZ = 2,
      heightOffset = 2,
      maxHeight = 50,
    } = options;

    return new Promise((resolve, reject) => {
      // Create canvas to process the heightmap
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = depth;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Load the heightmap image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = heightmapUrl;

      img.onload = () => {
        try {
          // Draw the image on canvas
          ctx.drawImage(img, 0, 0, width, depth);
          const imageData = ctx.getImageData(0, 0, width, depth);

          // Create geometry
          const geometry = new THREE.BufferGeometry();
          const vertices: number[] = [];
          const vertexColors: number[] = [];
          const indices: number[] = [];

          // Create vertices from heightmap
          for (let x = 0; x < depth; x++) {
            for (let z = 0; z < width; z++) {
              // Get pixel data (grayscale, so we use the red channel)
              const pixelIndex = (z * width + x) * 4;
              const height =
                ((imageData.data[pixelIndex] / 255) * maxHeight) / heightOffset;

              // Create vertex
              vertices.push(x * spacingX, height, z * spacingZ);

              // Create color based on height (blue -> green -> red)
              const normalizedHeight = height / maxHeight;
              let color = new THREE.Color();

              if (normalizedHeight < 0.3) {
                // Blue for low areas
                color.setRGB(0, 0, 0.5 + normalizedHeight * 0.5);
              } else if (normalizedHeight < 0.7) {
                // Green for mid areas
                color.setRGB(0, 0.5 + (normalizedHeight - 0.3) * 1.25, 0);
              } else {
                // Red for high areas
                color.setRGB(0.5 + (normalizedHeight - 0.7) * 1.67, 0, 0);
              }

              vertexColors.push(color.r, color.g, color.b);
            }
          }

          // Create faces (triangles)
          for (let z = 0; z < depth - 1; z++) {
            for (let x = 0; x < width - 1; x++) {
              const a = x + z * width;
              const b = x + 1 + z * width;
              const c = x + (z + 1) * width;
              const d = x + 1 + (z + 1) * width;

              // First triangle
              indices.push(a, b, d);
              // Second triangle
              indices.push(d, c, a);
            }
          }

          // Set geometry attributes
          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3)
          );
          geometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(vertexColors, 3)
          );
          geometry.setIndex(indices);

          // Compute normals for proper lighting
          geometry.computeVertexNormals();

          // Create material
          let material: THREE.Material;
          if (this.materialFunction) {
            material = this.materialFunction(0x404040, THREE.DoubleSide);
            if (material instanceof THREE.MeshStandardMaterial) {
              material.vertexColors = true;
            }
          } else {
            material = new THREE.MeshLambertMaterial({
              vertexColors: true,
              side: THREE.DoubleSide,
            });
          }

          // Create mesh
          const mesh = new THREE.Mesh(geometry, material);

          // Center the terrain
          geometry.computeBoundingBox();
          const boundingBox = geometry.boundingBox!;
          mesh.position.x = -(boundingBox.max.x + boundingBox.min.x) / 2;
          mesh.position.z = -(boundingBox.max.z + boundingBox.min.z) / 2;

          // Store reference and add to scene
          this.terrainMesh = mesh;
          this.scene.add(mesh);

          resolve(mesh);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load heightmap image"));
      };
    });
  }

  // Create a simple procedural terrain if no heightmap is available
  createProceduralTerrain(
    options: {
      width?: number;
      depth?: number;
      spacingX?: number;
      spacingZ?: number;
      maxHeight?: number;
      noiseScale?: number;
    } = {}
  ): THREE.Mesh {
    const {
      width = 128,
      depth = 128,
      spacingX = 2,
      spacingZ = 2,
      maxHeight = 30,
      noiseScale = 0.05,
    } = options;

    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const vertexColors: number[] = [];
    const indices: number[] = [];

    // Simple noise function
    const noise = (x: number, z: number) => {
      return Math.sin(x * noiseScale) * Math.cos(z * noiseScale) * 0.5 + 0.5;
    };

    // Create vertices
    for (let x = 0; x < depth; x++) {
      for (let z = 0; z < width; z++) {
        const height = noise(x, z) * maxHeight;
        vertices.push(x * spacingX, height, z * spacingZ);

        // Color based on height - using deep blue with slight variations
        const normalizedHeight = height / maxHeight;
        let color = new THREE.Color(colors.deepBlue);

        // Add slight height-based variation to the deep blue
        const heightVariation = normalizedHeight * 0.3; // 30% variation
        color.offsetHSL(0, 0, heightVariation - 0.15); // Slight brightness variation

        vertexColors.push(color.r, color.g, color.b);
      }
    }

    // Create faces
    for (let z = 0; z < depth - 1; z++) {
      for (let x = 0; x < width - 1; x++) {
        const a = x + z * width;
        const b = x + 1 + z * width;
        const c = x + (z + 1) * width;
        const d = x + 1 + (z + 1) * width;

        indices.push(a, b, d);
        indices.push(d, c, a);
      }
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(vertexColors, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    let material: THREE.Material;
    if (this.materialFunction) {
      material = this.materialFunction(
        parseInt(colors.deepBlue.replace("#", "0x")),
        THREE.DoubleSide
      );
      if (material instanceof THREE.MeshStandardMaterial) {
        material.vertexColors = true;
      }
    } else {
      material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);

    // Center the terrain
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox!;
    mesh.position.x = -(boundingBox.max.x + boundingBox.min.x) / 2;
    mesh.position.z = -(boundingBox.max.z + boundingBox.min.z) / 2;

    this.terrainMesh = mesh;
    this.scene.add(mesh);

    return mesh;
  }

  getTerrainMesh(): THREE.Mesh | undefined {
    return this.terrainMesh;
  }

  removeTerrain(): void {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      if (this.terrainMesh.material instanceof THREE.Material) {
        this.terrainMesh.material.dispose();
      }
      this.terrainMesh = undefined;
    }
  }
}
