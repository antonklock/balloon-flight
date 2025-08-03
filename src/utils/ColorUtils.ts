import * as THREE from "three";

/**
 * Converts HSL color values to RGB
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns THREE.Color object
 */
export function hslToRgb(h: number, s: number, l: number): THREE.Color {
  h = h / 360; // Convert to 0-1 range
  s = s / 100; // Convert to 0-1 range
  l = l / 100; // Convert to 0-1 range

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return new THREE.Color(r + m, g + m, b + m);
}