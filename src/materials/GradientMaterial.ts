import * as THREE from "three";
import { colors } from "../resources/colors";

export class GradientMaterial {
  private readonly material: THREE.ShaderMaterial;
  private readonly backgroundSphere: THREE.Mesh;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(colors.steelPink) },
        // bottomColor: { value: new THREE.Color(colors.frenchViolet) },
        bottomColor: { value: new THREE.Color(colors.darkBlue) },
        offset: { value: 40 },
        exponent: { value: 1.6 },
        rotation: { value: 4.6 },
        starMinSize: { value: 15 },
        starMaxSize: { value: 25 },
        starFadeOffset: { value: 0.1 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        uniform float rotation;
        uniform float starMinSize;
        uniform float starMaxSize;
        uniform float starFadeOffset;
        varying vec3 vWorldPosition;
        
        // Random function for star positioning
        vec2 rand(vec2 co){
            return vec2(
                fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453),
                fract(cos(dot(co.yx ,vec2(8.64947,45.097))) * 43758.5453)
            )*2.0-1.0;
        }
        
        // Dot distance field for stars with variable size
        float dots(in vec2 uv)
        {
            vec2 g = floor(uv);
            vec2 f = fract(uv)*2.0-1.0;
            vec2 r = rand(g)*.5;
            
            // Use the random value to determine star size
            float sizeVariation = rand(g + vec2(1.0, 0.0)).x;
            float starSize = mix(starMinSize, starMaxSize, sizeVariation);
            
            return length(f+r) / starSize;
        }
        
        void main() {
          vec3 pos = normalize(vWorldPosition + offset);
          vec3 originalPos = normalize(vWorldPosition);
          
          // Create a proper 2D gradient using dot product
          vec2 gradientDir = vec2(cos(rotation), sin(rotation));
          float gradientValue = dot(pos.xy, gradientDir);
          
          // Normalize the gradient value to 0-1 range
          float h = (gradientValue + 1.0) * 0.5;
          vec3 gradientColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
          
          // Add stars only in the upper portion with horizon fade
          vec3 starColor = vec3(0.0);
          if (originalPos.y > starFadeOffset) {
            // Convert to spherical coordinates for proper star placement
            float theta = acos(originalPos.y); // Angle from zenith (0 = top, PI = bottom)
            float phi = atan(originalPos.z, originalPos.x); // Azimuthal angle
            
            // Map to UV coordinates that start from the top
            vec2 starUV = vec2(
              phi / (2.0 * 3.14159), // Normalize azimuth to 0-1
              theta / 3.14159        // Normalize zenith angle to 0-1 (0 = top, 1 = horizon)
            );
            
            float d = smoothstep(0.0, 0.002, dots(starUV * 15.0));
            
            // Calculate fade based on distance from horizon
            float fadeFactor = smoothstep(starFadeOffset, 1.0, originalPos.y);
            starColor = vec3(1.0 - d, 1.0 - d, 1.0 - d) * fadeFactor;
          }
          
          // Add red star at the very top (zenith) using original world position
          if (originalPos.y > 0.99) {
            float redStar = smoothstep(0.0, 0.01, 1.0 - originalPos.y);
            starColor += vec3(redStar, 0.0, 0.0);
          }
          
          gl_FragColor = vec4(gradientColor + starColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    // Create a large sphere for the gradient background
    const backgroundGeometry = new THREE.SphereGeometry(100, 32, 32);
    this.backgroundSphere = new THREE.Mesh(backgroundGeometry, this.material);
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.backgroundSphere);
  }

  updateColors(topColor: string, bottomColor: string): void {
    this.material.uniforms.topColor.value = new THREE.Color(topColor);
    this.material.uniforms.bottomColor.value = new THREE.Color(bottomColor);
  }

  updateParameters(offset: number, exponent: number): void {
    this.material.uniforms.offset.value = offset;
    this.material.uniforms.exponent.value = exponent;
  }

  updateRotation(rotation: number): void {
    this.material.uniforms.rotation.value = rotation;
  }

  updateStarSizes(minSize: number, maxSize: number): void {
    this.material.uniforms.starMinSize.value = minSize;
    this.material.uniforms.starMaxSize.value = maxSize;
  }

  updateStarFadeOffset(fadeOffset: number): void {
    this.material.uniforms.starFadeOffset.value = fadeOffset;
  }
}
