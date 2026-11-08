"use client";

import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { SRGBColorSpace, TextureLoader, type Texture } from "three";
import { AtlasControls } from "./atlas-controls";
import { earthSurfaceCacheKey, styleEarthSurface } from "./earth-surface-style";
import { CAMERA_FOV, EARTH_TEXTURE, type AtlasAction, type ZoomLimits } from "./globe-config";

type Props = {
  action: AtlasAction;
  onReady: () => void;
  onError: (kind: "texture" | "webgl") => void;
  onLimitsChange: (limits: ZoomLimits) => void;
};

function EarthScene({ texture, onReady, onError }: { texture: Texture } & Pick<Props, "onReady" | "onError">) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onError("webgl");
    };
    canvas.addEventListener("webglcontextlost", lost);
    onReady();
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onReady, onError]);

  return (
    <>
      <ambientLight intensity={1.2} />
      <hemisphereLight args={["#ffffff", "#bcefe0", 1.1]} />
      <directionalLight position={[-3, 2, 5]} intensity={2.2} />
      <mesh rotation={[0, -Math.PI / 2, 0]}>
        <sphereGeometry args={[1, 64, 48]} />
        <meshStandardMaterial map={texture} roughness={1} metalness={0} onBeforeCompile={styleEarthSurface} customProgramCacheKey={earthSurfaceCacheKey} />
      </mesh>
    </>
  );
}

export default function EarthGlobe({ action, onReady, onError, onLimitsChange }: Props) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let active = true;
    // This component owns the texture, including failed/retried loads; no global loader cache.
    const loaded = new TextureLoader().load(EARTH_TEXTURE, (result) => {
      if (!active) { result.dispose(); return; }
      result.colorSpace = SRGBColorSpace;
      result.anisotropy = 4;
      setTexture(result);
    }, undefined, () => { if (active) onError("texture"); });
    return () => { active = false; loaded.dispose(); };
  }, [onError]);

  if (!texture) return null;

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: CAMERA_FOV, near: 0.01, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      fallback={<p role="alert">Для глобуса нужен браузер с поддержкой WebGL.</p>}
      role="img"
      aria-label="Трёхмерная модель Земли"
      aria-describedby="atlas-help"
    >
      <EarthScene texture={texture} onReady={onReady} onError={onError} />
      <AtlasControls action={action} onLimitsChange={onLimitsChange} />
    </Canvas>
  );
}
