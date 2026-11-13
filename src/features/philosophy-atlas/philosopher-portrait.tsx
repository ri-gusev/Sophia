"use client";

import { useState } from "react";
import Image from "next/image";
import type { AtlasPhilosopher } from "./philosophers-data";
import styles from "./philosopher-markers.module.css";

export function PhilosopherPortrait({ person, size, alt = "" }: { person: AtlasPhilosopher; size: number; alt?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const words = person.name.trim().split(/\s+/);
  const initials = [words[0], ...(words.length > 1 ? [words.at(-1)!] : [])].map(word => word[0]).join("");
  const fallback = !person.portrait || failed === person.portrait;
  return <span className={styles.portraitCrop} style={{ width: size, height: size }}>
    {fallback ? <span className={styles.initials} style={{ fontSize: size * .32 }} role={alt ? "img" : undefined} aria-label={alt ? `Инициалы: ${person.name}` : undefined} aria-hidden={alt ? undefined : true}>{initials}</span>
      : <Image src={person.portrait!} alt={alt} width={size} height={size} unoptimized onError={() => setFailed(person.portrait)} style={{ objectPosition: person.portraitPosition, transform: `scale(${person.portraitScale})`, transformOrigin: person.portraitPosition }} />}
  </span>;
}
