import * as THREE from 'three';

// One switch for the whole world: physically based materials on capable devices,
// cheaper Lambert shading on phones. Set it before anything is built.
let pbr = true;
export const setPBR = (on) => { pbr = on; };
export const usesPBR = () => pbr;

/**
 * A lit surface. On PBR it's a MeshStandardMaterial, so it picks up sky reflections from
 * scene.environment; otherwise the same look in Lambert (roughness/metalness are dropped).
 */
export function lit(params = {}) {
  if (pbr) return new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...params });
  const { roughness, metalness, roughnessMap, metalnessMap, envMapIntensity, ...rest } = params;
  return new THREE.MeshLambertMaterial(rest);
}

/** Shared clock for everything that sways. */
export const windTime = { value: 0 };

/**
 * Makes foliage sway in the wind. The bend grows with height above `from` and is phased by the
 * instance's world position, so neighbouring trees don't move in lockstep.
 */
export function addWind(material, { strength = 0.12, from = 1.5, to = 9 } = {}) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uWindTime = windTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 windPos = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 windPos = vec2(modelMatrix[3][0], modelMatrix[3][2]);
        #endif
        float bend = smoothstep(${from.toFixed(2)}, ${to.toFixed(2)}, position.y) * ${strength.toFixed(3)};
        float gust = 0.65 + 0.35 * sin(uWindTime * 0.37 + windPos.x * 0.01);
        transformed.x += sin(uWindTime * 1.35 + windPos.x * 0.083 + windPos.y * 0.051) * bend * gust;
        transformed.z += cos(uWindTime * 1.07 + windPos.y * 0.071) * bend * gust * 0.6;`);
  };
  material.customProgramCacheKey = () => `wind-${strength}-${from}-${to}`;
  return material;
}
