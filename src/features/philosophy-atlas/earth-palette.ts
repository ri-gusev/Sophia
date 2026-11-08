import type { WebGLProgramParametersWithUniforms } from "three";

// Muted sage, sand and blue-grey complement Sophia's pastel UI.
// These adjustments operate in linear RGB before lighting, without extra samples.
export function harmonizeEarthPalette(shader: WebGLProgramParametersWithUniforms) {
  shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", /* glsl */`
    #include <map_fragment>
    #ifdef USE_MAP
      vec3 surface = diffuseColor.rgb;
      float luminance = dot(surface, vec3(0.2126, 0.7152, 0.0722));
      float blueWater = smoothstep(1.15, 1.8, surface.b / max(surface.r, 0.0001))
        * smoothstep(1.05, 1.4, surface.b / max(surface.g, 0.0001))
        * (1.0 - smoothstep(0.15, 0.45, max(max(surface.r, surface.g), surface.b)));

      // Lift deep forest shadows and soften bright desert tones together.
      vec3 mutedLand = mix(vec3(luminance), surface, 0.74) * 0.65
        + vec3(0.035, 0.045, 0.037);
      float landShadows = 1.0 - smoothstep(0.05, 0.4, luminance);
      mutedLand += landShadows * vec3(0.05, 0.062, 0.05);
      float waterRelief = pow(luminance, 0.55);
      vec3 mutedWater = vec3(0.105, 0.175, 0.19) + waterRelief * vec3(0.28, 0.4, 0.42);
      diffuseColor.rgb = mix(mutedLand, mutedWater, blueWater);
    #endif
  `);
}

export function earthPaletteCacheKey() { return "sophia-earth-pastel-v2"; }
