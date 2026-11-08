"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, type ComponentRef } from "react";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
import { useThree } from "@react-three/fiber";
import { MOUSE, TOUCH } from "three";
import { initialDistance, MAX_DISTANCE, MIN_DISTANCE, type AtlasAction, type ZoomLimits } from "./globe-config";

type Props = {
  action: AtlasAction;
  onLimitsChange: (limits: ZoomLimits) => void;
};

export function AtlasControls({ action, onLimitsChange }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, size, invalidate } = useThree();
  const limits = useRef({ near: false, far: false });
  const consumedSequence = useRef(0);
  const fitted = useRef(false);

  const resetView = useCallback((aspect: number) => {
    const orbit = controls.current;
    if (orbit) {
      // Flush pending rotation deltas before replacing the position. Otherwise damping
      // continues to rotate the camera after a reset or an orientation change.
      const damping = orbit.enableDamping;
      orbit.enableDamping = false;
      orbit.update();
      orbit.enableDamping = damping;
      orbit.target.set(0, 0, 0);
    }
    const distance = initialDistance(aspect);
    camera.position.set(0, distance * 0.15, distance * Math.sqrt(1 - 0.15 ** 2));
    camera.lookAt(0, 0, 0);
    orbit?.update();
    invalidate();
  }, [camera, invalidate]);

  useLayoutEffect(() => {
    if (!fitted.current) {
      fitted.current = true;
      resetView(size.width / size.height);
      return;
    }
    const orbit = controls.current;
    if (orbit) {
      const position = camera.position.clone();
      const damping = orbit.enableDamping;
      orbit.enableDamping = false;
      orbit.update();
      orbit.enableDamping = damping;
      camera.position.copy(position);
    }
    // Preserve the chosen direction and zoom unless more distance is needed to fit.
    const required = initialDistance(size.width / size.height);
    if (camera.position.length() + 0.000001 < required) camera.position.setLength(required);
    orbit?.update();
    invalidate();
  }, [camera, size.width, size.height, invalidate, resetView]);

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit || action.sequence === consumedSequence.current) return;
    consumedSequence.current = action.sequence;
    const current = camera.position.length();
    if (action.kind === "reset") {
      resetView(size.width / size.height);
    } else if (action.kind === "left" || action.kind === "right") {
      orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + (action.kind === "left" ? -0.15 : 0.15));
    } else if (action.kind === "up" || action.kind === "down") {
      orbit.setPolarAngle(Math.max(0.001, Math.min(Math.PI - 0.001, orbit.getPolarAngle() + (action.kind === "up" ? -0.15 : 0.15))));
    } else {
      const distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, current * (action.kind === "in" ? 0.8 : 1.25)));
      camera.position.setLength(distance);
    }
    orbit.update();
    invalidate();
  }, [action, camera, size.width, size.height, invalidate, resetView]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.65}
      zoomSpeed={0.7}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY }}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
      onChange={() => {
        const distance = camera.position.length();
        const next = { near: distance <= MIN_DISTANCE + 0.001, far: distance >= MAX_DISTANCE - 0.001 };
        if (next.near !== limits.current.near || next.far !== limits.current.far) {
          limits.current = next;
          onLimitsChange(next);
        }
      }}
    />
  );
}
