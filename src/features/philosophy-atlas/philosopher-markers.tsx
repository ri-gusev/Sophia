"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei/web/Html";
import { AnimatePresence, usePresence } from "motion/react";
import { type Mesh, Vector3 } from "three";
import { isFacingCamera, latLonToVector3 } from "./geo-utils";
import { groupProjectedMarkers, type MarkerGroup } from "./marker-groups";
import { PHILOSOPHERS, type AtlasPhilosopher } from "./philosophers-data";
import { PhilosopherPortrait } from "./philosopher-portrait";
import { philosopherCountLabel } from "./historical-time";
import styles from "./philosopher-markers.module.css";

type Props = { philosophers: readonly AtlasPhilosopher[]; surfaceRef: RefObject<Mesh | null>; onSelect: (ids: string[], origin: HTMLButtonElement) => void };
const catalog = new Map(PHILOSOPHERS.map(person => [person.id, person]));

function MarkerAnchor({ group, surfaceRef, onSelect }: { group: MarkerGroup } & Pick<Props, "surfaceRef" | "onSelect">) {
  const anchor = catalog.get(group.anchorId)!;
  const position = useMemo(() => latLonToVector3(anchor.latitude, anchor.longitude), [anchor]);
  const content = useRef<HTMLDivElement>(null);
  // Groups mount only after the Earth mesh commits; Drei's older ref type excludes null.
  const occluders = useMemo(() => [surfaceRef as RefObject<Mesh>], [surfaceRef]);
  const [present, safeToRemove] = usePresence();
  useEffect(() => {
    if (present) return;
    const timer = window.setTimeout(() => safeToRemove?.(), matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
    return () => clearTimeout(timer);
  }, [present, safeToRemove]);
  useFrame(({ camera }) => {
    if (!content.current) return;
    const visible = isFacingCamera(position, camera.position);
    content.current.hidden = !visible;
    content.current.inert = !visible || !present;
  });
  const names = group.ids.map(id => catalog.get(id)!.name).join(", ");
  const label = group.ids.length > 1 ? `Философы: ${names}` : anchor.name;
  return <Html center position={position} occlude={occluders} zIndexRange={[12, 2]}>
    <div ref={content} className={styles.anchor} aria-hidden={!present} style={{ opacity: present ? 1 : 0, pointerEvents: present ? "auto" : "none" }}>
      <button type="button" className={styles.avatar} aria-label={label} title={label} disabled={!present} data-marker-ids={group.ids.join(",")} data-latitude={anchor.latitude} data-longitude={anchor.longitude} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onSelect(group.ids, event.currentTarget); }}>
        <PhilosopherPortrait person={anchor} size={42} />
        {group.ids.length > 1 && <span className={styles.badge} aria-hidden="true">{group.ids.length}</span>}
        <span className={styles.tooltip} aria-hidden="true">{group.ids.length > 1 ? `${philosopherCountLabel(group.ids.length)} · нажми, чтобы раскрыть` : anchor.name}</span>
      </button>
    </div>
  </Html>;
}

export function PhilosopherMarkers({ philosophers, surfaceRef, onSelect }: Props) {
  const points = useMemo(() => philosophers.map(person => ({ id: person.id, position: latLonToVector3(person.latitude, person.longitude) })), [philosophers]);
  const [groups, setGroups] = useState<MarkerGroup[]>([]);
  const previous = useRef("");
  const projected = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    const visible = surfaceRef.current ? points.flatMap(point => {
      if (!isFacingCamera(point.position, camera.position)) return [];
      projected.copy(point.position).project(camera);
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z < -1 || projected.z > 1) return [];
      return [{ id: point.id, x: projected.x * size.width / 2, y: projected.y * size.height / 2 }];
    }) : [];
    const next = groupProjectedMarkers(visible, 54);
    const signature = next.map(group => group.ids.join(",")).join("|");
    if (signature !== previous.current) { previous.current = signature; setGroups(next); }
  });
  return <AnimatePresence>{groups.map(group => <MarkerAnchor key={group.ids.join(",")} group={group} surfaceRef={surfaceRef} onSelect={onSelect} />)}</AnimatePresence>;
}
