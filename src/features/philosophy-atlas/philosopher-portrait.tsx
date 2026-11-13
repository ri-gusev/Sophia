import Image from "next/image";
import type { AtlasPhilosopher } from "./philosophers-data";
import styles from "./philosopher-markers.module.css";

export function PhilosopherPortrait({ person, size, alt = "" }: { person: AtlasPhilosopher; size: number; alt?: string }) {
  return <span className={styles.portraitCrop} style={{ width: size, height: size }}><Image src={person.portrait} alt={alt} width={size} height={size} unoptimized style={{ objectPosition: person.portraitPosition, transform: `scale(${person.portraitScale})`, transformOrigin: person.portraitPosition }} /></span>;
}
