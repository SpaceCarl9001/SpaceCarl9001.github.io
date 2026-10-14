import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * Final "camera" pass, applied to the display image: speed blur streaking out from the point
 * we're driving toward, a gentle filmic contrast curve with a time-of-day colour grade,
 * a soft vignette and fine film grain.
 */
export function createFinishPass() {
  return new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uBlur: { value: 0 },                       // 0 = parked, ~0.03 = flat out
      uFocus: { value: new THREE.Vector2(0.5, 0.45) },
      uGrade: { value: new THREE.Vector3(1, 1, 1) },
      uVignette: { value: 0.28 },
      uGrain: { value: 0.035 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime, uBlur, uVignette, uGrain;
      uniform vec2 uFocus;
      uniform vec3 uGrade;
      varying vec2 vUv;

      void main() {
        // radial motion blur, stronger toward the edges of the frame
        vec2 toFocus = vUv - uFocus;
        vec3 col = vec3(0.0);
        float total = 0.0;
        for (int i = 0; i < 8; i++) {
          float t = float(i) / 7.0;
          float w = 1.0 - t * 0.6;
          col += texture2D(tDiffuse, vUv - toFocus * t * uBlur).rgb * w;
          total += w;
        }
        col /= total;

        // filmic S-curve and a touch more saturation, then the time-of-day tint
        col = col * col * (3.0 - 2.0 * col) * 0.35 + col * 0.65;
        float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(luma), col, 1.08) * uGrade;

        // vignette and grain
        vec2 v = (vUv - 0.5) * vec2(1.15, 1.0);
        col *= 1.0 - uVignette * smoothstep(0.3, 0.85, length(v));
        float n = fract(sin(dot(vUv * vec2(1931.7, 1103.3) + uTime * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
        col += (n - 0.5) * uGrain;
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`,
  });
}
