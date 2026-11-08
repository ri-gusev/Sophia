import type { WebGLProgramParametersWithUniforms } from "three";

// Restyle the satellite colours on the GPU without repainting the geographic map.
// The original Blue Marble ocean is very dark blue; the colour mask leaves land,
// snow and coast coordinates intact. Five texture samples add mild local sharpness.
export function styleEarthSurface(shader: WebGLProgramParametersWithUniforms) {
  shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", /* glsl */`
    #include <map_fragment>
    #ifdef USE_MAP
      vec3 earthSource = diffuseColor.rgb;
      vec2 earthTexel = 1.0 / vec2(textureSize(map, 0));
      vec3 earthNeighbours =
        texture2D(map, vMapUv + vec2(earthTexel.x, 0.0)).rgb +
        texture2D(map, vMapUv - vec2(earthTexel.x, 0.0)).rgb +
        texture2D(map, vMapUv + vec2(0.0, earthTexel.y)).rgb +
        texture2D(map, vMapUv - vec2(0.0, earthTexel.y)).rgb;
      vec3 earthDetail = clamp(earthSource * 1.6 - earthNeighbours * 0.15, 0.0, 1.0);
      float earthDarkness = max(max(earthSource.r, earthSource.g), earthSource.b);
      float earthOcean = smoothstep(1.1, 1.6, earthSource.b / max(earthSource.r, 0.0001))
        * smoothstep(1.02, 1.3, earthSource.b / max(earthSource.g, 0.0001))
        * (1.0 - smoothstep(0.06, 0.18, earthDarkness));
      vec3 earthLand = pow(earthDetail, vec3(0.68));
      float earthLuma = dot(earthLand, vec3(0.2126, 0.7152, 0.0722));
      earthLand = mix(vec3(earthLuma), earthLand, 1.18);
      earthLand = mix(earthLand, vec3(0.72, 0.82, 0.55), 0.08);
      vec3 earthWater = mix(vec3(0.08, 0.34, 0.52), vec3(0.18, 0.55, 0.65),
        smoothstep(0.0, 0.045, earthDarkness));
      diffuseColor.rgb = mix(clamp(earthLand, 0.0, 1.0), earthWater, earthOcean);
    #endif
  `);
}

export function earthSurfaceCacheKey() { return "sophia-earth-illustrated-v1"; }
