"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, ClampToEdgeWrapping, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture, type Mesh } from "three";
import { AtlasControls } from "./atlas-controls";
import { harmonizeEarthPalette, earthPaletteCacheKey } from "./earth-palette";
import { CAMERA_FOV, EARTH_TEXTURE, EARTH_TEXTURE_8K, type AtlasAction, type ZoomLimits } from "./globe-config";
import { PhilosopherMarkers } from "./philosopher-markers";
import type { AtlasPhilosopher } from "./philosophers-data";

type Props = {
  action: AtlasAction;
  onReady: () => void;
  onError: (kind: "texture" | "webgl") => void;
  onLimitsChange: (limits: ZoomLimits) => void;
  philosophers: readonly AtlasPhilosopher[];
  onSelect: (ids: string[], origin: HTMLButtonElement) => void;
};

function EarthSurface({ onReady, onError, onQualityChange, surfaceRef }: Pick<Props, "onReady" | "onError"> & { onQualityChange: (high: boolean) => void; surfaceRef: RefObject<Mesh | null> }) {
  const { gl, invalidate } = useThree();
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onError("webgl");
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);

  useEffect(() => {
    let active = true;
    const owned = new Set<Texture>();
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const use8k = gl.capabilities.maxTextureSize >= 8192
      && !matchMedia("(pointer: coarse)").matches && (memory === undefined || memory > 4);
    onQualityChange(use8k);

    function load(path: string) {
      const pending = new TextureLoader().load(path, (result) => {
        if (!active) { result.dispose(); return; }
        result.colorSpace = SRGBColorSpace;
        result.wrapS = RepeatWrapping;
        result.wrapT = ClampToEdgeWrapping;
        result.generateMipmaps = true;
        result.minFilter = LinearMipmapLinearFilter;
        result.magFilter = LinearFilter;
        result.anisotropy = Math.min(path === EARTH_TEXTURE_8K ? 16 : 4, gl.capabilities.getMaxAnisotropy());
        try {
          // Upload here so an 8K allocation failure can use 4K before declaring readiness.
          gl.initTexture(result);
          const context = gl.getContext();
          if (context.isContextLost()) { onError("webgl"); return; }
          if (context.getError() !== context.NO_ERROR) throw new Error("Texture upload failed");
          setTexture(result);
          invalidate();
        } catch {
          result.dispose();
          owned.delete(result);
          if (path === EARTH_TEXTURE_8K) { onQualityChange(false); load(EARTH_TEXTURE); }
          else onError("webgl");
        }
      }, undefined, () => {
        pending.dispose();
        owned.delete(pending);
        if (!active) return;
        if (path === EARTH_TEXTURE_8K) { onQualityChange(false); load(EARTH_TEXTURE); }
        else onError("texture");
      });
      owned.add(pending);
    }

    load(use8k ? EARTH_TEXTURE_8K : EARTH_TEXTURE);
    return () => { active = false; owned.forEach(value => value.dispose()); owned.clear(); };
  }, [gl, invalidate, onError, onQualityChange]);

  useEffect(() => { if (texture) onReady(); }, [texture, onReady]);

  if (!texture) return null;

  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[-4, 2.5, 5]} intensity={1.5} />
      <mesh ref={surfaceRef} rotation={[0, -Math.PI / 2, 0]}>
        <sphereGeometry args={[1, 128, 96]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} onBeforeCompile={harmonizeEarthPalette} customProgramCacheKey={earthPaletteCacheKey} />
      </mesh>
    </>
  );
}

export default function EarthGlobe({ action, onReady, onError, onLimitsChange, philosophers, onSelect }: Props) {
  const [highQuality, setHighQuality] = useState(false);
  const surfaceRef = useRef<Mesh>(null);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, highQuality ? 2 : 1.5]}
      camera={{ position: [0, 0, 5], fov: CAMERA_FOV, near: 0.01, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
      fallback={<p role="alert">Для глобуса нужен браузер с поддержкой WebGL.</p>}
      role="group"
      aria-label="Трёхмерная модель Земли"
      aria-describedby="atlas-help"
    >
      <EarthSurface onReady={onReady} onError={onError} onQualityChange={setHighQuality} surfaceRef={surfaceRef} />
      <PhilosopherMarkers philosophers={philosophers} surfaceRef={surfaceRef} onSelect={onSelect} />
      <AtlasControls action={action} onLimitsChange={onLimitsChange} />
    </Canvas>
  );
}
